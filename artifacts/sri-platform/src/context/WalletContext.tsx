import { createContext, useContext, useState, ReactNode } from "react";
import { useWallet, type WalletState } from "@/hooks/useWallet";

interface WalletContextType {
  wallet: WalletState;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used inside <WalletProvider>");
  return ctx;
}
