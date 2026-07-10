import React from "react";
import { Key, ArrowRight, ExternalLink } from "lucide-react";

export function Homepage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white text-[#0F0F1A] font-sans overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}} />
      
      {/* Navbar */}
      <nav className="w-full px-6 py-5 flex items-center justify-between max-w-7xl mx-auto relative z-20">
        <div className="flex items-center gap-2">
          <span className="font-black text-2xl tracking-tighter" style={{ fontFamily: "'Inter', sans-serif" }}>SRI.</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#0F0F1A]">
          <a href="#" className="hover:text-[#4040FF] transition-colors">Home</a>
          <a href="#" className="hover:text-[#4040FF] transition-colors flex items-center gap-1">Learn</a>
          <a href="#" className="hover:text-[#4040FF] transition-colors">Token</a>
          <a href="#" className="hover:text-[#4040FF] transition-colors">Safety</a>
          <a href="#" className="hover:text-[#4040FF] transition-colors">Blog</a>
          <a href="#" className="hover:text-[#4040FF] transition-colors flex items-center gap-1">
            Community <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <button className="bg-[#0F0F1A] text-white px-6 py-2.5 rounded-full text-xs font-bold tracking-wide hover:bg-black transition-colors">
          CONNECT WALLET
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24 lg:pt-20 lg:pb-32 flex flex-col lg:flex-row items-center gap-16 relative">
        
        {/* Left Content */}
        <div className="flex-1 flex flex-col items-start relative z-10 w-full lg:max-w-[600px]">
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#E5E7EB] bg-white/50 backdrop-blur-sm text-xs font-bold tracking-widest text-[#6B7280] mb-8 uppercase">
            The SRI Learning Protocol
          </div>
          
          <h1 className="font-black text-6xl md:text-[80px] leading-[0.95] tracking-tight mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
            The World's First <br />
            <span className="text-[#4040FF]">AI-Powered</span> <br />
            Learning DAO.
          </h1>
          
          <p className="text-lg md:text-xl text-[#6B7280] leading-relaxed mb-10 max-w-lg font-medium">
            A decentralized autonomous organization dedicated to building an open, immutable education layer where knowledge is incentivized, verified, and owned by learners.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button className="w-full sm:w-auto bg-[#0F0F1A] text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-black transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-black/10">
              Explore Courses <ArrowRight className="w-4 h-4" />
            </button>
            <button className="w-full sm:w-auto bg-white border-2 border-[#E5E7EB] text-[#0F0F1A] px-8 py-4 rounded-full font-bold text-sm tracking-wide flex items-center justify-center hover:border-[#0F0F1A] transition-colors">
              Learn More
            </button>
          </div>
          
          {/* Floating Widget Card */}
          <div className="mt-16 bg-white p-6 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-[#E5E7EB] max-w-sm w-full relative group hover:shadow-[0_20px_40px_-15px_rgba(64,64,255,0.1)] transition-shadow">
            <div className="text-[10px] font-bold tracking-widest text-[#6B7280] mb-4 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4040FF]"></span>
              Learner Verification
            </div>
            
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#4040FF] flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>SARA Cryptographic ID</h3>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#F3F4F6] text-[10px] font-bold text-[#6B7280] tracking-wider uppercase">
                  <span>⬡</span> Wallet Unconnected
                </div>
              </div>
            </div>
            
            <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
              Connect your web3 identity to claim your learner keys and participate in on-chain peer review.
            </p>
            
            <button className="w-full bg-[#0F0F1A] text-white py-3 rounded-full text-xs font-bold tracking-wide hover:bg-[#4040FF] transition-colors">
              INSTANT WALLET
            </button>
          </div>
        </div>
        
        {/* Right Content - Visual */}
        <div className="flex-1 relative w-full flex justify-center lg:justify-end mt-12 lg:mt-0">
          {/* Decorative Circles */}
          <div className="absolute -top-12 -right-8 w-64 h-64 bg-[#4040FF] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-[#0D9488] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Main Image */}
          <div className="relative z-10 w-full max-w-lg aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-[#4040FF]/10 border-[8px] border-white/50 backdrop-blur-sm transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&auto=format&fit=crop&q=60" 
              alt="Beautiful ocean cliff landscape" 
              className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-700"
            />
          </div>
        </div>

      </main>
    </div>
  );
}