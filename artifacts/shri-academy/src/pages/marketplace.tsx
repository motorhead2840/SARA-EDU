import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Bitcoin, Cpu, ShoppingCart, Zap, ExternalLink, Mail, MapPin,
  RefreshCw, Package, Hammer, Server, Wallet, ArrowUpRight,
  ArrowDownLeft, ChevronRight, Shield, Radio, Star, AlertTriangle,
  Recycle, Smartphone, Monitor, HardDrive, Gamepad2, Tablet,
  Clock, CheckCircle, Info, Terminal, BarChart2, Activity
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'crypto' | 'icarus' | 'altairtech' | 'iowa' | 'pawnshop';

interface Product {
  name: string;
  price: string;
  originalPrice?: string;
  hashrate?: string;
  power?: string;
  efficiency?: string;
  badge?: 'SALE' | 'PREORDER' | 'HOT' | 'NEW';
  rating?: string;
  url: string;
}

interface CryptoAsset {
  symbol: string;
  name: string;
  price: string;
  change: string;
  positive: boolean;
  color: string;
  glowClass: string;
  icon: React.ReactNode;
  walletEnv: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const ALTAIR_COMMERCIAL: Product[] = [
  { name: 'Bitmain Antminer S21 XP 270T', price: '$3,849', originalPrice: '$3,949', hashrate: '270 TH/s', power: '3,600W', efficiency: '13.3 J/T', badge: 'SALE', url: 'https://altairtech.io/shop/' },
  { name: 'Bitdeer Sealminer A2 Pro', price: '$3,649', hashrate: 'N/A', power: 'N/A', efficiency: 'N/A', badge: 'HOT', url: 'https://altairtech.io/shop/' },
  { name: 'Bitmain Antminer S21++', price: '$2,099', hashrate: '235 TH/s', power: '3,500W', efficiency: '14.9 J/T', url: 'https://altairtech.io/shop/' },
  { name: 'Bitmain Antminer S21 Pro+', price: '$2,509', hashrate: '200 TH/s', power: '2,700W', efficiency: '13.5 J/T', url: 'https://altairtech.io/shop/' },
  { name: 'Bitmain Antminer L9 (Dogecoin/LTC)', price: '$3,149', originalPrice: '$3,299', hashrate: '16 GH/s', power: '3,260W', badge: 'SALE', url: 'https://altairtech.io/shop/' },
  { name: 'Bitmain Antminer S19k Pro', price: '$599', hashrate: '120 TH/s', power: '2,760W', efficiency: '23 J/T', rating: '5.0', url: 'https://altairtech.io/shop/' },
];

const ALTAIR_HOME: Product[] = [
  { name: 'Canaan Avalon Q 90T — Home Miner', price: '$1,299', originalPrice: '$1,888', hashrate: '90 TH/s', power: '3,010W', badge: 'SALE', rating: '5.0', url: 'https://altairtech.io/shop/' },
  { name: 'Hammer Miner BC04 Desktop 6T', price: '$199', originalPrice: '$259', hashrate: '6 TH/s', power: '96W', efficiency: '16 J/T', badge: 'SALE', url: 'https://altairtech.io/shop/' },
  { name: 'Hammer Miner BC08 12TH Desktop', price: '$669', hashrate: '12 TH/s', badge: 'PREORDER', url: 'https://altairtech.io/shop/' },
  { name: 'Hammer Miner Thor X1 3.6T', price: '$249', hashrate: '3.6 TH/s', badge: 'PREORDER', url: 'https://altairtech.io/shop/' },
  { name: 'Canaan Avalon Nano 3S', price: '$195', originalPrice: '$299', hashrate: '4 TH/s', power: '140W', badge: 'SALE', rating: '4.92', url: 'https://altairtech.io/shop/' },
  { name: 'NerdMiner V2 (Educational)', price: '$44.99', hashrate: 'Solo lottery', badge: 'NEW', rating: '4.10', url: 'https://altairtech.io/shop/' },
];

const ALTAIR_PARTS: Product[] = [
  { name: 'Antminer Hashboard (S19/S21 series)', price: '$139–$1,199', rating: '4.75', url: 'https://altairtech.io/shop/' },
  { name: 'Bitmain APW3++ PSU 1600W', price: '$74.99', originalPrice: '$149.99', badge: 'SALE', rating: '5.0', url: 'https://altairtech.io/shop/' },
  { name: 'APW17 Bitmain PSU', price: '$289', rating: '5.0', url: 'https://altairtech.io/shop/' },
  { name: 'Canaan Avalon 120mm Cooling Fan', price: '$19.99', url: 'https://altairtech.io/shop/' },
  { name: 'Antminer ASIC Chips', price: '$7.99–$59', url: 'https://altairtech.io/shop/' },
  { name: 'ePIC UMC Universal Control Board V4 (S19/S21)', price: '$139.99', rating: '4.71', url: 'https://altairtech.io/shop/' },
  { name: 'Njord Cloudline Fan Controller', price: '$59.99', rating: '5.0', url: 'https://altairtech.io/shop/' },
];

const ICARUS_EDITIONS = [
  { name: 'Timeline Edition (Monthly)', desc: 'Monthly limited-run art cards by rotating artists. Each edition captures a snapshot of Bitcoin history. Keyless design — pure collectible canvas.', price: 'Under $15', availability: 'Monthly drop', badge: 'ONGOING' },
  { name: '4th Halving Gold Edition', desc: 'Commemorating the 2024 Bitcoin halving. Designed by RebelMoney. Gold-finish premium collectible.', price: 'Auction', availability: 'Past — resale market', badge: 'SOLD OUT' },
  { name: '4th Halving Silver & Copper Edition', desc: 'Pair edition to the Gold Halving card. Two metal finishes celebrating Bitcoin\'s 4th halving event.', price: 'Auction', availability: 'Past — resale market', badge: 'SOLD OUT' },
  { name: 'Skull Edition', desc: 'Dark limited-run collector\'s series. 21 auction lots. Memento mori meets Bitcoin. A fan favourite.', price: 'Auction / 21 lots', availability: 'Past — resale market', badge: 'SOLD OUT' },
  { name: 'Sticker Edition (Keyless Cards)', desc: 'The inaugural Icarus drop — the foundation. Premium card stock with keyless design. Low serial numbers reserved for Coldkey community.', price: 'Under $15', availability: 'Limited stock', badge: 'AVAILABLE' },
  { name: 'Hat Edition (10 Designs)', desc: '10 unique hat-themed Bitcoin card designs. A fun collector\'s series for Bitcoin hat wearers.', price: 'Past sale', availability: 'Check forum thread', badge: 'CHECK' },
];

const PAWN_CATEGORIES = [
  { icon: <Smartphone className="w-5 h-5" />, label: 'Smartphones', examples: 'iPhone, Samsung Galaxy, Google Pixel', sara_rate: '50–800 SARA' },
  { icon: <Monitor className="w-5 h-5" />, label: 'GPUs / Graphics Cards', examples: 'NVIDIA RTX, AMD Radeon', sara_rate: '200–3,000 SARA' },
  { icon: <HardDrive className="w-5 h-5" />, label: 'Laptops & Computers', examples: 'MacBook, ThinkPad, Dell XPS', sara_rate: '100–2,000 SARA' },
  { icon: <Tablet className="w-5 h-5" />, label: 'Tablets', examples: 'iPad, Surface, Fire HD', sara_rate: '30–500 SARA' },
  { icon: <Gamepad2 className="w-5 h-5" />, label: 'Game Consoles', examples: 'PS5, Xbox Series X, Switch', sara_rate: '100–800 SARA' },
  { icon: <Cpu className="w-5 h-5" />, label: 'CPUs / Mining Hardware', examples: 'ASIC parts, old rigs, CPUs', sara_rate: '50–5,000 SARA' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({ id, label, icon, active, onClick }: { id: Tab; label: string; icon: React.ReactNode; active: boolean; onClick: (t: Tab) => void }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs uppercase tracking-widest font-bold transition-all whitespace-nowrap ${
        active
          ? 'border-system text-system text-glow-system bg-system/10'
          : 'border-transparent text-system/40 hover:text-system/70 hover:border-system/40'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Badge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    SALE: 'bg-user/20 text-user border-user/50',
    PREORDER: 'bg-mentor/20 text-mentor border-mentor/50',
    HOT: 'bg-red-500/20 text-red-400 border-red-500/50',
    NEW: 'bg-green-500/20 text-green-400 border-green-500/50',
    ONGOING: 'bg-system/20 text-system border-system/50',
    AVAILABLE: 'bg-green-500/20 text-green-400 border-green-500/50',
    'SOLD OUT': 'bg-system/10 text-system/40 border-system/20',
    CHECK: 'bg-mentor/20 text-mentor border-mentor/50',
  };
  return (
    <span className={`text-[9px] px-2 py-0.5 border font-bold tracking-wider uppercase ${styles[type] ?? 'bg-system/10 text-system/40 border-system/20'}`}>
      {type}
    </span>
  );
}

function ProductCard({ p }: { p: Product }) {
  return (
    <div className="border border-system/20 bg-black/60 p-4 hover:border-system/50 hover:bg-system/5 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {p.badge && <Badge type={p.badge} />}
            {p.rating && (
              <span className="text-[9px] text-user/70 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-current" />{p.rating}
              </span>
            )}
          </div>
          <p className="text-system/90 text-sm font-bold leading-tight">{p.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-user font-bold text-base text-glow-user">{p.price}</p>
          {p.originalPrice && (
            <p className="text-system/30 text-xs line-through">{p.originalPrice}</p>
          )}
        </div>
      </div>
      {(p.hashrate || p.power || p.efficiency) && (
        <div className="flex gap-3 text-[10px] text-system/50 uppercase tracking-wider border-t border-system/10 pt-2 mt-2">
          {p.hashrate && <span><span className="text-system/30">HASH:</span> {p.hashrate}</span>}
          {p.power && <span><span className="text-system/30">PWR:</span> {p.power}</span>}
          {p.efficiency && <span><span className="text-system/30">EFF:</span> {p.efficiency}</span>}
        </div>
      )}
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-system/50 hover:text-system transition-colors group-hover:text-system/80"
      >
        <ExternalLink className="w-3 h-3" /> View on Altairtech.io
      </a>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-l-2 border-system pl-4 mb-6">
      <h3 className="text-system text-xs uppercase tracking-[0.3em] font-bold">{title}</h3>
      {subtitle && <p className="text-system/40 text-xs mt-0.5">{subtitle}</p>}
    </div>
  );
}

function VendorBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 border border-system/30 text-system/60 uppercase tracking-wider">
      <CheckCircle className="w-2.5 h-2.5 text-green-400" /> {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Crypto Tab
// ---------------------------------------------------------------------------

function CryptoTab() {
  const [refreshing, setRefreshing] = useState(false);

  const SARA_ADDRESS = import.meta.env.VITE_CRYPTO_SARA_ADDRESS ?? '0x…';
  const ETH_ADDRESS  = import.meta.env.VITE_CRYPTO_ETH_ADDRESS  ?? 'Coming soon';
  const BTC_ADDRESS  = import.meta.env.VITE_CRYPTO_BTC_ADDRESS  ?? 'Coming soon';

  const assets: CryptoAsset[] = [
    {
      symbol: 'SARA', name: 'SARA Token', price: '$0.012', change: '+3.4%', positive: true,
      color: 'text-mentor', glowClass: 'border-mentor/40 bg-mentor/5',
      icon: <Shield className="w-6 h-6 text-mentor" />, walletEnv: SARA_ADDRESS,
    },
    {
      symbol: 'BTC', name: 'Bitcoin', price: '$63,322', change: '+1.2%', positive: true,
      color: 'text-user', glowClass: 'border-user/40 bg-user/5',
      icon: <Bitcoin className="w-6 h-6 text-user" />, walletEnv: BTC_ADDRESS,
    },
    {
      symbol: 'ETH', name: 'Ethereum', price: '$3,412', change: '-0.8%', positive: false,
      color: 'text-system', glowClass: 'border-system/40 bg-system/5',
      icon: <Zap className="w-6 h-6 text-system" />, walletEnv: ETH_ADDRESS,
    },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border border-system/20 bg-system/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-system" />
            <div>
              <p className="text-system text-xs uppercase tracking-[0.2em] font-bold">SARA Token Wallet Hub</p>
              <p className="text-system/40 text-[10px] uppercase">Manage SARA · BTC · ETH from one terminal</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 text-system/50 hover:text-system text-[10px] uppercase tracking-wider transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Asset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assets.map(a => (
          <div key={a.symbol} className={`border ${a.glowClass} p-5 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-24 h-24 opacity-5">{a.icon}</div>
            <div className="flex items-center gap-3 mb-4">
              {a.icon}
              <div>
                <p className={`font-bold text-sm uppercase tracking-widest ${a.color}`}>{a.symbol}</p>
                <p className="text-system/40 text-[10px]">{a.name}</p>
              </div>
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 border ${a.positive ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
                {a.change}
              </span>
            </div>

            <p className={`text-2xl font-bold mb-1 ${a.color}`}>{a.price}</p>
            <p className="text-system/30 text-[10px] uppercase tracking-wider mb-4">USD price · live</p>

            {/* Wallet address */}
            <div className="border border-system/10 bg-black/50 p-2 rounded-none mb-3">
              <p className="text-system/30 text-[9px] uppercase tracking-wider mb-1">Receive Address</p>
              <p className="text-system/70 text-[10px] font-mono break-all">{a.walletEnv}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className={`flex-1 flex items-center justify-center gap-1.5 py-2 border ${a.glowClass.replace('bg-', 'hover:bg-').replace('/5', '/10')} border-${a.symbol === 'BTC' ? 'user' : a.symbol === 'SARA' ? 'mentor' : 'system'}/30 text-[10px] uppercase tracking-wider transition-colors ${a.color}`}>
                <ArrowDownLeft className="w-3 h-3" /> Receive
              </button>
              <button className={`flex-1 flex items-center justify-center gap-1.5 py-2 border border-system/20 hover:border-system/40 text-system/50 hover:text-system text-[10px] uppercase tracking-wider transition-colors`}>
                <ArrowUpRight className="w-3 h-3" /> Send
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Market ticker */}
      <div className="border border-system/20 p-4">
        <div className="flex items-center gap-3 mb-4">
          <BarChart2 className="w-4 h-4 text-system/60" />
          <p className="text-system/60 text-[10px] uppercase tracking-[0.2em]">Network Snapshot — Altairtech Feed</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
          {[
            { label: 'BTC Price', value: '$63,322 USD' },
            { label: 'Hashprice', value: '30 USD/PH/day' },
            { label: 'Network Hashrate', value: '954 EH/s' },
            { label: 'Diff. Adjustment', value: '-0.54% (Jul 11)' },
          ].map(s => (
            <div key={s.label} className="border border-system/10 p-3">
              <p className="text-system/30 text-[9px] uppercase tracking-wider">{s.label}</p>
              <p className="text-system font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SARA token info */}
      <div className="border border-mentor/30 bg-mentor/5 p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-mentor shrink-0 mt-0.5" />
          <div>
            <p className="text-mentor text-xs uppercase tracking-[0.2em] font-bold mb-2">About SARA Token</p>
            <p className="text-system/60 text-xs leading-relaxed mb-3">
              SARA is the native ERC-20 utility token of the SRI Contemplative AI Platform.
              It is used for subscription access, mentor rewards, content licensing, and
              now — to purchase items in the Shri Academy Marketplace and redeem value at
              the Electronics Pawn Shop. SARA is cryptographically secured on the Ethereum
              network and accepted alongside BTC and ETH.
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase text-mentor/70">
              <VendorBadge label="ERC-20 Token" />
              <VendorBadge label="Ethereum Network" />
              <VendorBadge label="Accepted in Marketplace" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icarus Tab
// ---------------------------------------------------------------------------

function IcarusTab() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border border-user/30 bg-user/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 border border-user/40 bg-user/10 flex items-center justify-center shrink-0">
            <span className="text-user font-bold text-xl">I</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-user font-bold uppercase tracking-[0.2em] text-sm text-glow-user">Project Icarus</h2>
              <Badge type="AVAILABLE" />
            </div>
            <p className="text-system/60 text-xs leading-relaxed mb-3">
              Born from the ashes of Coldkey — Project Icarus brings premium collectible Bitcoin art cards to
              the community at an affordable price. Keyless design (Stage 1), with BIP38 cold storage options
              coming in Stage 2. Each monthly Timeline Edition is hand-designed by rotating community artists.
              Low serial numbers are reserved for the Coldkey community.
            </p>
            <div className="flex flex-wrap gap-2">
              <VendorBadge label="Community Project" />
              <VendorBadge label="Forum Verified" />
              <VendorBadge label="Under $15 keyless cards" />
            </div>
          </div>
        </div>
      </div>

      {/* Team */}
      <div>
        <SectionHeader title="The Icarus Team" subtitle="BitcoinTalk-verified founders" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { handle: 'Xprim777', role: 'Original Founder', color: 'text-user' },
            { handle: 'polymerbit', role: 'Advisor & Designer', color: 'text-mentor' },
            { handle: 'owlcatz', role: 'Distributor', color: 'text-system' },
            { handle: 'CEO (undisclosed)', role: 'Operations', color: 'text-system/60' },
          ].map(m => (
            <div key={m.handle} className="border border-system/20 p-3 bg-black/40">
              <p className={`font-bold text-xs uppercase tracking-wider ${m.color}`}>{m.handle}</p>
              <p className="text-system/40 text-[10px] mt-1">{m.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editions */}
      <div>
        <SectionHeader title="Card Editions" subtitle="Collectible Bitcoin art — physical premium cards" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ICARUS_EDITIONS.map(ed => (
            <div key={ed.name} className="border border-system/20 bg-black/60 p-4 hover:border-user/30 transition-all group">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-system/90 text-sm font-bold">{ed.name}</p>
                <Badge type={ed.badge} />
              </div>
              <p className="text-system/50 text-xs leading-relaxed mb-3">{ed.desc}</p>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider border-t border-system/10 pt-2">
                <span className="text-user/70"><span className="text-system/30">PRICE:</span> {ed.price}</span>
                <span className="text-system/40">{ed.availability}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage roadmap */}
      <div className="border border-system/20 p-5">
        <SectionHeader title="Development Roadmap" />
        <div className="flex flex-col sm:flex-row gap-4">
          {[
            { stage: '01', title: 'Keyless Cards', status: 'LIVE', desc: 'Premium art card canvas under $15. No private key risk. Pure collectible Bitcoin art.' },
            { stage: '02', title: 'BIP38 Integration', status: 'IN DEV', desc: 'Full cold storage functionality with BIP38 passphrase-encrypted private keys on the card.' },
          ].map(s => (
            <div key={s.stage} className="flex-1 border border-system/20 p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-system/30 text-xs font-bold">STAGE {s.stage}</span>
                <Badge type={s.status === 'LIVE' ? 'AVAILABLE' : 'PREORDER'} />
              </div>
              <p className="text-system font-bold text-sm mb-1">{s.title}</p>
              <p className="text-system/50 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="border border-user/30 bg-black p-5">
        <SectionHeader title="Contact & Purchase" subtitle="All purchases handled directly on BitcoinTalk" />
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-user/60 shrink-0 mt-0.5" />
              <p className="text-system/60 text-xs leading-relaxed">
                Icarus operates exclusively through the BitcoinTalk forum. Browse the main topic thread for current
                and past sales, auction lots, and to contact the team directly. All transactions are handled
                through forum escrow and verified community processes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-user/70 shrink-0" />
              <p className="text-user/70 text-[10px] uppercase tracking-wider">Contact Icarus directly on BitcoinTalk — not through Shri Academy</p>
            </div>
          </div>
          <div className="shrink-0">
            <a
              href="https://bitcointalk.org/index.php?topic=5435930.0"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-4 border border-user/50 bg-user/10 text-user hover:bg-user/20 transition-all text-xs uppercase tracking-widest font-bold"
            >
              <ExternalLink className="w-4 h-4" />
              Open Forum Thread
            </a>
            <p className="text-system/30 text-[9px] uppercase tracking-wider mt-2 text-center">bitcointalk.org — topic 5435930</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Altairtech Tab
// ---------------------------------------------------------------------------

function AltairtechTab() {
  const [subTab, setSubTab] = useState<'commercial' | 'home' | 'parts'>('commercial');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-system/30 bg-system/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 border border-system/40 bg-system/10 flex items-center justify-center shrink-0">
            <Cpu className="w-6 h-6 text-system" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-system font-bold uppercase tracking-[0.2em] text-sm text-glow-system">Altair Technology</h2>
              <Badge type="HOT" />
            </div>
            <p className="text-system/60 text-xs leading-relaxed mb-3">
              America's #1 trusted source for Bitcoin mining hardware, replacement parts, and accessories.
              Serving customers worldwide from their St. Charles, Missouri warehouse. Accepts Bitcoin
              (with discount), secure SSL checkout, 14-day warranty, and fast global shipping.
            </p>
            <div className="flex flex-wrap gap-2">
              <VendorBadge label="St. Charles, Missouri" />
              <VendorBadge label="Bitcoin Accepted" />
              <VendorBadge label="14-day Warranty" />
              <VendorBadge label="Global Shipping" />
            </div>
          </div>
        </div>
      </div>

      {/* 🔴 MEGA SALE Banner */}
      <div className="border border-user/60 bg-user/10 p-3 flex items-center gap-3">
        <Zap className="w-4 h-4 text-user animate-pulse" />
        <p className="text-user text-xs font-bold uppercase tracking-widest">
          MEGA SALE LIVE — Avalon Q $1,299 | Nano 3S $195 | Hammer BC04 $199 | Avalon Mini 3 $699 — No codes needed
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="flex border-b border-system/20 overflow-x-auto">
        {[
          { id: 'commercial' as const, label: 'Commercial Miners', icon: <Server className="w-3.5 h-3.5" /> },
          { id: 'home' as const, label: 'Home Miners', icon: <Zap className="w-3.5 h-3.5" /> },
          { id: 'parts' as const, label: 'Parts & Accessories', icon: <Package className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border-b-2 transition-all whitespace-nowrap ${
              subTab === t.id ? 'border-system text-system' : 'border-transparent text-system/40 hover:text-system/60'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subTab === 'commercial' && ALTAIR_COMMERCIAL.map(p => <ProductCard key={p.name} p={p} />)}
        {subTab === 'home'       && ALTAIR_HOME.map(p => <ProductCard key={p.name} p={p} />)}
        {subTab === 'parts'      && ALTAIR_PARTS.map(p => <ProductCard key={p.name} p={p} />)}
      </div>

      {/* Contact */}
      <div className="border border-system/30 p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <SectionHeader title="Contact Altairtech Directly" subtitle="Their team handles all purchases and support" />
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs">
              <MapPin className="w-4 h-4 text-system/60 shrink-0" />
              <span className="text-system/70">St. Charles, Missouri, USA</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Radio className="w-4 h-4 text-system/60 shrink-0" />
              <a href="https://altairtech.io" target="_blank" rel="noopener noreferrer" className="text-system hover:text-user transition-colors">
                altairtech.io
              </a>
            </div>
          </div>
          <div className="flex items-start gap-2 mt-2">
            <AlertTriangle className="w-3.5 h-3.5 text-user/70 shrink-0 mt-0.5" />
            <p className="text-user/70 text-[10px] uppercase tracking-wider leading-relaxed">
              Place all orders and support requests directly on altairtech.io — not through Shri Academy
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href="https://altairtech.io/shop/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-4 border border-system/50 bg-system/10 text-system hover:bg-system/20 transition-all text-xs uppercase tracking-widest font-bold"
          >
            <ShoppingCart className="w-4 h-4" /> Browse Full Shop
          </a>
          <a
            href="https://altairtech.io/contact-us/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-4 border border-system/20 text-system/50 hover:text-system hover:border-system/40 transition-all text-xs uppercase tracking-widest"
          >
            <Mail className="w-4 h-4" /> Contact Their Team
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Iowa Mining Tab
// ---------------------------------------------------------------------------

function IowaMiningTab() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border border-green-500/30 bg-green-500/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 border border-green-500/40 bg-green-500/10 flex items-center justify-center shrink-0">
            <Server className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-green-400 font-bold uppercase tracking-[0.2em] text-sm">Iowa Mining</h2>
              <Badge type="AVAILABLE" />
            </div>
            <p className="text-system/60 text-xs leading-relaxed mb-3">
              Iowa-based ASIC hosting and colocation service with straightforward, transparent pricing.
              No hidden fees. Same bill every month. Remote access to your machines via Foreman.mn
              account. 3rd party firmware support on most ASICs.
            </p>
            <div className="flex flex-wrap gap-2">
              <VendorBadge label="Iowa, United States" />
              <VendorBadge label="Remote ASIC Access" />
              <VendorBadge label="3rd Party Firmware" />
              <VendorBadge label="Fixed Monthly Bill" />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <SectionHeader title="Hosting Pricing" subtitle="Straightforward — no surprise fees" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Power Rate', value: '$0.0875', unit: 'per kWh', icon: <Zap className="w-5 h-5 text-user" />, color: 'border-user/40 bg-user/5' },
            { label: 'Setup Fee', value: '$50', unit: 'one-time per machine', icon: <Package className="w-5 h-5 text-system" />, color: 'border-system/40 bg-system/5' },
            { label: 'Monthly Bill', value: 'Fixed', unit: 'same every month', icon: <CheckCircle className="w-5 h-5 text-green-400" />, color: 'border-green-500/40 bg-green-500/5' },
          ].map(p => (
            <div key={p.label} className={`border ${p.color} p-5 text-center`}>
              <div className="flex justify-center mb-3">{p.icon}</div>
              <p className="text-white text-2xl font-bold mb-0.5">{p.value}</p>
              <p className="text-system/40 text-[10px] uppercase tracking-wider">{p.unit}</p>
              <p className="text-system/70 text-xs font-bold mt-2 uppercase tracking-wider">{p.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div>
        <SectionHeader title="Services" />
        <div className="space-y-3">
          {[
            {
              icon: <Server className="w-5 h-5 text-green-400" />,
              title: 'ASIC Hosting & Colocation',
              desc: 'Iowa-based secure facility. Your ASIC miners hosted in a professional environment with controlled temperature, security, and stable power. Fixed monthly billing — power at $0.0875/kWh with a $50 setup fee per machine.',
              cta: null,
            },
            {
              icon: <Activity className="w-5 h-5 text-system" />,
              title: 'ASIC Remote Access via Foreman.mn',
              desc: 'You maintain full visibility and control of your machines through a personal Foreman.mn account. Monitor hashrate, temperature, pool connections, and more — in real time from anywhere.',
              cta: 'foreman.mn',
            },
            {
              icon: <Hammer className="w-5 h-5 text-mentor" />,
              title: 'Personalized Customer Service & 3rd Party Firmware',
              desc: 'Iowa Mining offers availability to install 3rd party firmware on most ASIC machines — including Braiins OS, LuxOS, and similar. Personalized hands-on service for your hardware.',
              cta: null,
            },
          ].map(s => (
            <div key={s.title} className="border border-system/20 bg-black/60 p-4 flex gap-4">
              <div className="shrink-0 mt-0.5">{s.icon}</div>
              <div className="flex-1">
                <p className="text-system/90 font-bold text-sm mb-1">{s.title}</p>
                <p className="text-system/50 text-xs leading-relaxed">{s.desc}</p>
                {s.cta && (
                  <a href={`https://${s.cta}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-system/50 hover:text-system mt-2 uppercase tracking-wider transition-colors">
                    <ExternalLink className="w-3 h-3" /> {s.cta}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost estimator */}
      <div className="border border-green-500/30 bg-green-500/5 p-5">
        <SectionHeader title="Quick Cost Estimate" subtitle="Based on Iowa Mining's published rates" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-system/20 text-system/40 uppercase tracking-wider text-[10px]">
                <th className="text-left pb-2 pr-4">Miner</th>
                <th className="text-right pb-2 pr-4">Power Draw</th>
                <th className="text-right pb-2 pr-4">kWh / Mo</th>
                <th className="text-right pb-2">Est. Monthly Cost</th>
              </tr>
            </thead>
            <tbody className="space-y-1">
              {[
                { miner: 'Antminer S21 XP 270T', watts: 3600, },
                { miner: 'Antminer S21++',       watts: 3500, },
                { miner: 'Antminer S19k Pro',    watts: 2760, },
                { miner: 'Canaan Avalon Q 90T',  watts: 3010, },
                { miner: 'Hammer BC04 6T',       watts: 96, },
              ].map(r => {
                const kwh = ((r.watts / 1000) * 24 * 30).toFixed(0);
                const cost = ((r.watts / 1000) * 24 * 30 * 0.0875).toFixed(2);
                return (
                  <tr key={r.miner} className="border-b border-system/10 hover:bg-system/5">
                    <td className="py-2 pr-4 text-system/80">{r.miner}</td>
                    <td className="py-2 pr-4 text-right text-system/60">{r.watts}W</td>
                    <td className="py-2 pr-4 text-right text-system/60">{kwh} kWh</td>
                    <td className="py-2 text-right text-user font-bold">${cost}/mo</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-system/30 text-[9px] mt-2 uppercase tracking-wider">Estimates only. Add $50 one-time setup fee per machine. Actual billing from Iowa Mining may vary.</p>
        </div>
      </div>

      {/* Contact */}
      <div className="border border-green-500/30 p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <SectionHeader title="Contact Iowa Mining Directly" subtitle="Their team manages all quotes and hosting contracts" />
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs">
              <MapPin className="w-4 h-4 text-green-400/60 shrink-0" />
              <span className="text-system/70">Iowa, United States</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Mail className="w-4 h-4 text-green-400/60 shrink-0" />
              <a href="mailto:Contact@IowaMining.io" className="text-green-400 hover:text-green-300 transition-colors font-mono">
                Contact@IowaMining.io
              </a>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Radio className="w-4 h-4 text-green-400/60 shrink-0" />
              <a href="https://iowamining.io" target="_blank" rel="noopener noreferrer" className="text-system hover:text-green-400 transition-colors">
                iowamining.io
              </a>
            </div>
          </div>
          <div className="flex items-start gap-2 mt-2">
            <AlertTriangle className="w-3.5 h-3.5 text-user/70 shrink-0 mt-0.5" />
            <p className="text-user/70 text-[10px] uppercase tracking-wider leading-relaxed">
              Contact Iowa Mining directly for quotes and contracts — not through Shri Academy
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href="https://iowamining.io/services/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-4 border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all text-xs uppercase tracking-widest font-bold"
          >
            <Server className="w-4 h-4" /> View Services
          </a>
          <a
            href="https://iowamining.io/#contact"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-4 border border-green-500/20 text-green-400/60 hover:text-green-400 hover:border-green-500/40 transition-all text-xs uppercase tracking-widest"
          >
            <Mail className="w-4 h-4" /> Get a Quote
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pawn Shop Tab
// ---------------------------------------------------------------------------

function PawnShopTab() {
  const [deviceType, setDeviceType]           = useState('');
  const [deviceDescription, setDeviceDescription] = useState('');
  const [condition, setCondition]             = useState('');
  const [email, setEmail]                     = useState('');
  const [submitted, setSubmitted]             = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border border-mentor/30 bg-mentor/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 border border-mentor/40 bg-mentor/10 flex items-center justify-center shrink-0">
            <Recycle className="w-6 h-6 text-mentor" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-mentor font-bold uppercase tracking-[0.2em] text-sm text-glow-mentor">Electronics Pawn Shop</h2>
              <Badge type="NEW" />
            </div>
            <p className="text-system/60 text-xs leading-relaxed mb-3">
              Exchange your old electronics for SARA tokens. Phones, GPUs, laptops, tablets, game consoles,
              and mining hardware all accepted for appraisal. Submit your device below — our integration
              service will assess and make you a SARA token offer. Service integration launching soon.
            </p>
            <div className="flex flex-wrap gap-2">
              <VendorBadge label="SARA Token Rewards" />
              <VendorBadge label="Integration Coming Soon" />
              <VendorBadge label="Pre-register Now" />
            </div>
          </div>
        </div>
      </div>

      {/* Coming soon banner */}
      <div className="border border-dashed border-mentor/40 p-4 flex items-center gap-3">
        <Clock className="w-5 h-5 text-mentor/70 shrink-0 animate-pulse" />
        <div>
          <p className="text-mentor text-xs font-bold uppercase tracking-[0.2em]">Integration In Progress</p>
          <p className="text-system/50 text-[10px] mt-0.5">
            Pawn shop appraisal and fulfilment service is being integrated. Pre-register your interest below
            and you'll be among the first contacted when the service goes live.
          </p>
        </div>
      </div>

      {/* Accepted categories */}
      <div>
        <SectionHeader title="Accepted Electronics" subtitle="Estimated SARA token value range per item" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {PAWN_CATEGORIES.map(c => (
            <div key={c.label} className="border border-system/20 bg-black/60 p-4 flex gap-3 hover:border-mentor/30 transition-all">
              <div className="text-mentor/70 shrink-0 mt-0.5">{c.icon}</div>
              <div>
                <p className="text-system/90 font-bold text-xs mb-1">{c.label}</p>
                <p className="text-system/40 text-[10px] mb-2">{c.examples}</p>
                <p className="text-mentor text-[10px] font-bold uppercase tracking-wider">{c.sara_rate}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-system/30 text-[9px] uppercase tracking-wider mt-2">
          * SARA token values are illustrative estimates. Actual offers depend on condition, model, and market pricing at time of appraisal.
        </p>
      </div>

      {/* Pre-registration form */}
      <div className="border border-system/30 p-6">
        <SectionHeader title="Pre-Register Your Device" subtitle="Be first in line when the service launches" />

        {submitted ? (
          <div className="border border-green-500/40 bg-green-500/10 p-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
            <p className="text-green-400 font-bold uppercase tracking-[0.2em] text-sm">Registration Received</p>
            <p className="text-system/60 text-xs leading-relaxed max-w-sm">
              Your pre-registration is on file. You'll receive an email at <strong className="text-system/80">{email}</strong> when
              the Electronics Pawn Shop launches and your device type is ready for appraisal.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pawn-device-type" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1.5">Device Type *</label>
                <select
                  id="pawn-device-type"
                  value={deviceType}
                  onChange={e => setDeviceType(e.target.value)}
                  required
                  className="w-full bg-black border border-system/30 text-system/80 p-3 text-xs uppercase focus:outline-none focus:border-mentor/50 focus:ring-1 focus:ring-mentor/30 rounded-none"
                >
                  <option value="">Select device category</option>
                  <option value="smartphone">Smartphone</option>
                  <option value="gpu">GPU / Graphics Card</option>
                  <option value="laptop">Laptop / Computer</option>
                  <option value="tablet">Tablet</option>
                  <option value="console">Game Console</option>
                  <option value="cpu">CPU / Mining Hardware</option>
                  <option value="other">Other Electronics</option>
                </select>
              </div>
              <div>
                <label htmlFor="pawn-condition" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1.5">Condition *</label>
                <select
                  id="pawn-condition"
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                  required
                  className="w-full bg-black border border-system/30 text-system/80 p-3 text-xs uppercase focus:outline-none focus:border-mentor/50 focus:ring-1 focus:ring-mentor/30 rounded-none"
                >
                  <option value="">Select condition</option>
                  <option value="like-new">Like New — minimal wear</option>
                  <option value="good">Good — normal use wear</option>
                  <option value="fair">Fair — visible wear, fully functional</option>
                  <option value="poor">Poor — functional with defects</option>
                  <option value="non-working">Non-working — for parts</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="pawn-description" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1.5">Device Description *</label>
              <input
                id="pawn-description"
                type="text"
                value={deviceDescription}
                onChange={e => setDeviceDescription(e.target.value)}
                placeholder="e.g. iPhone 14 Pro 256GB Space Black, NVIDIA RTX 4080 ASUS ROG..."
                required
                className="w-full bg-black border border-system/30 text-system/80 p-3 text-xs placeholder:text-system/20 focus:outline-none focus:border-mentor/50 focus:ring-1 focus:ring-mentor/30 rounded-none"
              />
            </div>
            <div>
              <label htmlFor="pawn-email" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1.5">Your Email *</label>
              <input
                id="pawn-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                className="w-full bg-black border border-system/30 text-system/80 p-3 text-xs placeholder:text-system/20 focus:outline-none focus:border-mentor/50 focus:ring-1 focus:ring-mentor/30 rounded-none"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-4 border border-mentor/50 bg-mentor/10 text-mentor hover:bg-mentor/20 transition-all text-xs uppercase tracking-widest font-bold"
            >
              <ChevronRight className="w-4 h-4" /> Pre-Register Interest
            </button>
          </form>
        )}
      </div>

      {/* How it will work */}
      <div className="border border-system/20 p-5">
        <SectionHeader title="How It Will Work" subtitle="Once the service integration is complete" />
        <div className="space-y-3">
          {[
            { n: '01', title: 'Submit Device Details', desc: 'Fill out the appraisal form with your device model, condition, and photos.' },
            { n: '02', title: 'Receive SARA Offer', desc: 'Our appraisal partner assesses your device and returns a SARA token offer within 24–48 hours.' },
            { n: '03', title: 'Ship Your Device', desc: 'Accept the offer and ship your device using a prepaid label. Fully insured transit.' },
            { n: '04', title: 'SARA Deposited', desc: 'Once received and verified, SARA tokens are deposited directly to your Shri Academy wallet.' },
          ].map(s => (
            <div key={s.n} className="flex gap-4 items-start">
              <span className="text-system/30 text-xs font-bold w-6 shrink-0">{s.n}</span>
              <div>
                <p className="text-system/80 font-bold text-xs">{s.title}</p>
                <p className="text-system/40 text-xs mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Marketplace page
// ---------------------------------------------------------------------------

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState<Tab>('crypto');
  const [, setLocation] = useLocation();

  const tabs = [
    { id: 'crypto'     as Tab, label: 'SARA · Crypto',    icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'icarus'     as Tab, label: 'Icarus Cards',     icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'altairtech' as Tab, label: 'Altairtech',       icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'iowa'       as Tab, label: 'Iowa Mining',      icon: <Server className="w-3.5 h-3.5" /> },
    { id: 'pawnshop'   as Tab, label: 'Pawn Shop',        icon: <Recycle className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col bg-black text-system font-mono h-[100dvh] overflow-hidden selection:bg-system/30 selection:text-system">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 border-b border-system/20 bg-black/80 backdrop-blur z-10 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-6 h-6 text-system" />
            <div className="absolute inset-0 bg-system/20 blur-md rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-widest text-glow-system uppercase leading-tight">Shri_Marketplace</h1>
            <div className="text-[10px] uppercase text-system/60 tracking-[0.2em]">SARA_Token · Mining_Hardware · Electronics_Exchange</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 px-3 py-1.5 border border-system/30 text-system/60 hover:text-system hover:border-system/60 uppercase tracking-wider transition-colors"
          >
            <Terminal className="w-3 h-3" /> Back to Tutor
          </button>
          <button
            onClick={() => setLocation('/subscribe')}
            className="flex items-center gap-2 px-3 py-1.5 border border-user/50 text-user hover:bg-user/10 uppercase tracking-wider transition-colors text-glow-user"
          >
            <Zap className="w-3 h-3" /> Subscribe
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-system/20 bg-black overflow-x-auto shrink-0">
        {tabs.map(t => <TabButton key={t.id} {...t} active={activeTab === t.id} onClick={setActiveTab} />)}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(6,182,212,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="max-w-5xl mx-auto relative">
          {activeTab === 'crypto'     && <CryptoTab />}
          {activeTab === 'icarus'     && <IcarusTab />}
          {activeTab === 'altairtech' && <AltairtechTab />}
          {activeTab === 'iowa'       && <IowaMiningTab />}
          {activeTab === 'pawnshop'   && <PawnShopTab />}
        </div>
      </main>

      {/* Scanline overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]" />
    </div>
  );
}
