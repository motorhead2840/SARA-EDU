import React from "react";
import { Bot, ThumbsUp, MessageSquare, Eye, ArrowUp, ArrowDown, ChevronRight, PenTool } from "lucide-react";

export function ArticleFeed() {
  const articles = [
    {
      id: 1,
      author: "Elena R.",
      authorInitials: "ER",
      pathway: "Academia",
      pathwayColor: "bg-blue-100 text-[#4040FF]",
      timeAgo: "2h ago",
      title: "Attention Mechanisms in Biological Neural Networks",
      excerpt: "Exploring the parallels between transformer attention heads and human prefrontal cortex firing patterns during focused tasks...",
      tags: ["Neuroscience", "AI Models", "Cognition"],
      meritScore: 97,
      meritVoters: "3 AI agents + 14 peers",
      rewardStatus: "Author earned: +480 SARA",
      rewardColor: "text-amber-600 bg-amber-50",
      likes: 124,
      comments: 32,
      views: "1.2k"
    },
    {
      id: 2,
      author: "Marcus T.",
      authorInitials: "MT",
      pathway: "Self-Dev",
      pathwayColor: "bg-orange-100 text-orange-600",
      timeAgo: "5h ago",
      title: "The Stoic Framework for Modern Productivity",
      excerpt: "Why the ancient philosophy of controlling only what you can provides a superior framework for modern deep work...",
      tags: ["Philosophy", "Deep Work", "Stoicism"],
      meritScore: 91,
      meritVoters: "3 AI agents + 12 peers",
      rewardStatus: "Author earned: +310 SARA",
      rewardColor: "text-amber-600 bg-amber-50",
      likes: 89,
      comments: 14,
      views: "850"
    },
    {
      id: 3,
      author: "Sarah J.",
      authorInitials: "SJ",
      pathway: "Academia",
      pathwayColor: "bg-blue-100 text-[#4040FF]",
      timeAgo: "1d ago",
      title: "Why AI Safety Needs Cognitive Science",
      excerpt: "Current alignment approaches focus on mathematical guarantees, but cognitive science offers a behavioral perspective we are missing...",
      tags: ["AI Safety", "Ethics", "CogSci"],
      meritScore: 92,
      meritVoters: "3 AI agents + 18 peers",
      rewardStatus: "Author earned: +340 SARA",
      rewardColor: "text-amber-600 bg-amber-50",
      likes: 210,
      comments: 45,
      views: "2.4k"
    },
    {
      id: 4,
      author: "David K.",
      authorInitials: "DK",
      pathway: "Self-Dev",
      pathwayColor: "bg-orange-100 text-orange-600",
      timeAgo: "1d ago",
      title: "Journaling as a Cognitive Reframing Tool",
      excerpt: "Analyzing the psychological mechanics of structured journaling and how it actively rewires stress responses over time...",
      tags: ["Psychology", "Habits", "Mental Health"],
      meritScore: 88,
      meritVoters: "2 AI agents + 5 peers",
      rewardStatus: "Voting closes in 2d 4h",
      rewardColor: "text-blue-600 bg-blue-50",
      likes: 45,
      comments: 8,
      views: "320"
    },
    {
      id: 5,
      author: "Lisa W.",
      authorInitials: "LW",
      pathway: "Academia",
      pathwayColor: "bg-blue-100 text-[#4040FF]",
      timeAgo: "2d ago",
      title: "Blockchain Governance and Academic Integrity",
      excerpt: "How decentralized ledgers could provide immutable verification for peer-reviewed research and eliminate citation cartels...",
      tags: ["Web3", "Research", "Governance"],
      meritScore: 85,
      meritVoters: "3 AI agents + 9 peers",
      rewardStatus: "Author earned: +180 SARA",
      rewardColor: "text-amber-600 bg-amber-50",
      likes: 76,
      comments: 21,
      views: "610"
    },
    {
      id: 6,
      author: "James H.",
      authorInitials: "JH",
      pathway: "Self-Dev",
      pathwayColor: "bg-orange-100 text-orange-600",
      timeAgo: "3d ago",
      title: "Flow State Engineering: A Practical Guide",
      excerpt: "Synthesizing Mihaly Csikszentmihalyi's original research with modern neurobiology to predictably trigger flow states...",
      tags: ["Performance", "Neurobiology", "Focus"],
      meritScore: 79,
      meritVoters: "1 AI agent + 4 peers",
      rewardStatus: "Voting closes in 1d 12h",
      rewardColor: "text-blue-600 bg-blue-50",
      likes: 112,
      comments: 18,
      views: "940"
    }
  ];

  const comments = [
    {
      id: 1,
      author: "Dr. Chen",
      authorInitials: "DC",
      time: "1h ago",
      text: "Fascinating analysis. The correlation between transformer self-attention and human selective attention mechanisms is highly underexplored. However, biological networks exhibit much higher sparsity. How do you account for that in your model?",
      upvotes: 24,
      downvotes: 3
    },
    {
      id: 2,
      author: "Alex Morgan",
      authorInitials: "AM",
      time: "45m ago",
      text: "Great read! I'd add that the energetic constraints on biological brains might be the exact reason they evolved such efficient sparse attention mechanisms compared to our current dense AI models.",
      upvotes: 18,
      downvotes: 1
    },
    {
      id: 3,
      author: "Sophia R.",
      authorInitials: "SR",
      time: "15m ago",
      text: "This bridges the gap perfectly. Would love to see a follow-up exploring how this framework applies to recurrent neural networks and memory retention.",
      upvotes: 8,
      downvotes: 0
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white font-sans text-[#0F0F1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="text-2xl font-black tracking-tight" style={{ fontWeight: 900 }}>SRI.</div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-[#6B7280]">
          <a href="#" className="hover:text-[#0F0F1A] transition-colors">Dashboard</a>
          <a href="#" className="hover:text-[#0F0F1A] transition-colors">Pathways</a>
          <a href="#" className="text-[#0F0F1A] border-b-2 border-[#4040FF] pb-1">Feed</a>
          <a href="#" className="hover:text-[#0F0F1A] transition-colors">Network</a>
        </div>
        <button className="bg-[#0F0F1A] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors">
          CONNECT WALLET
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-black mb-4" style={{ fontWeight: 900 }}>Knowledge Feed</h1>
            <p className="text-[#6B7280] text-lg leading-relaxed">
              Articles written by SRI learners, merit-scored by AI agents and peer reviewers. Top articles earn SARA.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-4">
            <button className="flex items-center gap-2 bg-[#0F0F1A] text-white px-5 py-3 rounded-full font-semibold hover:bg-[#4040FF] transition-colors shadow-lg hover:shadow-xl">
              <PenTool size={18} />
              Write Article +
            </button>
            <div className="flex gap-2 bg-white p-1 rounded-full shadow-sm border border-gray-100 text-sm font-medium">
              <button className="px-4 py-1.5 bg-[#4040FF] text-white rounded-full">All</button>
              <button className="px-4 py-1.5 text-[#6B7280] hover:text-[#0F0F1A] rounded-full transition-colors">Academia</button>
              <button className="px-4 py-1.5 text-[#6B7280] hover:text-[#0F0F1A] rounded-full transition-colors">Self-Dev</button>
              <button className="px-4 py-1.5 text-[#6B7280] hover:text-[#0F0F1A] rounded-full transition-colors">Trending</button>
            </div>
          </div>
        </div>

        {/* Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {articles.map((article) => (
            <div key={article.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-100 flex flex-col overflow-hidden">
              <div className="p-6 flex-1 flex flex-col">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700">
                      {article.authorInitials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{article.author}</div>
                      <div className="text-xs text-[#6B7280]">{article.timeAgo}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${article.pathwayColor}`}>
                    {article.pathway}
                  </span>
                </div>

                {/* Card Body */}
                <h3 className="text-xl font-bold mb-3 leading-snug line-clamp-2" style={{ fontWeight: 800 }}>
                  {article.title}
                </h3>
                <p className="text-[#6B7280] text-sm mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {article.tags.map(tag => (
                    <span key={tag} className="text-[11px] font-semibold text-[#4040FF] bg-blue-50 px-2.5 py-1 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto">
                  {/* Merit Score Bar */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                        <Bot size={16} className="text-[#4040FF]" />
                        Merit Score
                      </div>
                      <div className="text-sm font-black" style={{ fontWeight: 900 }}>
                        {article.meritScore} <span className="text-gray-400 font-medium">/ 100</span>
                      </div>
                    </div>
                    
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full rounded-full ${
                          article.meritScore >= 85 ? 'bg-emerald-500' : 
                          article.meritScore >= 60 ? 'bg-amber-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${article.meritScore}%` }}
                      ></div>
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      Voted by {article.meritVoters}
                    </div>
                  </div>

                  {/* SARA Reward */}
                  <div className={`text-xs font-semibold px-3 py-2 rounded-lg mb-4 text-center ${article.rewardColor}`}>
                    {article.rewardStatus}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="bg-gray-50 border-t border-gray-100 p-4 px-6 flex justify-between items-center text-[#6B7280]">
                <div className="flex items-center gap-4 text-sm font-medium">
                  <div className="flex items-center gap-1.5 hover:text-[#4040FF] cursor-pointer transition-colors">
                    <ThumbsUp size={16} /> {article.likes}
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#4040FF] cursor-pointer transition-colors">
                    <MessageSquare size={16} /> {article.comments}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye size={16} /> {article.views}
                  </div>
                </div>
                <button className="text-[#4040FF] font-bold text-sm flex items-center gap-1 hover:underline">
                  Read <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Comment Voting Section - Expanded View Example */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-[#0F0F1A] text-white p-6 px-8">
            <div className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-2">Discussion Thread</div>
            <h2 className="text-2xl font-bold" style={{ fontWeight: 800 }}>
              Attention Mechanisms in Biological Neural Networks
            </h2>
          </div>
          
          <div className="p-8">
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#4040FF] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      {comment.authorInitials}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-[#0F0F1A]">{comment.author}</span>
                      <span className="text-xs text-[#6B7280]">{comment.time}</span>
                    </div>
                    
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">
                      {comment.text}
                    </p>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center bg-white border border-gray-200 rounded-full shadow-sm overflow-hidden text-sm">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-50 text-gray-700 font-medium transition-colors border-r border-gray-200">
                          <ArrowUp size={14} className="text-emerald-500" />
                          {comment.upvotes}
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                          <ArrowDown size={14} className="text-red-500" />
                          {comment.downvotes}
                        </button>
                      </div>
                      
                      <button className="text-sm font-semibold text-[#6B7280] hover:text-[#4040FF] transition-colors">
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs italic text-[#6B7280] mb-4">
                * Comment votes are separate from article merit scoring. Merit scoring is handled by AI and designated peer reviewers.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-600 font-bold text-sm">
                  ME
                </div>
                <div className="flex-1">
                  <textarea 
                    className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4040FF] focus:border-transparent resize-none h-24 shadow-sm"
                    placeholder="Add a substantive comment to the discussion..."
                  ></textarea>
                  <div className="flex justify-end mt-3">
                    <button className="bg-[#4040FF] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                      Submit Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
