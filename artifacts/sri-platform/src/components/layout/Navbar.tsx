import { Link, useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { href: "/",             label: "Home" },
  { href: "/architecture", label: "How It Works" },
  { href: "/pedagogy",     label: "Learning Methods" },
  { href: "/blueprint",    label: "Our Approach" },
  { href: "/pitch",        label: "Our Mission" },
  { href: "/token",        label: "Rewards" },
  { href: "/abhaya",       label: "Safety" },
];

export function Navbar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-5 flex items-center h-16 gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 mr-4">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md glow-red">
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'Poppins' }}>S</span>
          </div>
          <span className="font-bold text-lg text-foreground" style={{ fontFamily: 'Poppins' }}>
            SRI <span className="text-primary">Learn</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                location === l.href
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-3 ml-auto">
          <Link href="/login"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/login"
            className="bg-primary hover:bg-primary/90 text-white text-sm font-bold px-5 py-2 rounded-xl shadow-md glow-red transition-all duration-200 hover:scale-105">
            Get Started →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}
          className="lg:hidden ml-auto p-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-5 h-0.5 bg-foreground mb-1 transition-all" style={{ transform: open ? 'rotate(45deg) translateY(6px)' : 'none' }} />
          <div className="w-5 h-0.5 bg-foreground mb-1 transition-all" style={{ opacity: open ? 0 : 1 }} />
          <div className="w-5 h-0.5 bg-foreground transition-all" style={{ transform: open ? 'rotate(-45deg) translateY(-6px)' : 'none' }} />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="lg:hidden overflow-hidden border-t border-border/60 bg-background/98">
            <div className="p-4 flex flex-col gap-1">
              {links.map(l => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                  className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                    location === l.href
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}>
                  {l.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border/60 mt-2 flex flex-col gap-2">
                <Link href="/login" onClick={() => setOpen(false)}
                  className="w-full text-center py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors">
                  Get Started →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
