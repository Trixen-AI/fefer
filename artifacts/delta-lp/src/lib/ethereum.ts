export type EthereumListener = (...args: unknown[]) => void;

export type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
  on?: (event: string, listener: EthereumListener) => void;
  removeListener?: (event: string, listener: EthereumListener) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getEthereumProvider() {
  if (typeof window === "undefined") return undefined;
  return window.ethereum;
}

export async function readContract(
  provider: EthereumProvider,
  to: string,
  data: string,
) {
  const result = await provider.request({
    method: "eth_call",
    params: [{ to, data }, "latest"],
  });

  if (typeof result !== "string" || !result.startsWith("0x")) {
    throw new Error("RPC returned an invalid contract response.");
  }

  return result;
}

let rpcRequestId = 0;

export async function readRpcContract(
  rpcUrl: string,
  to: string,
  data: string,
) {
  rpcRequestId += 1;
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: rpcRequestId,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    result?: unknown;
    error?: { message?: string };
  };

  if (payload.error) {
    throw new Error(payload.error.message || "RPC contract call failed.");
  }

  if (typeof payload.result !== "string" || !payload.result.startsWith("0x")) {
    throw new Error("RPC returned an invalid contract response.");
  }

  return payload.result;
}

export function encodeAddress(address: string) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

export function encodeUint256(value: number | bigint) {
  return BigInt(value).toString(16).padStart(64, "0");
}

export function decodeWords(data: string) {
  const body = data.replace(/^0x/, "");
  if (!body || body.length % 64 !== 0) {
    throw new Error("RPC returned an invalid ABI response.");
  }
  return body.match(/.{64}/g) ?? [];
}

export function decodeUint256(word: string) {
  return BigInt(`0x${word}`);
}

export function decodeAddress(word: string) {
  return `0x${word.slice(-40)}`;
}

export function decodeSignedInt24(word: string) {
  const int24 = BigInt(`0x${word}`) & 0xffffffn;
  return Number(int24 >= 0x800000n ? int24 - 0x1000000n : int24);
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}