import { Link } from "wouter";
import { Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-[#E5E7EB] py-14 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="font-black text-2xl tracking-tighter text-[#0F0F1A] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              SRI.
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
              A decentralized learning platform where knowledge is incentivized, verified, and owned by learners.
            </p>
            <p className="text-xs text-[#9CA3AF]">Established 2026 · Global Education DAO</p>
          </div>

          {/* Learn */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-5">Learn</h4>
            <ul className="space-y-3">
              {[
                { href: "/choose-path",    label: "Choose Your Path" },
                { href: "/knowledge-feed", label: "Knowledge Feed" },
                { href: "/news-feed",      label: "Your News Feed" },
                { href: "/brag-sheet",     label: "Portfolio" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-[#6B7280] hover:text-[#0F0F1A] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-5">Platform</h4>
            <ul className="space-y-3">
              {[
                { href: "/pricing",  label: "Pricing",     color: "text-[#4040FF] font-semibold" },
                { href: "/token",    label: "SARA Token",  color: "" },
                { href: "/abhaya",   label: "AI Safety",   color: "" },
                { href: "/pitch",    label: "Our Mission", color: "" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href}
                    className={`text-sm transition-colors hover:text-[#0F0F1A] ${l.color || "text-[#6B7280]"}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="pt-1 border-t border-[#F3F4F6] mt-2" />
              {[
                { href: "/login/school",  label: "School Portal" },
                { href: "/login/parent",  label: "Family Portal" },
                { href: "/login/student", label: "Student Portal" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-[#6B7280] hover:text-[#0F0F1A] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-5">Get Started</h4>
            <p className="text-sm text-[#6B7280] leading-relaxed mb-5">
              Join researchers, students, and lifelong learners building the future of education.
            </p>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 bg-[#0F0F1A] hover:bg-[#4040FF] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-sm">
              <Zap className="w-3.5 h-3.5" /> View Plans
            </Link>
          </div>
        </div>

        <div className="pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#9CA3AF]">
            © 2026 SRI Quantum Technologies. All rights reserved.
          </p>
          <p className="text-xs text-[#9CA3AF]">
            Payments secured by <span className="font-semibold">Stripe</span> · Built for learners everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
