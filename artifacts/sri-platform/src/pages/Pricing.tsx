import { useState, useEffect } from "react";
import { Check, Zap, BookOpen, Bot, Shield, Star, Globe, Lock } from "lucide-react";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, string>;
  prices: Price[];
}

// ─── Static plan definitions (display only) ──────────────────────────────────

const PLAN_DISPLAY: Record<string, {
  badge?: string;
  color: string;
  borderColor: string;
  features: string[];
  icon: React.ReactNode;
  cta: string;
}> = {
  Scholar: {
    badge: "Most Popular",
    color: "bg-[#4040FF]",
    borderColor: "border-[#4040FF]",
    icon: <BookOpen className="w-6 h-6 text-[#4040FF]" />,
    cta: "Start Learning",
    features: [
      "Full course library (500+ tracks)",
      "AI tutor — 24/7 question answering",
      "Knowledge Feed — publish & earn",
      "Brag Sheet portfolio",
      "Merit peer voting",
      "Course completion certificates",
    ],
  },
  "Academic Pro": {
    badge: "Best Value",
    color: "bg-purple-600",
    borderColor: "border-purple-500",
    icon: <Shield className="w-6 h-6 text-purple-500" />,
    cta: "Go Pro",
    features: [
      "Everything in Scholar",
      "Abhaya Gate AI safety research tools",
      "SARA token rewards for contributions",
      "DAO governance voting power",
      "Priority support & early access",
      "On-chain credential verification",
    ],
  },
};

const FREE_FEATURES = [
  "5 introductory courses",
  "Public Knowledge Feed (read-only)",
  "Community news feed",
  "Basic profile",
];

// ─── Checkout modal ───────────────────────────────────────────────────────────

function CheckoutModal({
  product,
  price,
  onClose,
}: {
  product: Product;
  price: Price;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), priceId: price.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency.toUpperCase() }).format(price.unit_amount / 100);
  const interval = price.recurring?.interval ?? "month";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,15,26,0.7)", backdropFilter: "blur(8px)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="bg-[#0F0F1A] px-8 py-6">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Subscribe to</p>
          <h2 className="text-2xl font-black text-white">{product.name}</h2>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-white">{formatted}</span>
            <span className="text-gray-400 text-sm">/ {interval}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-bold text-[#0F0F1A] mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@university.edu"
              className="w-full border-2 border-gray-200 focus:border-[#4040FF] rounded-xl px-4 py-3 text-sm outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4040FF] hover:bg-blue-700 text-white font-black py-3.5 rounded-xl transition-colors text-sm disabled:opacity-60"
          >
            {loading ? "Redirecting to checkout…" : `Continue to Secure Checkout →`}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#9CA3AF]">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Secured by Stripe</span>
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Cards, SEPA, ACH &amp; more</span>
            <span>Cancel anytime</span>
          </div>

          <button type="button" onClick={onClose} className="w-full text-[#6B7280] text-sm hover:text-[#0F0F1A] transition-colors">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Pricing page ────────────────────────────────────────────────────────

export default function Pricing() {
  const [billing, setBilling] = useState<"month" | "year">("month");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<{ product: Product; price: Price } | null>(null);

  useEffect(() => {
    fetch("/api/stripe/products")
      .then((r) => r.json())
      .then((d) => { setProducts(d.data ?? []); })
      .catch(() => setError("Couldn't load pricing — please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const getPrice = (product: Product, interval: "month" | "year"): Price | undefined =>
    product.prices.find((p) => p.recurring?.interval === interval);

  const yearSaving = (product: Product) => {
    const mo = getPrice(product, "month");
    const yr = getPrice(product, "year");
    if (!mo || !yr) return null;
    const wouldPay = mo.unit_amount * 12;
    const pct = Math.round((1 - yr.unit_amount / wouldPay) * 100);
    return pct > 0 ? pct : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white" style={{ fontFamily: "'Inter', sans-serif", color: "#0F0F1A" }}>
      <div className="max-w-6xl mx-auto px-6 py-20">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-[#4040FF]/10 text-[#4040FF] text-sm font-bold px-4 py-2 rounded-full mb-6">
            <Star className="w-4 h-4" /> Simple, transparent pricing
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-5">
            Invest in your <span className="text-[#4040FF]">intellect</span>
          </h1>
          <p className="text-xl text-[#6B7280] max-w-xl mx-auto leading-relaxed">
            Start free. Upgrade when you're ready. Every plan includes access to the SRI Learn community.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm">
              <button
                onClick={() => setBilling("month")}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${billing === "month" ? "bg-[#0F0F1A] text-white shadow" : "text-[#6B7280] hover:text-[#0F0F1A]"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("year")}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${billing === "year" ? "bg-[#0F0F1A] text-white shadow" : "text-[#6B7280] hover:text-[#0F0F1A]"}`}
              >
                Yearly <span className="text-green-600 text-xs ml-1">Save up to 25%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center text-red-600 bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 font-medium">{error}</div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

          {/* Free tier — always shown */}
          <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-md p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h2 className="text-lg font-black">Free</h2>
                <p className="text-xs text-[#6B7280]">No credit card needed</p>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-black">$0</span>
              <span className="text-[#6B7280] text-sm ml-1">/ month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#374151]">
                  <Check className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full border-2 border-gray-200 hover:border-gray-400 text-[#0F0F1A] font-bold py-3 rounded-xl transition-colors text-sm">
              Get started free
            </button>
          </div>

          {/* Stripe-powered tiers */}
          {loading && (
            <>
              {["Scholar", "Academic Pro"].map((name) => (
                <div key={name} className="bg-white rounded-3xl border-2 border-gray-100 shadow-md p-8 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-1/2" />
                  <div className="h-10 bg-gray-200 rounded mb-6 w-1/3" />
                  {[1,2,3,4,5].map((i) => <div key={i} className="h-4 bg-gray-100 rounded mb-3" />)}
                  <div className="h-12 bg-gray-200 rounded-xl mt-6" />
                </div>
              ))}
            </>
          )}

          {!loading && products.map((product) => {
            const display = PLAN_DISPLAY[product.name];
            if (!display) return null;
            const price = getPrice(product, billing);
            const saving = billing === "year" ? yearSaving(product) : null;
            const isPro = product.name === "Academic Pro";

            return (
              <div
                key={product.id}
                className={`relative bg-white rounded-3xl border-2 shadow-lg p-8 flex flex-col ${isPro ? "border-purple-400 shadow-purple-100" : "border-[#4040FF] shadow-blue-100"}`}
              >
                {display.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${isPro ? "bg-purple-600" : "bg-[#4040FF]"} text-white text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap`}>
                    {display.badge}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${isPro ? "bg-purple-50" : "bg-blue-50"} flex items-center justify-center`}>
                    {display.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-black">{product.name}</h2>
                    <p className="text-xs text-[#6B7280] truncate max-w-[160px]">{product.description?.split(",")[0]}</p>
                  </div>
                </div>

                <div className="mb-2">
                  {price ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency.toUpperCase(), minimumFractionDigits: 0 }).format(price.unit_amount / 100)}
                      </span>
                      <span className="text-[#6B7280] text-sm">/ {billing === "month" ? "month" : "year"}</span>
                    </div>
                  ) : (
                    <div className="h-10 flex items-center">
                      <span className="text-[#6B7280] text-sm">Loading prices…</span>
                    </div>
                  )}
                  {saving && (
                    <p className="text-green-600 text-xs font-bold mt-1">Save {saving}% vs monthly</p>
                  )}
                  {billing === "year" && price && (
                    <p className="text-[#9CA3AF] text-xs mt-0.5">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency.toUpperCase(), minimumFractionDigits: 0 }).format(price.unit_amount / 100 / 12)} / month billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-3 my-6 flex-1">
                  {display.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#374151]">
                      <Check className={`w-4 h-4 ${isPro ? "text-purple-500" : "text-[#4040FF]"} mt-0.5 shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={!price}
                  onClick={() => price && setSelected({ product, price })}
                  className={`w-full text-white font-black py-3.5 rounded-xl transition-all text-sm hover:opacity-90 active:scale-95 disabled:opacity-50 ${isPro ? "bg-purple-600" : "bg-[#4040FF]"}`}
                >
                  {price ? display.cta : "Loading…"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment methods strip */}
        <div className="mt-12 text-center">
          <p className="text-[#9CA3AF] text-sm mb-4 font-medium">All major payment methods accepted globally</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["💳 Visa / Mastercard", "🏦 SEPA Bank Transfer", "🏦 ACH Direct Debit", "💳 American Express", "🇳🇱 iDEAL", "🇧🇪 Bancontact", "📱 Apple Pay / Google Pay"].map((m) => (
              <span key={m} className="text-xs font-semibold text-[#6B7280] bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">{m}</span>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-10">Common questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I cancel anytime?", a: "Yes. Cancel from your account dashboard at any time. You'll keep access until the end of your billing period." },
              { q: "Do you offer student discounts?", a: "We're working on institutional pricing. Email hello@sri-learn.ai with your student email and we'll sort you out." },
              { q: "What payment methods are supported?", a: "Stripe handles checkout — you can pay with any major card (Visa, Mastercard, Amex), SEPA bank debit, ACH bank transfer, iDEAL, Bancontact, Apple Pay, and Google Pay." },
              { q: "Is my payment info secure?", a: "Your card data never touches our servers. Stripe is PCI DSS Level 1 certified — the highest level of payment security certification." },
              { q: "What is the SARA token?", a: "SARA is an optional crypto reward token for Academic Pro members who contribute to the knowledge graph. It's separate from your subscription — no wallet needed to use SRI Learn." },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h3 className="font-black text-[#0F0F1A] mb-2">{q}</h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout modal */}
      {selected && (
        <CheckoutModal
          product={selected.product}
          price={selected.price}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
