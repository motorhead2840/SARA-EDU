import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function LoginSchool() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  const features = [
    { icon: "📊", label: "Real-time student dashboards" },
    { icon: "📋", label: "Curriculum management tools" },
    { icon: "💬", label: "Parent–teacher communication" },
    { icon: "🔒", label: "Secure multi-admin access" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-secondary/90 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-[#3b0f6e] opacity-90" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative z-10">
          <Link href="/login" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-bold mb-16">
            ← All Portals
          </Link>
          <div className="text-6xl mb-6">🏫</div>
          <h1 className="text-4xl font-black text-white mb-4 leading-snug">
            School<br />Educator<br />Portal
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Manage your institution, coordinate with families, and track every student's progress.
          </p>
        </div>
        <div className="relative z-10 space-y-4">
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="text-xl">{f.icon}</span>
              <span className="text-white/70 text-sm font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }} className="w-full max-w-md">

          <Link href="/login" className="lg:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 font-bold transition-colors">
            ← All Portals
          </Link>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-secondary/15 text-secondary text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
              🏫 School Portal
            </div>
            <h2 className="text-3xl font-black text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Sign in with your institution credentials.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="school-email" className="block text-sm font-bold text-foreground mb-1.5">School email</label>
              <input id="school-email" type="email" autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="admin@yourschool.edu" required
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border/60 focus:border-secondary/70 focus:outline-none text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors" />
            </div>

            <div>
              <label htmlFor="school-password" className="block text-sm font-bold text-foreground mb-1.5">Password</label>
              <input id="school-password" type="password" autoComplete="current-password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border/60 focus:border-secondary/70 focus:outline-none text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors" />
              <div className="flex justify-end mt-1.5">
                <a href="#" className="text-xs text-secondary hover:underline font-bold">Forgot password?</a>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-sm transition-all glow-purple disabled:opacity-60 flex items-center justify-center gap-2 hover:scale-[1.02]">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
              ) : "Sign in to School Portal →"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground font-medium">or</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <button className="w-full py-3 rounded-xl border border-border/60 hover:border-border text-foreground font-bold text-sm transition-all hover:bg-white/5 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Not registered?{" "}
            <a href="#" className="text-secondary font-bold hover:underline">Request institution access</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
