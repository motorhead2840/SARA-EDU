import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Play, Clock, Tag, Loader, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Episode {
  id: string;
  tradition: string;
  title: string;
  duration: string;
  era: string;
  tags: string[];
  cover_accent: 'system' | 'mentor' | 'user';
}

interface NarrativeResponse {
  episode: Episode;
  narrative: string;
}

const ACCENT_CLASSES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  system: { border: 'border-system/60', bg:  'bg-system/10', text: 'text-system', badge: 'border-system/30 text-system/70' },
  mentor: { border: 'border-mentor/60', bg:  'bg-mentor/10', text: 'text-mentor', badge: 'border-mentor/30 text-mentor/70' },
  user:   { border: 'border-user/60',   bg:  'bg-user/10',   text: 'text-user',   badge: 'border-user/30 text-user/70'     },
};

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

// ─── Narrative section parser ─────────────────────────────────────────────────

function renderNarrative(text: string) {
  const sections = text.split(/\n(?=\*\*[A-Z])/);
  return sections.map((section, i) => {
    const headerMatch = section.match(/^\*\*([^*]+)\*\*/);
    if (headerMatch) {
      const rest = section.slice(headerMatch[0].length).trim();
      return (
        <div key={i} className="mb-5">
          <div className="text-[10px] uppercase tracking-widest text-mentor/60 mb-2 flex items-center gap-2">
            <span className="text-mentor">◈</span> {headerMatch[1]}
          </div>
          <p className="text-system/80 leading-relaxed text-sm whitespace-pre-line">{rest}</p>
        </div>
      );
    }
    return <p key={i} className="text-system/80 leading-relaxed text-sm mb-4 whitespace-pre-line">{section.trim()}</p>;
  });
}

// ─── Episode card ─────────────────────────────────────────────────────────────

function EpisodeCard({ ep, onWatch, featured = false }: { ep: Episode; onWatch: (ep: Episode) => void; featured?: boolean }) {
  const a = ACCENT_CLASSES[ep.cover_accent];
  if (featured) {
    return (
      <motion.div {...fade} className={`border ${a.border} ${a.bg} p-5 sm:p-7 flex flex-col sm:flex-row gap-5 group cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={() => onWatch(ep)}>
        <div className="flex-shrink-0">
          <div className={`text-xs uppercase tracking-widest ${a.text} border ${a.border} px-2 py-1 inline-block mb-3`}>{ep.tradition}</div>
          <div className={`text-3xl sm:text-4xl font-bold leading-tight mb-2 ${a.text}`}>{ep.title}</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-system/50 uppercase tracking-wider mb-4">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ep.duration}</span>
            <span>{ep.era}</span>
            <span className={`border ${a.badge} px-2 py-0.5 text-[10px]`}>Featured</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {ep.tags.slice(0, 4).map((t) => (
              <span key={t} className={`text-[9px] uppercase px-1.5 py-0.5 border ${a.badge}`}>{t}</span>
            ))}
          </div>
          <button className={`flex items-center gap-2 px-5 py-2.5 border ${a.border} ${a.text} hover:${a.bg} text-xs uppercase tracking-widest transition-all`}>
            <Play className="w-4 h-4" /> Watch Episode
          </button>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div {...fade} whileHover={{ scale: 1.015 }} className={`border ${a.border} bg-black cursor-pointer group transition-all hover:${a.bg}`}
      onClick={() => onWatch(ep)}>
      {/* Accent bar */}
      <div className={`h-1 ${a.text.replace('text', 'bg')}`} style={{ backgroundImage: `linear-gradient(90deg, currentColor, transparent)` }}>
        <div className={`h-1 w-full opacity-70`} style={{ background: ep.cover_accent === 'system' ? '#06B6D4' : ep.cover_accent === 'mentor' ? '#8B5CF6' : '#F59E0B' }} />
      </div>
      <div className="p-4 flex flex-col h-full">
        <div className={`text-[9px] uppercase tracking-widest ${a.text} mb-2`}>{ep.tradition}</div>
        <h3 className="text-system text-sm font-bold leading-snug mb-2 line-clamp-2">{ep.title}</h3>
        <div className="flex items-center gap-3 text-[10px] text-system/40 uppercase tracking-wider mb-3">
          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{ep.duration}</span>
          <span>{ep.era}</span>
        </div>
        <div className="flex flex-wrap gap-1 mb-4">
          {ep.tags.slice(0, 3).map((t) => (
            <span key={t} className={`text-[8px] uppercase px-1 py-0.5 border ${a.badge}`}>{t}</span>
          ))}
        </div>
        <div className={`mt-auto flex items-center gap-1 text-[10px] uppercase tracking-widest ${a.text} opacity-60 group-hover:opacity-100 transition-opacity`}>
          <Play className="w-3 h-3" /> Watch
        </div>
      </div>
    </motion.div>
  );
}

// ─── Viewer panel ──────────────────────────────────────────────────────────────

function EpisodeViewer({ ep, onClose }: { ep: Episode; onClose: () => void }) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const a = ACCENT_CLASSES[ep.cover_accent];

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setNarrative(null);
    fetch('/api/mythology/narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode_id: ep.id }),
    })
      .then(async (r) => {
        if (r.ok) return r.json() as Promise<NarrativeResponse>;
        // Try to extract error message; fall back gracefully if body is not JSON
        let msg = `Error ${r.status}`;
        try { const b = await r.json() as { error?: string }; msg = b.error ?? msg; } catch { /* non-JSON body */ }
        throw new Error(msg);
      })
      .then((d) => { if (!cancelled) setNarrative(d.narrative); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Narrative generation failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ep.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-stretch justify-end">
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 200 }}
        className="w-full max-w-2xl bg-black border-l border-system/20 flex flex-col overflow-hidden">

        {/* Panel header */}
        <div className={`flex items-start justify-between p-5 border-b ${a.border} bg-black/80`}>
          <div>
            <div className={`text-[10px] uppercase tracking-widest ${a.text} mb-1`}>{ep.tradition} · {ep.era}</div>
            <h2 className={`text-xl font-bold ${a.text} leading-tight mb-2`}>{ep.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-system/50 uppercase">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ep.duration}</span>
              {ep.tags.map((t) => <span key={t} className={`border ${a.badge} px-1.5 py-0.5`}>{t}</span>)}
            </div>
          </div>
          <button onClick={onClose} className="text-system/40 hover:text-system transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader className={`w-6 h-6 ${a.text} animate-spin`} />
              <div className="text-xs uppercase tracking-widest text-system/40 animate-pulse">Generating narrative via NVIDIA Nemotron...</div>
              <div className="flex gap-1">
                {[0,1,2].map((i) => <div key={i} className={`w-2 h-8 ${a.text.replace('text','bg')} opacity-60 animate-pulse`} style={{ animationDelay: `${i * 150}ms`, background: ep.cover_accent === 'system' ? '#06B6D4' : ep.cover_accent === 'mentor' ? '#8B5CF6' : '#F59E0B' }} />)}
              </div>
            </div>
          )}
          {error && (
            <div className="border border-red-500/30 bg-red-500/5 p-5">
              <div className="text-red-400 text-xs uppercase tracking-widest mb-1">Error</div>
              <p className="text-system/70 text-sm">{error}</p>
            </div>
          )}
          {narrative && (
            <motion.div {...fade}>
              {renderNarrative(narrative)}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MythologyPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [traditions, setTraditions] = useState<string[]>(['All']);
  const [activeTradition, setActiveTradition] = useState('All');
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Episode | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/mythology/episodes').then((r) => r.json()) as Promise<Episode[]>,
      fetch('/api/mythology/traditions').then((r) => r.json()) as Promise<{ name: string; count: number }[]>,
    ]).then(([eps, trads]) => {
      setEpisodes(eps);
      setTraditions(['All', ...trads.map((t) => t.name)]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = activeTradition === 'All' ? episodes : episodes.filter((e) => e.tradition === activeTradition);
  const [featured, ...rest] = filtered;

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-system font-mono overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-system/20 bg-black/90 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/"><button className="flex items-center gap-1 text-system/60 hover:text-system text-xs uppercase tracking-wider transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button></Link>
          <div className="h-4 w-px bg-system/20" />
          <div>
            <h1 className="text-sm font-bold tracking-widest text-glow-mentor uppercase">Cosmos_Lore</h1>
            <div className="text-[10px] text-mentor/40 uppercase tracking-widest hidden sm:block">World Mythology Channel // NVIDIA Nemotron</div>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-system/30 hidden sm:block">
          {filtered.length} Episode{filtered.length !== 1 ? 's' : ''}
        </div>
      </header>

      {/* Tradition filter */}
      <div className="border-b border-system/20 bg-black/60 shrink-0">
        <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-none">
          {traditions.map((t) => (
            <button key={t} onClick={() => setActiveTradition(t)}
              className={`flex-shrink-0 px-3 py-1.5 border text-xs uppercase tracking-wider transition-all ${
                activeTradition === t
                  ? 'border-mentor bg-mentor/10 text-mentor'
                  : 'border-system/20 text-system/50 hover:border-system/50 hover:text-system/80'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader className="w-6 h-6 text-mentor animate-spin" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
            {featured && <EpisodeCard ep={featured} onWatch={setViewing} featured />}
            {rest.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-widest text-system/30 flex items-center gap-3">
                  <span>All Episodes</span>
                  <div className="flex-1 h-px bg-system/10" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {rest.map((ep) => <EpisodeCard key={ep.id} ep={ep} onWatch={setViewing} />)}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Episode viewer */}
      <AnimatePresence>
        {viewing && <EpisodeViewer ep={viewing} onClose={() => setViewing(null)} />}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-[0.06] bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]" />
    </div>
  );
}
