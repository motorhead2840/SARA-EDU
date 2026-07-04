import { XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white flex items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-gray-400" />
        </div>
        <h1 className="text-4xl font-black text-[#0F0F1A] mb-3">Payment cancelled</h1>
        <p className="text-lg text-[#6B7280] mb-8 leading-relaxed">
          No worries — your payment was not processed. You can go back and try again whenever you're ready.
        </p>
        <Link href="/pricing"
          className="inline-flex items-center justify-center gap-2 bg-[#0F0F1A] text-white font-bold px-7 py-3.5 rounded-full hover:bg-black transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Pricing
        </Link>
        <p className="text-xs text-[#9CA3AF] mt-8">
          Questions? Email us at <a href="mailto:hello@sri-learn.ai" className="underline">hello@sri-learn.ai</a>
        </p>
      </div>
    </div>
  );
}
