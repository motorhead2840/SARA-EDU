import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";

const portals = [
  {
    id: "school",
    href: "/login/school",
    emoji: "🏫",
    title: "Schools",
    subtitle: "Institution Portal",
    description: "Manage curriculum, track student cohorts, and coordinate with families — all in one place.",
    features: ["Cohort management", "Curriculum builder", "Parent communication", "Progress analytics"],
    bg: "from-blue-50 to-sky-50",
    border: "border-blue-200 hover:border-blue-400",
    badge: "bg-blue-100 text-blue-700",
    btn: "bg-blue-500 hover:bg-blue-600 text-white",
    accent: "text-blue-600",
    ring: "focus-visible:ring-blue-400",
    iconBg: "bg-blue-100",
  },
  {
    id: "parent",
    href: "/login/parent",
    emoji: "🏠",
    title: "Parents",
    subtitle: "Family Portal",
    description: "Guide your child's learning journey, track milestones, and connect with their teachers.",
    features: ["Learning roadmap", "Daily schedule", "Teacher messaging", "Progress reports"],
    bg: "from-amber-50 to-yellow-50",
    border: "border-amber-200 hover:border-amber-400",
    badge: "bg-amber-100 text-amber-700",
    btn: "bg-amber-400 hover:bg-amber-500 text-amber-900",
    accent: "text-amber-600",
    ring: "focus-visible:ring-amber-400",
    iconBg: "bg-amber-100",
  },
  {
    id: "student",
    href: "/login/student",
    emoji: "🎓",
    title: "Students",
    subtitle: "Learner Portal",
    description: "Start your learning adventure! Explore lessons, complete quests, and celebrate your growth.",
    features: ["Interactive lessons", "Learning quests", "Achievements", "Study buddy chat"],
    bg: "from-emerald-50 to-green-50",
    border: "border-emerald-200 hover:border-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    btn: "bg-emerald-500 hover:bg-emerald-600 text-white",
    accent: "text-emerald-600",
    ring: "focus-visible:ring-emerald-400",
    iconBg: "bg-emerald-100",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0 },
};

export default function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-sky-50 flex flex-col">
      {/* Hero header */}
      <div className="pt-24 pb-12 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Globe emoji cluster */}
          <div className="flex justify-center gap-3 mb-6 text-4xl">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>🌍</span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>📚</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>🌟</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-stone-800 mb-4 leading-tight">
            Welcome to{" "}
            <span className="text-amber-500">SRI Learn</span>
          </h1>
          <p className="text-lg text-stone-500 max-w-xl mx-auto leading-relaxed">
            Your global home-learning platform. Choose your portal to get started.
          </p>
        </motion.div>
      </div>

      {/* Portal cards */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 pb-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {portals.map((p) => (
            <motion.div key={p.id} variants={cardVariants}>
              <div
                className={`group relative rounded-2xl border-2 bg-gradient-to-br ${p.bg} ${p.border} p-7 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full flex flex-col focus-within:ring-2 focus-within:ring-offset-2`}
              >
                {/* Badge */}
                <div className="flex items-center justify-between mb-5">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${p.badge}`}>
                    {p.subtitle}
                  </span>
                </div>

                {/* Icon + Title */}
                <div className={`w-14 h-14 rounded-2xl ${p.iconBg} flex items-center justify-center text-3xl mb-4 shadow-sm`}>
                  {p.emoji}
                </div>
                <h2 className={`text-2xl font-extrabold ${p.accent} mb-2`}>{p.title}</h2>
                <p className="text-sm text-stone-600 leading-relaxed mb-5">{p.description}</p>

                {/* Features */}
                <ul className="space-y-1.5 mb-7 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-stone-600">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.accent.replace("text-", "bg-")} flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA — single interactive element, full card is navigated via this link */}
                <Link
                  href={p.href}
                  className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-all duration-200 shadow-sm group-hover:shadow-md ${p.btn}`}
                >
                  Sign in as {p.title.slice(0, -1)} →
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-sm text-stone-400 mt-10"
        >
          New to SRI Learn?{" "}
          <a href="#" className="text-amber-500 font-semibold hover:underline">
            Request access
          </a>{" "}
          or contact your school administrator.
        </motion.p>
      </div>
    </div>
  );
}
