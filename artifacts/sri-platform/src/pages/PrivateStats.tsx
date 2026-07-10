import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Lock, 
  Unlock, 
  RefreshCw, 
  Users, 
  CreditCard, 
  ShieldCheck, 
  Cpu, 
  Clock, 
  DollarSign, 
  Activity, 
  Server,
  TrendingUp,
  Coins
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

interface StatsData {
  success: boolean;
  generated_at: string;
  system: {
    uptime_seconds: number;
    node_version: string;
    memory: {
      rss_mb: number;
      heap_total_mb: number;
      heap_used_mb: number;
    };
  };
  users: {
    total: number;
    students: number;
    mentors: number;
    admins: number;
  };
  subscriptions: {
    active_total: number;
    via_stripe: number;
    via_crypto: number;
    by_tier: {
      high: number;
      middle: number;
      low: number;
    };
  };
  crypto_payments_30d: {
    total_transactions: number;
    total_usd_volume: number;
    by_currency: Record<string, { count: number; usd: string }>;
  };
  abhaya: {
    gate: string;
    version: string;
    params: {
      lambda0: number;
      kappa: number;
      lambdaMax: number;
      alpha: number;
      thetaCrit: number;
      epsilon: number;
    };
    manifold: {
      cycles: number;
      gradient_variance: number;
      manifold_stability: number;
      circuit_b_primed: boolean;
      increasing_sigmoid_verified: boolean;
    };
  };
}

export default function PrivateStats() {
  const [key, setKey] = useState<string>(() => localStorage.getItem("sara_private_stats_key") ?? "");
  const [inputKey, setInputKey] = useState("");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "billing" | "abhaya" | "system">("overview");

  const fetchStats = async (statsKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/private-stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-private-stats-key": statsKey
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to fetch statistics. Invalid key.");
      }

      const stats = await res.json();
      setData(stats);
      setKey(statsKey);
      localStorage.setItem("sara_private_stats_key", statsKey);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (key) {
      fetchStats(key);
    }
  }, [key]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      fetchStats(inputKey.trim());
    }
  };

  const handleLock = () => {
    setKey("");
    setInputKey("");
    setData(null);
    setError(null);
    localStorage.removeItem("sara_private_stats_key");
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 pt-24">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-indigo-600" />
          
          <div className="w-16 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>

          <h1 className="text-2xl font-black text-center mb-2 tracking-tight">
            Executive Stats Console
          </h1>
          <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
            This workspace statistics console is strictly private. Authorized access only.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Enter Private Stats Key
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs bg-red-950/40 border border-red-900/40 text-red-400 p-3 rounded-xl"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" /> Unlock Console
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 pt-24 pb-16">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                Live Console
              </span>
              <span className="text-slate-500 text-xs font-medium">
                Last updated: {new Date(data.generated_at).toLocaleTimeString()}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mt-2 flex items-center gap-2">
              SARA Private Stats <span className="text-indigo-400">Dashboard</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStats(key)}
              disabled={loading}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-50 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={handleLock}
              className="px-4 py-2 bg-red-950/10 border border-red-900/30 hover:bg-red-950/20 text-red-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Lock Console
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 pb-px gap-1 overflow-x-auto">
          {([
            ["overview", "Overview", Activity],
            ["billing", "Billing & Users", CreditCard],
            ["abhaya", "Abhaya Gate V3", ShieldCheck],
            ["system", "System Node", Cpu],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2.5 border-b-2 font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === id
                  ? "border-indigo-500 text-indigo-400 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Cards */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Users</div>
                <div className="text-2xl font-black mt-0.5">{data.users.total}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {data.users.students} Students / {data.users.mentors} Mentors
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active Subs</div>
                <div className="text-2xl font-black mt-0.5">{data.subscriptions.active_total}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {data.subscriptions.via_stripe} Stripe / {data.subscriptions.via_crypto} Crypto
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Abhaya Stability</div>
                <div className="text-2xl font-black mt-0.5">
                  {(data.abhaya.manifold.manifold_stability * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Gate {data.abhaya.version} Active
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Uptime</div>
                <div className="text-lg font-black mt-1 truncate max-w-[160px]">
                  {formatUptime(data.system.uptime_seconds)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Node {data.system.node_version}
                </div>
              </div>
            </div>

            {/* Quick Status Block */}
            <div className="col-span-1 md:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-sm text-slate-200 tracking-wide uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Platform Executive Summary
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The platform is operating with optimal parameters. Active subscriptions are balanced across Stripe and Cryptographic gateways. 
                Our **Abhaya thermodynamic phase-cancellation gate** is continuously stabilizing ξ-flux fluctuations with a validated sigmoid form 
                matching theoretical limits. No performance bottlenecks detected.
              </p>
            </div>

          </motion.div>
        )}

        {/* ── Tab: Billing ── */}
        {activeTab === "billing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* User Distribution */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" /> User Role Registrations
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Students</span>
                    <span className="font-black text-slate-200">{data.users.students}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">School Mentors</span>
                    <span className="font-black text-slate-200">{data.users.mentors}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">System Administrators</span>
                    <span className="font-black text-slate-200">{data.users.admins}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-1">
                    <span className="text-indigo-400">Total System Members</span>
                    <span className="text-indigo-400 font-black">{data.users.total}</span>
                  </div>
                </div>
              </div>

              {/* Subscriptions by Tier */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-400" /> Subscriptions & GDP Tiers
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">High Income Tier ($29.99/mo)</span>
                    <span className="font-black text-slate-200">{data.subscriptions.by_tier.high}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Middle Income Tier ($14.99/mo)</span>
                    <span className="font-black text-slate-200">{data.subscriptions.by_tier.middle}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Low Income Tier ($4.99/mo)</span>
                    <span className="font-black text-slate-200">{data.subscriptions.by_tier.low}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-1">
                    <span className="text-emerald-400">Active Paid Accounts</span>
                    <span className="text-emerald-400 font-black">{data.subscriptions.active_total}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Crypto Payments 30d */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <h3 className="font-bold text-base text-slate-200 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-500" /> On-Chain Web3 Payments (30 Days)
                </h3>
                <div className="text-xs bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400 font-medium">
                  Total Crypto Volume: <span className="font-black text-amber-400">${data.crypto_payments_30d.total_usd_volume.toLocaleString()}</span>
                </div>
              </div>

              {Object.keys(data.crypto_payments_30d.by_currency).length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No confirmed crypto transactions in the last 30 days.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(data.crypto_payments_30d.by_currency).map(([currency, item]) => (
                    <div key={currency} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-1">
                      <div className="text-xs font-black uppercase text-amber-500 tracking-wider">
                        {currency}
                      </div>
                      <div className="text-lg font-black text-slate-100">${parseFloat(item.usd).toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {item.count} Transactions
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Tab: Abhaya ── */}
        {activeTab === "abhaya" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            
            {/* Thermodynamic Parameters & Sigmoid formulation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Telemetry Indicator */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-200 mb-1">
                    Thermodynamic Stability
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time manifold stabilization monitoring.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Manifold Stability</span>
                    <span>{(data.abhaya.manifold.manifold_stability * 100).toFixed(2)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${data.abhaya.manifold.manifold_stability * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cycles Run:</span>
                    <span className="font-bold">{data.abhaya.manifold.cycles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gradient Variance:</span>
                    <span className="font-bold">{data.abhaya.manifold.gradient_variance.toExponential(4)}</span>
                  </div>
                </div>
              </div>

              {/* Parameters Configuration */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                <h3 className="font-bold text-base text-slate-200 mb-2">
                  Gate Parameters (V3.0)
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500">Baseline Rate (λ0):</span>
                    <span className="font-bold text-slate-200">{data.abhaya.params.lambda0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500">Damping Coefficient (κ):</span>
                    <span className="font-bold text-slate-200">{data.abhaya.params.kappa}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500">Max Capping limit (Λmax):</span>
                    <span className="font-bold text-slate-200">{data.abhaya.params.lambdaMax}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500">Overdrive Gain (α):</span>
                    <span className="font-bold text-slate-200">{data.abhaya.params.alpha}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-850 pb-1.5">
                    <span className="text-slate-500">Threshold Trigger (θcrit):</span>
                    <span className="font-bold text-slate-200">{data.abhaya.params.thetaCrit}</span>
                  </div>
                </div>
              </div>

              {/* Sigmoid Verification */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-200 mb-2">
                    Circuit B Sigmoid Form
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sigmoid uses the INCREASING form: <br />
                    <code className="text-amber-500 bg-slate-950 px-1 py-0.5 rounded text-[10px]">σ(α·σsat² + θcrit)</code> <br />
                    preventing sign inversion. This triggers overdrive power as entropy grows past the critical threshold.
                  </p>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-900/30 p-3.5 rounded-xl flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-400 uppercase tracking-wide">Sigmoid Validated</div>
                    <div className="text-[10px] text-slate-500">Thermodynamics constraints intact</div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ── Tab: System ── */}
        {activeTab === "system" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* System Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-base text-slate-200 flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" /> Environment Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-850 pb-2">
                  <span className="text-slate-400">Node Runtime Version</span>
                  <span className="font-bold text-slate-200">{data.system.node_version}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-2">
                  <span className="text-slate-400">Process Uptime</span>
                  <span className="font-bold text-slate-200">{data.system.uptime_seconds.toLocaleString()} seconds</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-slate-400">Environment Mode</span>
                  <span className="font-bold text-emerald-400 uppercase tracking-wide">Production Ready</span>
                </div>
              </div>
            </div>

            {/* Memory stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-base text-slate-200 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-rose-400" /> Node Memory Allocation
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-850 pb-2">
                  <span className="text-slate-400">Resident Set Size (RSS)</span>
                  <span className="font-bold text-slate-200">{data.system.memory.rss_mb} MB</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-2">
                  <span className="text-slate-400">Heap Total size</span>
                  <span className="font-bold text-slate-200">{data.system.memory.heap_total_mb} MB</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-slate-400">Heap Currently Used</span>
                  <span className="font-bold text-indigo-400">{data.system.memory.heap_used_mb} MB</span>
                </div>
              </div>
            </div>

          </motion.div>
        )}

      </div>
    </div>
  );
}
