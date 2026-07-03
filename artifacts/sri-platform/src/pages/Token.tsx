/**
 * SARA Rewards Token — simplified for students, all web3 logic preserved.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { fetchTokenInfo, TOKEN_ECONOMY, SARA_CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID } from "@/lib/sara";

interface TokenInfo {
  totalSupply: string;
  maxSupply: string;
  circulatingPct: number;
  contractAddress: string;
}

function useTokenInfo() {
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTokenInfo()
      .then(setInfo)
      .catch(() => setInfo({ totalSupply: "10,000,000", maxSupply: "100,000,000", circulatingPct: 10, contractAddress: SARA_CONTRACT_ADDRESS || "Not yet deployed" }))
      .finally(() => setLoading(false));
  }, []);
  return { info, loading };
}

function StatCard({ icon, label, value, sub, color = "border-border/60" }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className={`bg-card border ${color} rounded-2xl p-6 text-center`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-black text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const howToEarn = [
  { icon: "📚", title: "Complete lessons", desc: "Finish your daily learning goals and earn SARA rewards." },
  { icon: "🎯", title: "Hit your targets", desc: "Reach weekly milestones to unlock bonus rewards." },
  { icon: "🏆", title: "Ace challenges", desc: "Score well on challenges to earn extra SARA points." },
  { icon: "🤝", title: "Help others", desc: "Share knowledge and support other learners in the community." },
];

export default function Token() {
  const wallet = useWallet();
  const { info, loading: infoLoading } = useTokenInfo();
  const [delegateInput, setDelegateInput] = useState("");
  const [delegating, setDelegating] = useState(false);

  const isWrongNetwork = wallet.status === "wrong_network";
  const isConnected = wallet.status === "connected";

  const handleDelegate = async () => {
    if (!delegateInput) return;
    setDelegating(true);
    try { await wallet.delegateTo(delegateInput); setDelegateInput(""); }
    catch (e) { console.error(e); }
    finally { setDelegating(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-24">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <div className="w-20 h-20 bg-primary/15 border border-primary/30 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6 glow-red">
          🪙
        </div>
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary text-sm font-bold px-5 py-2 rounded-full mb-6">
          Ethereum · AWS Blockchain
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-foreground mb-4">
          SARA <span className="grad-red-purple">Rewards</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Earn SARA tokens as you learn. Use them to unlock features, vote on platform decisions,
          and be part of the SRI Learn community.
        </p>
        {SARA_CONTRACT_ADDRESS && (
          <div className="mt-6 inline-flex items-center gap-3 bg-card border border-border/60 px-5 py-2.5 rounded-xl">
            <span className="text-xs text-muted-foreground/60">Token address</span>
            <span className="font-mono text-sm text-secondary">
              {SARA_CONTRACT_ADDRESS.slice(0, 10)}…{SARA_CONTRACT_ADDRESS.slice(-8)}
            </span>
            <a href={`https://sepolia.etherscan.io/address/${SARA_CONTRACT_ADDRESS}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-primary hover:text-primary/80 transition-colors font-bold">
              View ↗
            </a>
          </div>
        )}
      </motion.div>

      {/* How to earn */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="mb-12">
        <h2 className="text-3xl font-black text-foreground text-center mb-8">How you earn SARA</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {howToEarn.map((h, i) => (
            <motion.div key={h.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="bg-card border border-border/60 rounded-2xl p-6 text-center hover:border-primary/40 transition-colors">
              <div className="text-4xl mb-3">{h.icon}</div>
              <h3 className="font-black text-foreground mb-1 text-sm">{h.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{h.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Wallet section */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mb-8">
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-8 py-5 border-b border-border/60 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-foreground">Your Wallet</h2>
              <p className="text-xs text-muted-foreground">Connect to see your SARA balance</p>
            </div>
            {isConnected && (
              <button onClick={wallet.disconnect}
                className="text-xs text-muted-foreground hover:text-foreground font-bold transition-colors">
                Disconnect
              </button>
            )}
          </div>

          <div className="p-8">
            {/* Not installed */}
            {wallet.status === "not_installed" && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🦊</div>
                <p className="text-xl font-black text-foreground mb-2">MetaMask not found</p>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Install MetaMask to connect your wallet and see your SARA rewards.
                </p>
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-primary text-white font-black px-8 py-3 rounded-xl glow-red hover:bg-primary/90 transition-all hover:scale-105">
                  Install MetaMask →
                </a>
              </div>
            )}

            {/* Wrong network */}
            {isWrongNetwork && (
              <div className="bg-primary/5 border border-primary/25 rounded-2xl p-6 flex items-start gap-4">
                <span className="text-3xl">⚠️</span>
                <div>
                  <p className="text-lg font-black text-foreground mb-1">Wrong Network</p>
                  <p className="text-muted-foreground mb-4">
                    Please switch to <strong>Ethereum Sepolia</strong> (chain {SEPOLIA_CHAIN_ID}) to use SARA tokens.
                  </p>
                  <button onClick={wallet.switchToSepolia}
                    className="bg-primary text-white font-black px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all hover:scale-105 glow-red">
                    Switch Network →
                  </button>
                </div>
              </div>
            )}

            {/* Idle / connecting */}
            {(wallet.status === "idle" || wallet.status === "connecting" || wallet.status === "error") && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">👛</div>
                <p className="text-xl font-black text-foreground mb-2">Connect your wallet</p>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Connect MetaMask to view your SARA balance and voting power.
                </p>
                {wallet.errorMessage && (
                  <p className="font-mono text-sm text-primary bg-primary/5 border border-primary/20 px-4 py-2 rounded-xl mb-5 inline-block">
                    {wallet.errorMessage}
                  </p>
                )}
                <button onClick={wallet.connect} disabled={wallet.status === "connecting"}
                  className="inline-flex items-center gap-2 bg-primary text-white font-black px-8 py-3 rounded-xl glow-red hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-60">
                  {wallet.status === "connecting" ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connecting…</>
                  ) : "Connect MetaMask"}
                </button>
              </div>
            )}

            {/* Connected */}
            {isConnected && (
              <div>
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border/60">
                  <div className="w-10 h-10 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center font-black text-sm text-primary">
                    {wallet.shortAddress?.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-foreground">{wallet.shortAddress}</p>
                    <p className="text-xs text-muted-foreground">Sepolia Testnet</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Connected
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 col-span-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">SARA Balance</p>
                    <p className="text-4xl font-black text-primary">{wallet.saraBalance ?? "—"}</p>
                    <p className="text-xs text-primary/60 mt-1">SARA tokens</p>
                  </div>
                  <div className="bg-card border border-border/60 rounded-2xl p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">ETH Balance</p>
                    <p className="text-3xl font-black text-foreground">{wallet.ethBalance ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">ETH</p>
                  </div>
                  <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Voting Power</p>
                    <p className="text-3xl font-black text-secondary">{wallet.votingPower ?? "—"}</p>
                    <p className="text-xs text-secondary/60 mt-1">SARA votes</p>
                  </div>
                </div>
                {wallet.saraBalance === "—" && !SARA_CONTRACT_ADDRESS && (
                  <p className="mt-5 text-xs text-primary bg-primary/5 border border-primary/20 px-4 py-2.5 rounded-xl">
                    ⚠ SARA contract not yet deployed. Set <code>VITE_SARA_CONTRACT_ADDRESS</code> after deploying.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Token economy */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="mb-8">
        <h2 className="text-3xl font-black text-foreground text-center mb-8">Token Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon="🏦" label="Max Supply" value="100M" sub="SARA tokens total" color="border-primary/30" />
          <StatCard icon="✅" label="In Circulation" value={infoLoading ? "…" : `${info?.totalSupply ?? "10M"}`} sub="currently issued" color="border-secondary/30" />
          <StatCard icon="📊" label="Distributed" value={infoLoading ? "…" : `${info?.circulatingPct ?? 10}%`} sub="of max supply" />
          <StatCard icon="⛓️" label="Network" value="Sepolia" sub="Ethereum testnet" />
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-5">How SARA tokens are shared</p>
          <div className="h-4 flex rounded-full overflow-hidden border border-border/40 mb-6">
            {TOKEN_ECONOMY.tranches.map(t => (
              <div key={t.label} style={{ width: `${t.pct}%`, background: t.color }} title={`${t.label}: ${t.pct}%`} />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TOKEN_ECONOMY.tranches.map(t => (
              <div key={t.label} className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: t.color }} />
                <div>
                  <p className="font-black text-foreground text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.tokens.toLocaleString()} SARA · {t.pct}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Governance */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="mb-8">
        <div className="bg-card border border-secondary/30 rounded-2xl p-8 glow-purple relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
          <div className="flex items-start gap-4 mb-6">
            <span className="text-4xl">🗳️</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Coming Soon</p>
              <h3 className="text-2xl font-black text-foreground mb-2">Vote on SRI Learn's Future</h3>
              <p className="text-muted-foreground leading-relaxed max-w-lg">
                SARA holders will be able to vote on new features, content decisions, and how the platform evolves.
                The more SARA you earn, the more say you have in shaping SRI Learn.
              </p>
            </div>
          </div>

          {isConnected && SARA_CONTRACT_ADDRESS && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <p className="font-black text-foreground mb-1">Activate your voting power now</p>
              <p className="text-sm text-muted-foreground mb-4">
                Delegate your SARA votes to yourself to get ready for governance voting.
              </p>
              <div className="flex gap-2">
                <input type="text" value={delegateInput} onChange={e => setDelegateInput(e.target.value)}
                  placeholder="Your wallet address (0x…)"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 rounded-xl font-mono text-sm focus:outline-none focus:border-secondary/50" />
                <button onClick={() => setDelegateInput(wallet.address ?? "")}
                  className="px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground text-xs font-bold rounded-xl transition-colors">
                  Me
                </button>
                <button onClick={handleDelegate} disabled={!delegateInput || delegating}
                  className="px-5 py-2 bg-secondary text-white font-black text-sm rounded-xl hover:bg-secondary/90 transition-all disabled:opacity-50">
                  {delegating ? "…" : "Delegate"}
                </button>
              </div>
              {wallet.delegate && wallet.delegate !== "0x0000000000000000000000000000000000000000" && (
                <p className="text-xs text-muted-foreground mt-3">
                  Delegated to: <span className="font-mono text-secondary">{wallet.delegate}</span>
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            {["Earn while you learn", "Vote on new features", "Community rewards", "DAO Treasury (40M SARA)"].map(chip => (
              <span key={chip} className="text-xs font-semibold px-3 py-1.5 border border-secondary/20 text-secondary/80 rounded-full">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

    </div>
  );
}
