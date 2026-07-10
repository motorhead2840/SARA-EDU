import { motion } from "framer-motion";
import { Link } from "wouter";

const pillars = [
  {
    num: "01",
    icon: "👂",
    title: "We Listen to You",
    subtitle: "Continuous Understanding",
    desc: "While you learn, the AI is paying close attention. It notices how quickly you answer, which questions are hard for you, and what topics make you light up. The more you use it, the better it understands you.",
    details: [
      "Tracks your learning pace in real time",
      "Remembers what you already know",
      "Spots when you're confused — before you even ask",
      "Updates your profile after every lesson",
    ],
    color: "border-primary/40",
    iconBg: "bg-primary/15",
    tagColor: "bg-primary/15 text-primary",
  },
  {
    num: "02",
    icon: "🔄",
    title: "Lessons That Adapt",
    subtitle: "Personalised Curriculum",
    desc: "No two students see exactly the same content. Your lessons are built on-the-fly based on what you know, what you're curious about, and the best way for you to learn something new.",
    details: [
      "Automatically adjusts difficulty",
      "Mixes formats — videos, quizzes, stories, activities",
      "Skips things you already know",
      "Revisits anything you found tricky",
    ],
    color: "border-secondary/40",
    iconBg: "bg-secondary/15",
    tagColor: "bg-secondary/15 text-secondary",
  },
  {
    num: "03",
    icon: "🛡️",
    title: "Safe at Every Step",
    subtitle: "Built-in Protection",
    desc: "Before anything reaches your screen, our safety system checks it. It ensures every message is kind, helpful, and appropriate for your age — so you can learn without worrying.",
    details: [
      "Every AI response is reviewed before you see it",
      "Flags anything that's off-topic or harmful",
      "Adapts content to your age group",
      "Parents and teachers can see full activity logs",
    ],
    color: "border-accent/40",
    iconBg: "bg-accent/15",
    tagColor: "bg-accent/15 text-accent",
  },
];

const techHighlights = [
  { icon: "⚡", title: "Lightning Fast", desc: "Responses in under a second, so you never wait" },
  { icon: "🔒", title: "Private by Design", desc: "Your data is encrypted and never sold" },
  { icon: "📱", title: "Works Everywhere", desc: "Phone, tablet, laptop — any device, any time" },
  { icon: "🌐", title: "Available Globally", desc: "Runs in 40+ regions worldwide for low latency" },
  { icon: "🤝", title: "Family Friendly", desc: "Parents stay informed with easy-to-read reports" },
  { icon: "🏆", title: "Proven Results", desc: "3× better outcomes vs traditional e-learning" },
];

export default function Architecture() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-24">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
        <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/25 text-secondary text-sm font-bold px-5 py-2 rounded-full mb-8">
          🧠 The Technology Behind SRI Learn
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-foreground mb-6">
          How <span className="grad-red-purple">SRI Learn</span> Works
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          We built something completely different. Most online learning apps give the same videos to every student.
          SRI Learn builds a unique experience around <strong className="text-foreground">each individual learner</strong>.
        </p>
      </motion.div>

      {/* Three pillars */}
      <div className="space-y-8 mb-24">
        {pillars.map((p, i) => (
          <motion.div key={p.num} initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.5 }}>
            <div className={`bg-card border-2 ${p.color} rounded-2xl p-8 md:p-10`}>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/2">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-14 h-14 ${p.iconBg} rounded-2xl flex items-center justify-center text-3xl`}>
                      {p.icon}
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${p.tagColor}`}>
                        Step {p.num}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{p.subtitle}</p>
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-foreground mb-4">{p.title}</h2>
                  <p className="text-muted-foreground leading-relaxed text-lg">{p.desc}</p>
                </div>
                <div className="md:w-1/2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">What this means for you</p>
                  <ul className="space-y-3">
                    {p.details.map(d => (
                      <li key={d} className="flex items-start gap-3 text-foreground/80">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0 mt-0.5">✓</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tech highlights grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="mb-20">
        <h2 className="text-3xl font-black text-foreground text-center mb-10">Built to last. Built to scale.</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {techHighlights.map((t, i) => (
            <motion.div key={t.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="bg-card border border-border/60 rounded-2xl p-6 hover:border-primary/40 transition-colors">
              <div className="text-3xl mb-3">{t.icon}</div>
              <h3 className="font-black text-foreground mb-1">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-card border border-primary/30 rounded-3xl p-10 text-center glow-red relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
        <h2 className="text-3xl font-black text-foreground mb-3">See it in action</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The best way to understand SRI Learn is to try it yourself. Create a free account and explore.
        </p>
        <Link href="/login"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-black text-lg px-10 py-4 rounded-2xl glow-red transition-all hover:scale-105">
          Try It Free →
        </Link>
      </motion.div>

    </div>
  );
}
