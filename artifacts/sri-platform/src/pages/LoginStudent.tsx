import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function LoginStudent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [classCode, setClassCode] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  const avatarEmojis = ["🦁", "🐬", "🦋", "🚀", "🌙", "⭐", "🦊", "🐢"];

  const features = [
    { icon: "🗺️", label: "Interactive lesson maps" },
    { icon: "🏆", label: "Earn badges & achievements" },
    { icon: "🤝", label: "Learn with study buddies" },
    { icon: "💡", label: "AI-guided learning quests" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent to-[#431407]" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative z-10">
          <Link href="/login" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-bold mb-16">
            ← All Portals
          </Link>
          <div className="text-6xl mb-6">🎓</div>
          <h1 className="text-4xl font-black text-white mb-4 leading-snug">
            Student<br />Learner<br />Portal
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Ready to explore and discover? Your next learning adventure is waiting for you!
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

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }} className="w-full max-w-md">

          <Link href="/login" className="lg:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 font-bold transition-colors">
            ← All Portals
          </Link>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-accent/15 text-accent text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
              🎓 Student Portal
            </div>
            <h2 className="text-3xl font-black text-foreground mb-2">Hey, learner! 👋</h2>
            <p className="text-muted-foreground text-sm">Sign in and pick up where you left off.</p>
          </div>

          {/* Avatar picker */}
          <div className="mb-6">
            <p className="text-xs font-black text-muted-foreground/60 uppercase tracking-widest mb-3">Pick your avatar</p>
            <div className="flex gap-2 flex-wrap">
              {avatarEmojis.map((emoji, i) => (
                <button key={i} type="button" onClick={() => setSelectedAvatar(i)}
                  className={`w-11 h-11 rounded-xl text-xl transition-all duration-150 hover:scale-110 border-2 ${
                    selectedAvatar === i
                      ? "bg-accent/20 border-accent scale-110"
                      : "bg-muted border-transparent hover:border-accent/40"
                  }`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="student-username" className="block text-sm font-bold text-foreground mb-1.5">Your username</label>
              <input id="student-username" type="text" autoComplete="username" value={username}
                onChange={e => setUsername(e.target.value)} placeholder="e.g. starlion_42" required
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border/60 focus:border-accent/70 focus:outline-none text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors" />
            </div>

            <div>
              <label htmlFor="student-password" className="block text-sm font-bold text-foreground mb-1.5">Password</label>
              <input id="student-password" type="password" autoComplete="current-password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border/60 focus:border-accent/70 focus:outline-none text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors" />
              <div className="flex justify-end mt-1.5">
                <a href="#" className="text-xs text-accent hover:underline font-bold">Forgot password? Ask a parent!</a>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-black text-sm transition-all glow-brown disabled:opacity-60 flex items-center justify-center gap-2 hover:scale-[1.02]">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Getting your space ready…</>
              ) : "Start learning! 🚀"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground font-medium">or join with a code</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <div className="rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 p-4">
            <p className="text-xs font-black text-accent uppercase tracking-widest mb-3">Join with a class code</p>
            <div className="flex gap-2">
              <input type="text" value={classCode} onChange={e => setClassCode(e.target.value)}
                placeholder="Enter code e.g. LION-4821"
                className="flex-1 px-3 py-2.5 rounded-xl border border-border/60 bg-muted text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent/60 focus:outline-none transition-colors" />
              <button className="px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-black rounded-xl transition-all hover:scale-105 glow-brown">
                Join
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            New student?{" "}
            <a href="#" className="text-accent font-bold hover:underline">Ask your parent or teacher to create your account</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
