import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  Terminal, LogOut, BarChart3, MessageSquare, RefreshCw, AlertTriangle,
  Users, CreditCard, Activity, ShieldCheck, Lock, Cpu, Database,
  Brain, Radio, CheckCircle, ExternalLink, Server, Zap, Eye, Key,
  GitBranch, AlertOctagon, FlaskConical, ArrowRight,
  GraduationCap, Trophy, Plus, BookOpen, Trash2, Play, Square,
  Award, ChevronDown, ChevronUp, Send, Clock, Gift,
} from 'lucide-react';
import { getMentorMe, getMentorMetrics, getSageMakerStatus, generateSageMakerData, trainSageMakerModel, deploySageMakerEndpoint } from '@/lib/mentor-api';
import Home from '@/pages/home';
import {
  listExams, createExam, addQuestion, getMentorQuestions, deleteQuestion,
  setExamStatus, getSubmissions, scoreSubmission, grantScholarships,
  type ScholarshipExam, type ScholarshipQuestion, type ScholarshipSubmission,
} from '@/lib/scholarship-api';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function MentorDashboard() {
  const [, setLocation] = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [email, setEmail] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'mentoring' | 'metrics' | 'security' | 'scholarship' | 'sagemaker'>('mentoring');

  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('mentor_token');
    if (!token) {
      setLocation('/mentor/login');
      return;
    }

    const payload = parseJwt(token);
    if (payload && payload.email) {
      setEmail(payload.email);
    }

    // Verify token
    getMentorMe(token)
      .then((data) => {
        if (data.email) {
          setEmail(data.email);
        }
        setIsVerifying(false);
      })
      .catch(() => {
        localStorage.removeItem('mentor_token');
        setLocation('/mentor/login');
      });
  }, [setLocation]);

  const fetchMetrics = async () => {
    const token = localStorage.getItem('mentor_token');
    if (!token) return;
    
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const data = await getMentorMetrics(token);
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setMetricsError(err.message || 'FAILED_TO_FETCH_METRICS');
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'metrics' && !metrics && !metricsLoading && !metricsError) {
      fetchMetrics();
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('mentor_token');
    setLocation('/mentor/login');
  };

  if (isVerifying) {
    return (
      <div className="min-h-[100dvh] bg-black text-system font-mono flex items-center justify-center">
        <div className="flex items-center gap-3 animate-pulse text-mentor">
          <Terminal className="w-5 h-5" />
          <span className="uppercase tracking-widest text-sm">VERIFYING_CREDENTIALS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-system font-mono overflow-hidden selection:bg-system/30 selection:text-system">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 border-b border-mentor/30 bg-black/80 backdrop-blur z-10 gap-3">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-mentor" />
          <h1 className="text-lg font-bold tracking-widest text-glow-mentor text-mentor uppercase leading-tight">MENTOR_PORTAL</h1>
        </div>
        
        <div className="flex items-center gap-4 text-xs uppercase tracking-wider text-mentor/80 border border-mentor/20 px-3 py-1.5 bg-mentor/5">
          <span className="hidden sm:inline">CLEARANCE: SCHOOL_MENTOR</span>
          <span className="hidden sm:inline text-mentor/30">|</span>
          <span className="text-mentor font-bold">{email || 'UNKNOWN_USER'}</span>
          <span className="text-mentor/30">|</span>
          <button 
            onClick={handleLogout}
            className="hover:text-user hover:text-glow-user transition-colors cursor-pointer flex items-center gap-1"
          >
            [ LOGOUT ] <LogOut className="w-3 h-3 inline" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-mentor/20 bg-black/50 z-10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('mentoring')}
          className={`flex-1 min-w-max py-3 px-4 uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'mentoring' 
              ? 'border-b-2 border-mentor text-mentor bg-mentor/10 text-glow-mentor' 
              : 'text-mentor/50 hover:text-mentor/80 hover:bg-mentor/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> AI_MENTORING
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 min-w-max py-3 px-4 uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'metrics' 
              ? 'border-b-2 border-system text-system bg-system/10 text-glow-system' 
              : 'text-system/50 hover:text-system/80 hover:bg-system/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> SCHOLARSHIP_METRICS
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 min-w-max py-3 px-4 uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'security' 
              ? 'border-b-2 border-user text-user bg-user/10 text-glow-user' 
              : 'text-user/40 hover:text-user/70 hover:bg-user/5'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> SECURITY_INFRA
        </button>
        <button
          onClick={() => setActiveTab('scholarship')}
          className={`flex-1 min-w-max py-3 px-4 uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'scholarship'
              ? 'border-b-2 border-mentor text-mentor bg-mentor/10 text-glow-mentor'
              : 'text-mentor/40 hover:text-mentor/70 hover:bg-mentor/5'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> SCHOLARSHIP_MGMT
        </button>
        <button
          onClick={() => setActiveTab('sagemaker')}
          className={`flex-1 min-w-max py-3 px-4 uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sagemaker'
              ? 'border-b-2 border-system text-system bg-system/10 text-glow-system'
              : 'text-system/40 hover:text-system/70 hover:bg-system/5'
          }`}
        >
          <Brain className="w-4 h-4" /> SAGEMAKER_PIPELINE
        </button>
      </div>

      {/* Content Area */}
      <main className="flex-1 relative overflow-hidden bg-black">
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(139,92,246,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.2)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {activeTab === 'mentoring' ? (
          <div className="absolute inset-0 relative h-full">
            <Home isMentorObserver={true} />
          </div>
        ) : activeTab === 'security' ? (
          <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
            <SecurityInfraTab />
          </div>
        ) : activeTab === 'scholarship' ? (
          <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
            <ScholarshipMgmtTab />
          </div>
        ) : activeTab === 'sagemaker' ? (
          <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
            <SageMakerTab />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
            <div className="max-w-6xl mx-auto space-y-8">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-system/30 pb-4">
                <div>
                  <h2 className="text-xl text-system font-bold tracking-widest uppercase text-glow-system flex items-center gap-2">
                    <Activity className="w-5 h-5" /> SYSTEM_TELEMETRY
                  </h2>
                  <div className="text-xs text-system/60 uppercase mt-1">
                    {lastUpdated ? `LAST_UPDATED: ${lastUpdated.toLocaleTimeString()}` : 'AWAITING_DATA'}
                  </div>
                </div>
                <button
                  onClick={fetchMetrics}
                  disabled={metricsLoading}
                  className="flex items-center gap-2 px-4 py-2 border border-system/50 text-system hover:bg-system/10 transition-colors uppercase cursor-pointer disabled:opacity-50 disabled:hover:bg-transparent text-sm"
                  data-testid="metrics-refresh-btn"
                >
                  <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} />
                  {metricsLoading ? 'FETCHING...' : 'REFRESH_DATA'}
                </button>
              </div>

              {metricsError ? (
                <div className="p-4 border border-destructive bg-destructive/10 text-destructive flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-bold uppercase tracking-widest mb-1">TELEMETRY_FAILURE</div>
                    <div className="text-sm opacity-80 uppercase">{metricsError}</div>
                  </div>
                </div>
              ) : metricsLoading && !metrics ? (
                <div className="space-y-6 animate-pulse opacity-60">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 border border-system/30 bg-system/5"></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 border border-system/30 bg-system/5"></div>
                    ))}
                  </div>
                  <div className="text-center text-system uppercase tracking-widest py-8">
                    FETCHING_DATA...
                  </div>
                </div>
              ) : metrics ? (
                <div className="space-y-6">
                  
                  {/* ROW 1: Users */}
                  <div className="space-y-2">
                    <div className="text-xs uppercase text-system/50 flex items-center gap-2 mb-2">
                      <Users className="w-3 h-3" /> USER_DEMOGRAPHICS
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <MetricCard title="TOTAL_USERS" value={metrics.users?.total} testId="metric-total-users" />
                      <MetricCard title="ENROLLED_STUDENTS" value={metrics.users?.students} />
                      <MetricCard title="ACTIVE_MENTORS" value={metrics.users?.mentors} highlight="mentor" />
                    </div>
                  </div>

                  {/* ROW 2: Subscriptions */}
                  <div className="space-y-2">
                    <div className="text-xs uppercase text-system/50 flex items-center gap-2 mb-2">
                      <CreditCard className="w-3 h-3" /> SUBSCRIPTION_STATUS
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <MetricCard title="ACTIVE_SUBSCRIPTIONS" value={metrics.subscriptions?.active_total} testId="metric-active-subs" />
                      <MetricCard title="VIA_STRIPE" value={metrics.subscriptions?.via_stripe} />
                      <MetricCard title="VIA_CRYPTO" value={metrics.subscriptions?.via_crypto} highlight="user" />
                    </div>
                  </div>

                  {/* ROW 3: Tiers */}
                  <div className="space-y-2">
                    <div className="text-xs uppercase text-system/50 mb-2">TIER_BREAKDOWN</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <MetricCard 
                        title="STANDARD_TIER" 
                        value={metrics.subscriptions?.tiers?.standard} 
                        subValue="$29.99/mo"
                        testId="metric-tier-high" 
                      />
                      <MetricCard 
                        title="REGIONAL_TIER" 
                        value={metrics.subscriptions?.tiers?.regional} 
                        subValue="$14.99/mo"
                        testId="metric-tier-middle" 
                      />
                      <MetricCard 
                        title="ACCESS_TIER" 
                        value={metrics.subscriptions?.tiers?.access} 
                        subValue="$4.99/mo"
                        testId="metric-tier-low" 
                      />
                    </div>
                  </div>

                  {/* ROW 4: Crypto */}
                  <div className="space-y-2">
                    <div className="text-xs uppercase text-system/50 mb-2">CRYPTO_ACTIVITY_30D</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <MetricCard title="TRANSACTIONS_30D" value={metrics.crypto_payments_30d?.total_transactions} highlight="user" />
                      <MetricCard 
                        title="VOLUME_USD" 
                        value={`$${(metrics.crypto_payments_30d?.total_usd_volume || 0).toFixed(2)}`} 
                        highlight="user" 
                      />
                      <div className="border border-system/30 bg-black/40 p-4 relative overflow-hidden flex flex-col justify-center">
                        <div className="absolute top-0 left-0 w-1 h-full bg-user/50"></div>
                        <div className="text-[10px] text-system/70 tracking-widest uppercase mb-2">CURRENCY_DISTRIBUTION</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {Object.entries(metrics.crypto_payments_30d?.by_currency || {}).map(([currency, count]) => (
                            <div key={currency} className="flex justify-between items-center">
                              <span className="text-system/60 uppercase">{currency}</span>
                              <span className="text-user font-bold">{count as number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : null}

            </div>
          </div>
        )}
      </main>
      
      {/* Visual Glitch Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]"></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scholarship Management Tab
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function ScholarshipMgmtTab() {
  const token = localStorage.getItem('mentor_token') ?? '';

  // ── Exams list ──
  const [exams, setExams] = useState<ScholarshipExam[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // ── Create exam form ──
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newOpensAt, setNewOpensAt] = useState('');
  const [newClosesAt, setNewClosesAt] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Questions form ──
  const [questions, setQuestions] = useState<ScholarshipQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showAddQ, setShowAddQ] = useState(false);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'mcq' | 'short_answer'>('mcq');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qMaxScore, setQMaxScore] = useState(10);
  const [addingQ, setAddingQ] = useState(false);

  // ── Submissions ──
  const [submissions, setSubmissions] = useState<ScholarshipSubmission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'questions' | 'submissions'>('questions');
  const [grantingResult, setGrantingResult] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);

  // ── Mentor score edit ──
  const [scoreEdit, setScoreEdit] = useState<Record<string, string>>({});

  const fetchExams = useCallback(async () => {
    setExamsLoading(true);
    try {
      const { exams: data } = await listExams(token);
      setExams(data);
    } catch {
      // ignore
    } finally {
      setExamsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const selectedExam = exams.find(e => e.id === selectedExamId) ?? null;

  const fetchQuestions = useCallback(async (examId: string) => {
    setQuestionsLoading(true);
    try {
      const { questions: data } = await getMentorQuestions(token, examId);
      setQuestions(data);
    } catch { /* ignore */ } finally {
      setQuestionsLoading(false);
    }
  }, [token]);

  const fetchSubmissions = useCallback(async (examId: string) => {
    setSubsLoading(true);
    try {
      const { submissions: data } = await getSubmissions(token, examId);
      setSubmissions(data);
    } catch { /* ignore */ } finally {
      setSubsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!selectedExamId) return;
    if (activeSection === 'questions') fetchQuestions(selectedExamId);
    else fetchSubmissions(selectedExamId);
  }, [selectedExamId, activeSection, fetchQuestions, fetchSubmissions]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { exam } = await createExam(token, {
        title: newTitle,
        description: newDesc,
        month: newMonth,
        year: newYear,
        opens_at: newOpensAt || undefined,
        closes_at: newClosesAt || undefined,
      });
      setExams(prev => [exam, ...prev]);
      setSelectedExamId(exam.id);
      setShowCreateForm(false);
      setNewTitle(''); setNewDesc(''); setNewOpensAt(''); setNewClosesAt('');
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;
    setAddingQ(true);
    try {
      await addQuestion(token, selectedExamId, {
        order_num: questions.length + 1,
        question_text: qText,
        question_type: qType,
        options: qType === 'mcq' ? qOptions.filter(o => o.trim()) : undefined,
        correct_option: qType === 'mcq' ? qCorrect : undefined,
        max_score: qMaxScore,
      });
      await fetchQuestions(selectedExamId);
      setShowAddQ(false);
      setQText(''); setQOptions(['','','','']); setQCorrect(0); setQMaxScore(10);
    } catch { /* ignore */ } finally {
      setAddingQ(false);
    }
  };

  const handleDeleteQ = async (qid: string) => {
    if (!selectedExamId) return;
    await deleteQuestion(token, qid);
    await fetchQuestions(selectedExamId);
  };

  const handleStatusChange = async (examId: string, status: string) => {
    await setExamStatus(token, examId, status);
    await fetchExams();
  };

  const handleScoreSubmission = async (sid: string) => {
    const val = Number(scoreEdit[sid]);
    if (isNaN(val)) return;
    await scoreSubmission(token, sid, val);
    if (selectedExamId) await fetchSubmissions(selectedExamId);
  };

  const handleGrantScholarships = async () => {
    if (!selectedExamId) return;
    setGranting(true);
    try {
      const { granted } = await grantScholarships(token, selectedExamId);
      setGrantingResult(`✓ ${granted} lifetime scholarships granted and applied to student accounts.`);
      await fetchExams();
    } catch (err: any) {
      setGrantingResult(`Error: ${err.message}`);
    } finally {
      setGranting(false);
    }
  };

  const statusBadgeClass = (status: string) => {
    if (status === 'open')   return 'text-green-400 border-green-400/40';
    if (status === 'graded') return 'text-user border-user/40';
    if (status === 'closed') return 'text-system/50 border-system/30';
    return 'text-mentor/50 border-mentor/20';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-mentor/30 pb-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-mentor text-glow-mentor" />
          <h2 className="text-xl text-mentor font-bold tracking-widest uppercase text-glow-mentor">
            SCHOLARSHIP_MANAGEMENT
          </h2>
        </div>
        <button
          onClick={() => setShowCreateForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 border border-mentor/50 text-mentor hover:bg-mentor/10 transition-colors uppercase tracking-wider text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> New Exam
        </button>
      </div>

      {/* Create exam form */}
      {showCreateForm && (
        <form onSubmit={handleCreateExam} className="border border-mentor/30 bg-mentor/5 p-5 space-y-4">
          <p className="text-[10px] text-mentor/60 uppercase tracking-widest mb-3">Create New Exam</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="exam-title" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1">Exam Title *</label>
              <input id="exam-title" type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Shri Academy July 2026 Scholarship Exam"
                className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm placeholder:text-system/20 focus:outline-none focus:border-mentor/50 rounded-none" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="exam-desc" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1">Description</label>
              <textarea id="exam-desc" rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Open to all ages. Top 100 scorers receive a lifetime subscription."
                className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm placeholder:text-system/20 focus:outline-none focus:border-mentor/50 rounded-none resize-none" />
            </div>
            <div>
              <label htmlFor="exam-month" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1">Month *</label>
              <select id="exam-month" value={newMonth} onChange={e => setNewMonth(Number(e.target.value))} required
                className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm focus:outline-none focus:border-mentor/50 rounded-none">
                {MONTH_NAMES.slice(1).map((m, i) => <option key={m} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="exam-year" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1">Year *</label>
              <input id="exam-year" type="number" min={2024} max={2099} required value={newYear} onChange={e => setNewYear(Number(e.target.value))}
                className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm focus:outline-none focus:border-mentor/50 rounded-none" />
            </div>
            <div>
              <label htmlFor="exam-opens" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1">Opens At (optional)</label>
              <input id="exam-opens" type="datetime-local" value={newOpensAt} onChange={e => setNewOpensAt(e.target.value)}
                className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm focus:outline-none focus:border-mentor/50 rounded-none" />
            </div>
            <div>
              <label htmlFor="exam-closes" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1">Closes At (optional)</label>
              <input id="exam-closes" type="datetime-local" value={newClosesAt} onChange={e => setNewClosesAt(e.target.value)}
                className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm focus:outline-none focus:border-mentor/50 rounded-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 border border-mentor/60 bg-mentor/10 text-mentor hover:bg-mentor/20 transition-all text-xs uppercase tracking-widest font-bold disabled:opacity-50">
              {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {creating ? 'Creating...' : 'Create Exam'}
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-system/20 text-system/50 hover:text-system/80 transition-colors text-xs uppercase tracking-wider">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Exam list */}
      <div className="space-y-2">
        <p className="text-[10px] text-system/40 uppercase tracking-widest flex items-center gap-2">
          <BookOpen className="w-3 h-3" /> All Exams
        </p>
        {examsLoading ? (
          <div className="animate-pulse space-y-2">
            {[1,2].map(i => <div key={i} className="h-14 border border-system/20 bg-system/5" />)}
          </div>
        ) : exams.length === 0 ? (
          <div className="border border-system/20 p-6 text-center text-system/40 text-sm uppercase tracking-wider">
            No exams yet — create your first exam above.
          </div>
        ) : (
          <div className="space-y-1">
            {exams.map(exam => (
              <div key={exam.id}
                className={`border p-4 cursor-pointer transition-all ${
                  selectedExamId === exam.id ? 'border-mentor/50 bg-mentor/5' : 'border-system/20 hover:border-system/40'
                }`}
                onClick={() => setSelectedExamId(exam.id === selectedExamId ? null : exam.id)}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Trophy className={`w-4 h-4 ${selectedExamId === exam.id ? 'text-mentor' : 'text-system/30'}`} />
                    <div>
                      <p className="text-system/90 text-sm font-bold uppercase tracking-wider">{exam.title}</p>
                      <p className="text-system/40 text-[10px] uppercase">{MONTH_NAMES[exam.month]} {exam.year} · {exam.submission_count} submissions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] border px-2 py-0.5 uppercase tracking-wider font-bold ${statusBadgeClass(exam.status)}`}>
                      {exam.status}
                    </span>
                    {selectedExamId === exam.id
                      ? <ChevronUp className="w-4 h-4 text-system/40" />
                      : <ChevronDown className="w-4 h-4 text-system/40" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected exam management */}
      {selectedExam && (
        <div className="border border-mentor/30 p-5 space-y-5">
          {/* Exam controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-mentor/20 pb-4">
            <div className="flex-1">
              <p className="text-mentor font-bold uppercase tracking-wider text-sm">{selectedExam.title}</p>
              <p className="text-system/40 text-[10px] mt-0.5 uppercase">{MONTH_NAMES[selectedExam.month]} {selectedExam.year}</p>
              {selectedExam.description && <p className="text-system/50 text-xs mt-1">{selectedExam.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {selectedExam.status === 'draft' && (
                <button onClick={() => handleStatusChange(selectedExam.id, 'open')}
                  className="flex items-center gap-1.5 px-3 py-2 border border-green-500/50 text-green-400 hover:bg-green-500/10 transition-colors text-xs uppercase tracking-wider font-bold">
                  <Play className="w-3.5 h-3.5" /> Open Exam
                </button>
              )}
              {selectedExam.status === 'open' && (
                <button onClick={() => handleStatusChange(selectedExam.id, 'closed')}
                  className="flex items-center gap-1.5 px-3 py-2 border border-user/50 text-user hover:bg-user/10 transition-colors text-xs uppercase tracking-wider font-bold">
                  <Square className="w-3.5 h-3.5" /> Close Exam
                </button>
              )}
              {(selectedExam.status === 'closed') && (
                <button onClick={handleGrantScholarships} disabled={granting}
                  className="flex items-center gap-1.5 px-3 py-2 border border-mentor/50 text-mentor hover:bg-mentor/10 transition-colors text-xs uppercase tracking-wider font-bold disabled:opacity-50">
                  {granting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                  Grant Top 100
                </button>
              )}
            </div>
          </div>

          {grantingResult && (
            <div className="border border-mentor/30 bg-mentor/5 p-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-mentor shrink-0 mt-0.5" />
              <p className="text-mentor text-xs">{grantingResult}</p>
            </div>
          )}

          {/* Section tabs */}
          <div className="flex border-b border-system/20">
            {(['questions', 'submissions'] as const).map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className={`px-5 py-2.5 uppercase tracking-widest text-xs font-bold transition-all flex items-center gap-2 ${
                  activeSection === s
                    ? 'border-b-2 border-mentor text-mentor'
                    : 'text-system/40 hover:text-system/70'
                }`}>
                {s === 'questions' ? <BookOpen className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                {s === 'questions' ? `Questions (${questions.length})` : `Submissions (${selectedExam.submission_count})`}
              </button>
            ))}
          </div>

          {/* Questions panel */}
          {activeSection === 'questions' && (
            <div className="space-y-3">
              {/* Add question form */}
              <div className="flex justify-end">
                <button onClick={() => setShowAddQ(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-system/30 text-system/60 hover:text-system hover:border-system/60 transition-colors text-xs uppercase tracking-wider">
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </button>
              </div>

              {showAddQ && (
                <form onSubmit={handleAddQuestion} className="border border-system/30 bg-black/60 p-4 space-y-4">
                  <div>
                    <label htmlFor="q-text" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1">Question Text *</label>
                    <textarea id="q-text" rows={2} required value={qText} onChange={e => setQText(e.target.value)}
                      placeholder="Enter the question..."
                      className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm placeholder:text-system/20 focus:outline-none focus:border-system/60 rounded-none resize-none" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="q-type" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1">Type</label>
                      <select id="q-type" value={qType} onChange={e => setQType(e.target.value as 'mcq' | 'short_answer')}
                        className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm focus:outline-none focus:border-system/60 rounded-none">
                        <option value="mcq">Multiple Choice</option>
                        <option value="short_answer">Short Answer</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="q-score" className="block text-[10px] uppercase tracking-wider text-system/50 mb-1">Max Score</label>
                      <input id="q-score" type="number" min={1} max={100} value={qMaxScore} onChange={e => setQMaxScore(Number(e.target.value))}
                        className="w-full bg-black border border-system/30 text-system/80 p-3 text-sm focus:outline-none focus:border-system/60 rounded-none" />
                    </div>
                  </div>
                  {qType === 'mcq' && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-system/50 uppercase tracking-wider">Answer Options (mark correct with ●)</p>
                      {qOptions.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button type="button" onClick={() => setQCorrect(oi)}
                            className={`w-5 h-5 rounded-full border flex-shrink-0 transition-colors ${qCorrect === oi ? 'bg-system border-system' : 'border-system/30'}`} />
                          <input type="text" value={opt} onChange={e => setQOptions(prev => prev.map((o, i) => i === oi ? e.target.value : o))}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            className="flex-1 bg-black border border-system/30 text-system/80 p-2 text-xs placeholder:text-system/20 focus:outline-none focus:border-system/60 rounded-none" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" disabled={addingQ}
                      className="flex items-center gap-1.5 px-4 py-2 border border-system/60 bg-system/10 text-system hover:bg-system/20 transition-all text-xs uppercase tracking-widest font-bold disabled:opacity-50">
                      {addingQ ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Save Question
                    </button>
                    <button type="button" onClick={() => setShowAddQ(false)}
                      className="px-3 py-2 border border-system/20 text-system/40 hover:text-system/70 transition-colors text-xs uppercase">Cancel</button>
                  </div>
                </form>
              )}

              {questionsLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-16 border border-system/20 bg-system/5" />)}
                </div>
              ) : questions.length === 0 ? (
                <div className="border border-system/20 p-6 text-center text-system/40 text-sm uppercase tracking-wider">
                  No questions yet — add the first one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={q.id} className="border border-system/20 p-4 flex gap-4 hover:border-system/40 transition-colors">
                      <span className="text-system/30 text-xs font-bold shrink-0 mt-0.5">Q{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-system/80 text-sm mb-1">{q.question_text}</p>
                        <div className="flex items-center gap-3 flex-wrap text-[10px]">
                          <span className={`border px-1.5 py-0.5 uppercase ${q.question_type === 'mcq' ? 'border-system/30 text-system/50' : 'border-mentor/30 text-mentor/60'}`}>
                            {q.question_type === 'mcq' ? 'MCQ' : 'Short Answer'}
                          </span>
                          <span className="text-system/30">{q.max_score} pts</span>
                          {q.question_type === 'mcq' && q.options && (
                            <span className="text-system/30">{q.options.length} options · Correct: {String.fromCharCode(65 + (q.correct_option ?? 0))}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteQ(q.id)}
                        className="text-system/20 hover:text-destructive transition-colors shrink-0 mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submissions panel */}
          {activeSection === 'submissions' && (
            <div className="space-y-3">
              {subsLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-12 border border-system/20 bg-system/5" />)}
                </div>
              ) : submissions.length === 0 ? (
                <div className="border border-system/20 p-6 text-center text-system/40 text-sm uppercase tracking-wider">
                  No submissions yet.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-system/20">
                          <th className="text-left text-system/40 uppercase tracking-wider py-2 pr-4">Name</th>
                          <th className="text-left text-system/40 uppercase tracking-wider py-2 pr-4">Email</th>
                          <th className="text-center text-system/40 uppercase tracking-wider py-2 pr-4">Age</th>
                          <th className="text-center text-system/40 uppercase tracking-wider py-2 pr-4">Auto</th>
                          <th className="text-center text-system/40 uppercase tracking-wider py-2 pr-4">Mentor</th>
                          <th className="text-center text-system/40 uppercase tracking-wider py-2 pr-4">Total</th>
                          <th className="text-center text-system/40 uppercase tracking-wider py-2 pr-4">Rank</th>
                          <th className="text-center text-system/40 uppercase tracking-wider py-2">Won</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-system/10">
                        {submissions.map(s => (
                          <tr key={s.id} className={`hover:bg-system/5 transition-colors ${s.scholarship_granted ? 'bg-user/5' : ''}`}>
                            <td className="py-2.5 pr-4 text-system/80 font-medium">{s.full_name}</td>
                            <td className="py-2.5 pr-4 text-system/50 font-mono">{s.email}</td>
                            <td className="py-2.5 pr-4 text-center text-system/50">{s.age}</td>
                            <td className="py-2.5 pr-4 text-center text-system/70">{Number(s.auto_score).toFixed(0)}</td>
                            <td className="py-2.5 pr-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number" min={0} step={0.5}
                                  value={scoreEdit[s.id] ?? s.mentor_score}
                                  onChange={e => setScoreEdit(prev => ({ ...prev, [s.id]: e.target.value }))}
                                  className="w-14 bg-black border border-system/30 text-system/80 p-1 text-xs text-center focus:outline-none focus:border-mentor/50 rounded-none"
                                />
                                <button onClick={() => handleScoreSubmission(s.id)}
                                  className="text-system/30 hover:text-mentor transition-colors">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 pr-4 text-center text-system font-bold">{Number(s.total_score).toFixed(0)}</td>
                            <td className="py-2.5 pr-4 text-center text-system/50">{s.rank ?? '—'}</td>
                            <td className="py-2.5 text-center">
                              {s.scholarship_granted
                                ? <Award className="w-4 h-4 text-user mx-auto" />
                                : <span className="text-system/20">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-system/30 uppercase tracking-wider">
                    Edit mentor scores inline and click ✓ to save. Click "Grant Top 100" above to finalise rankings and apply lifetime subscriptions.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Infrastructure Tab
// ─────────────────────────────────────────────────────────────────────────────

const NVIDIA_CC_FEATURES = [
  {
    icon: <Lock className="w-4 h-4" />,
    title: 'HBM Memory Encryption',
    desc: 'All on-GPU High Bandwidth Memory is hardware-encrypted in CC-ON mode. Model weights and training data are never exposed in plaintext outside the TEE boundary — not to the hypervisor, not to the cloud operator.',
  },
  {
    icon: <Key className="w-4 h-4" />,
    title: 'Remote Attestation',
    desc: 'Cryptographic proof via RIM (Reference Integrity Manifest) bundles that the SageMaker instance is running genuine NVIDIA H100 silicon with unmodified firmware. OCSP-validated attestation report signed by NVIDIA.',
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: 'NVLink / PCIe Encryption',
    desc: 'CPU-to-GPU data path encrypted in transit — training features from the SecOps Feature Group are decrypted only after crossing the TEE boundary. No relay or proxy can intercept plaintext gradients.',
  },
  {
    icon: <Eye className="w-4 h-4" />,
    title: 'Operator Blind',
    desc: 'Even the AWS SageMaker control plane and cloud operator are cryptographically excluded from the training computation. RageSage\'s DistilBERT weights are provably inaccessible to infrastructure staff.',
  },
  {
    icon: <FlaskConical className="w-4 h-4" />,
    title: 'Secure Fine-Tuning',
    desc: 'Student behavioural data used to fine-tune the PMI classifier is processed exclusively inside the confidential enclave. No training sample ever leaves the GPU TEE during forward or backward passes.',
  },
  {
    icon: <GitBranch className="w-4 h-4" />,
    title: 'Agentic AI Pipeline Ready',
    desc: 'NVIDIA CC is purpose-built for agentic workloads — RageSage\'s automated weekly retraining loop (Airflow → S3 export → SageMaker pipeline) runs end-to-end inside hardware-protected compute.',
  },
];

const PIPELINE_LAYERS = [
  {
    id: 'L1',
    label: 'Layer 1 — Hardware Root of Trust',
    title: 'NVIDIA H100 Confidential Computing',
    color: 'border-green-400/40 bg-green-400/5',
    accent: 'text-green-400',
    bar: 'bg-green-400',
    icon: <Cpu className="w-5 h-5" />,
    badge: 'CC-ON · Hopper TEE',
    status: 'PLANNED',
    statusColor: 'text-yellow-400 border-yellow-400/40',
    points: [
      'H100 SXM / H100 PCIe — CC-ON mode activates hardware TEE',
      'Protects RageSage training weights + SecOps feature vectors',
      'RIM-bundle attestation verifiable by data owner (Shri Academy)',
      'Apple Private Cloud Compute reference deployment confirms production readiness',
    ],
    href: 'https://www.nvidia.com/en-us/data-center/solutions/confidential-computing/',
    hrefLabel: 'nvidia.com/confidential-computing',
  },
  {
    id: 'L2',
    label: 'Layer 2 — ML Security Pipeline',
    title: 'RageSage — SageMaker Training',
    color: 'border-user/40 bg-user/5',
    accent: 'text-user',
    bar: 'bg-user',
    icon: <Brain className="w-5 h-5" />,
    badge: 'DistilBERT · F1 ≥ 0.78 gate',
    status: 'LIVE',
    statusColor: 'text-green-400 border-green-400/40',
    points: [
      '5-step pipeline: DataPrep → Training → Evaluate → Register → Deploy',
      'Writes {"f1_macro": float} to /opt/ml/processing/evaluation/metrics.json',
      'Quality gate via Std:JsonGet on PropertyFile — MinF1Threshold = 0.78; blocks sub-par models',
      'EventBridge weekly schedule + Airflow DAG (Sunday 03:00 UTC, ≥50 labelled rows)',
    ],
    href: 'https://aws.amazon.com/sagemaker/',
    hrefLabel: 'aws.amazon.com/sagemaker',
  },
  {
    id: 'L3',
    label: 'Layer 3 — Enforcement & Dispatch',
    title: 'Cyberdemon — SecOps Outbox',
    color: 'border-mentor/40 bg-mentor/5',
    accent: 'text-mentor',
    bar: 'bg-mentor',
    icon: <AlertOctagon className="w-5 h-5" />,
    badge: 'Outbox · Poll + Ack',
    status: 'LIVE',
    statusColor: 'text-green-400 border-green-400/40',
    points: [
      'secops_cyberdemon_events table — durable outbox queue, events never deleted',
      'Composite risk score: PMI 50% · Vulgarity 20% · Profanity 30%',
      'Mentor-gated /api/secops/cyberdemon/queue poll + /flush ack',
      'Dynamic pattern cache refreshes every 10 min — no redeploy needed',
    ],
    href: null,
    hrefLabel: null,
  },
];

const SCORING_TIERS = [
  { label: 'Profanity Index', weight: 30, color: 'bg-yellow-400', textColor: 'text-yellow-400', desc: 'Compiled regex against explicit word lists; dynamic blocklist from DB.' },
  { label: 'Vulgarity Index', weight: 20, color: 'bg-orange-400', textColor: 'text-orange-400', desc: 'Pattern sets for crude language and sexually suggestive phrasing.' },
  { label: 'PMI — Perverted Mentation', weight: 50, color: 'bg-user',     textColor: 'text-user',     desc: 'Contextual threat patterns: grooming, radicalisation, boundary violations.' },
];

function SecurityInfraTab() {
  return (
    <div className="max-w-6xl mx-auto space-y-10">

      {/* Header */}
      <div className="border-b border-user/30 pb-5">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-6 h-6 text-user text-glow-user" />
          <h2 className="text-xl text-user font-bold tracking-widest uppercase text-glow-user">
            SECURITY_INFRASTRUCTURE
          </h2>
        </div>
        <p className="text-system/50 text-xs leading-relaxed max-w-3xl">
          Three-layer defence-in-depth architecture protecting student content, training data, and AI model weights.
          Hardware root of trust via NVIDIA Confidential Computing → ML quality gating via RageSage SageMaker → real-time
          enforcement via the Cyberdemon outbox.
        </p>
      </div>

      {/* NVIDIA CC Feature Grid */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-4 h-4 text-green-400" />
          <h3 className="text-xs uppercase tracking-widest text-green-400 font-bold">
            NVIDIA CONFIDENTIAL COMPUTING — H100 HOPPER TEE
          </h3>
          <a
            href="https://www.nvidia.com/en-us/data-center/solutions/confidential-computing/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider text-system/40 hover:text-green-400 transition-colors border border-system/20 hover:border-green-400/40 px-2 py-1"
          >
            <ExternalLink className="w-3 h-3" /> nvidia.com
          </a>
        </div>

        {/* NVIDIA hero banner */}
        <div className="border border-green-400/30 bg-green-400/5 p-5 mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-400/60 via-green-400/20 to-transparent" />
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="shrink-0">
              <div className="w-14 h-14 border border-green-400/40 bg-green-400/10 flex items-center justify-center">
                <Server className="w-7 h-7 text-green-400" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span className="text-green-400 font-bold uppercase tracking-[0.2em] text-sm text-glow-user">Confidential AI Solutions</span>
                <span className="text-[9px] border border-green-400/30 text-green-400/70 px-2 py-0.5 uppercase tracking-wider">NVIDIA PRODUCT</span>
              </div>
              <p className="text-system/70 text-xs leading-relaxed max-w-2xl">
                As organisations turn to agentic AI, a critical concern emerges: safeguarding proprietary models and sensitive data
                during inference and fine-tuning. NVIDIA Confidential Computing — shipping on H100 (Hopper) — provides hardware-based
                Trusted Execution Environments that encrypt all GPU memory, cryptographically excluding cloud operators, hypervisors,
                and infrastructure staff from the computation. The RageSage DistilBERT training pipeline is the primary target
                workload for CC integration.
              </p>
              <p className="text-green-400/50 text-[10px] mt-2 uppercase tracking-wider">
                Reference deployment: Apple Private Cloud Compute on Google Cloud — proven at production scale.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {NVIDIA_CC_FEATURES.map(f => (
            <div key={f.title} className="border border-system/20 bg-black/60 p-4 hover:border-green-400/30 transition-all">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                {f.icon}
                <span className="text-xs font-bold uppercase tracking-wider">{f.title}</span>
              </div>
              <p className="text-system/50 text-[11px] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Three-Layer Architecture */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Radio className="w-4 h-4 text-user" />
          <h3 className="text-xs uppercase tracking-widest text-user font-bold">THREE-LAYER SECURITY STACK</h3>
        </div>

        <div className="space-y-4">
          {PIPELINE_LAYERS.map((layer, i) => (
            <div key={layer.id} className={`border ${layer.color} p-5 relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${layer.bar}`} />
              <div className="pl-3">
                {/* Layer header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`${layer.accent} shrink-0`}>{layer.icon}</div>
                    <div>
                      <div className="text-[10px] text-system/40 uppercase tracking-wider">{layer.label}</div>
                      <div className={`text-sm font-bold ${layer.accent} uppercase tracking-wider`}>{layer.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] border ${layer.statusColor} px-2 py-0.5 uppercase tracking-wider font-bold`}>
                      {layer.status}
                    </span>
                    <span className={`text-[9px] border border-system/20 text-system/50 px-2 py-0.5 uppercase tracking-wider`}>
                      {layer.badge}
                    </span>
                  </div>
                </div>

                {/* Points */}
                <ul className="space-y-1.5 mb-3">
                  {layer.points.map(pt => (
                    <li key={pt} className="flex items-start gap-2 text-[11px] text-system/60">
                      <CheckCircle className={`w-3 h-3 shrink-0 mt-0.5 ${layer.accent}`} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>

                {/* External link */}
                {layer.href && (
                  <a
                    href={layer.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${layer.accent} opacity-60 hover:opacity-100 transition-opacity`}
                  >
                    <ExternalLink className="w-3 h-3" /> {layer.hrefLabel}
                  </a>
                )}
              </div>

              {/* Arrow to next layer */}
              {i < PIPELINE_LAYERS.length - 1 && (
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-10 text-system/20">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Scoring Weights */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-4 h-4 text-system/60" />
          <h3 className="text-xs uppercase tracking-widest text-system/60 font-bold">COMPOSITE RISK SCORE — WEIGHTING</h3>
        </div>

        <div className="border border-system/20 p-5 space-y-4">
          {SCORING_TIERS.map(t => (
            <div key={t.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${t.textColor}`}>{t.label}</span>
                <span className={`text-xs font-bold ${t.textColor}`}>{t.weight}%</span>
              </div>
              <div className="h-1.5 bg-system/10 w-full mb-1.5">
                <div className={`h-full ${t.color}`} style={{ width: `${t.weight}%` }} />
              </div>
              <p className="text-system/40 text-[10px]">{t.desc}</p>
            </div>
          ))}
          <p className="text-system/30 text-[10px] pt-2 border-t border-system/10 uppercase tracking-wider">
            PMI carries the heaviest weight (50%) because contextual grooming / radicalisation patterns are more
            security-critical than explicit words. Cyberdemon events are dispatched when composite risk ≥ 0.65.
          </p>
        </div>
      </div>

      {/* Setup checklist */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-4 h-4 text-system/60" />
          <h3 className="text-xs uppercase tracking-widest text-system/60 font-bold">INTEGRATION CHECKLIST</h3>
        </div>

        <div className="border border-system/20 p-5 space-y-2">
          {[
            { done: true,  text: 'secops_cyberdemon_events + secops_training_labels tables provisioned' },
            { done: true,  text: 'Composite PMI content scorer deployed (contentIndex.ts)' },
            { done: true,  text: 'Cyberdemon queue + flush API routes live (/api/secops/cyberdemon/*)' },
            { done: true,  text: 'RageSage SageMaker Terraform stack (ragethesage.tf) authored' },
            { done: true,  text: 'Airflow DAG — ragethesage_export_and_train.py (Sunday 03:00 UTC)' },
            { done: false, text: 'terraform apply — provision SageMaker pipeline + S3 bucket + IAM role' },
            { done: false, text: 'Set RAGETHESAGE_PIPELINE_ARN + SECOPS_S3_BUCKET env vars on ECS task' },
            { done: false, text: 'Build RageSage training container — infrastructure/docker/ragethesage/' },
            { done: false, text: 'Request NVIDIA H100 Confidential Computing instance from AWS (p5.48xlarge — H100 SXM5, CC-ON capable)' },
            { done: false, text: 'Enable CC-ON mode on SageMaker training job — set --enable-network-isolation + TEE flags' },
            { done: false, text: 'Configure RIM-bundle attestation endpoint for training job verification' },
            { done: false, text: 'Validate attestation report via NVIDIA OCSP responder before each training run' },
          ].map(item => (
            <div key={item.text} className="flex items-start gap-3">
              <div className={`shrink-0 mt-0.5 ${item.done ? 'text-green-400' : 'text-system/20'}`}>
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[11px] leading-relaxed ${item.done ? 'text-system/70' : 'text-system/35'}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer source attribution */}
      <div className="border border-system/10 p-4 flex items-center justify-between">
        <div className="text-[10px] text-system/30 uppercase tracking-wider">
          Source: NVIDIA Confidential Computing — nvidia.com/en-us/data-center/solutions/confidential-computing/
        </div>
        <a
          href="https://www.nvidia.com/en-us/data-center/solutions/confidential-computing/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-system/40 hover:text-green-400 transition-colors flex items-center gap-1 uppercase tracking-wider"
        >
          <ExternalLink className="w-3 h-3" /> Open Page
        </a>
      </div>

    </div>
  );
}

const DEFAULT_PAIRS_PER_CHUNK = 8;
const STATUS_POLL_INTERVAL_MS = 30000;

function SageMakerTab() {
  const [status, setStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Step 1 states
  const [pairsPerChunk, setPairsPerChunk] = useState<number | undefined>(DEFAULT_PAIRS_PER_CHUNK);
  const [s3Prefix, setS3Prefix] = useState('mentor-training/data');
  const [generatingData, setGeneratingData] = useState(false);
  const [genDataResult, setGenDataResult] = useState<any>(null);
  const [genDataError, setGenDataError] = useState<string | null>(null);

  // Step 2 states
  const [dataS3Uri, setDataS3Uri] = useState('');
  const [modelId, setModelId] = useState('nvidia/Nemotron-Mini-4B-Instruct');
  const [trainingInstance, setTrainingInstance] = useState('ml.g4dn.2xlarge');
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<any>(null);
  const [trainError, setTrainError] = useState<string | null>(null);

  // Step 3 states
  const [modelDataS3, setModelDataS3] = useState('');
  const [endpointName, setEndpointName] = useState('shri-mentor-v1');
  const [deployInstance, setDeployInstance] = useState('ml.g4dn.xlarge');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Console terminal logs
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] SageMaker Mentor Training pipeline console initialized.']);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  }, []);

  const fetchStatus = useCallback(async () => {
    const token = localStorage.getItem('mentor_token');
    if (!token) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const data = await getSageMakerStatus(token);
      setStatus(data);
      addLog(`Status refreshed: Job: ${data.job_name || 'NONE'} (${data.job_status || 'N/A'}), Endpoint: ${data.endpoint_name || 'NONE'} (${data.endpoint_status || 'N/A'})`);
      if (data.s3_uri && !dataS3Uri) {
        setDataS3Uri(data.s3_uri);
      }
    } catch (err: any) {
      setStatusError(err.message || 'Failed to fetch SageMaker status');
      addLog(`ERROR: Status fetch failed - ${err.message || 'unknown error'}`);
    } finally {
      setStatusLoading(false);
    }
  }, [addLog, dataS3Uri]);

  // Call fetchStatus once on mount or when fetchStatus definition changes
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle periodic auto-polling, with conditional interval creation depending on active state
  useEffect(() => {
    if (generatingData || training || deploying) {
      return; // Pause auto-polling during active operations to avoid unnecessary APIs and potential race conditions
    }
    const interval = setInterval(fetchStatus, STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus, generatingData, training, deploying]);

  const handleGenerateData = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('mentor_token');
    if (!token) return;
    setGeneratingData(true);
    setGenDataError(null);
    setGenDataResult(null);
    const pairs = pairsPerChunk || DEFAULT_PAIRS_PER_CHUNK;
    addLog(`Kicked off synthetic Q&A generation from syllabus chunks (pairs_per_chunk: ${pairs}). Please wait, this takes 2-3 minutes...`);
    try {
      const res = await generateSageMakerData(token, { pairs_per_chunk: pairs, s3_prefix: s3Prefix });
      setGenDataResult(res);
      setDataS3Uri(res.s3_uri);
      addLog(`SUCCESS: Generated ${res.record_count} Q&A pairs. S3 URI: ${res.s3_uri}`);
      fetchStatus();
    } catch (err: any) {
      setGenDataError(err.message || 'Failed to generate synthetic data');
      addLog(`ERROR: Data generation failed - ${err.message || 'unknown error'}`);
    } finally {
      setGeneratingData(false);
    }
  };

  const handleLaunchTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataS3Uri) {
      setTrainError('Data S3 URI is required');
      return;
    }
    const token = localStorage.getItem('mentor_token');
    if (!token) return;
    setTraining(true);
    setTrainError(null);
    setTrainResult(null);
    addLog(`Launching SageMaker training job using model: ${modelId}...`);
    try {
      const res = await trainSageMakerModel(token, {
        data_s3_uri: dataS3Uri,
        model_id: modelId,
        instance_type: trainingInstance
      });
      setTrainResult(res);
      setModelDataS3(res.model_output_s3);
      addLog(`SUCCESS: Training job '${res.job_name}' submitted. Output S3: ${res.model_output_s3}`);
      fetchStatus();
    } catch (err: any) {
      setTrainError(err.message || 'Failed to start SageMaker training');
      addLog(`ERROR: Training launch failed - ${err.message || 'unknown error'}`);
    } finally {
      setTraining(false);
    }
  };

  const handleDeployEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelDataS3) {
      setDeployError('Model data S3 URI is required');
      return;
    }
    const token = localStorage.getItem('mentor_token');
    if (!token) return;
    setDeploying(true);
    setDeployError(null);
    setDeployResult(null);
    addLog(`Deploying SageMaker endpoint '${endpointName}' on ${deployInstance}...`);
    try {
      const res = await deploySageMakerEndpoint(token, {
        model_data_s3: modelDataS3,
        endpoint_name: endpointName,
        instance_type: deployInstance
      });
      setDeployResult(res);
      addLog(`SUCCESS: Endpoint '${res.endpoint_name}' deployment initialized. Status: ${res.status}`);
      fetchStatus();
    } catch (err: any) {
      setDeployError(err.message || 'Failed to deploy SageMaker endpoint');
      addLog(`ERROR: Endpoint deployment failed - ${err.message || 'unknown error'}`);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-system/30 pb-5">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-6 h-6 text-system text-glow-system" />
          <h2 className="text-xl text-system font-bold tracking-widest uppercase text-glow-system">
            SAGEMAKER_MENTOR_PIPELINE
          </h2>
        </div>
        <p className="text-system/50 text-xs leading-relaxed max-w-3xl">
          Complete model lifecycle command center for the Shri AI Mentor.
          Generate synthetic datasets from our proprietary curriculum → launch LoRA fine-tuning jobs on AWS SageMaker → deploy high-performance real-time endpoints.
        </p>
      </div>

      {/* Status Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-system/20 bg-system/5 p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-system"></div>
          <div className="text-[10px] text-system/50 tracking-widest uppercase mb-1">Active SageMaker Endpoint</div>
          <div className="text-sm font-bold truncate text-glow-system text-system">
            {status?.endpoint_name || 'NONE'}
          </div>
          <div className="mt-1 text-xs uppercase flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${status?.endpoint_status === 'InService' ? 'bg-green-400' : 'bg-system/30'}`} />
            <span className="text-system/70">{status?.endpoint_status || 'NOT_DEPLOYED'}</span>
          </div>
        </div>

        <div className="border border-system/20 bg-system/5 p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-system"></div>
          <div className="text-[10px] text-system/50 tracking-widest uppercase mb-1">Latest Training Job</div>
          <div className="text-sm font-bold truncate text-glow-system text-system">
            {status?.job_name || 'NONE'}
          </div>
          <div className="mt-1 text-xs uppercase flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${status?.job_status === 'Completed' ? 'bg-green-400' : status?.job_status === 'InProgress' ? 'bg-yellow-400 animate-pulse' : 'bg-system/30'}`} />
            <span className="text-system/70">{status?.job_status || 'NO_JOBS_FOUND'}</span>
          </div>
        </div>

        <div className="border border-system/20 bg-system/5 p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-system"></div>
          <div className="text-[10px] text-system/50 tracking-widest uppercase mb-1">Mentor Eval Mode</div>
          <div className="text-sm font-bold text-glow-system text-system uppercase">
            {status?.eval_mode_active ? 'ACTIVE_EVAL' : 'STANDARD_MODE'}
          </div>
          <p className="text-[10px] text-system/40 mt-1 uppercase">
            {status?.eval_mode_active ? 'AI Mentor routed to fine-tuned endpoint' : 'AI Mentor routed to baseline model'}
          </p>
        </div>
      </div>

      {/* Three Pipeline Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Step 1: Generate Data */}
        <div className="border border-system/20 bg-black/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-system/20 pb-2">
              <span className="border border-system text-system font-bold text-xs px-2 py-0.5 rounded-none">STEP_01</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-system">Synthetic Data Generation</h3>
            </div>
            <p className="text-[11px] text-system/60 leading-relaxed">
              Uses the NVIDIA Nemotron API to extract high-quality curriculum Q&A pairs from all 25 syllabus chapters.
            </p>

            <form onSubmit={handleGenerateData} className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] uppercase text-system/50 mb-1">Pairs per syllabus chunk</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={pairsPerChunk ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '') {
                      setPairsPerChunk(undefined);
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num)) {
                        setPairsPerChunk(Math.max(1, num));
                      }
                    }
                  }}
                  className="w-full bg-black border border-system/30 px-3 py-1.5 text-xs text-system font-mono focus:border-system focus:outline-none"
                  disabled={generatingData}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-system/50 mb-1">S3 Destination Prefix</label>
                <input
                  type="text"
                  value={s3Prefix}
                  onChange={e => setS3Prefix(e.target.value)}
                  className="w-full bg-black border border-system/30 px-3 py-1.5 text-xs text-system font-mono focus:border-system focus:outline-none"
                  disabled={generatingData}
                />
              </div>
              <button
                type="submit"
                disabled={generatingData}
                className="w-full border border-system bg-system/10 text-system uppercase tracking-widest text-xs font-bold py-2 hover:bg-system/25 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {generatingData ? 'GENERATING_DATA...' : 'RUN GENERATION'}
              </button>
            </form>
          </div>

          {genDataResult && (
            <div className="border border-green-500/30 bg-green-500/5 p-3 text-[10px] space-y-1">
              <div className="text-green-400 font-bold uppercase">Generation Complete</div>
              <div>Records: {genDataResult.record_count} | Chunks: {genDataResult.chunks_processed}</div>
              <div className="truncate font-mono">URI: {genDataResult.s3_uri}</div>
            </div>
          )}

          {genDataError && (
            <div className="border border-red-500/30 bg-red-500/5 p-3 text-[10px] text-red-400 font-mono">
              {genDataError}
            </div>
          )}
        </div>

        {/* Step 2: LoRA Fine-Tuning */}
        <div className="border border-system/20 bg-black/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-system/20 pb-2">
              <span className="border border-system text-system font-bold text-xs px-2 py-0.5 rounded-none">STEP_02</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-system">LoRA Fine-Tuning</h3>
            </div>
            <p className="text-[11px] text-system/60 leading-relaxed">
              Submits an asynchronous Hugging Face Training Job on SageMaker. Pins PyTorch 2.1 and transformers 4.37.0.
            </p>

            <form onSubmit={handleLaunchTraining} className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] uppercase text-system/50 mb-1">Dataset S3 URI</label>
                <input
                  type="text"
                  placeholder="s3://..."
                  value={dataS3Uri}
                  onChange={e => setDataS3Uri(e.target.value)}
                  className="w-full bg-black border border-system/30 px-3 py-1.5 text-xs text-system font-mono focus:border-system focus:outline-none"
                  disabled={training}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-system/50 mb-1">Base Model ID</label>
                <input
                  type="text"
                  value={modelId}
                  onChange={e => setModelId(e.target.value)}
                  className="w-full bg-black border border-system/30 px-3 py-1.5 text-xs text-system font-mono focus:border-system focus:outline-none"
                  disabled={training}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-system/50 mb-1">Instance Type</label>
                <select
                  value={trainingInstance}
                  onChange={e => setTrainingInstance(e.target.value)}
                  className="w-full bg-black border border-system/30 px-3 py-1.5 text-xs text-system font-mono focus:border-system focus:outline-none"
                  disabled={training}
                >
                  <option value="ml.g4dn.2xlarge">ml.g4dn.2xlarge (1x T4 16GB)</option>
                  <option value="ml.g5.2xlarge">ml.g5.2xlarge (1x A10G 24GB)</option>
                  <option value="ml.g5.4xlarge">ml.g5.4xlarge (1x A10G 64GB)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={training}
                className="w-full border border-system bg-system/10 text-system uppercase tracking-widest text-xs font-bold py-2 hover:bg-system/25 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {training ? 'LAUNCHING...' : 'LAUNCH TRAINING JOB'}
              </button>
            </form>
          </div>

          {trainResult && (
            <div className="border border-green-500/30 bg-green-500/5 p-3 text-[10px] space-y-1">
              <div className="text-green-400 font-bold uppercase">Training Launched</div>
              <div className="truncate">Job Name: {trainResult.job_name}</div>
              <div className="truncate font-mono text-[9px]">Artifact S3: {trainResult.model_output_s3}</div>
            </div>
          )}

          {trainError && (
            <div className="border border-red-500/30 bg-red-500/5 p-3 text-[10px] text-red-400 font-mono">
              {trainError}
            </div>
          )}
        </div>

        {/* Step 3: Endpoint Deployment */}
        <div className="border border-system/20 bg-black/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-system/20 pb-2">
              <span className="border border-system text-system font-bold text-xs px-2 py-0.5 rounded-none">STEP_03</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-system">Real-time Endpoint Deployment</h3>
            </div>
            <p className="text-[11px] text-system/60 leading-relaxed">
              Spins up a secure SageMaker real-time inference endpoint using the trained model archive weights.
            </p>

            <form onSubmit={handleDeployEndpoint} className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] uppercase text-system/50 mb-1">Model Artifact S3 URI (tar.gz)</label>
                <input
                  type="text"
                  placeholder="s3://.../model.tar.gz"
                  value={modelDataS3}
                  onChange={e => setModelDataS3(e.target.value)}
                  className="w-full bg-black border border-system/30 px-3 py-1.5 text-xs text-system font-mono focus:border-system focus:outline-none"
                  disabled={deploying}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-system/50 mb-1">Endpoint Name</label>
                <input
                  type="text"
                  value={endpointName}
                  onChange={e => setEndpointName(e.target.value)}
                  className="w-full bg-black border border-system/30 px-3 py-1.5 text-xs text-system font-mono focus:border-system focus:outline-none"
                  disabled={deploying}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-system/50 mb-1">Inference Instance Type</label>
                <select
                  value={deployInstance}
                  onChange={e => setDeployInstance(e.target.value)}
                  className="w-full bg-black border border-system/30 px-3 py-1.5 text-xs text-system font-mono focus:border-system focus:outline-none"
                  disabled={deploying}
                >
                  <option value="ml.g4dn.xlarge">ml.g4dn.xlarge (1x T4 16GB)</option>
                  <option value="ml.g5.xlarge">ml.g5.xlarge (1x A10G 24GB)</option>
                  <option value="ml.m5.large">ml.m5.large (CPU fallback)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={deploying}
                className="w-full border border-system bg-system/10 text-system uppercase tracking-widest text-xs font-bold py-2 hover:bg-system/25 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deploying ? 'DEPLOYING...' : 'DEPLOY ENDPOINT'}
              </button>
            </form>
          </div>

          {deployResult && (
            <div className="border border-green-500/30 bg-green-500/5 p-3 text-[10px] space-y-1">
              <div className="text-green-400 font-bold uppercase">Deployment Initialized</div>
              <div className="truncate">Name: {deployResult.endpoint_name}</div>
              <div>Status: {deployResult.status}</div>
            </div>
          )}

          {deployError && (
            <div className="border border-red-500/30 bg-red-500/5 p-3 text-[10px] text-red-400 font-mono">
              {deployError}
            </div>
          )}
        </div>
      </div>

      {/* Live System Console Logs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase text-system/60 tracking-wider font-bold flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-system animate-pulse" /> LIVE_PIPELINE_CONSOLE
          </div>
          <button
            onClick={() => setLogs([`[SYSTEM] Console logs cleared. Pipeline active.`])}
            className="text-[9px] border border-system/20 hover:border-system/50 hover:bg-system/5 px-2 py-0.5 text-system/60 hover:text-system transition-all uppercase"
          >
            Clear logs
          </button>
        </div>
        <div className="border border-system/30 bg-black p-4 h-48 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1 text-system/85 select-all scrollbar-thin scrollbar-thumb-system/20 scrollbar-track-transparent">
          {logs.map((log, i) => (
            <div key={i} className={log.includes('ERROR:') ? 'text-red-400' : log.includes('SUCCESS:') ? 'text-green-400' : ''}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  subValue,
  highlight = 'system',
  testId
}: { 
  title: string; 
  value: string | number | undefined; 
  subValue?: string;
  highlight?: 'system' | 'mentor' | 'user';
  testId?: string;
}) {
  const highlightColor = highlight === 'mentor' ? 'text-mentor bg-mentor' : highlight === 'user' ? 'text-user bg-user' : 'text-system bg-system';
  const borderColor = highlight === 'mentor' ? 'border-mentor/30' : highlight === 'user' ? 'border-user/30' : 'border-system/30';
  const bgColor = highlight === 'mentor' ? 'bg-mentor/5' : highlight === 'user' ? 'bg-user/5' : 'bg-system/5';

  return (
    <div 
      className={`border ${borderColor} ${bgColor} p-4 relative overflow-hidden group hover:border-${highlight}/60 transition-colors`}
      data-testid={testId}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${highlightColor.split(' ')[1]}`}></div>
      <div className="text-[10px] text-system/70 tracking-widest uppercase mb-1 truncate">{title}</div>
      <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${highlightColor.split(' ')[0]} ${highlightColor.split(' ')[0].replace('text', 'text-glow')}`}>
        {value !== undefined ? value : '--'}
      </div>
      {subValue && (
        <div className="text-xs text-system/50 mt-1 uppercase">{subValue}</div>
      )}
    </div>
  );
}
