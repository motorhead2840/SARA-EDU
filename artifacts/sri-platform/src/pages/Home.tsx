import { Link } from "wouter";
import { ArrowRight, Key } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";

export default function Home() {
  return (
    <div className="overflow-x-hidden bg-gradient-to-b from-[#EEF2FF] to-white min-h-screen">

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 flex flex-col lg:flex-row items-center gap-16 relative">

        {/* Left Content */}
        <div className="flex-1 flex flex-col items-start relative z-10 w-full lg:max-w-[600px]">
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#E5E7EB] bg-white/60 backdrop-blur-sm text-xs font-bold tracking-widest text-[#6B7280] mb-8 uppercase">
            The SRI Learning Protocol
          </div>

          <h1 className="font-black text-6xl md:text-[76px] leading-[0.95] tracking-tight mb-8 text-[#0F0F1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
            The World's First <br />
            <span className="text-[#4040FF]">AI-Powered</span> <br />
            Learning DAO.
          </h1>

          <p className="text-lg md:text-xl text-[#6B7280] leading-relaxed mb-10 max-w-lg font-medium">
            A decentralized autonomous organization dedicated to building an open, immutable education layer where knowledge is incentivized, verified, and owned by learners.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/choose-path"
              className="w-full sm:w-auto bg-[#0F0F1A] text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-black transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-black/10">
              Explore Courses <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/choose-path"
              className="w-full sm:w-auto bg-white border-2 border-[#E5E7EB] text-[#0F0F1A] px-8 py-4 rounded-full font-bold text-sm tracking-wide flex items-center justify-center hover:border-[#0F0F1A] transition-colors">
              Learn More
            </Link>
          </div>

          {/* Floating Widget Card */}
          <div className="mt-16 bg-white p-6 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] border border-[#E5E7EB] max-w-sm w-full relative group hover:shadow-[0_20px_40px_-15px_rgba(64,64,255,0.12)] transition-shadow">
            <div className="text-[10px] font-bold tracking-widest text-[#6B7280] mb-4 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4040FF]" />
              Learner Verification
            </div>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#4040FF] flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1 text-[#0F0F1A]" style={{ fontFamily: "'Inter', sans-serif" }}>SARA Cryptographic ID</h3>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#F3F4F6] text-[10px] font-bold text-[#6B7280] tracking-wider uppercase">
                  <span>⬡</span> Wallet Unconnected
                </div>
              </div>
            </div>

            <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
              Connect your web3 identity to claim your learner keys and participate in on-chain peer review.
            </p>

            <WalletButton variant="dark" className="w-full justify-center" />
          </div>
        </div>

        {/* Right Content - Visual */}
        <div className="flex-1 relative w-full flex justify-center lg:justify-end mt-12 lg:mt-0">
          <div className="absolute -top-12 -right-8 w-64 h-64 bg-[#4040FF] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-[#0D9488] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="relative z-10 w-full max-w-lg aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-[#4040FF]/10 border-[8px] border-white/60 transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-10" />
            <img
              src="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&auto=format&fit=crop&q=60"
              alt="Ocean cliff landscape"
              className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-700"
            />
          </div>
        </div>
      </main>

      {/* Stats row */}
      <section className="bg-white border-y border-[#E5E7EB] py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
          {[
            { value: "38,000+", label: "Active Learners" },
            { value: "14,000",  label: "Research Papers" },
            { value: "180+",    label: "Institutions" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-black text-[#4040FF] mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>{s.value}</p>
              <p className="text-xs text-[#6B7280] font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Choose Your Path Preview */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-xs font-bold tracking-wider text-[#4040FF] bg-[#4040FF]/10 border border-[#4040FF]/20 rounded-full uppercase">
            Two Distinct Communities
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0F0F1A] mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
            Where do you want to grow?
          </h2>
          <p className="text-xl text-[#6B7280] max-w-xl mx-auto">
            SRI Learn serves two distinct communities. Pick your path and we'll personalize everything.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Academia */}
          <div className="relative overflow-hidden rounded-3xl shadow-xl flex flex-col group transition-transform hover:-translate-y-1 duration-300 bg-[#0F0F1A]">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(#4040FF 1px, transparent 1px), linear-gradient(90deg, #4040FF 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)'
            }} />
            <div className="relative p-10 flex flex-col z-10">
              <div className="flex justify-between items-start mb-8">
                <span className="text-5xl">🎓</span>
                <span className="px-3 py-1 rounded-full border border-[#4040FF]/50 text-[#8080FF] text-xs font-bold tracking-wider uppercase bg-[#4040FF]/10">
                  Institutional
                </span>
              </div>
              <h3 className="text-4xl font-black text-white mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>Academia</h3>
              <p className="text-indigo-200/80 mb-8 leading-relaxed">For researchers, students, and faculty in accredited institutions</p>
              <ul className="space-y-3 mb-10 text-white/90 text-sm">
                {["Peer-reviewed article publishing", "SARA token rewards for merit-voted research", "Academic credential verification on-chain", "Supervised cohort learning + faculty tools"].map(f => (
                  <li key={f} className="flex items-center gap-2"><span className="text-[#4040FF]">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/choose-path" className="inline-flex items-center justify-center gap-2 bg-white text-[#0F0F1A] px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-colors">
                Enter Academia →
              </Link>
            </div>
            <div className="border-t border-white/10 bg-white/5 py-4 px-10 text-sm text-indigo-200/70 text-center">
              2,400 Researchers · 180 Institutions · 14,000 Papers
            </div>
          </div>

          {/* Self Dev */}
          <div className="relative overflow-hidden rounded-3xl shadow-xl flex flex-col group transition-transform hover:-translate-y-1 duration-300 bg-[#FFF8F0]">
            <div className="absolute top-0 right-0 w-full h-full" style={{ background: 'radial-gradient(circle at top right, rgba(255,107,53,0.15), transparent 60%)' }} />
            <div className="relative p-10 flex flex-col z-10">
              <div className="flex justify-between items-start mb-8">
                <span className="text-5xl">✨</span>
                <span className="px-3 py-1 rounded-full border border-[#FF6B35]/30 text-[#FF6B35] text-xs font-bold tracking-wider uppercase bg-[#FF6B35]/5">
                  Self-Directed
                </span>
              </div>
              <h3 className="text-4xl font-black text-[#0F0F1A] mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>Self Development</h3>
              <p className="text-[#6B7280] mb-8 leading-relaxed">For curious minds, lifelong learners, and career changers</p>
              <ul className="space-y-3 mb-10 text-[#374151] text-sm">
                {["Curated personal growth tracks", "AI-coached journaling + reflection prompts", "SARA tokens for completing milestones", "Community challenges + accountability pods"].map(f => (
                  <li key={f} className="flex items-center gap-2"><span className="text-[#FF6B35]">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/choose-path" className="inline-flex items-center justify-center gap-2 bg-[#0F0F1A] text-white px-8 py-4 rounded-full font-bold hover:bg-black transition-colors shadow-lg">
                Start Your Journey →
              </Link>
            </div>
            <div className="border-t border-orange-900/5 bg-white/40 py-4 px-10 text-sm text-orange-900/60 text-center">
              38,000 Learners · 500+ Learning Tracks
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#0F0F1A]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
            Ready to earn <span className="text-[#4040FF]">SARA</span> while you learn?
          </h2>
          <p className="text-xl text-white/60 mb-10">
            Publish research, vote on merit, and get rewarded. Knowledge should have value — on-chain.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/choose-path" className="bg-[#4040FF] hover:bg-blue-600 text-white font-bold text-lg px-10 py-4 rounded-full transition-all hover:scale-105">
              Choose Your Path →
            </Link>
            <Link href="/knowledge-feed" className="border border-white/20 hover:border-white/60 text-white font-bold text-lg px-10 py-4 rounded-full transition-all">
              Browse the Feed
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
