import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Check, CreditCard, Loader2, Wallet, Zap, Copy, AlertCircle, RefreshCw, CheckCircle2, Building } from "lucide-react";
import { useSubscriptionHooks, PlanDetails, CryptoPlan } from "@/hooks/use-subscriptions";
import { useToast } from "@/hooks/use-toast";

// Types
type PaymentMethod = "fiat" | "crypto" | "bank";
type CryptoCurrency = "USDC" | "ETH" | "BTC" | "SARA";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
];

const TIERS = [
  { id: "high", name: "Standard", price: 29.99, description: "Full access for high-income regions" },
  { id: "middle", name: "Regional", price: 14.99, description: "Adjusted access for middle-income regions" },
  { id: "low", name: "Access", price: 4.99, description: "Accessible tier for emerging economies" },
];

export default function Subscribe() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { getPlans, getStatus, checkoutFiat, checkoutCrypto, getCryptoStatus } = useSubscriptionHooks();

  const [email, setEmail] = useState("");
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  const [countryCode, setCountryCode] = useState("US"); // default, will be overridden by IP ideally, but we simulate
  const [plans, setPlans] = useState<PlanDetails | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("fiat");
  const [cryptoCurrency, setCryptoCurrency] = useState<CryptoCurrency>("USDC");
  const [accountType, setAccountType] = useState<"checking" | "savings">("checking");

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Crypto Payment State
  const [cryptoPayment, setCryptoPayment] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "confirmed" | "expired" | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial fetch of plans
    fetchPlans(countryCode);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const fetchPlans = async (code: string) => {
    setIsLoadingPlans(true);
    try {
      const data = await getPlans(code);
      setPlans(data);
      setCountryCode(data.detected_country);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load plans", variant: "destructive" });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setIsCheckingUser(true);
    try {
      const status = await getStatus(email);
      setSubscription(status);
      setUserChecked(true);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to check user status", variant: "destructive" });
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setCountryCode(code);
    fetchPlans(code);
  };

  const handleFiatCheckout = async () => {
    if (!email) return;
    setIsCheckingOut(true);
    try {
      const res = await checkoutFiat(email, countryCode);
      window.location.href = res.url;
    } catch (err) {
      console.error(err);
      toast({ title: "Checkout failed", variant: "destructive" });
      setIsCheckingOut(false);
    }
  };

  const handleBankCheckout = async () => {
    if (!email) return;
    setIsCheckingOut(true);
    try {
      const res = await checkoutFiat(email, countryCode, "bank");
      window.location.href = res.url;
    } catch (err) {
      console.error(err);
      toast({ title: "Bank checkout failed", variant: "destructive" });
      setIsCheckingOut(false);
    }
  };

  const handleCryptoCheckout = async () => {
    if (!email) return;
    setIsCheckingOut(true);
    try {
      const res = await checkoutCrypto(email, cryptoCurrency, countryCode);
      setCryptoPayment(res);
      setPaymentStatus("pending");
      
      const expiresAt = new Date(res.expires_at).getTime();
      
      // Setup Countdown
      timerRef.current = setInterval(() => {
        const now = new Date().getTime();
        const distance = expiresAt - now;
        
        if (distance < 0) {
          clearInterval(timerRef.current);
          setCountdown(0);
          setPaymentStatus("expired");
        } else {
          setCountdown(Math.floor(distance / 1000));
        }
      }, 1000);

      // Setup Polling
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await getCryptoStatus(res.payment_id);
          if (statusRes.status === "confirmed") {
            setPaymentStatus("confirmed");
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
            // Simulate unlocked features
            setSubscription({
              active: true,
              tier: plans?.tier,
              source: "crypto",
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              features: ["content", "certification"]
            });
          } else if (statusRes.status === "expired") {
            setPaymentStatus("expired");
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 5000);

    } catch (err) {
      console.error(err);
      toast({ title: "Crypto checkout failed", variant: "destructive" });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!", description: text });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderActiveSubscription = () => (
    <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 max-w-2xl mx-auto border border-[#E5E7EB]" data-testid="active-subscription-view">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-3xl font-bold text-center mb-2">You are Subscribed!</h2>
      <p className="text-center text-[#6B7280] mb-8">
        Your account ({email}) has an active subscription.
      </p>

      <div className="bg-[#EEF2FF] rounded-2xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-semibold text-[#6B7280]">Current Plan</span>
          <span className="px-3 py-1 bg-[#4040FF]/10 text-[#4040FF] rounded-full text-sm font-bold uppercase tracking-wider">
            {subscription.tier || "Standard"} Tier
          </span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-semibold text-[#6B7280]">Payment Source</span>
          <span className="text-[#0F0F1A] font-medium capitalize">{subscription.source || "Fiat"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-[#6B7280]">Expires On</span>
          <span className="text-[#0F0F1A] font-medium">
            {new Date(subscription.expires_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-bold mb-4">Unlocked Features</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {(subscription.features || ["Premium Content", "Certifications"]).map((feature: string) => (
            <div key={feature} className="flex items-center gap-2 p-3 bg-white border border-[#E5E7EB] rounded-xl">
              <Check className="w-5 h-5 text-[#4040FF]" />
              <span className="font-medium capitalize">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setLocation("/")} className="w-full bg-[#0F0F1A] text-white font-bold py-4 rounded-xl hover:bg-[#4040FF] transition-colors" data-testid="return-home-button">
        Return to Home
      </button>
    </div>
  );

  const renderEmailInput = () => (
    <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 max-w-md mx-auto border border-[#E5E7EB]" data-testid="email-input-view">
      <div className="w-16 h-16 bg-[#4040FF]/10 rounded-2xl flex items-center justify-center mb-6">
        <Zap className="w-8 h-8 text-[#4040FF]" />
      </div>
      <h1 className="text-3xl font-black tracking-tight mb-3 text-[#0F0F1A]">Join SRI Platform</h1>
      <p className="text-[#6B7280] mb-8 font-medium">Enter your email to check your status and access your subscription.</p>

      <form onSubmit={handleEmailSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-bold text-[#0F0F1A] mb-2">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#F9FAFB] border-2 border-[#E5E7EB] focus:border-[#4040FF] focus:ring-0 rounded-xl px-4 py-3 text-[#0F0F1A] font-medium transition-colors"
            placeholder="you@example.com"
            data-testid="email-input"
          />
        </div>
        <button
          type="submit"
          disabled={isCheckingUser || !email}
          className="w-full bg-[#4040FF] hover:bg-[#4040FF]/90 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          data-testid="email-submit-button"
        >
          {isCheckingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>
      </form>
    </div>
  );

  const renderCheckout = () => (
    <div className="max-w-5xl mx-auto" data-testid="checkout-view">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-4">Choose Your Plan</h1>
        <p className="text-[#6B7280] text-lg max-w-xl mx-auto font-medium">
          Our adaptive pricing ensures fair access globally. You are checking out as <span className="font-bold text-[#0F0F1A]">{email}</span>.
        </p>
      </div>

      {/* Country Override */}
      <div className="flex justify-center mb-12">
        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-[#E5E7EB] inline-flex items-center gap-3">
          <span className="text-sm font-medium text-[#6B7280]">Detected Region:</span>
          {isLoadingPlans ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#4040FF]" />
          ) : (
            <select
              value={countryCode}
              onChange={handleCountryChange}
              className="bg-transparent text-sm font-bold text-[#0F0F1A] outline-none cursor-pointer"
              data-testid="country-select"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tiers */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {TIERS.map(tier => {
          const isActive = plans?.tier === tier.id;
          return (
            <div 
              key={tier.id} 
              className={`relative rounded-3xl p-6 transition-all duration-300 ${
                isActive 
                  ? "bg-[#0F0F1A] text-white shadow-2xl scale-105 z-10" 
                  : "bg-white text-[#0F0F1A] border-2 border-[#E5E7EB] opacity-60 hover:opacity-100"
              }`}
              data-testid={`tier-card-${tier.id}`}
            >
              {isActive && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF6B35] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  Your Tier
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
              <p className={`text-sm mb-6 ${isActive ? "text-gray-400" : "text-[#6B7280]"}`}>
                {tier.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-black">${tier.price}</span>
                <span className={`text-sm ${isActive ? "text-gray-400" : "text-[#6B7280]"}`}>/mo</span>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm font-medium">
                  <Check className={`w-4 h-4 ${isActive ? "text-[#4040FF]" : "text-[#4040FF]"}`} /> Full content access
                </li>
                <li className="flex items-center gap-2 text-sm font-medium">
                  <Check className={`w-4 h-4 ${isActive ? "text-[#4040FF]" : "text-[#4040FF]"}`} /> Certification program
                </li>
                <li className="flex items-center gap-2 text-sm font-medium">
                  <Check className={`w-4 h-4 ${isActive ? "text-[#4040FF]" : "text-[#4040FF]"}`} /> Community feed
                </li>
              </ul>
            </div>
          );
        })}
      </div>

      {/* Payment Section */}
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl shadow-black/5 border border-[#E5E7EB] overflow-hidden">
        
        {/* Payment Methods */}
        <div className="flex border-b border-[#E5E7EB]">
          <button
            onClick={() => setPaymentMethod("fiat")}
            className={`flex-1 flex items-center justify-center gap-2 py-5 text-sm font-bold transition-colors ${
              paymentMethod === "fiat" ? "bg-[#EEF2FF] text-[#4040FF] border-b-2 border-[#4040FF]" : "text-[#6B7280] hover:text-[#0F0F1A] hover:bg-black/5"
            }`}
            data-testid="payment-tab-fiat"
          >
            <CreditCard className="w-5 h-5" /> Credit Card
          </button>
          <button
            onClick={() => setPaymentMethod("crypto")}
            className={`flex-1 flex items-center justify-center gap-2 py-5 text-sm font-bold transition-colors ${
              paymentMethod === "crypto" ? "bg-[#EEF2FF] text-[#4040FF] border-b-2 border-[#4040FF]" : "text-[#6B7280] hover:text-[#0F0F1A] hover:bg-black/5"
            }`}
            data-testid="payment-tab-crypto"
          >
            <Wallet className="w-5 h-5" /> Crypto Wallet
          </button>
          <button
            onClick={() => setPaymentMethod("bank")}
            className={`flex-1 flex items-center justify-center gap-2 py-5 text-sm font-bold transition-colors ${
              paymentMethod === "bank" ? "bg-[#EEF2FF] text-[#4040FF] border-b-2 border-[#4040FF]" : "text-[#6B7280] hover:text-[#0F0F1A] hover:bg-black/5"
            }`}
            data-testid="bank-tab"
          >
            <Building className="w-5 h-5" /> Bank Account
          </button>
        </div>

        <div className="p-8">
          
          {/* FIAT TAB */}
          {paymentMethod === "fiat" && (
            <div className="text-center" data-testid="fiat-checkout-section">
              <div className="mb-8">
                <span className="block text-[#6B7280] font-medium mb-1">Total Due Today</span>
                <span className="text-5xl font-black text-[#0F0F1A]">${plans?.usd_price}</span>
              </div>
              <button
                onClick={handleFiatCheckout}
                disabled={isCheckingOut || isLoadingPlans}
                className="w-full bg-[#0F0F1A] hover:bg-[#4040FF] text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="fiat-checkout-button"
              >
                {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : "Checkout with Stripe"}
              </button>
              <p className="mt-4 text-xs text-[#6B7280] font-medium flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" /> Secure payment processing via Stripe
              </p>
            </div>
          )}

          {/* BANK TAB */}
          {paymentMethod === "bank" && (
            <div className="text-center" data-testid="bank-checkout-section">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#0F0F1A]">Bank Account</h3>
                <p className="text-sm text-[#6B7280] font-medium">For parents & students with a verified bank account</p>
              </div>

              <div className="flex gap-4 mb-8 justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="accountType"
                    value="checking"
                    checked={accountType === "checking"}
                    onChange={() => setAccountType("checking")}
                    className="w-4 h-4 text-[#4040FF] border-gray-300 focus:ring-[#4040FF]"
                    data-testid="account-type-checking"
                  />
                  <span className="text-sm font-bold text-[#0F0F1A]">Checking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="accountType"
                    value="savings"
                    checked={accountType === "savings"}
                    onChange={() => setAccountType("savings")}
                    className="w-4 h-4 text-[#4040FF] border-gray-300 focus:ring-[#4040FF]"
                    data-testid="account-type-savings"
                  />
                  <span className="text-sm font-bold text-[#0F0F1A]">Savings</span>
                </label>
              </div>

              <div className="mb-8">
                <span className="block text-[#6B7280] font-medium mb-1">Total Due Today</span>
                <span className="text-5xl font-black text-[#0F0F1A]">${plans?.usd_price}</span>
              </div>
              <button
                onClick={handleBankCheckout}
                disabled={isCheckingOut || isLoadingPlans}
                className="w-full bg-[#0F0F1A] hover:bg-[#4040FF] text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="bank-pay-button"
              >
                {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Pay"}
              </button>
              <p className="mt-4 text-xs text-[#6B7280] font-medium flex items-start text-left bg-gray-50 p-3 rounded-lg gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Your bank account is verified in real-time via Stripe Financial Connections. Supports ACH (US), SEPA (EU), and other regional bank transfers.</span>
              </p>
            </div>
          )}

          {/* CRYPTO TAB */}
          {paymentMethod === "crypto" && !cryptoPayment && (
            <div data-testid="crypto-checkout-section">
              <div className="grid grid-cols-4 gap-2 mb-8">
                {(["USDC", "ETH", "BTC", "SARA"] as CryptoCurrency[]).map(coin => (
                  <button
                    key={coin}
                    onClick={() => setCryptoCurrency(coin)}
                    className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                      cryptoCurrency === coin 
                        ? "border-[#4040FF] bg-[#4040FF]/10 text-[#4040FF]" 
                        : "border-[#E5E7EB] text-[#6B7280] hover:border-gray-400"
                    }`}
                    data-testid={`crypto-coin-${coin}`}
                  >
                    {coin}
                  </button>
                ))}
              </div>

              <div className="mb-8 p-6 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] flex flex-col items-center">
                <span className="text-[#6B7280] font-medium text-sm mb-1">Total Due Today</span>
                <div className="text-3xl font-black text-[#0F0F1A] mb-2 flex items-baseline gap-2">
                  {plans?.crypto[cryptoCurrency.toLowerCase() as keyof typeof plans.crypto]?.amount} 
                  <span className="text-xl text-[#4040FF]">{cryptoCurrency}</span>
                </div>
                <div className="text-sm font-medium text-[#6B7280]">
                  ≈ ${plans?.usd_price} USD
                </div>
              </div>

              <button
                onClick={handleCryptoCheckout}
                disabled={isCheckingOut || isLoadingPlans}
                className="w-full bg-[#0F0F1A] hover:bg-[#4040FF] text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="crypto-checkout-button"
              >
                {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Payment Invoice"}
              </button>
            </div>
          )}

          {/* CRYPTO PENDING STATE */}
          {paymentMethod === "crypto" && cryptoPayment && paymentStatus === "pending" && (
            <div className="text-center" data-testid="crypto-pending-section">
              <div className="inline-flex items-center gap-2 bg-[#FF6B35]/10 text-[#FF6B35] px-4 py-1.5 rounded-full text-sm font-bold mb-6">
                <Loader2 className="w-4 h-4 animate-spin" /> Awaiting Payment...
              </div>

              <div className="mb-6">
                <p className="text-[#6B7280] font-medium text-sm mb-2">Send Exactly:</p>
                <div className="text-3xl font-black text-[#0F0F1A] flex justify-center items-baseline gap-2">
                  {cryptoPayment.amount} <span className="text-xl text-[#4040FF]">{cryptoPayment.currency}</span>
                </div>
              </div>

              <div className="text-left bg-[#1E1E2E] rounded-xl p-4 mb-6 relative group">
                <p className="text-gray-400 text-xs font-semibold mb-2">To Address:</p>
                <code className="text-green-400 text-sm break-all font-mono">
                  {cryptoPayment.wallet_address}
                </code>
                <button 
                  onClick={() => copyToClipboard(cryptoPayment.wallet_address)}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
                  data-testid="copy-address-button"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-sm font-medium bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280]">Time remaining</span>
                <span className="text-[#0F0F1A] font-bold font-mono text-lg">{formatTime(countdown)}</span>
              </div>
              
              <p className="text-xs text-[#6B7280] mt-6 flex items-center justify-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin-slow" /> Polling for network confirmation
              </p>
            </div>
          )}

          {/* CRYPTO EXPIRED STATE */}
          {paymentMethod === "crypto" && cryptoPayment && paymentStatus === "expired" && (
            <div className="text-center py-8" data-testid="crypto-expired-section">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Expired</h3>
              <p className="text-[#6B7280] mb-6">The 30-minute window for this payment has closed.</p>
              <button
                onClick={() => {
                  setCryptoPayment(null);
                  setPaymentStatus(null);
                }}
                className="w-full bg-[#0F0F1A] text-white font-bold py-3 rounded-xl hover:bg-[#4040FF] transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] pt-32 pb-24 px-6 relative selection:bg-[#4040FF]/20 selection:text-[#4040FF]">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#4040FF]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-[#FF6B35]/5 blur-[100px] pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10">
        {!userChecked && renderEmailInput()}
        {userChecked && subscription?.active && renderActiveSubscription()}
        {userChecked && !subscription?.active && renderCheckout()}
      </div>
    </div>
  );
}
