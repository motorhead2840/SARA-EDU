import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Terminal, ShieldAlert, Cpu, Zap, CreditCard, Wallet, Copy, CheckCircle2, ArrowLeft, Loader2, Key, Landmark } from 'lucide-react';

// API fetchers
const fetchPlans = async (countryCode: string) => {
  const url = new URL(window.location.origin + '/api/subscription/plans');
  if (countryCode) url.searchParams.set('country_code', countryCode);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch plans');
  return res.json();
};

const fetchStatus = async (email: string) => {
  if (!email) return null;
  const url = new URL(window.location.origin + '/api/subscription/status');
  url.searchParams.set('email', email);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
};

const checkoutFiat = async ({ email, country_code, payment_category }: { email: string; country_code: string; payment_category?: string }) => {
  const res = await fetch('/api/subscription/checkout/fiat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, country_code, payment_category }),
  });
  if (!res.ok) throw new Error('Checkout failed');
  return res.json();
};

const checkoutCrypto = async ({ email, currency, country_code }: { email: string; currency: string; country_code: string }) => {
  const res = await fetch('/api/subscription/checkout/crypto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, currency, country_code }),
  });
  if (!res.ok) throw new Error('Crypto checkout failed');
  return res.json();
};

const fetchCryptoStatus = async (paymentId: string) => {
  const res = await fetch(`/api/subscription/crypto/status/${paymentId}`);
  if (!res.ok) throw new Error('Failed to fetch crypto status');
  return res.json();
};

export default function Subscribe() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'crypto' | 'bank' | null>(null);
  const [bankAccountType, setBankAccountType] = useState<'checking' | 'savings'>('checking');
  const [selectedCrypto, setSelectedCrypto] = useState<string>('usdc');
  const [cryptoPayment, setCryptoPayment] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(email), 500);
    return () => clearTimeout(timer);
  }, [email]);

  const { data: plans, isLoading: isPlansLoading } = useQuery({
    queryKey: ['subscription_plans', countryCode],
    queryFn: () => fetchPlans(countryCode),
  });

  const { data: subStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ['subscription_status', debouncedEmail],
    queryFn: () => fetchStatus(debouncedEmail),
    enabled: !!debouncedEmail && debouncedEmail.includes('@'),
  });

  const fiatMutation = useMutation({
    mutationFn: checkoutFiat,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    }
  });

  const cryptoMutation = useMutation({
    mutationFn: checkoutCrypto,
    onSuccess: (data) => {
      setCryptoPayment(data);
    }
  });

  const { data: cryptoStatusData } = useQuery({
    queryKey: ['crypto_status', cryptoPayment?.payment_id],
    queryFn: () => fetchCryptoStatus(cryptoPayment.payment_id),
    enabled: !!cryptoPayment && cryptoPayment.status !== 'confirmed',
    refetchInterval: (query) => {
      if (query?.state?.data?.status === 'confirmed' || query?.state?.data?.status === 'expired') {
        return false;
      }
      return 5000;
    },
  });

  const effectiveCryptoStatus = cryptoStatusData?.status || cryptoPayment?.status || 'pending';

  // Countdown timer for crypto
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  useEffect(() => {
    if (!cryptoPayment?.expires_at || effectiveCryptoStatus !== 'pending') return;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(cryptoPayment.expires_at).getTime();
      const diff = expiry - now;
      
      if (diff <= 0) {
        setTimeLeft('00:00');
        return;
      }
      
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [cryptoPayment, effectiveCryptoStatus]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTier = subStatus?.active ? subStatus.tier : null;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-black text-system font-mono overflow-y-auto selection:bg-system/30 selection:text-system pb-20">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-system/20 bg-black/80 backdrop-blur sticky top-0 z-10 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-system/60 hover:text-system transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Zap className="w-6 h-6 text-user" />
              <div className="absolute inset-0 bg-user/20 blur-md rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-widest text-glow-user text-user uppercase leading-tight">Uplink_Node</h1>
              <div className="text-[10px] uppercase text-system/60 tracking-[0.2em]">Subscription_Terminal</div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-8 relative z-0 mt-8">
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(6,182,212,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:40px_40px] -z-10"></div>

        {/* Status Display if Active */}
        {activeTier && (
          <div className="border border-mentor/50 bg-mentor/5 p-6 relative overflow-hidden" data-testid="active-subscription">
            <div className="absolute top-0 left-0 w-1 h-full bg-mentor"></div>
            <div className="flex items-start gap-4">
              <ShieldAlert className="w-8 h-8 text-mentor shrink-0 mt-1" />
              <div className="space-y-2">
                <h2 className="text-mentor uppercase tracking-widest font-bold text-glow-mentor">Active_Clearance: {activeTier}</h2>
                <p className="text-mentor/70 text-sm">
                  Identity <span className="text-mentor">{email}</span> confirmed.
                  Clearance expires: {new Date(subStatus.expires_at).toLocaleDateString()}
                </p>
                <div className="pt-4 border-t border-mentor/20 mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-mentor/50 mb-2">Unlocked_Features</div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-mentor/80">
                    {subStatus.features?.map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-mentor" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form area if not confirmed crypto payment */}
        {effectiveCryptoStatus !== 'confirmed' && (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-system/60">
                <Key className="w-4 h-4" /> <span>01_Identity_Verification</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-system/50">Email_Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="OPERATIVE@DOMAIN.COM"
                    className="w-full bg-black border border-system/30 p-3 text-system placeholder:text-system/20 focus:outline-none focus:border-system focus:ring-1 focus:ring-system transition-all uppercase"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-system/50">Country_Override (Optional)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                    placeholder={plans?.detected_country || "XX"}
                    className="w-full bg-black border border-system/30 p-3 text-system placeholder:text-system/20 focus:outline-none focus:border-system focus:ring-1 focus:ring-system transition-all uppercase"
                    data-testid="input-country"
                  />
                </div>
              </div>
            </section>

            {isPlansLoading ? (
              <div className="flex items-center gap-2 text-system/50 uppercase text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Fetching_Tiers...
              </div>
            ) : plans ? (
              <section className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-system/60 border-t border-system/20 pt-8">
                  <Cpu className="w-4 h-4" /> <span>02_Select_Hardware_Tier</span>
                </div>
                
                <div className="border border-user/30 bg-user/5 p-6 relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-user"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-user text-glow-user uppercase">{plans.tier_label || 'Pro_Access'}</h3>
                      <div className="text-xs text-user/60 uppercase mt-1">Tier: {plans.tier} | Loc: {plans.detected_country}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-user">${plans.usd_price}</div>
                      <div className="text-[10px] text-user/60 uppercase">USD / Month</div>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-4">
                    <div className="text-[10px] uppercase tracking-wider text-user/50 mb-2">Select_Transaction_Protocol</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button
                        onClick={() => setPaymentMethod('fiat')}
                        className={`flex flex-col items-center gap-3 p-4 border transition-all ${
                          paymentMethod === 'fiat' 
                            ? 'border-user bg-user/10 text-user' 
                            : 'border-system/20 text-system/60 hover:border-user/50 hover:text-user'
                        }`}
                        data-testid="btn-fiat"
                      >
                        <CreditCard className="w-6 h-6" />
                        <span className="uppercase text-[10px] sm:text-xs font-bold tracking-wider">Fiat_Gateway</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('bank')}
                        className={`flex flex-col items-center gap-3 p-4 border transition-all ${
                          paymentMethod === 'bank' 
                            ? 'border-user bg-user/10 text-user' 
                            : 'border-system/20 text-system/60 hover:border-user/50 hover:text-user'
                        }`}
                        data-testid="bank-tab"
                      >
                        <Landmark className="w-6 h-6" />
                        <span className="uppercase text-[10px] sm:text-xs font-bold tracking-wider">Bank_Transfer</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('crypto')}
                        className={`flex flex-col items-center gap-3 p-4 border transition-all ${
                          paymentMethod === 'crypto' 
                            ? 'border-user bg-user/10 text-user' 
                            : 'border-system/20 text-system/60 hover:border-user/50 hover:text-user'
                        }`}
                        data-testid="btn-crypto"
                      >
                        <Wallet className="w-6 h-6" />
                        <span className="uppercase text-[10px] sm:text-xs font-bold tracking-wider">Web3_Direct</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Details */}
                  {paymentMethod === 'fiat' && (
                    <div className="mt-6 pt-6 border-t border-user/20 animate-fade-in">
                      <button
                        onClick={() => fiatMutation.mutate({ email, country_code: countryCode || plans.detected_country })}
                        disabled={!email || fiatMutation.isPending}
                        className="w-full py-4 border border-user text-user font-bold uppercase tracking-widest hover:bg-user/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        data-testid="checkout-fiat"
                      >
                        {fiatMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                        {fiatMutation.isPending ? 'Establishing_Connection...' : 'Initialize_Stripe_Node'}
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'bank' && (
                    <div className="mt-6 pt-6 border-t border-user/20 animate-fade-in space-y-6">
                      <div className="space-y-4">
                        <div className="text-xs text-user/80 uppercase">Available for parents and students with a verified bank account</div>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setBankAccountType('checking')}
                            className={`flex-1 p-3 border transition-all uppercase text-xs font-bold tracking-wider ${bankAccountType === 'checking' ? 'border-user bg-user/20 text-user' : 'border-system/20 text-system/60 hover:border-user/30 hover:text-user'}`}
                            data-testid="account-type-checking"
                          >
                            Checking_Account
                          </button>
                          <button 
                            onClick={() => setBankAccountType('savings')}
                            className={`flex-1 p-3 border transition-all uppercase text-xs font-bold tracking-wider ${bankAccountType === 'savings' ? 'border-user bg-user/20 text-user' : 'border-system/20 text-system/60 hover:border-user/30 hover:text-user'}`}
                            data-testid="account-type-savings"
                          >
                            Savings_Account
                          </button>
                        </div>
                        <div className="text-[10px] text-system/60 leading-relaxed uppercase border border-system/20 p-4 bg-black">
                          STRIPE_VERIFIED — your bank account is verified in real-time via Stripe Financial Connections before any charge is processed. Only parents and students with a valid bank account can use this option.
                        </div>
                      </div>

                      <button
                        onClick={() => fiatMutation.mutate({ email, country_code: countryCode || plans.detected_country, payment_category: 'bank' })}
                        disabled={!email || fiatMutation.isPending}
                        className="w-full py-4 border border-user text-user font-bold uppercase tracking-widest hover:bg-user/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        data-testid="bank-pay-button"
                      >
                        {fiatMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Landmark className="w-5 h-5" />}
                        {fiatMutation.isPending ? 'Verifying_Connection...' : 'Verify_And_Pay'}
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'crypto' && !cryptoPayment && (
                    <div className="mt-6 pt-6 border-t border-user/20 animate-fade-in space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase text-user/50">Select_Asset</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {Object.entries(plans.crypto || {}).map(([symbol, data]: [string, any]) => (
                            <button
                              key={symbol}
                              onClick={() => setSelectedCrypto(symbol)}
                              className={`p-3 border text-center transition-all ${
                                selectedCrypto === symbol
                                  ? 'border-user bg-user/20 text-user'
                                  : 'border-system/20 text-system/60 hover:border-user/30'
                              }`}
                            >
                              <div className="font-bold uppercase">{symbol}</div>
                              <div className="text-[10px] opacity-70 truncate">{data.amount}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => cryptoMutation.mutate({ email, currency: selectedCrypto, country_code: countryCode || plans.detected_country })}
                        disabled={!email || !selectedCrypto || cryptoMutation.isPending}
                        className="w-full py-4 border border-user text-user font-bold uppercase tracking-widest hover:bg-user/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        data-testid="checkout-crypto"
                      >
                        {cryptoMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                        {cryptoMutation.isPending ? 'Generating_Address...' : 'Generate_Payment_Vector'}
                      </button>
                    </div>
                  )}

                  {/* Active Crypto Payment Awaiting Transfer */}
                  {paymentMethod === 'crypto' && cryptoPayment && effectiveCryptoStatus === 'pending' && (
                    <div className="mt-6 pt-6 border-t border-user/20 animate-fade-in space-y-6">
                      <div className="bg-black border border-user/50 p-6 space-y-6 relative overflow-hidden">
                        {/* Scanning effect */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-user/30 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-[scan_2s_linear_infinite]"></div>

                        <div className="flex justify-between items-end border-b border-user/20 pb-4">
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase text-user/50 tracking-wider">Awaiting_Transfer</div>
                            <div className="text-2xl font-bold text-user text-glow-user">
                              {cryptoPayment.amount} <span className="uppercase">{cryptoPayment.currency}</span>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-[10px] uppercase text-user/50 tracking-wider">Vector_Expires</div>
                            <div className="text-xl font-mono text-system">{timeLeft}</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-user/50">Destination_Address</label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 p-4 bg-user/5 border border-user/30 text-user/90 text-sm sm:text-base break-all" data-testid="crypto-address">
                              {cryptoPayment.wallet_address}
                            </code>
                            <button
                              onClick={() => handleCopy(cryptoPayment.wallet_address)}
                              className="p-4 border border-user/30 bg-user/10 text-user hover:bg-user/20 transition-colors"
                              title="Copy Address"
                            >
                              {copied ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <Copy className="w-5 h-5 sm:w-6 sm:h-6" />}
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-user/60 uppercase leading-relaxed text-center pt-2">
                          <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                          Polling network for transaction verification...
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'crypto' && effectiveCryptoStatus === 'expired' && (
                    <div className="mt-6 pt-6 border-t border-destructive/20 text-center animate-fade-in">
                      <ShieldAlert className="w-8 h-8 text-destructive mx-auto mb-3" />
                      <div className="text-destructive font-bold uppercase tracking-widest mb-1">Payment_Vector_Expired</div>
                      <div className="text-xs text-destructive/70 mb-4">The allotted time window has closed.</div>
                      <button
                        onClick={() => setCryptoPayment(null)}
                        className="px-6 py-2 border border-destructive/50 text-destructive hover:bg-destructive/10 uppercase text-xs"
                      >
                        Generate_New_Vector
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        )}

        {/* Success State */}
        {effectiveCryptoStatus === 'confirmed' && (
          <div className="border border-system bg-system/5 p-8 text-center space-y-6 animate-fade-in" data-testid="crypto-success">
            <div className="relative inline-block mx-auto">
              <CheckCircle2 className="w-16 h-16 text-system text-glow-system relative z-10" />
              <div className="absolute inset-0 bg-system/30 blur-xl rounded-full animate-pulse"></div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-system uppercase tracking-widest text-glow-system">Clearance_Upgraded</h2>
              <p className="text-system/70 max-w-md mx-auto text-sm leading-relaxed">
                Transaction {cryptoPayment?.payment_id?.substring(0, 8)} confirmed. Neural pathways unlocked.
              </p>
            </div>

            <div className="pt-6 border-t border-system/20 max-w-sm mx-auto space-y-3 text-left">
              <div className="text-[10px] uppercase text-system/50 tracking-wider text-center mb-4">Privileges_Acquired</div>
              <div className="flex items-center gap-3 p-3 bg-black border border-system/30">
                <Zap className="w-4 h-4 text-system" />
                <span className="text-xs uppercase">Unrestricted Socratic Queries</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-black border border-system/30">
                <Cpu className="w-4 h-4 text-system" />
                <span className="text-xs uppercase">Circuit A & B Access</span>
              </div>
            </div>

            <div className="pt-8">
              <Link href="/">
                <button className="px-8 py-4 border border-system text-system font-bold uppercase tracking-widest hover:bg-system/10 transition-colors w-full sm:w-auto">
                  Return_To_Terminal
                </button>
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]"></div>
    </div>
  );
}
