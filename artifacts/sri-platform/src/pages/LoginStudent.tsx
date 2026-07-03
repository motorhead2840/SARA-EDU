import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function LoginStudent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  const avatarEmojis = ["🦁", "🐬", "🦋", "🚀", "🌙", "⭐", "🦊", "🐢"];

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-emerald-500 to-teal-500 flex-col justify-between p-12 overflow-hidden relative">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute bottom-20 -left-10 w-36 h-36 rounded-full bg-white/10" />

        <div className="relative z-10">
          <Link href="/login" className="flex items-center gap-2 text-emerald-100 hover:text-white transition-colors text-sm font-semibold mb-16">
            ← All Portals
          </Link>
          <div className="text-6xl mb-6">🎓</div>
          <h1 className="text-4xl font-extrabold text-white mb-4 leading-snug">
            Student<br />Learning<br />Portal
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed">
            Ready to explore, discover, and grow? Your next adventure is waiting. Let's make today's lessons amazing!
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: "🗺️", label: "Interactive lesson maps" },
            { icon: "🏆", label: "Earn badges & achievements" },
            { icon: "🤝", label: "Learn with study buddies" },
            { icon: "💡", label: "AI-guided learning quests" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="text-xl">{f.icon}</span>
              <span className="text-emerald-100 text-sm font-medium">{f.label}</span>
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
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
              <span>🎓</span> Student Portal
            </div>
            <h2 className="text-3xl font-extrabold text-stone-800 mb-2">Hey, learner! 👋</h2>
            <p className="text-stone-500 text-sm">Sign in to pick up where you left off.</p>
          </div>

          {/* Avatar picker (friendly touch for kids) */}
          <div className="mb-6">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Pick your avatar</p>
            <div className="flex gap-2 flex-wrap">
              {avatarEmojis.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-2 border-transparent hover:border-emerald-300 text-xl transition-all duration-150 hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="student-username" className="block text-sm font-bold text-stone-700 mb-1.5">
                Your username
              </label>
              <input
                id="student-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. starlion_42"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-emerald-400 focus:outline-none text-sm text-stone-800 placeholder:text-stone-300 transition-colors bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="student-password" className="block text-sm font-bold text-stone-700 mb-1.5">
                Password
              </label>
              <input
                id="student-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-emerald-400 focus:outline-none text-sm text-stone-800 placeholder:text-stone-300 transition-colors bg-stone-50 focus:bg-white"
              />
              <div className="flex justify-end mt-1.5">
                <a href="#" className="text-xs text-emerald-600 hover:underline font-semibold">
                  Forgot password? Ask a parent!
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Getting your learning space ready…
                </>
              ) : (
                "Start learning! 🚀"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-400 font-medium">or</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          {/* Class code */}
          <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Join with a class code</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter code e.g. LION-4821"
                className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 text-sm focus:border-emerald-400 focus:outline-none bg-white"
              />
              <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors">
                Join
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-stone-400 mt-6">
            New student?{" "}
            <a href="#" className="text-emerald-600 font-semibold hover:underline">
              Ask your parent or teacher to set up your account
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
