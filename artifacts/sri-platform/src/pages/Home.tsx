import { Link } from "wouter";
import { motion } from "framer-motion";

const features = [
  {
    icon: "🤖",
    title: "Your Personal AI Tutor",
    desc: "Our AI learns how you think and adjusts every lesson just for you. No two students get exactly the same experience.",
    color: "border-primary/30 hover:border-primary/60",
    glow: "glow-red",
    tag: "Smart Learning",
    tagColor: "bg-primary/15 text-primary",
  },
  {
    icon: "🛡️",
    title: "Always Safe",
    desc: "Every response from our AI is checked before you see it. We make sure the content is always helpful, kind, and age-appropriate.",
    color: "border-secondary/30 hover:border-secondary/60",
    glow: "glow-purple",
    tag: "100% Safe",
    tagColor: "bg-secondary/15 text-secondary",
  },
  {
    icon: "🌍",
    title: "Learn From Anywhere",
    desc: "Whether you're at home, at school, or on the move — SRI Learn works on any device, in any country, at any time.",
    color: "border-accent/30 hover:border-accent/60",
    glow: "glow-brown",
    tag: "Global Access",
    tagColor: "bg-accent/15 text-accent",
  },
];

const steps = [
  { num: "01", title: "Tell us about yourself", desc: "Answer a few quick questions about your age, interests, and how you like to learn. It only takes a minute!", icon: "✏️" },
  { num: "02", title: "Get your personal plan", desc: "Our AI creates a learning plan that's built just for you — with topics you'll love and goals you can actually reach.", icon: "📋" },
  { num: "03", title: "Start learning and growing", desc: "Jump into lessons, earn rewards, track your progress, and celebrate every win — big or small.", icon: "🚀" },
];

const audiences = [
  {
    emoji: "🎓",
    who: "Students",
    headline: "Make learning fun again",
    points: ["Learn at your own speed", "Pick topics you're curious about", "Earn points and badges", "Get help whenever you're stuck"],
    href: "/login/student",
    cta: "I'm a Student",
    color: "border-primary/30",
    btnColor: "bg-primary hover:bg-primary/90 text-white glow-red",
  },
  {
    emoji: "🏠",
    who: "Families",
    headline: "Stay close to your child's progress",
    points: ["See what your child is learning", "Set daily learning goals", "Get weekly progress reports", "Chat with teachers anytime"],
    href: "/login/parent",
    cta: "I'm a Parent",
    color: "border-secondary/30",
    btnColor: "bg-secondary hover:bg-secondary/90 text-white glow-purple",
  },
  {
    emoji: "🏫",
    who: "Schools",
    headline: "Upgrade your whole classroom",
    points: ["Manage all students in one place", "Create your own curriculum", "Track class-wide progress", "Connect families and teachers"],
    href: "/login/school",
    cta: "I'm an Educator",
    color: "border-accent/30",
    btnColor: "bg-accent hover:bg-accent/90 text-white glow-brown",
  },
];

const stats = [
  { value: "240M+", label: "Children without access to quality education" },
  { value: "150+", label: "Countries where families homeschool" },
  { value: "3×",   label: "Better learning outcomes with personalised AI" },
  { value: "100%", label: "Safe content, every single time" },
];

export default function Home() {
  return (
    <div className="overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary text-sm font-bold px-5 py-2 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              The Future of Home Learning — Now Available
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-none tracking-tight">
            <span className="text-foreground">Learn Smarter.</span>
            <br />
            <span className="grad-red-purple">Grow Faster.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            SRI Learn is an AI-powered education platform that gives every student
            a <strong className="text-foreground">personalised learning experience</strong> — safe, fun, and built around them.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/login"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-black text-lg px-10 py-4 rounded-2xl shadow-xl glow-red transition-all duration-200 hover:scale-105">
              Start Learning Free →
            </Link>
            <Link href="/architecture"
              className="w-full sm:w-auto border border-border/80 hover:border-secondary/60 text-foreground font-bold text-lg px-10 py-4 rounded-2xl transition-all duration-200 hover:bg-white/5">
              See How It Works
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="bg-card/60 border border-border/60 rounded-2xl p-5 text-center backdrop-blur-sm">
                <p className="text-3xl font-black text-primary mb-1">{s.value}</p>
                <p className="text-xs text-muted-foreground leading-snug">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              Everything a learner needs
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              SRI Learn was built from the ground up to make every student feel seen, supported, and excited to learn.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <div className={`h-full bg-card border-2 ${f.color} rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:${f.glow} group cursor-default`}>
                  <div className="text-5xl mb-5">{f.icon}</div>
                  <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${f.tagColor} mb-4 inline-block`}>
                    {f.tag}
                  </span>
                  <h3 className="text-xl font-black text-foreground mb-3">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              Up and running in minutes
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              Getting started with SRI Learn is simple — no setup, no complicated steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary/40 to-transparent -z-10" />
                )}
                <div className="bg-card border border-border/60 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-3xl">{s.icon}</span>
                    <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full">{s.num}</span>
                  </div>
                  <h3 className="text-xl font-black text-foreground mb-3">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              Made for everyone
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              Whether you're a student, a parent, or a teacher — SRI Learn has a place for you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {audiences.map((a, i) => (
              <motion.div key={a.who} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className={`h-full bg-card border-2 ${a.color} rounded-2xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1`}>
                  <div className="text-5xl mb-4">{a.emoji}</div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{a.who}</p>
                  <h3 className="text-2xl font-black text-foreground mb-5">{a.headline}</h3>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {a.points.map(p => (
                      <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link href={a.href}
                    className={`w-full py-3.5 rounded-xl font-black text-sm text-center transition-all duration-200 hover:scale-105 ${a.btnColor}`}>
                    {a.cta} →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative bg-card border border-primary/30 rounded-3xl p-12 text-center overflow-hidden glow-red">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
            <div className="relative">
              <div className="text-5xl mb-6">🎉</div>
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
                Ready to start your<br />
                <span className="grad-red-purple">learning adventure?</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
                Join thousands of students who are already discovering how amazing learning can be.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login"
                  className="bg-primary hover:bg-primary/90 text-white font-black text-lg px-10 py-4 rounded-2xl glow-red transition-all hover:scale-105">
                  Start Learning Free →
                </Link>
                <Link href="/pitch"
                  className="border border-border/80 hover:border-secondary/60 text-foreground font-bold text-lg px-10 py-4 rounded-2xl transition-all hover:bg-white/5">
                  Learn About Our Mission
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
