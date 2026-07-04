import { Link, useLocation } from "wouter";
import { useState } from "react";
import { ExternalLink, Menu, X, Zap } from "lucide-react";

const links = [
  { href: "/",               label: "Home" },
  { href: "/choose-path",    label: "Learn" },
  { href: "/knowledge-feed", label: "Feed" },
  { href: "/news-feed",      label: "News" },
  { href: "/pricing",        label: "Pricing" },
  { href: "/subscribe",      label: "Subscribe" },
  { href: "/abhaya",         label: "Safety" },
  { href: "/brag-sheet",     label: "Portfolio" },
];

export function Navbar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#EEF2FF]/90 backdrop-blur-xl border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-6 flex items-center h-16 gap-6">

        {/* Logo */}
        <Link href="/" className="shrink-0 font-black text-2xl tracking-tighter text-[#0F0F1A] mr-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          SRI.
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                location === l.href
                  ? "text-[#4040FF] bg-[#4040FF]/10 font-semibold"
                  : "text-[#6B7280] hover:text-[#0F0F1A] hover:bg-black/5"
              }`}>
              {l.label}
            </Link>
          ))}
          <a href="https://discord.gg" target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#6B7280] hover:text-[#0F0F1A] hover:bg-black/5 flex items-center gap-1 transition-colors">
            Community <ExternalLink className="w-3 h-3" />
          </a>
        </nav>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-3 ml-auto">
          <Link href="/login"
            className="text-sm font-medium text-[#6B7280] hover:text-[#0F0F1A] transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link href="/pricing"
            className="flex items-center gap-1.5 bg-[#0F0F1A] hover:bg-[#4040FF] text-white text-sm font-bold px-5 py-2 rounded-full transition-colors shadow-sm">
            <Zap className="w-3.5 h-3.5" /> Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="lg:hidden ml-auto p-2 rounded-lg hover:bg-black/5 transition-colors text-[#0F0F1A]"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-[#E5E7EB] bg-[#EEF2FF]/98">
          <div className="p-4 flex flex-col gap-1">
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  location === l.href
                    ? "bg-[#4040FF]/10 text-[#4040FF] font-semibold"
                    : "text-[#6B7280] hover:text-[#0F0F1A] hover:bg-black/5"
                }`}>
                {l.label}
              </Link>
            ))}
            <a href="https://discord.gg" target="_blank" rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="px-4 py-3 rounded-xl font-medium text-sm text-[#6B7280] hover:text-[#0F0F1A] hover:bg-black/5 flex items-center gap-1 transition-colors">
              Community <ExternalLink className="w-3 h-3" />
            </a>
            <div className="pt-3 border-t border-[#E5E7EB] mt-2 flex gap-2">
              <Link href="/login" onClick={() => setOpen(false)}
                className="flex-1 text-center py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-[#374151] hover:border-gray-400 transition-colors">
                Sign In
              </Link>
              <Link href="/pricing" onClick={() => setOpen(false)}
                className="flex-1 text-center py-3 rounded-xl bg-[#0F0F1A] text-white text-sm font-bold hover:bg-[#4040FF] transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
