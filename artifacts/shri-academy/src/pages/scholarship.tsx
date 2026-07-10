import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  Trophy, BookOpen, Star, Clock, Users, CheckCircle, ChevronRight,
  AlertTriangle, Terminal, ArrowLeft, Zap, Award, Calendar,
  RefreshCw, Send, Eye, Shield, GraduationCap, Gift,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Exam {
  id: string;
  title: string;
  description: string;
  month: number;
  year: number;
  status: 'draft' | 'open' | 'closed' | 'graded';
  opens_at: string | null;
  closes_at: string | null;
  submission_count: number;
}

interface Question {
  id: string;
  order_num: number;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  options: string[] | null;
  max_score: number;
}

interface Winner {
  first_name: string;
  last_initial: string;
  age: number;
  rank: number;
  total_score: number;
  exam_title: string;
  month: number;
  year: number;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Countdown hook
// ─────────────────────────────────────────────────────────────────────────────

function useCountdown(targetIso: string | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!targetIso) { setRemaining(''); return; }
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) { setRemaining('CLOSED'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(d > 0 ? `${d}D ${h}H ${m}M` : `${h}H ${m}M ${s}S`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}

// ─────────────────────────────────────────────────────────────────────────────
// How It Works section
// ─────────────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  { n: '01', icon: <Calendar className="w-5 h-5" />, title: 'Monthly Exam', desc: 'Every month, a new examination opens for all ages — from curious 8-year-olds to working adults. No prerequisites, no fees.' },
  { n: '02', icon: <BookOpen className="w-5 h-5" />, title: 'Answer Questions', desc: 'Mix of multiple-choice and short-answer questions spanning mathematics, science, language, and critical thinking.' },
  { n: '03', icon: <Trophy className="w-5 h-5" />, title: 'Top 100 Win', desc: 'The highest-scoring 100 students from each monthly exam receive a free lifetime subscription — no strings attached, no expiry.' },
  { n: '04', icon: <Gift className="w-5 h-5" />, title: 'Lifetime Access', desc: 'Winners get permanent Standard-tier access: unlimited AI mentoring, all subjects, certifications, forever.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Exam Panel — shows questions and handles submission
// ─────────────────────────────────────────────────────────────────────────────

function ExamPanel({ exam, onSubmitted }: { exam: Exam; onSubmitted: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ auto_score: number } | null>(null);
  const countdown = useCountdown(exam.closes_at);

  useEffect(() => {
    apiFetch(`/scholarship/exam/${exam.id}/questions`)
      .then((d) => { setQuestions(d.questions); setLoading(false); })
      .catch(() => setLoading(false));
  }, [exam.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim() || !age) {
      setError('Please fill in your name, email, and age.');
      return;
    }
    const unanswered = questions.filter(q => answers[q.id] === undefined || answers[q.id] === '');
    if (unanswered.length > 0) {
      setError(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiFetch('/scholarship/submit', {
        method: 'POST',
        body: JSON.stringify({ exam_id: exam.id, full_name: fullName, email, age: Number(age), answers }),
      });
      setSuccess({ auto_score: data.auto_score });
      onSubmitted();
    } catch (err: any) {
      setError(err.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="border border-green-500/40 bg-green-500/10 p-8 flex flex-col items-center gap-4 text-center">
        <CheckCircle className="w-14 h-14 text-green-400" />
        <p className="text-green-400 font-bold uppercase tracking-[0.2em] text-lg">Submission Received</p>
        <p className="text-system/60 text-sm leading-relaxed max-w-md">
          Your answers are on record. MCQ auto-score: <strong className="text-system">{success.auto_score} pts</strong>.
          Short answers will be reviewed by our mentors. Winners are announced at month-end.
        </p>
        <p className="text-system/40 text-xs uppercase tracking-wider">Good luck — top 100 win a lifetime subscription.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Exam meta */}
      <div className="border border-user/30 bg-user/5 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <p className="text-user font-bold uppercase tracking-[0.15em] text-sm">{exam.title}</p>
          <p className="text-system/50 text-xs mt-0.5">{MONTH_NAMES[exam.month]} {exam.year} · {exam.submission_count} entrants</p>
        </div>
        {exam.closes_at && (
          <div className="flex items-center gap-2 border border-user/30 px-3 py-2 shrink-0">
            <Clock className="w-4 h-4 text-user/70" />
            <div>
              <p className="text-[9px] text-system/40 uppercase tracking-wider">Closes In</p>
              <p className="text-user font-bold text-sm">{countdown || '...'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Student details */}
      <div className="border border-system/20 p-5 space-y-4">
        <p className="text-[10px] uppercase tracking-widest text-system/50 mb-3">Your Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sch-name" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1.5">Full Name *</label>
            <input
              id="sch-name"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Arjun Sharma"
              required
              className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm placeholder:text-system/20 focus:outline-none focus:border-system/60 rounded-none"
            />
          </div>
          <div>
            <label htmlFor="sch-age" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1.5">Age *</label>
            <input
              id="sch-age"
              type="number"
              min={5}
              max={99}
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="e.g. 14"
              required
              className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm placeholder:text-system/20 focus:outline-none focus:border-system/60 rounded-none"
            />
          </div>
        </div>
        <div>
          <label htmlFor="sch-email" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1.5">Email *</label>
          <input
            id="sch-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="student@example.com"
            required
            className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm placeholder:text-system/20 focus:outline-none focus:border-system/60 rounded-none"
          />
          <p className="text-system/30 text-[10px] mt-1">Used to apply your scholarship if you place in the top 100.</p>
        </div>
      </div>

      {/* Questions */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 border border-system/20 bg-system/5" />)}
        </div>
      ) : questions.length === 0 ? (
        <div className="border border-system/20 p-6 text-center text-system/40 text-sm uppercase tracking-wider">
          No questions have been added to this exam yet.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="border border-system/20 p-5 hover:border-system/40 transition-colors">
              <div className="flex gap-3 mb-4">
                <span className="text-system/30 text-xs font-bold shrink-0 mt-0.5">Q{i + 1}</span>
                <div className="flex-1">
                  <p className="text-system/90 text-sm leading-relaxed">{q.question_text}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${q.question_type === 'mcq' ? 'border-system/30 text-system/50' : 'border-mentor/30 text-mentor/60'}`}>
                      {q.question_type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                    </span>
                    <span className="text-[9px] text-system/30 uppercase tracking-wider">{q.max_score} pts</span>
                  </div>
                </div>
              </div>

              {q.question_type === 'mcq' && q.options ? (
                <div className="space-y-2 pl-6">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${
                        Number(answers[q.id]) === oi
                          ? 'border-system/60 bg-system/10 text-system'
                          : 'border-system/15 text-system/60 hover:border-system/30 hover:text-system/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={oi}
                        checked={Number(answers[q.id]) === oi}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                        className="sr-only"
                      />
                      <span className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                        Number(answers[q.id]) === oi ? 'border-system bg-system text-black' : 'border-system/30'
                      }`}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="pl-6">
                  <label htmlFor={`short-${q.id}`} className="sr-only">Answer for question {i + 1}</label>
                  <textarea
                    id={`short-${q.id}`}
                    rows={3}
                    value={(answers[q.id] as string) ?? ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Write your answer here..."
                    className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm placeholder:text-system/20 focus:outline-none focus:border-system/60 rounded-none resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {questions.length > 0 && (
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-8 py-4 border border-system/60 bg-system/10 text-system hover:bg-system/20 transition-all text-sm uppercase tracking-widest font-bold disabled:opacity-50"
        >
          {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? 'Submitting...' : 'Submit Answers'}
        </button>
      )}
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Winners Board
// ─────────────────────────────────────────────────────────────────────────────

function WinnersBoard() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/scholarship/winners')
      .then(d => { setWinners(d.winners); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="animate-pulse space-y-2">
      {[1,2,3,4,5].map(i => <div key={i} className="h-10 border border-system/15 bg-system/5" />)}
    </div>
  );

  if (winners.length === 0) return (
    <div className="border border-system/20 p-8 text-center">
      <Trophy className="w-10 h-10 text-system/20 mx-auto mb-3" />
      <p className="text-system/40 text-sm uppercase tracking-wider">No winners yet — be the first!</p>
    </div>
  );

  // Group by exam
  const byExam = winners.reduce<Record<string, Winner[]>>((acc, w) => {
    const key = `${w.year}-${w.month}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(byExam).map(([key, ws]) => {
        const w0 = ws[0];
        return (
          <div key={key} className="border border-system/20">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-system/20 bg-system/5">
              <Trophy className="w-4 h-4 text-user" />
              <span className="text-xs font-bold uppercase tracking-widest text-system/80">
                {w0.exam_title} — {MONTH_NAMES[w0.month]} {w0.year}
              </span>
              <span className="ml-auto text-[10px] text-system/40 uppercase">{ws.length} winners</span>
            </div>
            <div className="divide-y divide-system/10">
              {ws.slice(0, 20).map(w => (
                <div key={`${w.rank}-${w.first_name}`} className="flex items-center gap-4 px-4 py-2.5 hover:bg-system/5 transition-colors">
                  <span className={`w-8 text-right text-xs font-bold ${w.rank <= 3 ? 'text-user' : 'text-system/40'}`}>
                    #{w.rank}
                  </span>
                  <span className="text-system/80 text-sm flex-1">
                    {w.first_name} {w.last_initial && `${w.last_initial}.`}
                  </span>
                  <span className="text-system/40 text-xs">{w.age} yrs</span>
                  <span className="text-system/60 text-xs font-mono">{Number(w.total_score).toFixed(0)} pts</span>
                  <Award className="w-3.5 h-3.5 text-user/60" />
                </div>
              ))}
              {ws.length > 20 && (
                <div className="px-4 py-2 text-[10px] text-system/30 uppercase tracking-wider">
                  + {ws.length - 20} more winners
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Scholarship page
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'exam' | 'winners';

export default function Scholarship() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [exam, setExam] = useState<Exam | null>(null);
  const [examLoading, setExamLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const countdown = useCountdown(exam?.closes_at ?? null);

  const fetchExam = useCallback(() => {
    apiFetch('/scholarship/current')
      .then(d => { setExam(d.exam); setExamLoading(false); })
      .catch(() => setExamLoading(false));
  }, []);

  useEffect(() => { fetchExam(); }, [fetchExam]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview',    icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'exam',     label: 'Take Exam',   icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'winners',  label: 'Hall of Fame', icon: <Trophy className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col bg-black text-system font-mono h-[100dvh] overflow-hidden selection:bg-system/30 selection:text-system">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 border-b border-system/20 bg-black/80 backdrop-blur z-10 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <GraduationCap className="w-6 h-6 text-system" />
            <div className="absolute inset-0 bg-system/20 blur-md rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-widest text-glow-system uppercase leading-tight">Shri_Scholarship</h1>
            <div className="text-[10px] uppercase text-system/60 tracking-[0.2em]">Monthly_Exam · Top_100 · Lifetime_Access</div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {exam && (
            <div className="hidden sm:flex items-center gap-2 border border-user/30 px-3 py-1.5">
              <Clock className="w-3 h-3 text-user/70" />
              <span className="text-user/70 uppercase tracking-wider text-[10px]">
                {exam.status === 'open' ? `Closes: ${countdown}` : `Status: ${exam.status.toUpperCase()}`}
              </span>
            </div>
          )}
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 px-3 py-1.5 border border-system/30 text-system/60 hover:text-system hover:border-system/60 uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Tutor
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-system/20 bg-black shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-3 px-4 uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === t.id
                ? 'border-b-2 border-system text-system bg-system/10 text-glow-system'
                : 'text-system/40 hover:text-system/70 hover:bg-system/5'
            }`}
          >
            {t.icon} {t.label}
            {t.id === 'exam' && exam?.status === 'open' && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(6,182,212,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="max-w-4xl mx-auto relative space-y-8">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              {/* Hero */}
              <div className="border border-system/30 p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-system/60 via-user/40 to-transparent" />
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="w-16 h-16 border border-system/40 bg-system/10 flex items-center justify-center shrink-0">
                    <Trophy className="w-8 h-8 text-system" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <h2 className="text-system font-bold uppercase tracking-[0.2em] text-base text-glow-system">
                        Shri Academy Scholarship Programme
                      </h2>
                      <span className="text-[9px] border border-system/30 text-system/60 px-2 py-0.5 uppercase tracking-wider">Free · Monthly · All Ages</span>
                    </div>
                    <p className="text-system/60 text-sm leading-relaxed max-w-2xl">
                      We believe cost should never be a barrier to world-class AI tutoring. Every month, we hold
                      an open examination — no registration fee, no age restriction, no prerequisites. The top
                      <strong className="text-system"> 100 students</strong> receive a
                      <strong className="text-system"> free lifetime subscription</strong> to Shri Academy, applied
                      automatically to their account.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {['No fees ever', 'All ages welcome', 'Top 100 win lifetime access', 'Monthly fresh start'].map(b => (
                        <span key={b} className="text-[9px] border border-system/20 text-system/50 px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5 text-green-400" /> {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current exam status */}
              {examLoading ? (
                <div className="border border-system/20 p-6 animate-pulse bg-system/5" />
              ) : exam ? (
                <div className={`border p-5 ${exam.status === 'open' ? 'border-green-500/40 bg-green-500/5' : 'border-system/20'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${exam.status === 'open' ? 'bg-green-400 animate-pulse' : 'bg-system/30'}`} />
                      <div>
                        <p className="text-system/80 font-bold uppercase tracking-wider text-sm">{exam.title}</p>
                        <p className="text-system/40 text-[10px] uppercase mt-0.5">
                          {MONTH_NAMES[exam.month]} {exam.year} · {exam.submission_count} entrants so far
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] border px-2 py-1 uppercase tracking-wider font-bold ${
                        exam.status === 'open' ? 'text-green-400 border-green-400/40' :
                        exam.status === 'graded' ? 'text-user border-user/40' :
                        'text-system/40 border-system/20'
                      }`}>{exam.status.toUpperCase()}</span>
                      {exam.status === 'open' && (
                        <button
                          onClick={() => setActiveTab('exam')}
                          className="flex items-center gap-2 px-4 py-2 border border-system/60 bg-system/10 text-system hover:bg-system/20 transition-all text-xs uppercase tracking-widest font-bold"
                        >
                          <ChevronRight className="w-3.5 h-3.5" /> Take Exam
                        </button>
                      )}
                    </div>
                  </div>
                  {exam.closes_at && exam.status === 'open' && (
                    <div className="mt-4 pt-4 border-t border-system/15 flex items-center gap-2 text-xs">
                      <Clock className="w-3.5 h-3.5 text-system/50" />
                      <span className="text-system/50 uppercase tracking-wider">Closes in:</span>
                      <span className="text-system font-bold">{countdown}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-system/20 p-6 text-center">
                  <Calendar className="w-8 h-8 text-system/20 mx-auto mb-3" />
                  <p className="text-system/50 text-sm uppercase tracking-wider">No exam currently open</p>
                  <p className="text-system/30 text-xs mt-1">Check back next month — exams open on the 1st.</p>
                </div>
              )}

              {/* How it works */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-system/40 mb-4 flex items-center gap-2">
                  <Star className="w-3 h-3" /> How It Works
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {HOW_IT_WORKS.map(s => (
                    <div key={s.n} className="border border-system/20 p-4 hover:border-system/40 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-system/30 text-[10px] font-bold">{s.n}</span>
                        <div className="text-system/60">{s.icon}</div>
                        <span className="text-system/90 text-xs font-bold uppercase tracking-wider">{s.title}</span>
                      </div>
                      <p className="text-system/40 text-[11px] leading-relaxed pl-7">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* What you win */}
              <div className="border border-user/30 bg-user/5 p-5">
                <p className="text-[10px] uppercase tracking-widest text-user/60 mb-4 flex items-center gap-2">
                  <Gift className="w-3 h-3" /> What Winners Receive
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Subscription Tier', value: 'Standard (Highest)', sub: 'All features unlocked' },
                    { label: 'Duration', value: 'Lifetime', sub: 'No expiry, ever' },
                    { label: 'Value', value: '$29.99 / mo', sub: 'Free, forever' },
                  ].map(item => (
                    <div key={item.label} className="border border-user/20 p-4">
                      <p className="text-[10px] text-user/50 uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-user font-bold text-sm">{item.value}</p>
                      <p className="text-system/40 text-[10px] mt-0.5">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── TAKE EXAM ── */}
          {activeTab === 'exam' && (
            <>
              {examLoading ? (
                <div className="animate-pulse border border-system/20 h-40 bg-system/5" />
              ) : !exam ? (
                <div className="border border-system/20 p-8 text-center">
                  <Calendar className="w-10 h-10 text-system/20 mx-auto mb-3" />
                  <p className="text-system/50 uppercase tracking-wider text-sm">No exam is currently open</p>
                  <p className="text-system/30 text-xs mt-2">Exams open every month. Check back soon.</p>
                </div>
              ) : exam.status !== 'open' ? (
                <div className="border border-system/20 p-8 text-center">
                  <Clock className="w-10 h-10 text-system/20 mx-auto mb-3" />
                  <p className="text-system/50 uppercase tracking-wider text-sm">
                    {exam.status === 'graded' ? 'This exam has been graded. Winners have been notified.' : 'This exam is not currently open for submissions.'}
                  </p>
                </div>
              ) : submitted ? (
                <div className="border border-green-500/40 bg-green-500/10 p-8 flex flex-col items-center gap-4 text-center">
                  <CheckCircle className="w-14 h-14 text-green-400" />
                  <p className="text-green-400 font-bold uppercase tracking-[0.2em] text-lg">Submission on Record</p>
                  <p className="text-system/60 text-sm">Winners are announced at month-end. Good luck!</p>
                </div>
              ) : (
                <ExamPanel exam={exam} onSubmitted={() => setSubmitted(true)} />
              )}
            </>
          )}

          {/* ── WINNERS ── */}
          {activeTab === 'winners' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-5 h-5 text-user" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-user">Hall of Fame — Scholarship Winners</h2>
              </div>
              <WinnersBoard />
            </>
          )}

        </div>
      </main>

      {/* Scanline */}
      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]" />
    </div>
  );
}
