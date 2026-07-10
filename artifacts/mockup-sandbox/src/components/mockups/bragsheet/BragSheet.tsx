import React from 'react';
import { 
  Shield, 
  CheckCircle2, 
  Star, 
  ThumbsUp, 
  Wallet, 
  ArrowUpRight, 
  Award, 
  FileText,
  Hexagon,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Settings
} from 'lucide-react';

export function BragSheet() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white pb-20" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-transparent">
        <div className="text-2xl font-black text-[#0F0F1A]" style={{ fontWeight: 900 }}>SRI.</div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-[#6B7280]">
          <a href="#" className="hover:text-[#0F0F1A] transition-colors">Manifesto</a>
          <a href="#" className="hover:text-[#0F0F1A] transition-colors">Network</a>
          <a href="#" className="text-[#0F0F1A]">Brag Sheet</a>
          <a href="#" className="hover:text-[#0F0F1A] transition-colors">Research</a>
        </div>
        <button className="bg-[#0F0F1A] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-black transition-colors">
          CONNECT WALLET
        </button>
      </nav>

      {/* Profile Header Banner */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="relative rounded-t-3xl overflow-visible bg-[#0F0F1A] h-[200px] flex flex-col justify-between p-6">
          <div className="flex justify-end gap-3 w-full">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors">
              <UserPlus className="w-4 h-4" />
              Follow
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full text-white/80 text-sm font-medium hover:bg-white/10 transition-colors">
              <Settings className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
          
          <div className="absolute -bottom-12 left-8 flex items-end gap-6">
            <div className="w-24 h-24 rounded-full bg-[#4040FF] border-4 border-[#EEF2FF] flex items-center justify-center text-3xl text-white font-black shadow-lg" style={{ fontWeight: 900 }}>
              AK
            </div>
            <div className="pb-2">
              <h1 className="text-3xl text-white mb-1" style={{ fontWeight: 900 }}>Aisha Kamara</h1>
              <p className="text-white/70 text-sm font-medium mb-3">Computational Neuroscience · MIT · Class of 2026</p>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-[#4040FF]/20 text-[#4040FF] border border-[#4040FF]/30 rounded-full text-xs font-semibold">
                  <span>🎓</span> Verified Academic
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-semibold">
                  <Hexagon className="w-3 h-3" /> 4,820 SARA
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 text-white/90 border border-white/20 rounded-full text-xs font-semibold">
                  <FileText className="w-3 h-3" /> 23 Articles
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="bg-white rounded-b-3xl rounded-tr-3xl shadow-md pt-16 pb-6 px-8 flex justify-between items-center mb-8">
          <div className="text-center">
            <div className="text-2xl text-[#0F0F1A]" style={{ fontWeight: 900 }}>23</div>
            <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider mt-1">Published Articles</div>
          </div>
          <div className="w-px h-10 bg-gray-100"></div>
          <div className="text-center">
            <div className="text-2xl text-[#0F0F1A]" style={{ fontWeight: 900 }}>1,847</div>
            <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider mt-1">Merit Votes Received</div>
          </div>
          <div className="w-px h-10 bg-gray-100"></div>
          <div className="text-center">
            <div className="text-2xl text-amber-500 flex items-center justify-center gap-1" style={{ fontWeight: 900 }}>
              <Hexagon className="w-5 h-5 fill-amber-500 text-amber-500" />
              4,820
            </div>
            <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider mt-1">SARA Earned</div>
          </div>
          <div className="w-px h-10 bg-gray-100"></div>
          <div className="text-center">
            <div className="text-2xl text-[#4040FF]" style={{ fontWeight: 900 }}>#142</div>
            <div className="text-xs text-[#6B7280] font-medium uppercase tracking-wider mt-1">Global Rank</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT SIDEBAR (30%) */}
          <div className="w-full lg:w-[30%] space-y-6">
            
            {/* Credentials */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center gap-2 mb-4 text-[#0F0F1A]">
                <Shield className="w-5 h-5 text-[#4040FF]" />
                <h2 className="text-lg" style={{ fontWeight: 900 }}>Credentials</h2>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0F0F1A]">MIT — B.S. Neuroscience</p>
                    <p className="text-xs text-[#6B7280]">Class of 2026 • Verified on-chain</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0F0F1A]">Coursera</p>
                    <p className="text-xs text-[#6B7280]">Deep Learning Specialization</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0F0F1A]">SRI Learn</p>
                    <p className="text-xs text-[#6B7280]">Advanced AI Safety Certificate</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 opacity-70">
                  <div className="w-4 h-4 rounded-full border border-gray-300 mt-0.5 shrink-0 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-gray-300 hidden" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F0F1A]">Harvard OCW</p>
                    <p className="text-xs text-[#6B7280]">Justice (audited)</p>
                  </div>
                </li>
              </ul>
              <a href="#" className="flex items-center gap-1 text-xs font-semibold text-[#4040FF] mt-5 hover:underline">
                <ExternalLink className="w-3 h-3" /> View on Etherscan
              </a>
            </div>

            {/* Expertise */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg text-[#0F0F1A] mb-4" style={{ fontWeight: 900 }}>Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {['Neuroscience', 'Machine Learning', 'AI Ethics', 'Python', 'Research Methods', 'Cognitive Science'].map(skill => (
                  <span key={skill} className="px-3 py-1.5 bg-gray-100 text-[#0F0F1A] text-xs font-medium rounded-lg">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* SARA Wallet */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg text-[#0F0F1A]" style={{ fontWeight: 900 }}>SARA Rewards</h2>
                <Wallet className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-3xl text-amber-500 mb-1" style={{ fontWeight: 900 }}>4,820</div>
              <p className="text-xs text-[#6B7280] font-medium mb-5">Total Earned SARA</p>
              
              <div className="mb-5">
                <div className="flex items-end gap-1 h-16 w-full mb-1">
                  {[20, 35, 25, 45, 30, 60, 50, 80, 65, 40, 75, 90].map((h, i) => (
                    <div key={i} className="flex-1 bg-amber-500/20 rounded-t-sm" style={{ height: `${h}%` }}>
                      <div className="bg-amber-500 w-full rounded-t-sm" style={{ height: `${h * 0.4}%`, marginTop: 'auto' }}></div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 text-right uppercase">30-Day Earnings</p>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                  Withdraw
                </button>
                <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#0F0F1A] text-xs font-semibold py-2 rounded-lg transition-colors">
                  Stake
                </button>
              </div>
            </div>

          </div>

          {/* MAIN CONTENT (70%) */}
          <div className="w-full lg:w-[70%]">
            
            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-6">
              <button className="pb-3 text-sm font-semibold border-b-2 border-[#4040FF] text-[#0F0F1A]">
                Articles
              </button>
              <button className="pb-3 text-sm font-semibold text-[#6B7280] hover:text-[#0F0F1A] border-b-2 border-transparent transition-colors">
                Achievements
              </button>
              <button className="pb-3 text-sm font-semibold text-[#6B7280] hover:text-[#0F0F1A] border-b-2 border-transparent transition-colors">
                Activity
              </button>
            </div>

            {/* Articles List */}
            <div className="space-y-4">
              
              {/* Article 1 */}
              <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-transparent hover:border-[#4040FF]/10 group">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl text-[#0F0F1A] pr-4 group-hover:text-[#4040FF] transition-colors" style={{ fontWeight: 900 }}>
                    Attention Mechanisms in Biological Neural Networks
                  </h3>
                  <button className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:text-[#0F0F1A] hover:border-[#0F0F1A] transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[#6B7280] mb-4 line-clamp-2 leading-relaxed">
                  Exploring the parallels between transformer-based attention models and human biological mechanisms. We identify significant similarities in temporal processing that could inform more energy-efficient AI architectures.
                </p>
                <div className="flex gap-2 mb-5">
                  <span className="px-2.5 py-1 bg-[#4040FF]/10 text-[#4040FF] text-[11px] font-semibold rounded-md">Neuroscience</span>
                  <span className="px-2.5 py-1 bg-[#4040FF]/10 text-[#4040FF] text-[11px] font-semibold rounded-md">ML</span>
                  <span className="px-2.5 py-1 bg-[#4040FF]/10 text-[#4040FF] text-[11px] font-semibold rounded-md">Research</span>
                </div>
                <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-4 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0F0F1A]">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      97/100
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
                      <Hexagon className="w-4 h-4 fill-amber-500" />
                      +480 SARA
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280]">
                      <ThumbsUp className="w-4 h-4" />
                      142
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7280] font-medium">Oct 12, 2023</span>
                    <button className="px-4 py-1.5 border border-gray-200 text-sm font-semibold text-[#0F0F1A] rounded-lg hover:bg-gray-50 transition-colors">
                      Read
                    </button>
                  </div>
                </div>
              </div>

              {/* Article 2 */}
              <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-transparent hover:border-[#4040FF]/10 group">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl text-[#0F0F1A] pr-4 group-hover:text-[#4040FF] transition-colors" style={{ fontWeight: 900 }}>
                    Why AI Safety Needs Cognitive Science
                  </h3>
                  <button className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:text-[#0F0F1A] hover:border-[#0F0F1A] transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[#6B7280] mb-4 line-clamp-2 leading-relaxed">
                  A foundational piece arguing that alignment cannot be purely mathematical. It requires a deep integration of cognitive models to bridge the gap between machine optimization and human values.
                </p>
                <div className="flex gap-2 mb-5">
                  <span className="px-2.5 py-1 bg-[#4040FF]/10 text-[#4040FF] text-[11px] font-semibold rounded-md">AI Ethics</span>
                  <span className="px-2.5 py-1 bg-[#4040FF]/10 text-[#4040FF] text-[11px] font-semibold rounded-md">Neuroscience</span>
                </div>
                <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-4 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0F0F1A]">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      92/100
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
                      <Hexagon className="w-4 h-4 fill-amber-500" />
                      +340 SARA
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280]">
                      <ThumbsUp className="w-4 h-4" />
                      89
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7280] font-medium">Sep 28, 2023</span>
                    <button className="px-4 py-1.5 border border-gray-200 text-sm font-semibold text-[#0F0F1A] rounded-lg hover:bg-gray-50 transition-colors">
                      Read
                    </button>
                  </div>
                </div>
              </div>

              {/* Article 3 */}
              <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-transparent hover:border-[#4040FF]/10 group">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl text-[#0F0F1A] pr-4 group-hover:text-[#4040FF] transition-colors" style={{ fontWeight: 900 }}>
                    The Hebbian Learning Paradox in Modern Transformers
                  </h3>
                  <button className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:text-[#0F0F1A] hover:border-[#0F0F1A] transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[#6B7280] mb-4 line-clamp-2 leading-relaxed">
                  Contrasting backpropagation with Hebbian plasticity. Can we achieve scalable learning without global error gradients? An analysis of recent local-learning architectures.
                </p>
                <div className="flex gap-2 mb-5">
                  <span className="px-2.5 py-1 bg-[#4040FF]/10 text-[#4040FF] text-[11px] font-semibold rounded-md">ML</span>
                  <span className="px-2.5 py-1 bg-[#4040FF]/10 text-[#4040FF] text-[11px] font-semibold rounded-md">Theory</span>
                </div>
                <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-4 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0F0F1A]">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      89/100
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
                      <Hexagon className="w-4 h-4 fill-amber-500" />
                      +220 SARA
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280]">
                      <ThumbsUp className="w-4 h-4" />
                      64
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7280] font-medium">Aug 15, 2023</span>
                    <button className="px-4 py-1.5 border border-gray-200 text-sm font-semibold text-[#0F0F1A] rounded-lg hover:bg-gray-50 transition-colors">
                      Read
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
