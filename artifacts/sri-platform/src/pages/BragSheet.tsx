import { Shield, CheckCircle2, Star, ThumbsUp, Wallet, ArrowUpRight, FileText, ExternalLink, UserPlus, Settings, Bot } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWalletContext } from "@/context/WalletContext";

const articles = [
  { title: "Attention Mechanisms in Biological Neural Networks", excerpt: "Exploring the parallels between transformer-based attention models and human biological mechanisms. We identify significant similarities in temporal processing that could inform more energy-efficient AI architectures.", tags: ["Neuroscience", "ML", "Research"], score: 97, votes: 142, date: "Oct 12, 2023" },
  { title: "Why AI Safety Needs Cognitive Science", excerpt: "A foundational piece arguing that alignment cannot be purely mathematical. It requires a deep integration of cognitive models to bridge the gap between machine optimization and human values.", tags: ["AI Ethics", "Neuroscience"], score: 92, votes: 89, date: "Sep 28, 2023" },
  { title: "The Hebbian Learning Paradox in Modern Transformers", excerpt: "Contrasting backpropagation with Hebbian plasticity. Can we achieve scalable learning without global error gradients? An analysis of recent local-learning architectures.", tags: ["ML", "Theory"], score: 89, votes: 64, date: "Aug 15, 2023" },
];

export default function BragSheet() {
  const { wallet, openModal } = useWalletContext();
  const isConnected = wallet.status === "connected" && wallet.address;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white pb-20" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Profile Header Banner */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="relative rounded-t-3xl overflow-visible bg-[#0F0F1A] h-[200px] flex flex-col justify-between p-6">
          <div className="flex justify-end gap-3 w-full">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors">
              <UserPlus className="w-4 h-4" /> Follow
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full text-white/80 text-sm font-medium hover:bg-white/10 transition-colors">
              <Settings className="w-4 h-4" /> Edit Profile
            </button>
          </div>

          <div className="absolute -bottom-12 left-8 flex items-end gap-6">
            <div className="w-24 h-24 rounded-full bg-[#4040FF] border-4 border-[#EEF2FF] flex items-center justify-center text-3xl text-white font-black shadow-lg">
              AK
            </div>
            <div className="pb-2">
              <h1 className="text-3xl text-white mb-1 font-black" style={{ fontFamily: "'Inter', sans-serif" }}>Aisha Kamara</h1>
              <p className="text-white/70 text-sm font-medium mb-3">Computational Neuroscience · MIT · Class of 2026</p>
              <div className="flex gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-[#4040FF]/20 text-[#4040FF] border border-[#4040FF]/30 rounded-full text-xs font-semibold">
                  🎓 Verified Academic
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 text-white/90 border border-white/20 rounded-full text-xs font-semibold">
                  <FileText className="w-3 h-3" /> 23 Articles
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white rounded-b-3xl rounded-tr-3xl shadow-md pt-16 pb-6 px-8 flex flex-wrap justify-between items-center gap-4 mb-8">
          {[
            { value: "23", label: "Published Articles", color: "text-[#0F0F1A]" },
            { value: "1,847", label: "Merit Votes Received", color: "text-[#0F0F1A]" },
            { value: "#142", label: "Global Rank", color: "text-[#4040FF]" },
          ].map((s) => (
            <div key={s.label} className="text-center flex-1 min-w-[100px]">
              <div className={`text-2xl font-black ${s.color}`} style={{ fontFamily: "'Inter', sans-serif" }}>{s.value}</div>
              <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT SIDEBAR */}
          <div className="w-full lg:w-[30%] space-y-6">

            {/* Credentials */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center gap-2 mb-4 text-[#0F0F1A]">
                <Shield className="w-5 h-5 text-[#4040FF]" />
                <h2 className="text-lg font-black" style={{ fontFamily: "'Inter', sans-serif" }}>Credentials</h2>
              </div>
              <ul className="space-y-4">
                {[
                  { name: "MIT — B.S. Neuroscience", sub: "Class of 2026 • Verified on-chain", verified: true },
                  { name: "Coursera", sub: "Deep Learning Specialization", verified: true },
                  { name: "SRI Learn", sub: "Advanced AI Safety Certificate", verified: true },
                  { name: "Harvard OCW", sub: "Justice (audited)", verified: false },
                ].map(c => (
                  <li key={c.name} className="flex items-start gap-3">
                    {c.verified
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border border-gray-300 mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-sm font-semibold text-[#0F0F1A]">{c.name}</p>
                      <p className="text-xs text-[#6B7280]">{c.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-[#4040FF] mt-5 hover:underline">
                <ExternalLink className="w-3 h-3" /> View on Etherscan
              </a>
            </div>

            {/* Expertise */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg text-[#0F0F1A] font-black mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {['Neuroscience', 'Machine Learning', 'AI Ethics', 'Python', 'Research Methods', 'Cognitive Science'].map(skill => (
                  <span key={skill} className="px-3 py-1.5 bg-gray-100 text-[#0F0F1A] text-xs font-medium rounded-lg">{skill}</span>
                ))}
              </div>
            </div>

            {/* SARA Wallet */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg text-[#0F0F1A] font-black" style={{ fontFamily: "'Inter', sans-serif" }}>SARA Rewards</h2>
                <Wallet className="w-5 h-5 text-gray-400" />
              </div>

              {isConnected ? (
                <>
                  <div className="text-3xl font-black text-[#4040FF] mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {wallet.saraBalance ?? "—"}
                  </div>
                  <p className="text-xs text-[#6B7280] font-medium mb-5">SARA Balance</p>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-[#6B7280] mb-1">ETH Balance</p>
                      <p className="font-bold text-sm text-[#0F0F1A]">{wallet.ethBalance ?? "—"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-[#6B7280] mb-1">Voting Power</p>
                      <p className="font-bold text-sm text-[#0F0F1A]">{wallet.votingPower ?? "—"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#9CA3AF] font-mono truncate mb-4">{wallet.shortAddress}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-[#4040FF] hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">View Token</button>
                    <button onClick={wallet.disconnect} className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#6B7280] text-xs font-semibold py-2 rounded-lg transition-colors">Disconnect</button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-[#4040FF]/10 flex items-center justify-center mx-auto mb-3">
                    <Wallet className="w-6 h-6 text-[#4040FF]" />
                  </div>
                  <p className="text-sm font-semibold text-[#0F0F1A] mb-1">Connect your wallet</p>
                  <p className="text-xs text-[#6B7280] mb-4">View your SARA balance and on-chain credentials</p>
                  <WalletButton variant="dark" className="w-full justify-center text-[11px]" />
                </div>
              )}
            </div>

          </div>

          {/* MAIN CONTENT */}
          <div className="w-full lg:w-[70%]">

            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-6">
              {["Articles", "Achievements", "Activity"].map((t, i) => (
                <button key={t} className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${i === 0 ? "border-[#4040FF] text-[#0F0F1A]" : "border-transparent text-[#6B7280] hover:text-[#0F0F1A]"}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Articles List */}
            <div className="space-y-4">
              {articles.map((a) => (
                <div key={a.title} className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-transparent hover:border-[#4040FF]/10 group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-black text-[#0F0F1A] pr-4 group-hover:text-[#4040FF] transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {a.title}
                    </h3>
                    <button aria-label="Open article" className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:text-[#0F0F1A] hover:border-[#0F0F1A] transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-[#6B7280] mb-4 line-clamp-2 leading-relaxed">{a.excerpt}</p>
                  <div className="flex gap-2 mb-5">
                    {a.tags.map(t => (
                      <span key={t} className="px-2.5 py-1 bg-[#4040FF]/10 text-[#4040FF] text-[11px] font-semibold rounded-md">{t}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-4 gap-4">
                    <div className="flex items-center gap-4">
                      {/* Merit score */}
                      <div className="flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-[#4040FF]" />
                        <span className="text-sm font-semibold text-[#0F0F1A]">{a.score}/100</span>
                        <span className="text-xs text-[#6B7280]">merit</span>
                      </div>
                      {/* Merit bar */}
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${a.score}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280]">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{a.votes} votes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-700">Merit verified</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#6B7280] font-medium">{a.date}</span>
                      <button className="px-4 py-1.5 border border-gray-200 text-sm font-semibold text-[#0F0F1A] rounded-lg hover:bg-gray-50 transition-colors">Read</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
