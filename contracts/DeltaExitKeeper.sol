// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
}

interface INonfungiblePositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function ownerOf(uint256 tokenId) external view returns (address owner);
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);

    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function collect(CollectParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function burn(uint256 tokenId) external payable;
}

contract LiqoraExitKeeper {
    uint32 public constant MIN_GRACE_PERIOD = 60;
    uint32 public constant MAX_GRACE_PERIOD = 1 days;

    enum Action {
        None,
        Poke,
        Execute
    }

    struct Mandate {
        address owner;
        uint128 minToken0Below;
        uint128 minToken1Above;
        uint48 armedAt;
        uint32 gracePeriod;
        int8 armedSide;
        bool active;
    }

    INonfungiblePositionManager public immutable positionManager;
    IUniswapV3Factory public immutable factory;
    address public immutable keeper;

    mapping(uint256 tokenId => Mandate mandate) public mandates;
    uint256[] private activeTokenIds;
    mapping(uint256 tokenId => uint256 indexPlusOne) private activeIndexes;

    bool private entered;

    event MandateConfigured(
        uint256 indexed tokenId,
        address indexed owner,
        uint32 gracePeriod,
        uint128 minToken0Below,
        uint128 minToken1Above
    );
    event MandateCancelled(uint256 indexed tokenId, address indexed owner);
    event ExitArmed(uint256 indexed tokenId, int8 side, uint48 armedAt);
    event ExitReset(uint256 indexed tokenId);
    event ExitExecuted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount0,
        uint256 amount1
    );

    error Unauthorized();
    error InvalidConfiguration();
    error MandateInactive();
    error PositionNotApproved();
    error PositionInRange();
    error GracePeriodActive();
    error NoLiquidity();
    error PoolUnavailable();
    error Reentrancy();

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (entered) revert Reentrancy();
        entered = true;
        _;
        entered = false;
    }

    constructor(address positionManager_, address factory_, address keeper_) {
        if (
            positionManager_ == address(0) ||
            factory_ == address(0) ||
            keeper_ == address(0)
        ) revert InvalidConfiguration();
        positionManager = INonfungiblePositionManager(positionManager_);
        factory = IUniswapV3Factory(factory_);
        keeper = keeper_;
    }

    function configure(
        uint256 tokenId,
        uint32 gracePeriod,
        uint128 minToken0Below,
        uint128 minToken1Above
    ) external nonReentrant {
        if (
            gracePeriod < MIN_GRACE_PERIOD ||
            gracePeriod > MAX_GRACE_PERIOD
        ) revert InvalidConfiguration();
        if (positionManager.ownerOf(tokenId) != msg.sender) revert Unauthorized();
        if (!_isApproved(msg.sender, tokenId)) revert PositionNotApproved();

        (,,,,,,, uint128 liquidity,,,,) = positionManager.positions(tokenId);
        if (liquidity == 0) revert NoLiquidity();

        Mandate storage mandate = mandates[tokenId];
        if (!mandate.active) {
            activeTokenIds.push(tokenId);
            activeIndexes[tokenId] = activeTokenIds.length;
        }
        mandates[tokenId] = Mandate({
            owner: msg.sender,
            minToken0Below: minToken0Below,
            minToken1Above: minToken1Above,
            armedAt: 0,
            gracePeriod: gracePeriod,
            armedSide: 0,
            active: true
        });

        emit MandateConfigured(
            tokenId,
            msg.sender,
            gracePeriod,
            minToken0Below,
            minToken1Above
        );
    }

    function cancel(uint256 tokenId) external nonReentrant {
        Mandate memory mandate = mandates[tokenId];
        if (!mandate.active) revert MandateInactive();
        if (msg.sender != mandate.owner) revert Unauthorized();
        _removeMandate(tokenId);
        emit MandateCancelled(tokenId, msg.sender);
    }

    function check(uint256 tokenId)
        external
        view
        returns (Action action, int8 side, uint48 readyAt, int24 currentTick)
    {
        Mandate memory mandate = mandates[tokenId];
        if (!mandate.active) return (Action.None, 0, 0, 0);

        (side, currentTick) = _currentSide(tokenId);
        if (side == 0) {
            return (
                mandate.armedAt == 0 ? Action.None : Action.Poke,
                0,
                0,
                currentTick
            );
        }

        if (mandate.armedAt == 0 || mandate.armedSide != side) {
            return (
                Action.Poke,
                side,
                uint48(block.timestamp + mandate.gracePeriod),
                currentTick
            );
        }

        readyAt = mandate.armedAt + mandate.gracePeriod;
        action = block.timestamp >= readyAt ? Action.Execute : Action.None;
    }

    function poke(uint256 tokenId) external onlyKeeper nonReentrant {
        Mandate storage mandate = mandates[tokenId];
        if (!mandate.active) revert MandateInactive();
        if (positionManager.ownerOf(tokenId) != mandate.owner) revert Unauthorized();
        if (!_isApproved(mandate.owner, tokenId)) revert PositionNotApproved();

        (int8 side,) = _currentSide(tokenId);
        if (side == 0) {
            if (mandate.armedAt != 0) {
                mandate.armedAt = 0;
                mandate.armedSide = 0;
                emit ExitReset(tokenId);
            }
            return;
        }

        if (mandate.armedAt == 0 || mandate.armedSide != side) {
            mandate.armedAt = uint48(block.timestamp);
            mandate.armedSide = side;
            emit ExitArmed(tokenId, side, mandate.armedAt);
            return;
        }

        if (block.timestamp < mandate.armedAt + mandate.gracePeriod) {
            revert GracePeriodActive();
        }

        _executeExit(tokenId, mandate, side);
    }

    function activeCount() external view returns (uint256) {
        return activeTokenIds.length;
    }

    function activeTokenAt(uint256 index) external view returns (uint256) {
        return activeTokenIds[index];
    }

    function _executeExit(
        uint256 tokenId,
        Mandate storage mandate,
        int8 side
    ) private {
        (,,,,,,, uint128 liquidity,,,,) = positionManager.positions(tokenId);
        if (liquidity == 0) revert NoLiquidity();

        address owner = mandate.owner;
        uint256 amount0Min = side < 0 ? mandate.minToken0Below : 0;
        uint256 amount1Min = side > 0 ? mandate.minToken1Above : 0;
        _removeMandate(tokenId);

        positionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                deadline: block.timestamp
            })
        );

        (uint256 amount0, uint256 amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: owner,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        positionManager.burn(tokenId);

        emit ExitExecuted(tokenId, owner, amount0, amount1);
    }

    function _currentSide(uint256 tokenId)
        private
        view
        returns (int8 side, int24 currentTick)
    {
        (
            ,,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            ,,,,
        ) = positionManager.positions(tokenId);
        address pool = factory.getPool(token0, token1, fee);
        if (pool == address(0)) revert PoolUnavailable();
        (, currentTick,,,,,) = IUniswapV3Pool(pool).slot0();
        if (currentTick <= tickLower) return (-1, currentTick);
        if (currentTick >= tickUpper) return (1, currentTick);
        return (0, currentTick);
    }

    function _isApproved(address owner, uint256 tokenId)
        private
        view
        returns (bool)
    {
        return
            positionManager.getApproved(tokenId) == address(this) ||
            positionManager.isApprovedForAll(owner, address(this));
    }

    function _removeMandate(uint256 tokenId) private {
        uint256 indexPlusOne = activeIndexes[tokenId];
        if (indexPlusOne != 0) {
            uint256 index = indexPlusOne - 1;
            uint256 lastIndex = activeTokenIds.length - 1;
            if (index != lastIndex) {
                uint256 movedTokenId = activeTokenIds[lastIndex];
                activeTokenIds[index] = movedTokenId;
                activeIndexes[movedTokenId] = index + 1;
            }
            activeTokenIds.pop();
            delete activeIndexes[tokenId];
        }
        delete mandates[tokenId];
    }
}