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
};

export const isRobinhoodChainConfigured =
  robinhoodChain.chainId !== null && robinhoodChain.rpcUrl.length > 0;

export function toChainIdHex(chainId: number) {
  return `0x${chainId.toString(16)}`;
}