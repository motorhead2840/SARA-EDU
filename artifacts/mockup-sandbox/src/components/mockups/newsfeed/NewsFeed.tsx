import React from 'react';
import { 
  Bookmark, 
  Settings2, 
  Plus, 
  ExternalLink, 
  Clock, 
  TrendingUp, 
  Target, 
  Search 
} from 'lucide-react';

export function NewsFeed() {
  const activeInterests = ['Neuroscience', 'AI & ML', 'Philosophy', 'Climate Tech', 'Education'];
  const inactiveInterests = ['Economics', 'Physics', 'Psychology', 'Blockchain', 'History'];

  const articles = [
    {
      source: 'Nature',
      sourceColor: 'bg-green-600',
      sourceLetter: 'N',
      category: 'Science',
      timeAgo: '2h ago',
      headline: 'New study maps 86 billion neurons using AI-assisted connectomics',
      summary: 'Researchers have completed the most comprehensive map of the human brain to date, utilizing novel machine learning techniques to trace connections that were previously impossible to track.',
      matches: ['Neuroscience', 'AI & ML'],
    },
    {
      source: 'MIT News',
      sourceColor: 'bg-red-600',
      sourceLetter: 'M',
      category: 'Technology',
      timeAgo: '4h ago',
      headline: 'CSAIL develops self-correcting LLMs that cite their own uncertainty',
      summary: 'A new framework allows large language models to accurately express when they are uncertain about an answer, drastically reducing hallucination rates in educational contexts.',
      matches: ['AI & ML', 'Education'],
    },
    {
      source: 'Harvard Gazette',
      sourceColor: 'bg-rose-800',
      sourceLetter: 'H',
      category: 'Humanities',
      timeAgo: '6h ago',
      headline: 'Philosophy of mind enters the transformer era: consciousness and computation',
      summary: 'As artificial neural networks become increasingly sophisticated, philosophers are re-examining classic thought experiments about consciousness, intentionality, and what it means to "understand".',
      matches: ['Philosophy', 'AI & ML'],
    },
    {
      source: 'Reuters Science',
      sourceColor: 'bg-orange-600',
      sourceLetter: 'R',
      category: 'Environment',
      timeAgo: '8h ago',
      headline: 'Antarctic ice sheet model updated with 40 years of climate data',
      summary: 'Climate scientists have released an updated predictive model for Antarctic ice melt, incorporating four decades of satellite observations and advanced thermodynamic simulations.',
      matches: ['Climate Tech'],
    },
    {
      source: 'The Conversation',
      sourceColor: 'bg-indigo-600',
      sourceLetter: 'C',
      category: 'Academia',
      timeAgo: '12h ago',
      headline: 'Peer learning outperforms lecture-based teaching in STEM by 23%',
      summary: 'A comprehensive meta-analysis of undergraduate STEM education reveals that structured peer-to-peer learning environments significantly improve both retention rates and conceptual understanding.',
      matches: ['Education', 'Neuroscience'],
    }
  ];

  const topSources = [
    { name: 'Nature', letter: 'N', color: 'bg-green-600', count: 12 },
    { name: 'MIT News', letter: 'M', color: 'bg-red-600', count: 8 },
    { name: 'Harvard Gazette', letter: 'H', color: 'bg-rose-800', count: 6 },
    { name: 'BBC Science', letter: 'B', color: 'bg-red-800', count: 11 },
    { name: 'Reuters', letter: 'R', color: 'bg-orange-600', count: 9 },
  ];

  const trendingTopics = [
    { tag: '#NeuralNetworks', count: 142 },
    { tag: '#ClimateAI', count: 98 },
    { tag: '#EdTech', count: 87 },
    { tag: '#Consciousness', count: 76 },
    { tag: '#LLMs', count: 201 },
    { tag: '#SyntheticBiology', count: 54 },
    { tag: '#QuantumML', count: 43 },
    { tag: '#OpenScience', count: 67 },
  ];

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white pb-20"
      style={{ fontFamily: "'Inter', sans-serif", color: '#0F0F1A' }}
    >
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/40 bg-white/40 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl tracking-tighter" style={{ fontWeight: 900 }}>SRI.</div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B7280]">
          <a href="#" className="text-[#0F0F1A]">Home</a>
          <a href="#" className="hover:text-[#0F0F1A] transition-colors">Courses</a>
          <a href="#" className="hover:text-[#0F0F1A] transition-colors">Network</a>
          <a href="#" className="hover:text-[#0F0F1A] transition-colors">Research</a>
        </div>
        <button className="bg-[#0F0F1A] text-white px-5 py-2 rounded-full text-xs font-semibold tracking-wide hover:bg-black transition-colors">
          CONNECT WALLET
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-5xl tracking-tight mb-2" style={{ fontWeight: 900 }}>Your Feed</h1>
            <p className="text-[#6B7280] text-lg">Curated from 40+ trusted sources, personalized to your interests</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6B7280] flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Last updated 4 min ago
            </span>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm">
              <Settings2 className="w-4 h-4" />
              Manage Interests
            </button>
          </div>
        </div>

        {/* Interest Filter Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {activeInterests.map(interest => (
            <button 
              key={interest} 
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#4040FF] text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {interest}
              <span className="opacity-70 hover:opacity-100 px-1 -mr-2">×</span>
            </button>
          ))}
          {inactiveInterests.map(interest => (
            <button 
              key={interest} 
              className="flex-shrink-0 px-4 py-1.5 rounded-full border border-gray-200 text-[#6B7280] bg-white text-sm font-medium hover:border-gray-300 hover:text-gray-900 transition-colors"
            >
              {interest}
            </button>
          ))}
          <button className="flex-shrink-0 flex items-center gap-1 px-4 py-1.5 rounded-full text-[#4040FF] text-sm font-medium hover:bg-blue-50 transition-colors ml-2">
            <Plus className="w-4 h-4" />
            Add interests
          </button>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT MAIN FEED */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {articles.map((article, idx) => (
              <article key={idx} className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${article.sourceColor}`}>
                      {article.sourceLetter}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-gray-900">{article.source}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[#4040FF] font-medium bg-blue-50 px-2 py-0.5 rounded-md text-xs">{article.category}</span>
                    </div>
                  </div>
                  <span className="text-sm text-[#6B7280]">{article.timeAgo}</span>
                </div>
                
                <h2 className="text-2xl tracking-tight leading-tight mb-3" style={{ fontWeight: 800 }}>
                  {article.headline}
                </h2>
                
                <p className="text-[#6B7280] leading-relaxed mb-6 line-clamp-3">
                  {article.summary}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <Target className="w-4 h-4" />
                    <span>Matches: <span className="font-medium text-gray-900">{article.matches.join(', ')}</span></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="text-[#6B7280] hover:text-[#4040FF] transition-colors p-2 rounded-full hover:bg-blue-50">
                      <Bookmark className="w-5 h-5" />
                    </button>
                    <a href="#" className="flex items-center gap-1.5 text-[#4040FF] font-semibold text-sm hover:text-blue-800 transition-colors">
                      Read Full Article
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
            
            <button className="w-full py-4 bg-white rounded-2xl border border-dashed border-gray-300 text-[#6B7280] font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors mt-4">
              Load More Stories
            </button>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Top Sources Card */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                <Search className="w-5 h-5 text-[#4040FF]" />
                Top Sources
              </h3>
              <div className="flex flex-col gap-4">
                {topSources.map((source, idx) => (
                  <div key={idx} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${source.color}`}>
                        {source.letter}
                      </div>
                      <span className="font-medium text-gray-900 group-hover:text-[#4040FF] transition-colors">{source.name}</span>
                    </div>
                    <span className="text-sm text-[#6B7280] bg-gray-50 px-2.5 py-1 rounded-full">{source.count} articles</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Topics Card */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#4040FF]" />
                Trending Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic, idx) => (
                  <button key={idx} className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-lg text-sm transition-colors text-left group">
                    <span className="font-medium text-gray-900 group-hover:text-[#4040FF] block">{topic.tag}</span>
                    <span className="text-xs text-[#6B7280]">{topic.count} stories</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recommended For You Card */}
            <div className="bg-gradient-to-br from-[#4040FF] to-indigo-800 rounded-2xl shadow-md p-6 text-white">
              <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                <Target className="w-5 h-5 opacity-80" />
                Recommended For You
              </h3>
              <div className="flex flex-col gap-4">
                <a href="#" className="block bg-white/10 hover:bg-white/20 p-4 rounded-xl transition-colors border border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold tracking-wider text-blue-200 uppercase">Nature</span>
                    <span className="text-xs font-bold bg-white text-[#4040FF] px-2 py-0.5 rounded">94% match</span>
                  </div>
                  <h4 className="font-bold text-sm leading-snug">Quantum entanglement observed in macroscopic biological structures</h4>
                </a>
                <a href="#" className="block bg-white/10 hover:bg-white/20 p-4 rounded-xl transition-colors border border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold tracking-wider text-blue-200 uppercase">MIT Tech Review</span>
                    <span className="text-xs font-bold bg-white text-[#4040FF] px-2 py-0.5 rounded">89% match</span>
                  </div>
                  <h4 className="font-bold text-sm leading-snug">The next generation of solid-state batteries hits a major milestone</h4>
                </a>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
