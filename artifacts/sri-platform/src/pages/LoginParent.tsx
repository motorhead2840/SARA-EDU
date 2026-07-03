import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function LoginParent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-amber-400 to-yellow-400 flex-col justify-between p-12">
        <div>
          <Link href="/login" className="flex items-center gap-2 text-amber-900/70 hover:text-amber-900 transition-colors text-sm font-semibold mb-16">
            ← All Portals
          </Link>
          <div className="text-6xl mb-6">🏠</div>
          <h1 className="text-4xl font-extrabold text-amber-900 mb-4 leading-snug">
            Parent &<br />Family<br />Portal
          </h1>
          <p className="text-amber-800 text-lg leading-relaxed">
            Be part of your child's learning story. Set goals, track milestones, and stay connected with their teachers every step of the way.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: "🗓️", label: "Weekly learning schedules" },
            { icon: "📈", label: "Live progress milestones" },
            { icon: "💌", label: "Direct teacher messaging" },
            { icon: "👨‍👩‍👧", label: "Multi-child family support" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="text-xl">{f.icon}</span>
              <span className="text-amber-800 text-sm font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile back link */}
          <Link href="/login" className="lg:hidden flex items-center gap-1 text-sm text-stone-400 hover:text-stone-700 mb-6 font-semibold transition-colors">
            ← All Portals
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
              <span>🏠</span> Parent Portal
            </div>
            <h2 className="text-3xl font-extrabold text-stone-800 mb-2">Welcome back</h2>
            <p className="text-stone-500 text-sm">Sign in to see how your family's learning is progressing.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="parent-email" className="block text-sm font-bold text-stone-700 mb-1.5">
                Your email
              </label>
              <input
                id="parent-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@family.com"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm text-stone-800 placeholder:text-stone-300 transition-colors bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="parent-password" className="block text-sm font-bold text-stone-700 mb-1.5">
                Password
              </label>
              <input
                id="parent-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm text-stone-800 placeholder:text-stone-300 transition-colors bg-stone-50 focus:bg-white"
              />
              <div className="flex justify-end mt-1.5">
                <a href="#" className="text-xs text-amber-600 hover:underline font-semibold">
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold text-sm transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-amber-900/30 border-t-amber-900 rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in to Family Portal →"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-400 font-medium">or</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          {/* SSO */}
          <button className="w-full py-3 rounded-xl border-2 border-stone-200 hover:border-stone-300 text-stone-600 font-semibold text-sm transition-all duration-200 hover:bg-stone-50 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-stone-400 mt-8">
            First time here?{" "}
            <a href="#" className="text-amber-600 font-semibold hover:underline">
              Create a family account
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
