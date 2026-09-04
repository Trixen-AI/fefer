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
  type EthereumListener,
  type EthereumProvider,
} from "@/lib/ethereum";

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
  switchNetwork: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType | null>(null);

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
    if (!provider) return;

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
      setError("Wallet EVM tidak terdeteksi.");
      return;
    }

    try {
      setError(null);
      await switchProviderNetwork(provider);
      setChainId(
        getChainId(await provider.request({ method: "eth_chainId" })),
      );
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
          ? "Network switch dibatalkan."
          : "Network gagal dipilih.",
      );
      await syncWallet();
    }
  }, [syncWallet, address]);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError("Wallet EVM tidak terdeteksi.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      const nextAccounts = Array.isArray(accounts) ? accounts : [];
      setAddress(typeof nextAccounts[0] === "string" ? nextAccounts[0] : null);

      const currentChain = getChainId(
        await provider.request({ method: "eth_chainId" }),
      );
      setChainId(currentChain);

      if (
        isRobinhoodChainConfigured &&
        robinhoodChain.chainId !== null &&
        currentChain !== robinhoodChain.chainId
      ) {
        await switchProviderNetwork(provider);
        setChainId(
          getChainId(await provider.request({ method: "eth_chainId" })),
        );
      }

      if (
        isRobinhoodChainConfigured &&
        robinhoodChain.chainId !== null &&
        (currentChain === robinhoodChain.chainId ||
          (await provider.request({ method: "eth_chainId" })) ===
            toChainIdHex(robinhoodChain.chainId))
      ) {
        try {
          const balance = await provider.request({
            method: "eth_getBalance",
            params: [nextAccounts[0], "latest"],
          });
          setNativeBalance(formatNativeBalance(balance));
        } catch {
          setNativeBalance(null);
        }
      }
    } catch (connectError) {
      const code = getErrorCode(connectError);
      setError(
        code === 4001
          ? "Koneksi wallet dibatalkan."
          : "Wallet gagal terhubung.",
      );
      await syncWallet();
    } finally {
      setIsConnecting(false);
    }
  }, [syncWallet]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setNativeBalance(null);
    setError(null);
  }, []);

  useEffect(() => {
    void syncWallet();
    const provider = getProvider();
    if (!provider?.on) return;

    const handleAccountsChanged: EthereumListener = () => {
      void syncWallet();
    };
    const handleChainChanged: EthereumListener = () => {
      void syncWallet();
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [syncWallet]);

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