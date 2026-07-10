import { motion } from "framer-motion";
import { Link } from "wouter";

const values = [
  {
    icon: "🧒",
    title: "Every Child Is Different",
    desc: "No two students learn in exactly the same way. Some learn best by reading, some by doing, some by watching. SRI Learn adapts to all of them.",
    color: "border-primary/40",
    iconBg: "bg-primary/15",
  },
  {
    icon: "💪",
    title: "Confidence Before Content",
    desc: "Before we teach anything, we make sure you feel ready to learn. A student who feels confident absorbs knowledge far more effectively.",
    color: "border-secondary/40",
    iconBg: "bg-secondary/15",
  },
  {
    icon: "🎯",
    title: "Purpose-Driven Learning",
    desc: "Students learn best when they understand why something matters. Every lesson connects to real life, real goals, and real curiosity.",
    color: "border-accent/40",
    iconBg: "bg-accent/15",
  },
];

const teacherRoles = [
  {
    role: "Supporter",
    icon: "🤗",
    what: "When you first start, the AI is warm and gentle — giving you space to settle in and explore without any pressure.",
  },
  {
    role: "Guide",
    icon: "🗺️",
    what: "As you grow in confidence, the AI starts to challenge you more — introducing new ideas, asking harder questions, and pushing your thinking.",
  },
  {
    role: "Partner",
    icon: "🤝",
    what: "At the highest level, the AI becomes your creative partner — helping you tackle your own projects and real-world challenges.",
  },
];

const safetyPillars = [
  { icon: "🔒", title: "Private Data", desc: "Your personal information is encrypted. We never share it with advertisers." },
  { icon: "👁️", title: "Parental Visibility", desc: "Parents can see every conversation and lesson at any time." },
  { icon: "🚦", title: "Content Filtering", desc: "All AI responses go through a safety check before reaching you." },
  { icon: "🧠", title: "Emotional Awareness", desc: "The AI notices if you seem upset or stressed, and adjusts its approach." },
];

const milestones = [
  { year: "2024", label: "Research begins", desc: "Our team started studying what actually helps students learn best." },
  { year: "2025", label: "Platform built", desc: "We built and tested SRI Learn with hundreds of families worldwide." },
  { year: "2026", label: "Global launch", desc: "SRI Learn opens to students everywhere. The journey begins." },
  { year: "2027+", label: "What's next", desc: "New languages, more subjects, and deeper AI personalisation." },
];

export default function Blueprint() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-24">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/25 text-accent text-sm font-bold px-5 py-2 rounded-full mb-8">
          🗺️ Our Plan for Education
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-foreground mb-6">
          Our <span className="grad-red-purple">Approach</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          We didn't just build an app. We rethought education from the ground up —
          asking what students actually need to truly succeed.
        </p>
      </motion.div>

      {/* Core values */}
      <section className="mb-20">
        <h2 className="text-3xl font-black text-foreground text-center mb-10">What we believe in</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className={`h-full bg-card border-2 ${v.color} rounded-2xl p-8 transition-all hover:-translate-y-1 duration-300`}>
                <div className={`w-14 h-14 ${v.iconBg} rounded-2xl flex items-center justify-center text-3xl mb-5`}>
                  {v.icon}
                </div>
                <h3 className="text-xl font-black text-foreground mb-3">{v.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI as teacher — three modes */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="mb-20">
        <h2 className="text-3xl font-black text-foreground text-center mb-4">
          Our AI changes with you
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          A great teacher doesn't act the same way with every student, or even with the same student over time.
          Our AI has three different modes depending on where you are in your journey.
        </p>
        <div className="grid md:grid-cols-3 gap-1 bg-border/40 rounded-2xl overflow-hidden">
          {teacherRoles.map((t, i) => (
            <div key={t.role}
              className={`bg-card p-8 ${i === 1 ? "border-x border-border/60" : ""}`}>
              <div className="text-4xl mb-4">{t.icon}</div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Mode {i + 1}</p>
              <h3 className="text-xl font-black text-foreground mb-3">{t.role}</h3>
              <p className="text-muted-foreground leading-relaxed">{t.what}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Safety */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="mb-20">
        <div className="bg-card border border-secondary/30 rounded-2xl p-10 glow-purple relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
          <h2 className="text-3xl font-black text-foreground mb-3">Safety is not an afterthought</h2>
          <p className="text-muted-foreground mb-8 max-w-xl">
            We built safety into the foundation of SRI Learn — not added it on top. Every part of the platform
            was designed with students' wellbeing in mind.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {safetyPillars.map(s => (
              <div key={s.title} className="bg-card/60 border border-border/60 rounded-xl p-5">
                <div className="text-3xl mb-3">{s.icon}</div>
                <h4 className="font-black text-foreground mb-1">{s.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Timeline */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="mb-20">
        <h2 className="text-3xl font-black text-foreground text-center mb-10">Our journey</h2>
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-accent" />
          <div className="space-y-6 pl-20">
            {milestones.map((m, i) => (
              <motion.div key={m.year} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="relative bg-card border border-border/60 rounded-2xl p-6">
                <div className="absolute -left-14 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary border-4 border-background flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-primary font-black text-lg shrink-0">{m.year}</span>
                  <div>
                    <h3 className="font-black text-foreground mb-1">{m.label}</h3>
                    <p className="text-sm text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-card border border-primary/30 rounded-3xl p-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
        <h2 className="text-3xl font-black text-foreground mb-3">Want to be part of this?</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Join us as we build the future of education — one student at a time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login"
            className="bg-primary hover:bg-primary/90 text-white font-black text-lg px-10 py-4 rounded-2xl glow-red transition-all hover:scale-105">
            Get Started Free →
          </Link>
          <Link href="/pitch"
            className="border border-border/80 hover:border-secondary/60 text-foreground font-bold text-lg px-10 py-4 rounded-2xl transition-all hover:bg-white/5">
            Our Mission
          </Link>
        </div>
      </motion.div>

    </div>
  );
}
