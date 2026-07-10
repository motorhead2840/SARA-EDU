/**
 * Wallet provider detection utilities.
 * Handles EIP-5749 multi-provider arrays and single injected providers.
 */

import type { Eip1193Provider } from "ethers";

export interface EthereumProvider extends Eip1193Provider {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isBraveWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isRainbow?: boolean;
  isTrust?: boolean;
  providers?: EthereumProvider[];
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export type WalletId =
  | "metamask"
  | "coinbase"
  | "rabby"
  | "brave"
  | "rainbow"
  | "trust"
  | "walletconnect"
  | "browser";

export interface WalletConfig {
  id: WalletId;
  name: string;
  description: string;
  brandColor: string;
  bgColor: string;
  textColor: string;
  /** emoji fallback icon */
  emoji: string;
  installUrl: string;
  comingSoon?: boolean;
}

export const WALLET_CONFIGS: WalletConfig[] = [
  {
    id: "metamask",
    name: "MetaMask",
    description: "The most popular self-custody wallet",
    brandColor: "#F6851B",
    bgColor: "#FFF3E8",
    textColor: "#F6851B",
    emoji: "🦊",
    installUrl: "https://metamask.io/download/",
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    description: "Connect using Coinbase Wallet app or extension",
    brandColor: "#1B5FFE",
    bgColor: "#EEF3FF",
    textColor: "#1B5FFE",
    emoji: "🔵",
    installUrl: "https://www.coinbase.com/wallet/downloads",
  },
  {
    id: "rabby",
    name: "Rabby Wallet",
    description: "Security-first wallet for DeFi users",
    brandColor: "#7B3FE4",
    bgColor: "#F3EEFF",
    textColor: "#7B3FE4",
    emoji: "🐇",
    installUrl: "https://rabby.io/",
  },
  {
    id: "brave",
    name: "Brave Wallet",
    description: "Built-in wallet for Brave browser",
    brandColor: "#FB542B",
    bgColor: "#FFF0EB",
    textColor: "#FB542B",
    emoji: "🦁",
    installUrl: "https://brave.com/download/",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    description: "A fun, simple, and secure Ethereum wallet",
    brandColor: "#0E76FD",
    bgColor: "#F0F7FF",
    textColor: "#0E76FD",
    emoji: "🌈",
    installUrl: "https://rainbow.me/download",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    description: "Multi-chain wallet by Binance",
    brandColor: "#3375BB",
    bgColor: "#EEF4FF",
    textColor: "#3375BB",
    emoji: "🛡️",
    installUrl: "https://trustwallet.com/download",
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    description: "Scan with any compatible mobile wallet",
    brandColor: "#3B99FC",
    bgColor: "#EEF7FF",
    textColor: "#3B99FC",
    emoji: "📱",
    installUrl: "https://walletconnect.com/",
    comingSoon: true,
  },
];

/** Return all candidate providers (handles EIP-5749 multi-provider arrays) */
export function getAllProviders(): EthereumProvider[] {
  const win = window as Window & { ethereum?: EthereumProvider; coinbaseWalletExtension?: EthereumProvider };
  if (!win.ethereum) return [];
  if (Array.isArray(win.ethereum.providers) && win.ethereum.providers.length > 0) {
    return win.ethereum.providers;
  }
  return [win.ethereum];
}

/** Detect which wallets are installed and return provider instances */
export function detectInstalledWallets(): Map<WalletId, EthereumProvider> {
  const win = window as Window & { ethereum?: EthereumProvider; coinbaseWalletExtension?: EthereumProvider };
  const result = new Map<WalletId, EthereumProvider>();
  const providers = getAllProviders();

  for (const p of providers) {
    if (p.isRabby) result.set("rabby", p);
    else if (p.isBraveWallet) result.set("brave", p);
    else if (p.isCoinbaseWallet) result.set("coinbase", p);
    else if (p.isRainbow) result.set("rainbow", p);
    else if (p.isTrust) result.set("trust", p);
    else if (p.isMetaMask) result.set("metamask", p);
  }

  // Coinbase extension may live under a separate key
  if (!result.has("coinbase") && win.coinbaseWalletExtension) {
    result.set("coinbase", win.coinbaseWalletExtension);
  }

  // If nothing specific was detected but window.ethereum exists, tag as generic browser wallet
  if (result.size === 0 && win.ethereum) {
    result.set("browser", win.ethereum);
  }

  return result;
}

export function getWalletConfig(id: WalletId): WalletConfig {
  return (
    WALLET_CONFIGS.find((w) => w.id === id) ?? {
      id: "browser",
      name: "Browser Wallet",
      description: "Use your browser's built-in wallet",
      brandColor: "#6B7280",
      bgColor: "#F3F4F6",
      textColor: "#6B7280",
      emoji: "🌐",
      installUrl: "",
    }
  );
}
