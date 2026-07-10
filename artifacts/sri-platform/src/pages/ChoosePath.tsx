import { Link } from "wouter";
import { GraduationCap, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";

export default function ChoosePath() {
  return (
    <div className="bg-gradient-to-b from-[#EEF2FF] to-white min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <main className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center">

        {/* Section Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-xs font-bold tracking-wider text-[#4040FF] bg-indigo-50 border border-indigo-100 rounded-full uppercase">
            Choose Your Path
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#0F0F1A] mb-6 tracking-tight leading-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
            Where do you want to grow?
          </h1>
          <p className="text-lg md:text-xl text-[#6B7280] leading-relaxed">
            SRI Learn serves two distinct communities. Pick your path and we'll personalize everything.
          </p>
        </div>

        {/* Two Portal Cards */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">

          {/* Academia Portal */}
          <div className="relative overflow-hidden rounded-3xl shadow-xl flex flex-col group transition-transform hover:-translate-y-1 duration-300 bg-[#0F0F1A]">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(#4040FF 1px, transparent 1px), linear-gradient(90deg, #4040FF 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)'
            }} />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#4040FF] opacity-20 blur-[100px] rounded-full" />

            <div className="relative p-10 md:p-12 flex-1 flex flex-col z-10">
              <div className="flex justify-between items-start mb-12">
                <GraduationCap className="w-16 h-16 text-white stroke-[1.5]" />
                <div className="px-3 py-1 rounded-full border border-[#4040FF]/50 text-[#8080FF] text-xs font-bold tracking-wider uppercase bg-[#4040FF]/10">
                  Institutional
                </div>
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>Academia</h2>
              <p className="text-lg text-indigo-200/80 mb-8 max-w-sm leading-relaxed">
                For researchers, students, and faculty in accredited institutions
              </p>

              <ul className="space-y-4 mb-12 flex-1">
                {[
                  "Peer-reviewed article publishing",
                  "SARA token rewards for merit-voted research",
                  "Academic credential verification on-chain",
                  "Supervised cohort learning + faculty tools",
                  "Citation network + plagiarism detection",
                ].map(f => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                    <span className="text-white/90 font-medium">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/login/school"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#0F0F1A] px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors">
                Enter Academia <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="relative border-t border-white/10 bg-white/5 py-5 px-10 md:px-12 z-10">
              <p className="text-sm font-medium text-indigo-200/70 tracking-wide text-center">
                2,400 Researchers · 180 Institutions · 14,000 Papers
              </p>
            </div>
          </div>

          {/* Personal Development Portal */}
          <div className="relative overflow-hidden rounded-3xl shadow-xl flex flex-col group transition-transform hover:-translate-y-1 duration-300 bg-[#FFF8F0]">
            <div className="absolute top-0 right-0 w-full h-full" style={{
              background: 'radial-gradient(circle at top right, rgba(255, 107, 53, 0.15), transparent 60%)'
            }} />

            <div className="relative p-10 md:p-12 flex-1 flex flex-col z-10">
              <div className="flex justify-between items-start mb-12">
                <Sparkles className="w-16 h-16 text-[#FF6B35] stroke-[1.5]" />
                <div className="px-3 py-1 rounded-full border border-[#FF6B35]/30 text-[#FF6B35] text-xs font-bold tracking-wider uppercase bg-[#FF6B35]/5">
                  Self-Directed
                </div>
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-[#0F0F1A] mb-4 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>Self Development</h2>
              <p className="text-lg text-[#6B7280] mb-8 max-w-sm leading-relaxed">
                For curious minds, lifelong learners, and career changers
              </p>

              <ul className="space-y-4 mb-12 flex-1">
                {[
                  "Curated personal growth tracks",
                  "AI-coached journaling + reflection prompts",
                  "SARA tokens for completing milestones",
                  "Community challenges + accountability pods",
                  "Personalized news feed based on your interests",
                ].map(f => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#FF6B35] mt-0.5 shrink-0" />
                    <span className="text-[#374151] font-medium">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/login/student"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0F0F1A] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-black transition-colors shadow-lg">
                Start Your Journey <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="relative border-t border-orange-900/5 bg-white/40 py-5 px-10 md:px-12 z-10">
              <p className="text-sm font-medium text-orange-900/60 tracking-wide text-center">
                38,000 Learners · 500+ Learning Tracks
              </p>
            </div>
          </div>

        </div>

        {/* Nudge */}
        <div className="text-center">
          <p className="text-[#6B7280] font-medium flex flex-col sm:flex-row items-center justify-center gap-2">
            Not sure which fits you? Take our 2-minute path finder.
            <Link href="/login" className="text-[#4040FF] font-bold hover:underline inline-flex items-center gap-1 group">
              Take the quiz <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </p>
        </div>

      </main>
    </div>
  );
}
