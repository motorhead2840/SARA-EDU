import { useState } from "react";
import { motion } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL ?? "";

interface AnalysisResult {
  safe: boolean;
  confidence: number;
  flags: string[];
  recommendation: string;
}

async function analyseText(text: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_URL}/api/abhaya/analyze/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

const howItWorks = [
  {
    icon: "📥",
    title: "Your message is sent",
    desc: "You type a question or chat with the AI — just like normal.",
    color: "border-primary/30",
  },
  {
    icon: "🔍",
    title: "Our safety system checks it",
    desc: "Before the AI replies, our Safety Guardian reviews the response to make sure it's helpful, kind, and age-appropriate.",
    color: "border-secondary/30",
  },
  {
    icon: "✅",
    title: "You get a safe reply",
    desc: "Only approved responses reach you. Anything that fails the check is rewritten or blocked automatically.",
    color: "border-accent/30",
  },
];

const protections = [
  { icon: "🚫", title: "No Harmful Content", desc: "Violence, hate speech, or inappropriate content is blocked before it reaches you." },
  { icon: "🧒", title: "Age-Appropriate", desc: "Responses are tuned to your age and learning level — always suitable." },
  { icon: "😊", title: "Kind and Positive", desc: "Our AI is trained to be encouraging, patient, and never rude or discouraging." },
  { icon: "🔒", title: "Private and Secure", desc: "Your conversations are encrypted. They're never shared or used for advertising." },
  { icon: "📊", title: "Parent Visibility", desc: "Parents can view all conversations and receive safety alerts if needed." },
  { icon: "🚨", title: "Instant Alerts", desc: "If the system detects a student is upset or in distress, it flags it for a trusted adult." },
];

export default function Abhaya() {
  const [tab, setTab] = useState<"about" | "test">("about");
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyse = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await analyseText(inputText);
      setResult(r);
    } catch {
      setError("Couldn't connect to the safety system right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-24">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <div className="w-20 h-20 bg-secondary/15 border border-secondary/30 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6 glow-purple">
          🛡️
        </div>
        <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/25 text-secondary text-sm font-bold px-5 py-2 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          Always On · Always Watching
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-foreground mb-6">
          AI <span className="grad-red-purple">Safety Guardian</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Every message, every lesson, every interaction on SRI Learn goes through our
          Safety Guardian — an AI system designed to protect students at every step.
        </p>
      </motion.div>

      {/* Tab switcher */}
      <div className="flex bg-card border border-border/60 rounded-2xl p-1.5 mb-10 max-w-sm mx-auto">
        {([["about", "About Safety"], ["test", "Try It Live"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === key
                ? "bg-secondary text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── About tab ─────────────────────────────────────────────────────── */}
      {tab === "about" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">

          {/* How it works */}
          <section>
            <h2 className="text-3xl font-black text-foreground mb-8 text-center">How it works</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {howItWorks.map((s, i) => (
                <div key={s.title} className={`bg-card border-2 ${s.color} rounded-2xl p-8 relative`}>
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-primary/15 text-primary text-sm font-black flex items-center justify-center">
                    {i + 1}
                  </div>
                  <h3 className="font-black text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* What we protect against */}
          <section>
            <h2 className="text-3xl font-black text-foreground mb-8 text-center">What we protect you from</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {protections.map((p, i) => (
                <motion.div key={p.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="bg-card border border-border/60 rounded-2xl p-6 hover:border-secondary/40 transition-colors">
                  <div className="text-3xl mb-3">{p.icon}</div>
                  <h4 className="font-black text-foreground mb-1 text-sm">{p.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Trust statement */}
          <div className="bg-card border border-primary/30 rounded-2xl p-10 text-center glow-red relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
            <div className="text-5xl mb-5">🤝</div>
            <h2 className="text-2xl font-black text-foreground mb-3">You have our word</h2>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              We know that parents need to trust the technology their children use. SRI Learn's Safety Guardian
              is always running — 24/7, with no exceptions. If it ever lets anything through that shouldn't be there,
              we want to know. Our commitment to your child's safety is absolute.
            </p>
          </div>

        </motion.div>
      )}

      {/* ── Live test tab ──────────────────────────────────────────────────── */}
      {tab === "test" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

          <div className="bg-card border border-secondary/30 rounded-2xl p-8">
            <h2 className="text-2xl font-black text-foreground mb-2">Test the Safety System</h2>
            <p className="text-muted-foreground mb-6">
              Type any message below and see how our Safety Guardian analyses it in real time.
              Try both friendly messages and tricky ones — see how it responds.
            </p>

            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type a message here — e.g. 'Can you help me with maths?' or try something inappropriate to see it blocked..."
              rows={4}
              className="w-full bg-muted border border-border/60 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-secondary/60 text-sm leading-relaxed mb-4"
            />

            <button onClick={handleAnalyse} disabled={!inputText.trim() || loading}
              className="w-full bg-secondary hover:bg-secondary/90 disabled:opacity-50 text-white font-black py-3.5 rounded-xl transition-all hover:scale-[1.02] glow-purple">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking safety…
                </span>
              ) : "Check This Message →"}
            </button>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 text-destructive font-semibold text-sm">
              ⚠ {error}
            </div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-8 border-2 ${result.safe ? "bg-card border-accent/50" : "bg-card border-primary/60"}`}>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${result.safe ? "bg-accent/20" : "bg-primary/15"}`}>
                  {result.safe ? "✅" : "🚫"}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-foreground">
                    {result.safe ? "This message is safe" : "This message was flagged"}
                  </h3>
                  <p className={`text-sm font-semibold ${result.safe ? "text-accent" : "text-primary"}`}>
                    Confidence: {Math.round(result.confidence * 100)}%
                  </p>
                </div>
              </div>

              <div className="bg-muted/60 border border-border/60 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Safety recommendation</p>
                <p className="text-foreground">{result.recommendation}</p>
              </div>

              {result.flags?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Issues found</p>
                  <div className="flex flex-wrap gap-2">
                    {result.flags.map(f => (
                      <span key={f} className="text-xs font-bold bg-primary/15 text-primary px-3 py-1.5 rounded-full border border-primary/30">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </motion.div>
      )}

    </div>
  );
}
