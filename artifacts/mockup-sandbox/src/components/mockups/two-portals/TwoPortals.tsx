import React from 'react';
import { GraduationCap, Sparkles, CheckCircle2, ChevronRight, Menu } from 'lucide-react';

export function TwoPortals() {
  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ fontFamily: "'Inter', sans-serif", background: "linear-gradient(to bottom, #EEF2FF 0%, #FFFFFF 100%)" }}>
      {/* Navbar */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-10 sticky top-0 bg-[#EEF2FF]/80 backdrop-blur-sm border-b border-indigo-100/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#4040FF] flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <span className="text-xl font-black text-[#0F0F1A] tracking-tight">SRI.</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-medium text-[#6B7280] hover:text-[#0F0F1A] transition-colors">Platform</a>
          <a href="#" className="text-sm font-medium text-[#0F0F1A]">Learn</a>
          <a href="#" className="text-sm font-medium text-[#6B7280] hover:text-[#0F0F1A] transition-colors">Research</a>
          <a href="#" className="text-sm font-medium text-[#6B7280] hover:text-[#0F0F1A] transition-colors">Community</a>
        </nav>
        
        <div className="flex items-center gap-4">
          <button className="hidden md:flex items-center justify-center px-5 py-2.5 bg-[#0F0F1A] text-white text-sm font-semibold rounded-full hover:bg-black transition-colors">
            CONNECT WALLET
          </button>
          <button className="md:hidden text-[#0F0F1A]">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center">
        {/* Section Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-xs font-bold tracking-wider text-[#4040FF] bg-indigo-50 border border-indigo-100 rounded-full uppercase">
            Choose Your Path
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0F0F1A] mb-6 tracking-tight leading-tight">
            Where do you want to grow?
          </h2>
          <p className="text-lg md:text-xl text-[#6B7280] leading-relaxed">
            SRI Learn serves two distinct communities. Pick your path and we'll personalize everything.
          </p>
        </div>

        {/* Two Portal Cards */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          
          {/* Academia Portal */}
          <div className="relative overflow-hidden rounded-3xl shadow-xl flex flex-col group transition-transform hover:-translate-y-1 duration-300" style={{ backgroundColor: '#0F0F1A' }}>
            {/* Background Texture/Grid */}
            <div className="absolute inset-0 opacity-20" style={{ 
              backgroundImage: 'linear-gradient(#4040FF 1px, transparent 1px), linear-gradient(90deg, #4040FF 1px, transparent 1px)', 
              backgroundSize: '32px 32px',
              maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)'
            }}></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#4040FF] opacity-20 blur-[100px] rounded-full"></div>
            
            <div className="relative p-10 md:p-12 flex-1 flex flex-col z-10">
              <div className="flex justify-between items-start mb-12">
                <GraduationCap className="w-16 h-16 text-white stroke-[1.5]" />
                <div className="px-3 py-1 rounded-full border border-[#4040FF]/50 text-[#8080FF] text-xs font-bold tracking-wider uppercase bg-[#4040FF]/10 backdrop-blur-md">
                  Institutional
                </div>
              </div>
              
              <h3 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Academia</h3>
              <p className="text-lg text-indigo-200/80 mb-8 max-w-sm leading-relaxed">
                For researchers, students, and faculty in accredited institutions
              </p>
              
              <ul className="space-y-4 mb-12 flex-1">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-white/90 font-medium">Peer-reviewed article publishing</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-white/90 font-medium">SARA token rewards for merit-voted research</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-white/90 font-medium">Academic credential verification on-chain</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-white/90 font-medium">Supervised cohort learning + faculty tools</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-white/90 font-medium">Citation network + plagiarism detection</span>
                </li>
              </ul>
              
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#0F0F1A] px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                Enter Academia <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="relative border-t border-white/10 bg-white/5 py-5 px-10 md:px-12 backdrop-blur-md z-10">
              <p className="text-sm font-medium text-indigo-200/70 tracking-wide text-center">
                2,400 Researchers · 180 Institutions · 14,000 Papers
              </p>
            </div>
          </div>

          {/* Personal Development Portal */}
          <div className="relative overflow-hidden rounded-3xl shadow-xl flex flex-col group transition-transform hover:-translate-y-1 duration-300" style={{ backgroundColor: '#FFF8F0' }}>
            {/* Background Texture/Gradient */}
            <div className="absolute top-0 right-0 w-full h-full" style={{
              background: 'radial-gradient(circle at top right, rgba(255, 107, 53, 0.15), transparent 60%)'
            }}></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2" style={{
              background: 'radial-gradient(circle at bottom left, rgba(255, 180, 100, 0.1), transparent 60%)'
            }}></div>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            <div className="relative p-10 md:p-12 flex-1 flex flex-col z-10">
              <div className="flex justify-between items-start mb-12">
                <Sparkles className="w-16 h-16 text-[#FF6B35] stroke-[1.5]" />
                <div className="px-3 py-1 rounded-full border border-[#FF6B35]/30 text-[#FF6B35] text-xs font-bold tracking-wider uppercase bg-[#FF6B35]/5 backdrop-blur-md">
                  Self-Directed
                </div>
              </div>
              
              <h3 className="text-4xl md:text-5xl font-black text-[#0F0F1A] mb-4 tracking-tight">Self Development</h3>
              <p className="text-lg text-[#6B7280] mb-8 max-w-sm leading-relaxed">
                For curious minds, lifelong learners, and career changers
              </p>
              
              <ul className="space-y-4 mb-12 flex-1">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#FF6B35] mt-0.5 shrink-0" />
                  <span className="text-[#374151] font-medium">Curated personal growth tracks</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#FF6B35] mt-0.5 shrink-0" />
                  <span className="text-[#374151] font-medium">AI-coached journaling + reflection prompts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#FF6B35] mt-0.5 shrink-0" />
                  <span className="text-[#374151] font-medium">SARA tokens for completing milestones</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#FF6B35] mt-0.5 shrink-0" />
                  <span className="text-[#374151] font-medium">Community challenges + accountability pods</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#FF6B35] mt-0.5 shrink-0" />
                  <span className="text-[#374151] font-medium">Personalized news feed based on your interests</span>
                </li>
              </ul>
              
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0F0F1A] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-black transition-colors shadow-lg shadow-[#0F0F1A]/10 group-hover:shadow-[#0F0F1A]/20">
                Start Your Journey <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="relative border-t border-orange-900/5 bg-white/40 py-5 px-10 md:px-12 backdrop-blur-md z-10">
              <p className="text-sm font-medium text-orange-900/60 tracking-wide text-center">
                38,000 Learners · 500+ Tracks · $420K SARA Earned
              </p>
            </div>
          </div>

        </div>

        {/* Nudge */}
        <div className="text-center mt-4">
          <p className="text-[#6B7280] font-medium flex flex-col sm:flex-row items-center gap-2">
            Not sure which fits you? Take our 2-minute path finder.
            <a href="#" className="text-[#4040FF] font-bold hover:underline inline-flex items-center gap-1 group">
              Take the quiz <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </p>
        </div>

      </main>
    </div>
  );
}
