const parsedChainId = Number(import.meta.env.VITE_CHAIN_ID);

export const robinhoodChain = {
  chainId: Number.isInteger(parsedChainId) && parsedChainId > 0 ? parsedChainId : null,
  rpcUrl: String(import.meta.env.VITE_RPC_URL ?? ""),
  chainName: String(import.meta.env.VITE_CHAIN_NAME ?? "Robinhood Chain"),
  nativeCurrency: {
    name: String(import.meta.env.VITE_NATIVE_CURRENCY_NAME ?? "Ether"),
    symbol: String(import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL ?? "ETH"),
    decimals: 18,
  },
  explorerUrl: String(
    import.meta.env.VITE_BLOCK_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com",
  ),
  uniswapV3PositionManager: String(
    import.meta.env.VITE_UNISWAP_V3_POSITION_MANAGER ?? "",
  ),
};

export const isRobinhoodChainConfigured =
  robinhoodChain.chainId !== null && robinhoodChain.rpcUrl.length > 0;

export const isUniswapV3Configured =
  /^0x[a-fA-F0-9]{40}$/.test(robinhoodChain.uniswapV3PositionManager);

export function toChainIdHex(chainId: number) {
  return `0x${chainId.toString(16)}`;
}