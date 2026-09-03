import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 15_000;
const MAX_MANDATES_PER_POLL = 100;
const DEFAULT_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

const keeperAbi = [
  {
    type: "function",
    name: "activeCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "activeTokenAt",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "check",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "action", type: "uint8" },
      { name: "side", type: "int8" },
      { name: "readyAt", type: "uint48" },
      { name: "currentTick", type: "int24" },
    ],
  },
  {
    type: "function",
    name: "poke",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
] as const;

type KeeperStatus = {
  configured: boolean;
  running: boolean;
  operatorAddress: string | null;
  contractAddress: string | null;
  activeMandates: number;
  lastPollAt: string | null;
  lastTransactionHash: string | null;
  lastError: string | null;
};

const status: KeeperStatus = {
  configured: false,
  running: false,
  operatorAddress: null,
  contractAddress: null,
  activeMandates: 0,
  lastPollAt: null,
  lastTransactionHash: null,
  lastError: null,
};

let timer: ReturnType<typeof setInterval> | undefined;
let polling = false;

function loadConfig() {
  const privateKey = process.env["KEEPER_PRIVATE_KEY"];
  const contractAddress = process.env["EXIT_KEEPER_ADDRESS"];
  const rpcUrl = process.env["ROBINHOOD_RPC_URL"] || DEFAULT_RPC_URL;
  if (
    !privateKey ||
    !/^0x[a-fA-F0-9]{64}$/.test(privateKey) ||
    !contractAddress ||
    !isAddress(contractAddress)
  ) {
    return null;
  }
  const account = privateKeyToAccount(privateKey as Hex);
  return { account, contractAddress: contractAddress as Address, rpcUrl };
}

export function getKeeperStatus(): KeeperStatus {
  return { ...status };
}

async function pollKeeper() {
  if (polling) return;
  polling = true;
  try {
    const config = loadConfig();
    if (!config) {
      status.configured = false;
      status.running = false;
      status.lastError =
        "KEEPER_PRIVATE_KEY or EXIT_KEEPER_ADDRESS is not configured.";
      return;
    }

    const chain = defineChain({
      id: 4663,
      name: "Robinhood Chain",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    });
    const publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });
    const walletClient = createWalletClient({
      account: config.account,
      chain,
      transport: http(config.rpcUrl),
    });

    status.configured = true;
    status.running = true;
    status.operatorAddress = config.account.address;
    status.contractAddress = config.contractAddress;
    status.lastError = null;

    const count = await publicClient.readContract({
      address: config.contractAddress,
      abi: keeperAbi,
      functionName: "activeCount",
    });
    status.activeMandates = Number(count);
    const visibleCount = Math.min(Number(count), MAX_MANDATES_PER_POLL);

    for (let index = 0; index < visibleCount; index += 1) {
      const tokenId = await publicClient.readContract({
        address: config.contractAddress,
        abi: keeperAbi,
        functionName: "activeTokenAt",
        args: [BigInt(index)],
      });
      const [action] = await publicClient.readContract({
        address: config.contractAddress,
        abi: keeperAbi,
        functionName: "check",
        args: [tokenId],
      });
      if (action === 0) continue;

      const hash = await walletClient.writeContract({
        address: config.contractAddress,
        abi: keeperAbi,
        functionName: "poke",
        args: [tokenId],
      });
      status.lastTransactionHash = hash;
      await publicClient.waitForTransactionReceipt({ hash });
      logger.info({ tokenId: tokenId.toString(), hash }, "Keeper poke confirmed");
    }

    status.lastPollAt = new Date().toISOString();
  } catch (error) {
    status.lastError = error instanceof Error ? error.message : "Unknown keeper error.";
    logger.error({ err: error }, "Keeper poll failed");
  } finally {
    polling = false;
  }
}

export function startKeeper() {
  if (timer) return;
  void pollKeeper();
  timer = setInterval(() => void pollKeeper(), POLL_INTERVAL_MS);
  timer.unref();
}