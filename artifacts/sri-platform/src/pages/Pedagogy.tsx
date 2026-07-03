import { motion } from "framer-motion";
import { Link } from "wouter";

const stages = [
  {
    num: "Stage 1",
    icon: "🌱",
    title: "Getting Comfortable",
    subtitle: "Building a Safe Foundation",
    color: "border-primary/40",
    iconBg: "bg-primary/15",
    tagColor: "bg-primary/15 text-primary",
    desc: "Before any real learning can happen, a student needs to feel safe, seen, and not judged. This stage is all about settling in.",
    whatHappens: [
      "No pressure to perform right away",
      "The AI introduces itself gently — like a friendly guide",
      "You explore topics at your own pace",
      "There are no wrong answers in this stage — only discoveries",
    ],
    insight: "Research shows that students who feel emotionally safe learn up to 3× faster. This isn't just a nice idea — it's the science of how brains learn best.",
  },
  {
    num: "Stage 2",
    icon: "🔍",
    title: "Finding What You Love",
    subtitle: "Building Curiosity and Confidence",
    color: "border-secondary/40",
    iconBg: "bg-secondary/15",
    tagColor: "bg-secondary/15 text-secondary",
    desc: "Once you feel settled, the magic begins. You start to discover what makes you curious, what questions you want to ask, and what you're naturally good at.",
    whatHappens: [
      "The AI presents a wide range of topics to explore",
      "Your interests guide the direction of your lessons",
      "Challenges grow as your confidence grows",
      "You start setting your own goals",
    ],
    insight: "Traditional schools often skip this stage entirely — they push content before students know why they should care. SRI Learn does it differently.",
  },
  {
    num: "Stage 3",
    icon: "🚀",
    title: "Taking the Lead",
    subtitle: "Independent, Deep Learning",
    color: "border-accent/40",
    iconBg: "bg-accent/15",
    tagColor: "bg-accent/15 text-accent",
    desc: "The final stage is where real growth happens. You become an active, independent learner — setting your own goals, pursuing deep interests, and helping others.",
    whatHappens: [
      "You design your own learning projects",
      "AI becomes a collaborator, not just a teacher",
      "You connect with other learners globally",
      "You earn recognition and share your work",
    ],
    insight: "This is the stage most students never reach in traditional school. At SRI Learn, it's the destination we're always working towards.",
  },
];

const principles = [
  { icon: "💬", title: "Talk, Don't Test", desc: "We learn through conversation, not multiple-choice exams. Our AI engages you in dialogue — asking questions, listening, adapting." },
  { icon: "🎯", title: "Goals You Choose", desc: "You decide what you want to achieve. The AI helps you get there — but the direction is always yours." },
  { icon: "🤲", title: "Mistakes Are Welcome", desc: "Getting something wrong is how you learn. We never penalise mistakes — we use them as stepping stones." },
  { icon: "🌱", title: "Growth Over Grades", desc: "We track how much you've grown, not just what score you got. Progress is personal." },
  { icon: "🌍", title: "Real-World Connection", desc: "Lessons are connected to real things happening in the world — making learning feel meaningful, not abstract." },
  { icon: "👨‍👩‍👧", title: "Family Involved", desc: "Parents and teachers aren't left out. They get regular updates and can join the journey at any time." },
];

export default function Pedagogy() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-24">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary text-sm font-bold px-5 py-2 rounded-full mb-8">
          📚 Our Teaching Philosophy
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-foreground mb-6">
          How We Help<br />
          <span className="grad-red-purple">You Grow</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          SRI Learn isn't just an app — it's a completely new way of thinking about education.
          Every student goes through three stages of growth, at their own pace.
        </p>
      </motion.div>

      {/* Opening quote */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-card border border-secondary/30 rounded-2xl p-10 mb-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary rounded-l-2xl" />
        <p className="text-2xl md:text-3xl font-black text-foreground leading-relaxed mb-4">
          "The problem with education isn't what we teach — it's that we never ask if the student is ready to learn it."
        </p>
        <p className="text-muted-foreground font-semibold">— The SRI Learn Teaching Team</p>
      </motion.div>

      {/* Three stages */}
      <div className="space-y-8 mb-24">
        <h2 className="text-3xl font-black text-foreground text-center mb-10">The Three Stages of Learning</h2>
        {stages.map((s, i) => (
          <motion.div key={s.num} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <div className={`bg-card border-2 ${s.color} rounded-2xl p-8 md:p-10`}>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/2">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-14 h-14 ${s.iconBg} rounded-2xl flex items-center justify-center text-3xl`}>
                      {s.icon}
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${s.tagColor}`}>
                        {s.num}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{s.subtitle}</p>
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-foreground mb-4">{s.title}</h2>
                  <p className="text-muted-foreground leading-relaxed text-lg mb-6">{s.desc}</p>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm text-foreground/80 leading-relaxed italic">💡 {s.insight}</p>
                  </div>
                </div>
                <div className="md:w-1/2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">What happens in this stage</p>
                  <ul className="space-y-3">
                    {s.whatHappens.map(w => (
                      <li key={w} className="flex items-start gap-3 text-foreground/80">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0 mt-0.5">✓</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Principles */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-20">
        <h2 className="text-3xl font-black text-foreground text-center mb-10">Our core beliefs about learning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {principles.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="bg-card border border-border/60 rounded-2xl p-7 hover:border-primary/40 transition-colors">
              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="text-lg font-black text-foreground mb-2">{p.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-card border border-secondary/30 rounded-3xl p-10 text-center glow-purple relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
        <h2 className="text-3xl font-black text-foreground mb-3">Ready to start Stage 1?</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          It all starts with feeling comfortable. Sign up and take your first step — completely free, no pressure.
        </p>
        <Link href="/login"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-black text-lg px-10 py-4 rounded-2xl glow-red transition-all hover:scale-105">
          Begin My Journey →
        </Link>
      </motion.div>

    </div>
  );
}
