import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  isRobinhoodChainConfigured,
  robinhoodChain,
  toChainIdHex,
} from "@/config/network";
import {
  getEthereumProvider,
  getWalletErrorMessage,
  type EthereumProvider,
} from "@/lib/ethereum";
import {
  disconnectWalletModal,
  openAccountModal,
  isReownConfigured,
  onAppKitAccountChange,
  openWalletModal,
} from "@/lib/appkit";

type WalletContextType = {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  nativeBalance: string | null;
  wrongNetwork: boolean;
  onTargetNetwork: boolean;
  isConnecting: boolean;
  error: string | null;
  networkName: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  openAccount: () => Promise<void>;
  switchNetwork: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType | null>(null);

// Reown AppKit is the only connection path. Nothing here reads window.ethereum,
// so no wallet extension is prompted until the user opens the modal.
function getProvider() {
  return getEthereumProvider();
}

function getChainId(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 16);
  return Number.isInteger(parsed) ? parsed : null;
}

function formatNativeBalance(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("0x")) return null;

  try {
    const wei = BigInt(value);
    const whole = wei / 10n ** 18n;
    const fraction = (wei % 10n ** 18n)
      .toString()
      .padStart(18, "0")
      .slice(0, 6)
      .replace(/0+$/, "");
    return fraction ? `${whole}.${fraction}` : whole.toString();
  } catch {
    return null;
  }
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : null;
  }
  return null;
}

async function switchProviderNetwork(provider: EthereumProvider) {
  if (!isRobinhoodChainConfigured || robinhoodChain.chainId === null) {
    throw new Error("Robinhood Chain configuration is not available.");
  }

  const chainId = toChainIdHex(robinhoodChain.chainId);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    if (getErrorCode(error) !== 4902) throw error;

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: robinhoodChain.chainName,
          nativeCurrency: robinhoodChain.nativeCurrency,
          rpcUrls: [robinhoodChain.rpcUrl],
          blockExplorerUrls: [robinhoodChain.explorerUrl],
        },
      ],
    });
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncWallet = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setAddress(null);
      setChainId(null);
      setNativeBalance(null);
      return;
    }

    const [accounts, currentChain] = await Promise.all([
      provider.request({ method: "eth_accounts" }),
      provider.request({ method: "eth_chainId" }),
    ]);

    const nextAccounts = Array.isArray(accounts) ? accounts : [];
    const nextAddress =
      typeof nextAccounts[0] === "string" ? nextAccounts[0] : null;
    const nextChainId = getChainId(currentChain);
    setAddress(nextAddress);
    setChainId(nextChainId);

    if (
      nextAddress &&
      isRobinhoodChainConfigured &&
      nextChainId === robinhoodChain.chainId
    ) {
      try {
        const balance = await provider.request({
          method: "eth_getBalance",
          params: [nextAddress, "latest"],
        });
        setNativeBalance(formatNativeBalance(balance));
      } catch {
        setNativeBalance(null);
      }
    } else {
      setNativeBalance(null);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError("Connect a wallet before switching networks.");
      return;
    }

    try {
      setError(null);
      await switchProviderNetwork(provider);
      setChainId(getChainId(await provider.request({ method: "eth_chainId" })));
      if (address) {
        try {
          const balance = await provider.request({
            method: "eth_getBalance",
            params: [address, "latest"],
          });
          setNativeBalance(formatNativeBalance(balance));
        } catch {
          setNativeBalance(null);
        }
      }
    } catch (switchError) {
      const code = getErrorCode(switchError);
      setError(
        code === 4001
          ? "The network switch request was cancelled in your wallet."
          : "Robinhood Chain could not be selected in your wallet.",
      );
      await syncWallet();
    }
  }, [address, syncWallet]);

  const connect = useCallback(async () => {
    if (!isReownConfigured) {
      setError(
        "WalletConnect is not configured: set VITE_REOWN_PROJECT_ID to your Reown project id.",
      );
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Loads the SDK and opens the picker, only ever from this click.
      await openWalletModal();
      await syncWallet();
    } catch (cause) {
      setError(
        getWalletErrorMessage(
          cause,
          "The wallet could not be connected. Please try again.",
        ),
      );
    } finally {
      setIsConnecting(false);
    }
  }, [syncWallet]);

  // Opens AppKit's account panel instead of tearing the session down on one
  // click. The user disconnects from inside the modal if that is what they want.
  const openAccount = useCallback(async () => {
    try {
      await openAccountModal();
    } catch {
      setError("The wallet panel could not be opened. Please try again.");
    }
  }, []);

  const disconnect = useCallback(() => {
    void disconnectWalletModal();
    setAddress(null);
    setChainId(null);
    setNativeBalance(null);
    setError(null);
  }, []);

  // The AppKit session is the single source of truth: it fires on connect,
  // disconnect, account switch and chain switch.
  useEffect(() => onAppKitAccountChange(() => void syncWallet()), [syncWallet]);

  const connected = Boolean(address);
  const onTargetNetwork =
    connected &&
    isRobinhoodChainConfigured &&
    chainId === robinhoodChain.chainId;

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        chainId,
        nativeBalance,
        wrongNetwork: connected && !onTargetNetwork,
        onTargetNetwork,
        isConnecting,
        error,
        networkName: robinhoodChain.chainName,
        connect,
        disconnect,
        openAccount,
        switchNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
