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
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  let response: Response;

  try {
    response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: rpcRequestId,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new Error("RPC request timed out.");
    }
    throw cause;
  } finally {
    window.clearTimeout(timeout);
  }

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

export async function simulateRpcTransaction(
  rpcUrl: string,
  transaction: { from: string; to: string; data: string; value?: string },
) {
  rpcRequestId += 1;
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: rpcRequestId,
      method: "eth_call",
      params: [transaction, "latest"],
    }),
  });
  const payload = (await response.json()) as {
    result?: unknown;
    error?: { message?: string };
  };

  if (!response.ok || payload.error) {
    throw new Error(
      payload.error?.message || "Mint simulation failed before submission.",
    );
  }
  if (typeof payload.result !== "string" || !payload.result.startsWith("0x")) {
    throw new Error("Mint simulation returned an invalid response.");
  }
  return payload.result;
}

export function encodeInt256(value: number | bigint) {
  const parsed = BigInt(value);
  const encoded = parsed < 0n ? 2n ** 256n + parsed : parsed;
  return encoded.toString(16).padStart(64, "0");
}

export function parseUnits(value: string, decimals: number) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a valid positive token amount.");
  }
  const [whole, fraction = ""] = trimmed.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Amount supports up to ${decimals} decimal places.`);
  }
  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0")
  );
}

export function formatUnits(value: bigint, decimals: number, precision = 4) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  if (fraction === 0n) return whole.toString();
  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, precision)
    .replace(/0+$/, "");
  return `${whole}.${fractionText}`;
}

export function encodeTransactionData(
  selector: string,
  values: Array<"address" | "uint256" | "int256">,
  args: Array<string | number | bigint>,
) {
  return `${selector}${values
    .map((type, index) => {
      const value = args[index];
      if (type === "address") return encodeAddress(String(value));
      if (type === "int256") return encodeInt256(value as number | bigint);
      return encodeUint256(value as number | bigint);
    })
    .join("")}`;
}

export async function sendTransaction(
  provider: EthereumProvider,
  transaction: { from: string; to: string; data: string; value?: string },
) {
  const result = await provider.request({
    method: "eth_sendTransaction",
    params: [transaction],
  });
  if (typeof result !== "string" || !result.startsWith("0x")) {
    throw new Error("Wallet returned an invalid transaction hash.");
  }
  return result;
}

export async function waitForTransactionReceipt(
  provider: EthereumProvider,
  hash: string,
  timeoutMs = 90_000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    });

    if (typeof receipt === "object" && receipt !== null) {
      const status =
        "status" in receipt
          ? (receipt as { status?: unknown }).status
          : undefined;
      if (status === "0x0") throw new Error("Transaction reverted on-chain.");
      if (status === "0x1") return receipt;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1_200));
  }

  throw new Error("Transaction is still pending. Check it in Blockscout.");
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