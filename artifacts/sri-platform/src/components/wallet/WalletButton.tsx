import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { useWalletContext } from "@/context/WalletContext";

interface WalletButtonProps {
  className?: string;
  variant?: "dark" | "light" | "outline";
}

const MENU_ITEMS = ["copy", "etherscan", "disconnect"] as const;
type MenuItem = typeof MENU_ITEMS[number];

export function WalletButton({ className = "", variant = "dark" }: WalletButtonProps) {
  const { wallet, openModal } = useWalletContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focusedItem, setFocusedItem] = useState<number>(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const isConnected = wallet.status === "connected" && wallet.address;
  const isConnecting = wallet.status === "connecting";

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setFocusedItem(-1);
    triggerRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, closeMenu]);

  // Focus first item when menu opens
  useEffect(() => {
    if (menuOpen && focusedItem === -1) {
      setFocusedItem(0);
    }
  }, [menuOpen]);

  // Move focus to the focused item
  useEffect(() => {
    if (menuOpen && focusedItem >= 0) {
      itemRefs.current[focusedItem]?.focus();
    }
  }, [menuOpen, focusedItem]);

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (!menuOpen) return;
    if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedItem(i => Math.min(i + 1, MENU_ITEMS.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocusedItem(i => Math.max(i - 1, 0)); return; }
    if (e.key === "Tab") { closeMenu(); }
  };

  const copyAddress = () => {
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseStyles = {
    dark: "bg-[#0F0F1A] hover:bg-black text-white",
    light: "bg-white hover:bg-gray-50 text-[#0F0F1A] border border-[#E5E7EB]",
    outline: "bg-transparent hover:bg-white/10 text-white border border-white/30",
  }[variant];

  if (isConnected) {
    return (
      <div className="relative" onKeyDown={handleMenuKeyDown}>
        <button
          ref={triggerRef}
          onClick={() => setMenuOpen(v => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Wallet connected: ${wallet.shortAddress}. Click to open options.`}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all ${baseStyles} ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
          <span className="font-mono">{wallet.shortAddress}</span>
          <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${menuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Wallet options"
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header (non-interactive) */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-[#4040FF] flex items-center justify-center text-white font-black text-[10px]" aria-hidden="true">
                  {wallet.shortAddress?.slice(0, 2).toUpperCase()}
                </div>
                <p className="font-mono text-sm font-bold text-[#0F0F1A] truncate flex-1">{wallet.shortAddress}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span className="flex items-center gap-1 font-semibold text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
                  {wallet.walletType ?? "Connected"}
                </span>
                <span aria-hidden="true">·</span>
                <span>{wallet.ethBalance} ETH</span>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-2">
              <button
                role="menuitem"
                ref={el => { itemRefs.current[0] = el; }}
                onClick={() => { copyAddress(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#374151] hover:bg-gray-50 transition-colors text-left focus:outline-none focus:bg-gray-100"
              >
                <Copy className="w-4 h-4 text-[#6B7280]" aria-hidden="true" />
                {copied ? "Copied!" : "Copy Address"}
              </button>

              <a
                role="menuitem"
                ref={el => { itemRefs.current[1] = el; }}
                href={`https://sepolia.etherscan.io/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#374151] hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                <ExternalLink className="w-4 h-4 text-[#6B7280]" aria-hidden="true" />
                View on Etherscan
              </a>

              <div className="my-1.5 border-t border-gray-100" role="separator" />

              <button
                role="menuitem"
                ref={el => { itemRefs.current[2] = el; }}
                onClick={() => { wallet.disconnect(); closeMenu(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left focus:outline-none focus:bg-red-50"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={openModal}
      disabled={isConnecting}
      aria-label={isConnecting ? "Connecting wallet…" : "Connect a wallet"}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-wait ${baseStyles} ${className}`}
    >
      {isConnecting ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" aria-hidden="true" />
          Connecting…
        </>
      ) : (
        <>
          <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
          CONNECT WALLET
        </>
      )}
    </button>
  );
}
