import { Link } from "wouter";
import { motion } from "framer-motion";

const portals = [
  {
    id: "school",
    href: "/login/school",
    icon: "🏫",
    title: "Schools",
    subtitle: "Educator Portal",
    desc: "Manage your students, build curriculum, and stay connected with families.",
    features: ["Manage all students", "Build your curriculum", "Track class progress", "Parent communication"],
    borderColor: "border-secondary/40 hover:border-secondary",
    iconBg: "bg-secondary/15",
    tagColor: "bg-secondary/15 text-secondary",
    dotColor: "bg-secondary",
    btnClass: "bg-secondary hover:bg-secondary/90 text-white glow-purple",
    glowClass: "hover:glow-purple",
  },
  {
    id: "parent",
    href: "/login/parent",
    icon: "🏠",
    title: "Parents",
    subtitle: "Family Portal",
    desc: "Follow your child's learning journey and celebrate every milestone together.",
    features: ["Daily progress updates", "Set learning goals", "Message teachers", "Weekly reports"],
    borderColor: "border-primary/40 hover:border-primary",
    iconBg: "bg-primary/15",
    tagColor: "bg-primary/15 text-primary",
    dotColor: "bg-primary",
    btnClass: "bg-primary hover:bg-primary/90 text-white glow-red",
    glowClass: "hover:glow-red",
  },
  {
    id: "student",
    href: "/login/student",
    icon: "🎓",
    title: "Students",
    subtitle: "Learner Portal",
    desc: "Start your learning adventure — explore, discover, and earn rewards along the way!",
    features: ["Personalised lessons", "Fun challenges", "Earn SARA tokens", "Global community"],
    borderColor: "border-accent/40 hover:border-accent",
    iconBg: "bg-accent/15",
    tagColor: "bg-accent/15 text-accent",
    dotColor: "bg-accent",
    btnClass: "bg-accent hover:bg-accent/90 text-white glow-brown",
    glowClass: "hover:glow-brown",
  },
];

export default function Login() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
        className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-black text-foreground mb-4">
          Welcome to <span className="grad-red-purple">SRI Learn</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
          Choose your portal to sign in and start your learning journey.
        </p>
      </motion.div>

      {/* Portal cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {portals.map((p, i) => (
          <motion.div key={p.id}
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.12 }}>
            <div className={`group h-full bg-card border-2 ${p.borderColor} ${p.glowClass} rounded-2xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1`}>
              {/* Badge row */}
              <div className="flex items-center justify-between mb-6">
                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${p.tagColor}`}>
                  {p.subtitle}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${p.dotColor} animate-pulse`} />
              </div>

              {/* Icon + title */}
              <div className={`w-14 h-14 ${p.iconBg} rounded-2xl flex items-center justify-center text-3xl mb-4`}>
                {p.icon}
              </div>
              <h2 className="text-3xl font-black text-foreground mb-2">{p.title}</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">{p.desc}</p>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <span className="text-primary">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={p.href}
                className={`w-full py-3.5 font-black text-sm text-center rounded-xl transition-all duration-200 hover:scale-105 ${p.btnClass}`}>
                Sign in as {p.id.charAt(0).toUpperCase() + p.id.slice(1)} →
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-center text-sm text-muted-foreground">
        New to SRI Learn?{" "}
        <a href="#" className="text-primary font-bold hover:underline">Request access</a>
        {" "}or contact your school administrator.
      </motion.p>
    </div>
  );
}
