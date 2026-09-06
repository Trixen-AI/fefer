const parsedChainId = Number(import.meta.env.VITE_CHAIN_ID);

export const robinhoodChain = {
  chainId:
    Number.isInteger(parsedChainId) && parsedChainId > 0 ? parsedChainId : null,
  rpcUrl: String(import.meta.env.VITE_RPC_URL ?? ""),
  chainName: String(import.meta.env.VITE_CHAIN_NAME ?? "Robinhood Chain"),
  nativeCurrency: {
    name: String(import.meta.env.VITE_NATIVE_CURRENCY_NAME ?? "Ether"),
    symbol: String(import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL ?? "ETH"),
    decimals: 18,
  },
  explorerUrl: String(
    import.meta.env.VITE_BLOCK_EXPLORER_URL ??
      "https://robinhoodchain.blockscout.com",
  ),
  uniswapV3PositionManager: String(
    import.meta.env.VITE_UNISWAP_V3_POSITION_MANAGER ?? "",
  ),
  uniswapV3Factory: String(import.meta.env.VITE_UNISWAP_V3_FACTORY ?? ""),
  token0Address: String(import.meta.env.VITE_LP_TOKEN0_ADDRESS ?? ""),
  token1Address: String(import.meta.env.VITE_LP_TOKEN1_ADDRESS ?? ""),
  token0Label: String(import.meta.env.VITE_LP_TOKEN0_LABEL ?? "Token 0"),
  token1Label: String(import.meta.env.VITE_LP_TOKEN1_LABEL ?? "Token 1"),
};

export const isRobinhoodChainConfigured =
  robinhoodChain.chainId !== null && robinhoodChain.rpcUrl.length > 0;

export const isUniswapV3Configured =
  /^0x[a-fA-F0-9]{40}$/.test(robinhoodChain.uniswapV3PositionManager) &&
  /^0x[a-fA-F0-9]{40}$/.test(robinhoodChain.uniswapV3Factory) &&
  /^0x[a-fA-F0-9]{40}$/.test(robinhoodChain.token0Address) &&
  /^0x[a-fA-F0-9]{40}$/.test(robinhoodChain.token1Address);

export function toChainIdHex(chainId: number) {
  return `0x${chainId.toString(16)}`;
}
