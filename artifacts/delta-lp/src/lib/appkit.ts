import { robinhoodChain, isRobinhoodChainConfigured } from "@/config/network";
import { setEthereumProvider, type EthereumProvider } from "@/lib/ethereum";

/**
 * Reown AppKit (WalletConnect) wiring.
 *
 * The SDK is imported lazily inside `openWalletModal()` so nothing is loaded,
 * initialised, or reconnected while the page is booting. The modal only ever
 * appears as a direct result of the user clicking "Connect".
 */

export const reownProjectId = String(
  import.meta.env.VITE_REOWN_PROJECT_ID ?? "",
).trim();

/** WalletConnect is only usable once a project id is supplied via env. */
export const isReownConfigured = reownProjectId.length > 0;

export type AppKitAccountState = {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
};

type Listener = (state: AppKitAccountState) => void;

const listeners = new Set<Listener>();

let appKitPromise: Promise<AppKitInstance> | null = null;

// Structural type covering only the members used here, so this file does not
// depend on the SDK's types at module scope (it must stay lazily loaded).
type AppKitInstance = {
  open: (options?: unknown) => Promise<unknown>;
  disconnect: (namespace?: string) => Promise<void>;
  getProvider: <T>(namespace: string) => T | undefined;
  getAddress: (namespace?: string) => string | undefined;
  getChainId: () => string | number | undefined;
  getIsConnectedState: () => boolean;
  subscribeAccount: (
    callback: (state: { address?: string; isConnected?: boolean }) => void,
    namespace?: string,
  ) => () => void;
  subscribeProviders: (callback: (providers: unknown) => void) => () => void;
};

export function onAppKitAccountChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function toChainId(value: string | number | undefined) {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value !== "string") return null;
  // AppKit reports either "eip155:4663" or a bare id depending on the caller.
  const raw = value.includes(":") ? (value.split(":").pop() ?? "") : value;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function emit(appKit: AppKitInstance) {
  // Hand the connected wallet's EIP-1193 provider to the rest of the app so
  // every existing `getEthereumProvider()` call site keeps working unchanged.
  const provider = appKit.getProvider<EthereumProvider>("eip155");
  setEthereumProvider(provider ?? null);

  const state: AppKitAccountState = {
    address: appKit.getAddress("eip155") ?? null,
    chainId: toChainId(appKit.getChainId()),
    isConnected: appKit.getIsConnectedState(),
  };

  for (const listener of listeners) listener(state);
}

async function initAppKit(): Promise<AppKitInstance> {
  if (!isReownConfigured) {
    throw new Error(
      "WalletConnect is unavailable: set VITE_REOWN_PROJECT_ID to your Reown project id.",
    );
  }
  if (!isRobinhoodChainConfigured || robinhoodChain.chainId === null) {
    throw new Error("Robinhood Chain configuration is not available.");
  }

  const [{ createAppKit }, { defineChain }, { EthersAdapter }] =
    await Promise.all([
      import("@reown/appkit"),
      import("@reown/appkit/networks"),
      import("@reown/appkit-adapter-ethers"),
    ]);

  const network = defineChain({
    id: robinhoodChain.chainId,
    name: robinhoodChain.chainName,
    nativeCurrency: { ...robinhoodChain.nativeCurrency },
    rpcUrls: { default: { http: [robinhoodChain.rpcUrl] } },
    blockExplorers: {
      default: { name: "Blockscout", url: robinhoodChain.explorerUrl },
    },
    chainNamespace: "eip155",
    caipNetworkId: `eip155:${robinhoodChain.chainId}`,
  });

  const appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [network],
    defaultNetwork: network,
    projectId: reownProjectId,
    metadata: {
      name: "LI.QO",
      description:
        "Automated take-profit controls for concentrated liquidity on Robinhood Chain.",
      url: window.location.origin,
      icons: [`${window.location.origin}/liqo-logo.png`],
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
  }) as unknown as AppKitInstance;

  appKit.subscribeAccount(() => emit(appKit));
  appKit.subscribeProviders(() => emit(appKit));

  return appKit;
}

function getAppKit() {
  if (!appKitPromise) {
    appKitPromise = initAppKit().catch((error) => {
      // Let the next click retry instead of caching a failed initialisation.
      appKitPromise = null;
      throw error;
    });
  }
  return appKitPromise;
}

/** Opens the wallet picker. Called only from an explicit user click. */
export async function openWalletModal() {
  const appKit = await getAppKit();
  await appKit.open();
  emit(appKit);
}

/**
 * Opens AppKit on its account view: balance, copy address, network switch and
 * its own Disconnect button. Preferred over calling disconnect() straight from
 * the header, so a single click cannot drop the session by accident.
 */
export async function openAccountModal() {
  const appKit = await getAppKit();
  await appKit.open({ view: "Account" });
  emit(appKit);
}

/** Disconnects the AppKit session, if one was ever started. */
export async function disconnectWalletModal() {
  if (!appKitPromise) return;
  try {
    const appKit = await appKitPromise;
    await appKit.disconnect("eip155");
  } finally {
    setEthereumProvider(null);
  }
}
