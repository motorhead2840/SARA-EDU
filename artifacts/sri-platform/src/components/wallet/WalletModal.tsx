import { useEffect, useRef } from "react";
import { X, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useWalletContext } from "@/context/WalletContext";
import {
  WALLET_CONFIGS,
  detectInstalledWallets,
  type WalletId,
} from "@/lib/walletProviders";

/* ── Wallet brand SVG logos ──────────────────────────────────────────────── */

function MetaMaskIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#FFF3E8" />
      <path d="M33 8L22.5 15.5L24.5 11L33 8Z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 8L17.4 15.6L15.5 11L7 8Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M29.1 26.5L26.3 30.8L32.4 32.5L34.2 26.6L29.1 26.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.8 26.6L7.6 32.5L13.7 30.8L10.9 26.5L5.8 26.6Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.4 19.2L11.7 21.8L17.7 22.1L17.5 15.6L13.4 19.2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M26.6 19.2L22.4 15.5L22.3 22.1L28.3 21.8L26.6 19.2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.7 30.8L17.3 29L14.2 26.6L13.7 30.8Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22.7 29L26.3 30.8L25.8 26.6L22.7 29Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CoinbaseIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#1B5FFE" />
      <circle cx="20" cy="20" r="10" fill="white" />
      <rect x="15" y="17.5" width="10" height="5" rx="2.5" fill="#1B5FFE" />
    </svg>
  );
}

function RabbyIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#F3EEFF" />
      <ellipse cx="20" cy="22" rx="9" ry="8" fill="#7B3FE4" />
      <ellipse cx="14" cy="14" rx="4" ry="5.5" fill="#7B3FE4" />
      <ellipse cx="26" cy="14" rx="4" ry="5.5" fill="#7B3FE4" />
      <circle cx="16.5" cy="21" r="1.5" fill="white" />
      <circle cx="23.5" cy="21" r="1.5" fill="white" />
      <path d="M17 25.5 Q20 27.5 23 25.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function BraveIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#FB542B" />
      <path d="M20 8L28 13V22C28 26.4 24.4 29.9 20 32C15.6 29.9 12 26.4 12 22V13L20 8Z" fill="white" fillOpacity="0.9" />
      <path d="M20 12L24.5 14.8V21C24.5 23.8 22.5 26.2 20 27.5C17.5 26.2 15.5 23.8 15.5 21V14.8L20 12Z" fill="#FB542B" />
    </svg>
  );
}

function RainbowIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#174299" />
      <path d="M8 26C8 18.3 14.3 12 22 12H32C32 19.7 25.7 26 18 26H8Z" fill="url(#rb)" />
      <defs>
        <linearGradient id="rb" x1="8" y1="19" x2="32" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="25%" stopColor="#FFD93D" />
          <stop offset="50%" stopColor="#6BCB77" />
          <stop offset="75%" stopColor="#4D96FF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function TrustIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#3375BB" />
      <path d="M20 9L29 13V21C29 26 25 30 20 32C15 30 11 26 11 21V13L20 9Z" fill="white" fillOpacity="0.15" />
      <path d="M20 11.5L27.5 15V21C27.5 25.4 24.1 29 20 30.5C15.9 29 12.5 25.4 12.5 21V15L20 11.5Z" fill="white" />
      <path d="M16 21L18.5 23.5L24 18" stroke="#3375BB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletConnectIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#3B99FC" />
      <path d="M12.5 17.5C16.6 13.4 23.4 13.4 27.5 17.5L28 18C28.3 18.3 28.3 18.8 28 19.1L26.5 20.6C26.3 20.8 26 20.8 25.8 20.6L25.1 19.9C22.3 17.1 17.7 17.1 14.9 19.9L14.2 20.6C14 20.8 13.7 20.8 13.5 20.6L12 19.1C11.7 18.8 11.7 18.3 12 18L12.5 17.5Z" fill="white" />
      <path d="M29.5 21L31 22.5C31.3 22.8 31.3 23.3 31 23.6L24 30.6C23.7 30.9 23.2 30.9 22.9 30.6L18 25.7C17.9 25.6 17.7 25.6 17.6 25.7L12.7 30.6C12.4 30.9 11.9 30.9 11.6 30.6L4.6 23.6C4.3 23.3 4.3 22.8 4.6 22.5L6.1 21C6.4 20.7 6.9 20.7 7.2 21L12.1 25.9C12.2 26 12.4 26 12.5 25.9L17.4 21C17.7 20.7 18.2 20.7 18.5 21L23.4 25.9C23.5 26 23.7 26 23.8 25.9L28.7 21C29 20.7 29.5 20.7 29.8 21H29.5Z" fill="white" />
    </svg>
  );
}

const WALLET_ICONS: Record<WalletId | "browser", React.FC> = {
  metamask: MetaMaskIcon,
  coinbase: CoinbaseIcon,
  rabby: RabbyIcon,
  brave: BraveIcon,
  rainbow: RainbowIcon,
  trust: TrustIcon,
  walletconnect: WalletConnectIcon,
  browser: () => (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#F3F4F6" />
      <circle cx="20" cy="20" r="9" stroke="#6B7280" strokeWidth="1.5" fill="none" />
      <path d="M20 11C20 11 16 15 16 20C16 25 20 29 20 29" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 11C20 11 24 15 24 20C24 25 20 29 20 29" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 20H29" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

/* ── Main Modal ──────────────────────────────────────────────────────────── */

export function WalletModal() {
  const { wallet, isModalOpen, closeModal } = useWalletContext();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeModal]);

  // Lock body scroll
  useEffect(() => {
    if (isModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const installed = detectInstalledWallets();
  const isConnecting = wallet.status === "connecting";

  const handleConnect = async (id: WalletId | "browser") => {
    const cfg = WALLET_CONFIGS.find(w => w.id === id);
    if (cfg?.comingSoon) return;
    const provider = installed.get(id as WalletId);
    if (!provider) {
      if (cfg?.installUrl) window.open(cfg.installUrl, "_blank", "noopener");
      return;
    }
    const name = cfg?.name ?? "Browser Wallet";
    const ok = await wallet.connectWith(provider, name);
    if (ok) closeModal();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(15,15,26,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) closeModal(); }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ fontFamily: "'Inter', sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#0F0F1A]">Connect a Wallet</h2>
              <p className="text-sm text-[#6B7280] mt-0.5">Choose your preferred wallet to continue</p>
            </div>
            <button
              onClick={closeModal}
              aria-label="Close wallet modal"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Error state */}
          {wallet.status === "error" && wallet.errorMessage && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{wallet.errorMessage}</p>
            </div>
          )}

          {/* Wrong network */}
          {wallet.status === "wrong_network" && (
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-amber-800 mb-1">Wrong Network</p>
              <p className="text-xs text-amber-700 mb-2">Switch to Ethereum Sepolia to use SARA tokens.</p>
              <button
                onClick={wallet.switchToSepolia}
                className="text-xs font-bold text-amber-800 underline hover:no-underline"
              >
                Switch Network →
              </button>
            </div>
          )}
        </div>

        {/* Connected state */}
        {wallet.status === "connected" && wallet.address ? (
          <div className="px-6 py-6">
            <div className="flex items-center gap-4 mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-[#4040FF] flex items-center justify-center text-white font-black text-sm shrink-0">
                {wallet.shortAddress?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-mono text-sm font-bold text-[#0F0F1A] truncate">{wallet.shortAddress}</p>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {wallet.walletType ?? "Connected"}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">Sepolia Testnet · {wallet.ethBalance} ETH</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(wallet.address!)}
                className="w-full py-3 text-sm font-semibold text-[#0F0F1A] bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Copy Address
              </button>
              <a
                href={`https://sepolia.etherscan.io/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 text-sm font-semibold text-[#4040FF] bg-[#4040FF]/5 hover:bg-[#4040FF]/10 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                View on Etherscan <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => { wallet.disconnect(); closeModal(); }}
                className="w-full py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        ) : (
          /* Wallet list */
          <div className="px-4 py-4 max-h-[420px] overflow-y-auto">
            <div className="grid grid-cols-1 gap-2">
              {/* Generic browser wallet — shown when an unrecognised injected provider is present */}
              {installed.has("browser") && (
                <button
                  onClick={() => handleConnect("browser")}
                  disabled={isConnecting}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all border-gray-200 hover:border-[#4040FF]/40 hover:bg-[#4040FF]/5 active:scale-[0.99] bg-white ${isConnecting && wallet.walletType === "Browser Wallet" ? "border-[#4040FF] bg-[#4040FF]/5" : ""}`}
                >
                  <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden">
                    <WALLET_ICONS.browser />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0F0F1A]">Browser Wallet</span>
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Detected</span>
                    </div>
                    <p className="text-xs text-[#9CA3AF]">Use your browser's built-in wallet extension</p>
                  </div>
                  <div className="shrink-0">
                    {isConnecting && wallet.walletType === "Browser Wallet"
                      ? <Loader2 className="w-4 h-4 text-[#4040FF] animate-spin" />
                      : <div className="w-2 h-2 rounded-full bg-green-400" />}
                  </div>
                </button>
              )}

              {WALLET_CONFIGS.map((cfg) => {
                const isInstalled = installed.has(cfg.id as WalletId);
                const Icon = WALLET_ICONS[cfg.id as WalletId] ?? WALLET_ICONS.browser;
                const isActive = isConnecting && wallet.walletType === cfg.name;

                return (
                  <button
                    key={cfg.id}
                    onClick={() => handleConnect(cfg.id as WalletId)}
                    disabled={isConnecting || cfg.comingSoon}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all
                      ${cfg.comingSoon
                        ? "opacity-50 cursor-not-allowed border-gray-100 bg-gray-50"
                        : isInstalled
                          ? "border-gray-200 hover:border-[#4040FF]/40 hover:bg-[#4040FF]/5 active:scale-[0.99] cursor-pointer bg-white"
                          : "border-dashed border-gray-200 hover:border-gray-300 bg-gray-50/50 cursor-pointer"
                      }
                      ${isActive ? "border-[#4040FF] bg-[#4040FF]/5" : ""}
                    `}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden">
                      <Icon />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F0F1A]">{cfg.name}</span>
                        {cfg.comingSoon && (
                          <span className="text-[10px] font-bold text-[#6B7280] bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Soon
                          </span>
                        )}
                        {isInstalled && !cfg.comingSoon && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Detected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9CA3AF] truncate">{cfg.description}</p>
                    </div>

                    {/* Right side */}
                    <div className="shrink-0">
                      {isActive ? (
                        <Loader2 className="w-4 h-4 text-[#4040FF] animate-spin" />
                      ) : cfg.comingSoon ? null : isInstalled ? (
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                      ) : (
                        <span className="text-[11px] font-semibold text-[#4040FF] flex items-center gap-1">
                          Install <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <p className="text-[11px] text-[#9CA3AF] text-center leading-relaxed">
            By connecting a wallet you agree to our{" "}
            <a href="#" className="underline hover:text-[#6B7280] transition-colors">Terms of Service</a>.{" "}
            New to wallets?{" "}
            <a href="https://ethereum.org/en/wallets/" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#6B7280] transition-colors">
              Learn more →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
