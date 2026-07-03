import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full bg-stone-50 border-t border-stone-200 py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
                <span className="font-serif text-xs font-bold text-amber-900">S</span>
              </div>
              <span className="font-sans text-base font-bold text-stone-800">
                SRI <span className="text-amber-500">Learn</span>
              </span>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed">
              Where Vedantic wisdom meets global homeschooling. A contemplative AI platform for every learner.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Platform</h4>
            <ul className="space-y-2">
              {[
                { href: "/architecture", label: "Architecture" },
                { href: "/pedagogy", label: "Pedagogy" },
                { href: "/blueprint", label: "Blueprint" },
                { href: "/pitch", label: "Pitch" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-stone-500 hover:text-amber-600 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Portals</h4>
            <ul className="space-y-2">
              {[
                { href: "/login/school", label: "School Login", color: "text-blue-500" },
                { href: "/login/parent", label: "Parent Login", color: "text-amber-500" },
                { href: "/login/student", label: "Student Login", color: "text-emerald-500" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className={`text-sm ${l.color} hover:underline transition-colors font-semibold`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">SRI Quantum</h4>
            <p className="text-sm text-stone-500 leading-relaxed">
              SRI Quantum Technologies<br />
              Contemplative AI Platform<br />
              Blueprint v1.0 · February 2026
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-400">
            © 2026 SRI Quantum Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <span className="text-xs text-stone-400">Made with</span>
            <span className="text-amber-400 text-xs">♥</span>
            <span className="text-xs text-stone-400">for global learners</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
