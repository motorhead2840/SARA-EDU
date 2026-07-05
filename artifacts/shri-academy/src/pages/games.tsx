import React, { useState } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, RefreshCw, CheckCircle, XCircle, Eye, EyeOff, ChevronDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type GameType = 'quiz' | 'riddle' | 'myth-match' | 'code-challenge';

interface GameTypeInfo { id: GameType; name: string; icon: string; description: string; }

interface QuizData   { question: string; options: string[]; correct: string; explanation: string; difficulty: string; topic: string; }
interface RiddleData { riddle: string; hint: string; answer: string; explanation: string; topic: string; }
interface MythPair   { id: string; term: string; match: string; }
interface MythData   { culture: string; title: string; pairs: MythPair[]; }
interface CodeData   { title: string; description: string; starter_code: string; expected_output: string; hints: string[]; topic: string; }

type GameData = QuizData | RiddleData | MythData | CodeData;

const GAME_TYPES: GameTypeInfo[] = [
  { id: 'quiz',           name: 'Knowledge Duel',  icon: '⬡', description: 'Nemotron fires curriculum questions. Answer fast.' },
  { id: 'riddle',         name: 'Riddle Forge',    icon: '◈', description: 'Solve AI-crafted riddles that test lateral thinking.' },
  { id: 'myth-match',     name: 'Myth Match',      icon: '◉', description: 'Match mythological figures to their legends.' },
  { id: 'code-challenge', name: 'Code Gauntlet',   icon: '▣', description: 'Tackle Nemotron-generated programming challenges.' },
];

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };

// ─── Quiz renderer ─────────────────────────────────────────────────────────────

function QuizGame({ data, onNext, score, setScore }: { data: QuizData; onNext: () => void; score: { c: number; t: number }; setScore: React.Dispatch<React.SetStateAction<{ c: number; t: number }>> }) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (opt: string) => {
    if (selected) return;
    const letter = opt[0];
    setSelected(letter);
    setScore((s) => ({ c: s.c + (letter === data.correct ? 1 : 0), t: s.t + 1 }));
  };

  return (
    <motion.div {...fade} className="space-y-6">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest">
        <span className="text-system/50">Difficulty: <span className="text-system">{data.difficulty}</span></span>
        <span className="text-mentor/70">Score: <span className="text-mentor font-bold">{score.c}/{score.t}</span></span>
      </div>

      <div className="border border-system/30 bg-system/5 p-6">
        <div className="text-[10px] uppercase tracking-widest text-system/40 mb-3">Question</div>
        <p className="text-system text-lg leading-relaxed">{data.question}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.options.map((opt) => {
          const letter = opt[0];
          const isCorrect = letter === data.correct;
          const isSelected = letter === selected;
          let cls = 'border border-system/30 bg-black text-system/80 hover:border-system hover:bg-system/10';
          if (selected) {
            if (isCorrect) cls = 'border-mentor bg-mentor/10 text-mentor';
            else if (isSelected) cls = 'border-red-500/60 bg-red-500/10 text-red-400';
            else cls = 'border-system/10 text-system/30';
          }
          return (
            <button key={opt} onClick={() => handleSelect(opt)}
              className={`text-left p-4 transition-all font-mono text-sm ${cls} ${!selected ? 'cursor-pointer' : 'cursor-default'}`}>
              {opt}
            </button>
          );
        })}
      </div>

      {selected && (
        <motion.div {...fade} className="border border-mentor/30 bg-mentor/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-mentor/60">
            {selected === data.correct ? <CheckCircle className="w-4 h-4 text-mentor" /> : <XCircle className="w-4 h-4 text-red-400" />}
            {selected === data.correct ? 'Correct' : `Correct answer: ${data.correct}`}
          </div>
          <p className="text-system/80 text-sm leading-relaxed">{data.explanation}</p>
          <button onClick={onNext} className="mt-3 px-4 py-2 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-widest transition-all flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Next Question
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Riddle renderer ───────────────────────────────────────────────────────────

function RiddleGame({ data, onNext }: { data: RiddleData; onNext: () => void }) {
  const [showHint, setShowHint] = useState(false);
  const [answer, setAnswer] = useState('');
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [revealed, setRevealed] = useState(false);

  const check = () => {
    const correct = data.answer.toLowerCase().includes(answer.toLowerCase().trim()) ||
                    answer.toLowerCase().trim().includes(data.answer.toLowerCase().split(' ')[0]);
    setTries((t) => t + 1);
    if (correct) { setResult('correct'); return; }
    setResult('wrong');
    if (tries >= 2) setRevealed(true);
  };

  return (
    <motion.div {...fade} className="space-y-6">
      <div className="border border-mentor/30 bg-mentor/5 p-6">
        <div className="text-[10px] uppercase tracking-widest text-mentor/40 mb-3">Riddle</div>
        <p className="text-mentor text-lg leading-relaxed italic">"{data.riddle}"</p>
      </div>

      <button onClick={() => setShowHint(!showHint)}
        className="flex items-center gap-2 text-xs uppercase tracking-widest text-user/60 hover:text-user transition-colors">
        {showHint ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {showHint ? 'Hide Hint' : 'Reveal Hint'}
      </button>
      {showHint && <motion.div {...fade} className="text-user/80 text-sm border-l-2 border-user/50 pl-4">{data.hint}</motion.div>}

      {!result && !revealed && (
        <div className="flex gap-3">
          <input value={answer} onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && answer.trim() && check()}
            placeholder="Your answer..."
            className="flex-1 bg-black border border-system/30 text-system placeholder:text-system/30 px-4 py-2 font-mono text-sm focus:outline-none focus:border-system" />
          <button onClick={check} disabled={!answer.trim()}
            className="px-4 py-2 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-widest transition-all disabled:opacity-30">
            Check
          </button>
        </div>
      )}

      {result === 'correct' && (
        <motion.div {...fade} className="border border-mentor/30 bg-mentor/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-mentor text-xs uppercase tracking-widest">
            <CheckCircle className="w-4 h-4" /> Correct!
          </div>
          <p className="text-system/80 text-sm">{data.explanation}</p>
          <button onClick={onNext} className="mt-2 px-4 py-2 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-widest transition-all flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Next Riddle
          </button>
        </motion.div>
      )}

      {(result === 'wrong' || revealed) && (
        <motion.div {...fade} className="border border-red-500/30 bg-red-500/5 p-4 space-y-2">
          <div className="text-red-400 text-xs uppercase tracking-widest">
            {revealed ? `Answer: ${data.answer}` : `Not quite — ${tries >= 3 ? `Answer: ${data.answer}` : 'try again'}`}
          </div>
          {revealed && <p className="text-system/70 text-sm">{data.explanation}</p>}
          {!revealed && tries < 3 && (
            <div className="flex gap-3 mt-2">
              <input value={answer} onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && answer.trim() && check()}
                placeholder="Try again..."
                className="flex-1 bg-black border border-system/30 text-system placeholder:text-system/30 px-4 py-2 font-mono text-sm focus:outline-none focus:border-system" />
              <button onClick={check} disabled={!answer.trim()}
                className="px-4 py-2 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-widest transition-all disabled:opacity-30">
                Check
              </button>
            </div>
          )}
          {(revealed || tries >= 3) && (
            <button onClick={onNext} className="mt-2 px-4 py-2 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-widest transition-all flex items-center gap-2">
              <RefreshCw className="w-3 h-3" /> Next Riddle
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Myth Match renderer ───────────────────────────────────────────────────────

function MythMatchGame({ data, onNext }: { data: MythData; onNext: () => void }) {
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<string | null>(null);

  // Shuffle once on mount — NOT on every render
  const [shuffledTerms] = useState(() => [...data.pairs].sort(() => Math.random() - 0.5));
  const [shuffledMatches] = useState(() => [...data.pairs].sort(() => Math.random() - 0.5));
  const done = Object.keys(matched).length === data.pairs.length;

  const handleMatchClick = (matchId: string) => {
    if (!selectedTerm) return;
    if (matchId === selectedTerm) {
      setMatched((m) => ({ ...m, [selectedTerm]: selectedTerm }));
      setSelectedTerm(null);
      setWrong(null);
    } else {
      setWrong(selectedTerm);
      setTimeout(() => { setWrong(null); setSelectedTerm(null); }, 800);
    }
  };

  return (
    <motion.div {...fade} className="space-y-6">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-widest text-mentor/40 mb-1">{data.culture} Mythology</div>
        <h3 className="text-mentor font-bold text-lg">{data.title}</h3>
        <div className="text-xs text-system/50 mt-1 uppercase tracking-wider">Click a term, then its description</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Terms */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-system/30 mb-3">Figures</div>
          {shuffledTerms.map((p) => {
            const isMatched = !!matched[p.id];
            const isSelected = selectedTerm === p.id;
            const isWrong = wrong === p.id;
            return (
              <button key={p.id} onClick={() => !isMatched && setSelectedTerm(p.id)}
                className={`w-full text-left px-3 py-3 border text-sm font-bold transition-all ${
                  isMatched ? 'border-mentor/50 bg-mentor/10 text-mentor cursor-default' :
                  isWrong ? 'border-red-500/50 bg-red-500/10 text-red-400' :
                  isSelected ? 'border-system bg-system/15 text-system' :
                  'border-system/20 text-system/70 hover:border-system/60 cursor-pointer'
                }`}>
                {p.term}
              </button>
            );
          })}
        </div>
        {/* Descriptions */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-system/30 mb-3">Descriptions</div>
          {shuffledMatches.map((p) => {
            const isMatched = !!matched[p.id];
            return (
              <button key={p.id} onClick={() => handleMatchClick(p.id)}
                className={`w-full text-left px-3 py-3 border text-xs leading-snug transition-all ${
                  isMatched ? 'border-mentor/50 bg-mentor/10 text-mentor/70 cursor-default' :
                  selectedTerm ? 'border-system/40 text-system/70 hover:border-system hover:bg-system/10 cursor-pointer' :
                  'border-system/20 text-system/50 cursor-default'
                }`}>
                {p.match}
              </button>
            );
          })}
        </div>
      </div>

      {done && (
        <motion.div {...fade} className="border border-mentor/30 bg-mentor/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-mentor text-sm uppercase tracking-widest">
            <CheckCircle className="w-4 h-4" /> All matched!
          </div>
          <button onClick={onNext} className="px-4 py-2 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-widest transition-all flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> New Set
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Code Challenge renderer ───────────────────────────────────────────────────

function CodeChallengeGame({ data, onNext }: { data: CodeData; onNext: () => void }) {
  const [revealedHints, setRevealedHints] = useState<number[]>([]);

  return (
    <motion.div {...fade} className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-user/40 mb-1">Challenge</div>
        <h3 className="text-user font-bold text-xl">{data.title}</h3>
      </div>
      <p className="text-system/80 leading-relaxed text-sm">{data.description}</p>

      <div className="border border-system/20 bg-black">
        <div className="flex items-center justify-between px-4 py-2 border-b border-system/20">
          <span className="text-[10px] uppercase tracking-widest text-system/40">Starter Code</span>
          <span className="text-[10px] text-system/30">Python</span>
        </div>
        <pre className="p-4 text-sm text-system/90 overflow-x-auto leading-relaxed font-mono">{data.starter_code}</pre>
      </div>

      <div className="border border-system/20 p-4">
        <div className="text-[10px] uppercase tracking-widest text-system/40 mb-2">Expected Output</div>
        <code className="text-mentor text-sm font-mono">{data.expected_output}</code>
      </div>

      {data.hints.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-system/40">Hints</div>
          {data.hints.map((hint, i) => (
            <div key={i}>
              {revealedHints.includes(i) ? (
                <motion.div {...fade} className="border border-user/20 bg-user/5 p-3 text-sm text-user/80">
                  <span className="text-user/50 mr-2">#{i + 1}</span>{hint}
                </motion.div>
              ) : (
                <button onClick={() => setRevealedHints((h) => [...h, i])}
                  className="flex items-center gap-2 text-xs uppercase tracking-widest text-user/40 hover:text-user transition-colors">
                  <ChevronDown className="w-3 h-3" /> Reveal hint {i + 1}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border border-system/20 bg-system/5 p-4 text-xs text-system/50 uppercase tracking-wider">
        Write your solution in your own code environment, then come back for the next challenge.
      </div>

      <button onClick={onNext} className="px-4 py-2 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-widest transition-all flex items-center gap-2">
        <RefreshCw className="w-3 h-3" /> New Challenge
      </button>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function GamesPage() {
  const [activeType, setActiveType] = useState<GameType>('quiz');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<{ type: GameType; data: GameData } | null>(null);
  const [score, setScore] = useState({ c: 0, t: 0 });
  const [key, setKey] = useState(0); // forces re-render of game component

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, topic: topic.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
      }
      const result = await res.json() as { type: GameType; data: GameData };
      setGameData({ type: result.type, data: result.data });
      setKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => generate();

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-system font-mono overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-system/20 bg-black/90 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/"><button className="flex items-center gap-1 text-system/60 hover:text-system text-xs uppercase tracking-wider transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button></Link>
          <div className="h-4 w-px bg-system/20" />
          <div>
            <h1 className="text-sm font-bold tracking-widest text-glow-system uppercase">Nemotron_Games</h1>
            <div className="text-[10px] text-system/40 uppercase tracking-widest hidden sm:block">Interactive learning // Powered by NVIDIA</div>
          </div>
        </div>
        {score.t > 0 && (
          <div className="text-xs uppercase tracking-wider text-mentor/70 border border-mentor/30 px-3 py-1">
            Score <span className="text-mentor font-bold">{score.c}/{score.t}</span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">

          {/* Game type selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {GAME_TYPES.map((gt) => (
              <button key={gt.id} onClick={() => { setActiveType(gt.id); setGameData(null); }}
                className={`text-left p-3 border transition-all ${
                  activeType === gt.id
                    ? 'border-system bg-system/10 text-system border-glow-system'
                    : 'border-system/20 text-system/50 hover:border-system/60 hover:text-system/80'
                }`}>
                <div className="text-xl mb-2">{gt.icon}</div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1">{gt.name}</div>
                <div className="text-[10px] text-system/50 leading-snug">{gt.description}</div>
              </button>
            ))}
          </div>

          {/* Topic + generate */}
          <div className="flex gap-3">
            <input value={topic} onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && generate()}
              placeholder="Topic — e.g. photosynthesis, Greek mythology, recursion..."
              className="flex-1 bg-black border border-system/30 text-system placeholder:text-system/30 px-4 py-2 font-mono text-sm focus:outline-none focus:border-system" />
            <button onClick={generate} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-widest transition-all disabled:opacity-40">
              {loading ? <><span className="w-1 h-4 bg-system animate-pulse inline-block" /><span className="w-1 h-4 bg-system animate-pulse inline-block ml-0.5" /></> : <Zap className="w-4 h-4" />}
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.div {...fade} className="border border-red-500/40 bg-red-500/5 p-4 text-sm">
              <span className="text-red-400 uppercase tracking-widest text-xs">Error — </span>
              <span className="text-red-300/80">{error}</span>
            </motion.div>
          )}

          {/* Game area */}
          <AnimatePresence mode="wait">
            {!gameData && !loading && (
              <motion.div key="empty" {...fade} className="text-center py-16 text-system/30">
                <div className="text-4xl mb-4">⬡</div>
                <div className="text-xs uppercase tracking-widest">Select a game type and press Generate</div>
                <div className="text-[10px] mt-2 text-system/20">Powered by NVIDIA Nemotron 70B</div>
              </motion.div>
            )}
            {gameData && (
              <motion.div key={`game-${key}`} {...fade}>
                {gameData.type === 'quiz' && <QuizGame key={key} data={gameData.data as QuizData} onNext={handleNext} score={score} setScore={setScore} />}
                {gameData.type === 'riddle' && <RiddleGame key={key} data={gameData.data as RiddleData} onNext={handleNext} />}
                {gameData.type === 'myth-match' && <MythMatchGame key={key} data={gameData.data as MythData} onNext={handleNext} />}
                {gameData.type === 'code-challenge' && <CodeChallengeGame key={key} data={gameData.data as CodeData} onNext={handleNext} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-[0.06] bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]" />
    </div>
  );
}
