import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full bg-card border-t border-border/60 py-14 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-red">
                <span className="text-white font-bold text-sm" style={{ fontFamily: 'Poppins' }}>S</span>
              </div>
              <span className="font-bold text-lg text-foreground" style={{ fontFamily: 'Poppins' }}>
                SRI <span className="text-primary">Learn</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              A smart learning platform that helps every student grow at their own pace — from anywhere in the world.
            </p>
            <p className="text-xs text-muted-foreground/60">Established 2026 · Global Education</p>
          </div>

          {/* Learn */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-5">Learn</h4>
            <ul className="space-y-3">
              {[
                { href: "/architecture", label: "How It Works" },
                { href: "/pedagogy",     label: "Learning Methods" },
                { href: "/blueprint",    label: "Our Approach" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-5">Product</h4>
            <ul className="space-y-3">
              {[
                { href: "/token",   label: "SRI Rewards",  color: "text-primary" },
                { href: "/abhaya",  label: "AI Safety",    color: "text-secondary" },
                { href: "/pitch",   label: "Our Mission",  color: "" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href}
                    className={`text-sm font-semibold transition-colors hover:brightness-125 ${l.color || "text-muted-foreground hover:text-foreground"}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="pt-1 border-t border-border/40 mt-2" />
              {[
                { href: "/login/school",  label: "School Portal" },
                { href: "/login/parent",  label: "Family Portal" },
                { href: "/login/student", label: "Student Portal" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-5">Community</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              Join thousands of families and schools using SRI Learn to make education more personal, safe, and fun.
            </p>
            <Link href="/login"
              className="inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all hover:scale-105 glow-red">
              Join SRI Learn →
            </Link>
          </div>
        </div>

        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © 2026 SRI Quantum Technologies. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with ❤️ for learners everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
