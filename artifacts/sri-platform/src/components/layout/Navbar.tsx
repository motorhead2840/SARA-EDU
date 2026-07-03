import { Link, useLocation } from "wouter";
import { useState } from "react";

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: { href: string; label: string; accent?: boolean }[] = [
    { href: "/", label: "Home" },
    { href: "/architecture", label: "Architecture" },
    { href: "/pedagogy", label: "Pedagogy" },
    { href: "/blueprint", label: "Blueprint" },
    { href: "/pitch", label: "Pitch" },
    { href: "/token", label: "SARA Token", accent: true },
    { href: "/abhaya", label: "Abhaya Gate", accent: true },
  ];

  const isLoginPage = location.startsWith("/login");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E8E0D0] shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shadow-sm">
            <span className="font-serif text-sm font-bold text-amber-900">S</span>
          </div>
          <span className="font-sans text-lg font-800 text-foreground tracking-tight">
            SRI <span className="text-amber-500 font-semibold">Learn</span>
          </span>
        </Link>

        {/* Desktop nav */}
        {!isLoginPage && (
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors duration-200 ${
                  link.accent
                    ? location === link.href
                      ? "text-violet-600 font-bold"
                      : "text-violet-500 hover:text-violet-700"
                    : location === link.href
                    ? "text-amber-500"
                    : "text-stone-500 hover:text-stone-800"
                }`}
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isLoginPage ? (
            <Link
              href="/"
              className="text-sm font-semibold text-stone-500 hover:text-stone-800 transition-colors"
            >
              ← Back to home
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-stone-100"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold text-sm px-4 py-2 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
              >
                Get Started
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          {!isLoginPage && (
            <button
              className="md:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <div className="w-5 h-0.5 bg-stone-600 mb-1 transition-all" />
              <div className="w-5 h-0.5 bg-stone-600 mb-1 transition-all" />
              <div className="w-5 h-0.5 bg-stone-600 transition-all" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && !isLoginPage && (
        <div className="md:hidden bg-white border-t border-stone-100 px-6 py-4 flex flex-col gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`text-sm font-semibold py-1.5 transition-colors ${
                location === link.href ? "text-amber-500" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-stone-100">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block text-center bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold text-sm px-4 py-2 rounded-xl"
            >
              Sign In / Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
