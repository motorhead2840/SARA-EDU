import { motion } from "framer-motion";
import { Link } from "wouter";

const problems = [
  {
    stat: "240M+",
    label: "Children worldwide have no access to quality education",
    icon: "📉",
    color: "border-primary/40 bg-primary/5",
    statColor: "text-primary",
  },
  {
    stat: "65%",
    label: "Of students say school doesn't match how they learn",
    icon: "😔",
    color: "border-secondary/40 bg-secondary/5",
    statColor: "text-secondary",
  },
  {
    stat: "$400B",
    label: "Spent on education technology — yet outcomes haven't improved",
    icon: "💸",
    color: "border-accent/40 bg-accent/5",
    statColor: "text-accent",
  },
];

const theses = [
  {
    num: "I",
    icon: "🎯",
    title: "The Right Moment to Act",
    color: "border-primary/40",
    tagColor: "bg-primary/15 text-primary",
    points: [
      "AI is now powerful enough to truly personalise learning",
      "Families are actively looking for better alternatives to traditional school",
      "The homeschooling market has grown 400% since 2020",
      "No platform has yet solved the safety + personalisation combination",
    ],
  },
  {
    num: "II",
    icon: "🚀",
    title: "What Makes SRI Learn Different",
    color: "border-secondary/40",
    tagColor: "bg-secondary/15 text-secondary",
    points: [
      "Every student gets a unique, adapting learning experience",
      "Built-in AI Safety Guardian protects students at all times",
      "Works for home-learners, schools, and hybrid setups",
      "Designed for global scale from day one",
    ],
  },
  {
    num: "III",
    icon: "📈",
    title: "A Huge Opportunity",
    color: "border-accent/40",
    tagColor: "bg-accent/15 text-accent",
    points: [
      "$400B global EdTech market, growing at 15% per year",
      "150+ countries with significant homeschooling communities",
      "SARA token creates a built-in network effect and community",
      "Recurring subscription model with low churn",
    ],
  },
];

const metrics = [
  { label: "Market Size", value: "$400B", sub: "Global EdTech market" },
  { label: "Growth Rate", value: "15%/yr", sub: "Compound annual growth" },
  { label: "Target Families", value: "50M+", sub: "Homeschooling worldwide" },
  { label: "Countries", value: "150+", sub: "Active homeschooling markets" },
];

const team = [
  { name: "Learning Scientists", count: "5+", icon: "🧪", desc: "Researchers in child development and AI-assisted education" },
  { name: "AI Engineers", count: "8+", icon: "🤖", desc: "Building safe, personalised learning systems" },
  { name: "Educators", count: "12+", icon: "🏫", desc: "Former teachers and curriculum specialists" },
  { name: "Families", count: "500+", icon: "🏠", desc: "Beta testers who shaped the product" },
];

const roadmap = [
  { phase: "Phase 1", title: "Platform Launch", items: ["Core AI tutor", "Safety Guardian", "Student, Parent, School portals"], status: "Now" },
  { phase: "Phase 2", title: "Community & Rewards", items: ["SARA reward tokens", "Global student community", "Achievement system"], status: "Mid 2026" },
  { phase: "Phase 3", title: "Global Scale", items: ["10+ languages", "Live tutoring sessions", "School partnership programme"], status: "2027" },
];

export default function Pitch() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-24">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary text-sm font-bold px-5 py-2 rounded-full mb-8">
          🌍 Our Mission
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-foreground mb-6">
          Every child deserves<br />
          <span className="grad-red-purple">a great education</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          We believe the biggest problem in education isn't a lack of content — it's that learning
          has never been personalised at scale. Until now.
        </p>
      </motion.div>

      {/* Problem stats */}
      <section className="mb-20">
        <h2 className="text-3xl font-black text-foreground text-center mb-10">The problem is real</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <motion.div key={p.label} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className={`h-full bg-card border-2 ${p.color} rounded-2xl p-8 text-center`}>
                <div className="text-4xl mb-4">{p.icon}</div>
                <p className={`text-5xl font-black mb-3 ${p.statColor}`}>{p.stat}</p>
                <p className="text-muted-foreground leading-relaxed">{p.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why invest — three theses */}
      <section className="mb-20">
        <h2 className="text-3xl font-black text-foreground text-center mb-10">Why SRI Learn</h2>
        <div className="space-y-6">
          {theses.map((t, i) => (
            <motion.div key={t.num} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className={`bg-card border-2 ${t.color} rounded-2xl p-8`}>
                <div className="flex items-start gap-5">
                  <div className="text-4xl shrink-0">{t.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${t.tagColor}`}>
                        Thesis {t.num}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-foreground mb-4">{t.title}</h3>
                    <ul className="grid sm:grid-cols-2 gap-2.5">
                      {t.points.map(pt => (
                        <li key={pt} className="flex items-start gap-2.5 text-muted-foreground">
                          <span className="text-primary mt-0.5 shrink-0">✓</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Market metrics */}
      <section className="mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="bg-card border border-border/60 rounded-2xl p-6 text-center">
              <p className="text-3xl font-black text-primary mb-2">{m.value}</p>
              <p className="font-black text-foreground text-sm mb-1">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mb-20">
        <h2 className="text-3xl font-black text-foreground text-center mb-10">Who built this</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {team.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="bg-card border border-border/60 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">{t.icon}</div>
              <p className="text-3xl font-black text-secondary mb-1">{t.count}</p>
              <h4 className="font-black text-foreground text-sm mb-2">{t.name}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section className="mb-20">
        <h2 className="text-3xl font-black text-foreground text-center mb-10">What's coming</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {roadmap.map((r, i) => (
            <motion.div key={r.phase} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className={`h-full bg-card border-2 ${i === 0 ? "border-primary/50" : "border-border/60"} rounded-2xl p-8`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{r.phase}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${i === 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {r.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-foreground mb-4">{r.title}</h3>
                <ul className="space-y-2.5">
                  {r.items.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="text-primary shrink-0">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-card border border-primary/30 rounded-3xl p-12 text-center glow-red relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
        <h2 className="text-4xl font-black text-foreground mb-4">
          Join us in reshaping<br />
          <span className="grad-red-purple">education for everyone</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-10 text-lg">
          Whether you're a parent, a teacher, an investor, or a student — there's a place for you in the SRI Learn story.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login"
            className="bg-primary hover:bg-primary/90 text-white font-black text-lg px-10 py-4 rounded-2xl glow-red transition-all hover:scale-105">
            Get Started Free →
          </Link>
          <a href="mailto:hello@srilearn.com"
            className="border border-border/80 hover:border-secondary/60 text-foreground font-bold text-lg px-10 py-4 rounded-2xl transition-all hover:bg-white/5">
            Contact Our Team
          </a>
        </div>
      </motion.div>

    </div>
  );
}
