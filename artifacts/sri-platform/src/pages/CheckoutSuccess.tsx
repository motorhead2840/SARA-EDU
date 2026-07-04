import { CheckCircle2, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "wouter";

export default function CheckoutSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white flex items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-4xl font-black text-[#0F0F1A] mb-3">You're in!</h1>
        <p className="text-lg text-[#6B7280] mb-8 leading-relaxed">
          Your subscription is active. Welcome to SRI Learn — the world's first contemplative AI learning DAO.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/choose-path"
            className="flex items-center justify-center gap-2 bg-[#4040FF] text-white font-bold px-7 py-3.5 rounded-full hover:bg-blue-700 transition-colors">
            <BookOpen className="w-4 h-4" /> Start Learning
          </Link>
          <Link href="/knowledge-feed"
            className="flex items-center justify-center gap-2 border-2 border-gray-200 text-[#0F0F1A] font-bold px-7 py-3.5 rounded-full hover:border-gray-400 transition-colors">
            Explore Feed <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-xs text-[#9CA3AF] mt-8">
          A receipt has been sent to your email. Manage your subscription anytime from your account.
        </p>
      </div>
    </div>
  );
}
