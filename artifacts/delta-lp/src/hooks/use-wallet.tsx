import { createContext, useContext, useState, ReactNode } from 'react';

type WalletContextType = {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  return (
    <WalletContext.Provider 
      value={{ 
        connected, 
        connect: () => setConnected(true), 
        disconnect: () => setConnected(false) 
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
