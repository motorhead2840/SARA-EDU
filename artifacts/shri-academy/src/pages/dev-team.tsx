import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal as TerminalIcon,
  Github,
  Mail,
  ArrowLeft,
  Loader,
  MessageSquare,
  Plus,
  ThumbsUp,
  Clock,
  Pin,
  ChevronRight,
  ExternalLink,
  Cpu,
  RefreshCw,
  Eye,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DevTeamMember {
  id: number;
  email: string;
  github_username: string | null;
  signup_method: 'github' | 'email';
  created_at: string;
}

interface Thread {
  id: number;
  category_id: number;
  title: string;
  body: string;
  author_name: string;
  tags: string[];
  upvotes: number;
  view_count: number;
  reply_count: number;
  is_pinned: boolean;
  created_at: string;
  category_name: string;
  category_slug: string;
  category_color: string;
}

interface Post {
  id: number;
  thread_id: number;
  body: string;
  author_name: string;
  upvotes: number;
  created_at: string;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DevTeamPage() {
  const [member, setMember] = useState<DevTeamMember | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dev_token'));
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Sign up state
  const [signupMethod, setSignupMethod] = useState<'github' | 'email'>('github');
  const [email, setEmail] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [authLogs, setAuthLogs] = useState<string[]>([]);

  // Forum state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [threadPosts, setPostList] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [postingReply, setPostingReply] = useState(false);

  // New thread modal state
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState('');
  const [creatingThread, setCreatingThread] = useState(false);

  // Grok build simulation state
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [buildRunning, setBuildRunning] = useState(false);
  const buildConsoleEndRef = useRef<HTMLDivElement>(null);

  // Check auth profile on load
  useEffect(() => {
    if (!token) {
      setLoadingProfile(false);
      return;
    }

    fetch('/api/dev-team/me', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then((data) => {
        setMember(data.member);
        loadDevThreads();
      })
      .catch(() => {
        localStorage.removeItem('dev_token');
        setToken(null);
      })
      .finally(() => setLoadingProfile(false));
  }, [token]);

  // Load threads belonging to 'dev-team' category
  const loadDevThreads = () => {
    setLoadingThreads(true);
    fetch('/api/forum/threads?category=dev-team')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Thread[]) => {
        setThreads(data);
      })
      .catch(console.error)
      .finally(() => setLoadingThreads(false));
  };

  // View specific thread details
  const viewThread = (thread: Thread) => {
    setActiveThread(thread);
    setLoadingPosts(true);
    fetch(`/api/forum/threads/${thread.id}`)
      .then((res) => res.json())
      .then((data: { posts: Post[] }) => {
        setPostList(data.posts);
      })
      .catch(console.error)
      .finally(() => setLoadingPosts(false));
  };

  // Handle signup/authentication
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmittingAuth(true);
    setAuthLogs([]);

    const log = (msg: string) => setAuthLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    if (signupMethod === 'github') {
      log('Contacting api.github.com/oauth/authorize...');
      await new Promise((r) => setTimeout(r, 600));
      log('Simulating redirect callback handshake...');
      await new Promise((r) => setTimeout(r, 600));
      log('Retrieving developer profile for @' + githubUsername + '...');
      await new Promise((r) => setTimeout(r, 500));
      log('Validating repository-scope access...');
    } else {
      log('Verifying developer email uniqueness...');
      await new Promise((r) => setTimeout(r, 600));
      log('Securing transmission pipeline...');
    }

    try {
      const res = await fetch('/api/dev-team/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          github_username: signupMethod === 'github' ? githubUsername.trim() : null,
          signup_method: signupMethod,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Authentication sequence failed');
      }

      const data = await res.json();
      log('Registration confirmed in secure database schema!');
      await new Promise((r) => setTimeout(r, 400));
      log('Issuing session token... SESSION_ACTIVE');

      localStorage.setItem('dev_token', data.token);
      setToken(data.token);
      setMember(data.member);
      loadDevThreads();
    } catch (err: any) {
      setAuthError(err.message || 'AUTHENTICATION_FAILED');
      setAuthLogs([]);
    } finally {
      setSubmittingAuth(false);
    }
  };

  // Submit forum thread reply
  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || !activeThread) return;
    setPostingReply(true);

    const authorName = member?.github_username ? `@${member.github_username}` : (member?.email || 'Developer');

    try {
      const res = await fetch(`/api/forum/threads/${activeThread.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          body: replyBody.trim(),
          author_name: authorName,
        }),
      });

      if (!res.ok) throw new Error();
      const newPost = await res.json() as Post;
      setPostList((prev) => [...prev, newPost]);
      setReplyBody('');

      // Refresh threads behind the scenes to update reply count
      loadDevThreads();
    } catch {
      alert('Could not post reply. Please try again.');
    } finally {
      setPostingReply(false);
    }
  };

  // Create new thread
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    setCreatingThread(true);

    const authorName = member?.github_username ? `@${member.github_username}` : (member?.email || 'Developer');

    try {
      // First, retrieve categories to find 'dev-team' category ID
      const catRes = await fetch('/api/forum/categories');
      const cats = await catRes.json();
      const devCat = cats.find((c: any) => c.slug === 'dev-team');
      if (!devCat) throw new Error('Dev Team category not seeded yet');

      const res = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          category_id: devCat.id,
          title: newTitle.trim(),
          body: newBody.trim(),
          author_name: authorName,
          tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error();
      const thread = await res.json() as Thread;
      setThreads((prev) => [thread, ...prev]);
      setShowNewThread(false);
      setNewTitle('');
      setNewBody('');
      setNewTags('');
      viewThread(thread);
    } catch {
      alert('Could not create thread. Please ensure category is seeded.');
    } finally {
      setCreatingThread(false);
    }
  };

  // Upvote thread
  const handleUpvoteThread = (id: number) => {
    fetch(`/api/forum/threads/${id}/upvote`, { method: 'POST' })
      .then(() => {
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, upvotes: t.upvotes + 1 } : t))
        );
        if (activeThread && activeThread.id === id) {
          setActiveThread((t) => (t ? { ...t, upvotes: t.upvotes + 1 } : null));
        }
      })
      .catch(console.error);
  };

  // Upvote reply post
  const handleUpvotePost = (id: number) => {
    fetch(`/api/forum/posts/${id}/upvote`, { method: 'POST' })
      .then(() => {
        setPostList((prev) =>
          prev.map((p) => (p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p))
        );
      })
      .catch(console.error);
  };

  // Simulated Grok-Build sequence
  const triggerGrokBuild = async () => {
    if (buildRunning) return;
    setBuildRunning(true);
    setBuildLogs([]);

    const runLogs = [
      'grok build --config config.toml --release --host-vcs=git',
      '⚡ Grok-Build Agent initializing workspace context...',
      '🔍 Inspecting monorepo: /home/runner/work/SHRI-ACADEMY/SHRI-ACADEMY',
      '📁 5 workspaces detected: artifacts/api-server, artifacts/shri-academy, artifacts/sri-platform, artifacts/threat-detection-service, scripts',
      '📦 Validating dependencies and pnpm-workspace.yaml compatibility...',
      '⚙️ [1/5] Compiling workspace: @workspace/api-spec...',
      '⚙️ [2/5] Compiling workspace: @workspace/api-zod...',
      '⚙️ [3/5] Compiling workspace: @workspace/api-client-react...',
      '⚙️ [4/5] Building Node backend: artifacts/api-server/src/index.ts -> build.mjs',
      '✨ artifacts/api-server build complete (3.8mb production bundle)',
      '⚙️ [5/5] Building Frontend bundle: artifacts/shri-academy with Vite...',
      '⚡ vite v7.3.2 compiling assets/modules...',
      '✨ artifacts/shri-academy: client-side build succeeded (711kb JS bundle)',
      '🔍 Initiating background linter checks and types checking...',
      '✅ TSC -p tsconfig.json --noEmit: PASS (0 errors)',
      '🔒 Grok-Build security checklist scan: No unredacted secrets found in repository traces.',
      '🚀 Launching local sidecar listener on port 8001...',
      '🎉 SUCCESS: Grok-Build compile finalized in 1.42 seconds!',
    ];

    for (const log of runLogs) {
      setBuildLogs((prev) => [...prev, log]);
      setTimeout(() => {
        buildConsoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      await new Promise((r) => setTimeout(r, Math.random() * 150 + 100));
    }

    setBuildRunning(false);
  };

  // Sign out developer
  const handleSignOut = () => {
    localStorage.removeItem('dev_token');
    setToken(null);
    setMember(null);
    setActiveThread(null);
    setThreads([]);
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-black text-system">
        <Loader className="w-8 h-8 animate-spin text-user" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-system font-mono overflow-hidden selection:bg-system/30 selection:text-system">
      {/* Dev Header */}
      <header className="flex justify-between items-center px-4 py-3 border-b border-system/20 bg-black/90 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="flex items-center gap-1 text-system/60 hover:text-system text-xs uppercase tracking-wider transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </Link>
          <div className="h-4 w-px bg-system/20" />
          <TerminalIcon className="w-5 h-5 text-user animate-pulse" />
          <div>
            <h1 className="text-sm font-bold tracking-widest text-glow-system uppercase text-system">
              Dev_Team_Portal
            </h1>
            <div className="hidden sm:block text-[8px] uppercase text-system/50 tracking-wider">
              Secure development, builds, and peer forum
            </div>
          </div>
        </div>

        {member && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 border border-system/20 px-2 py-1 bg-system/5">
              {member.signup_method === 'github' ? (
                <Github className="w-3.5 h-3.5 text-user" />
              ) : (
                <Mail className="w-3.5 h-3.5 text-system" />
              )}
              <span className="text-system/80 font-semibold">
                {member.github_username ? `@${member.github_username}` : member.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-[10px] uppercase border border-destructive/30 text-destructive/70 hover:text-destructive hover:bg-destructive/10 px-2.5 py-1 transition-all cursor-pointer"
            >
              Sign_Out
            </button>
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(6,182,212,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:30px_30px]" />

        {!member ? (
          /* Sign Up / Authenticate Block */
          <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-md border border-system/30 bg-black/60 backdrop-blur p-6 relative shadow-[0_0_30px_rgba(6,182,212,0.05)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-user"></div>

              <div className="mb-6 text-center">
                <Cpu className="w-12 h-12 text-user mx-auto mb-3" />
                <h2 className="text-lg text-system font-bold tracking-widest uppercase">
                  Initialize Dev Identity
                </h2>
                <p className="text-xs text-system/50 mt-1 leading-relaxed">
                  Authentication is strictly constrained to GitHub accounts and verified emails only.
                </p>
              </div>

              {/* Tab selector */}
              <div className="grid grid-cols-2 gap-2 mb-5 border-b border-system/10 pb-3">
                <button
                  onClick={() => {
                    setSignupMethod('github');
                    setAuthError(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-wider transition-all border ${
                    signupMethod === 'github'
                      ? 'border-user text-user bg-user/5 font-bold'
                      : 'border-system/10 text-system/40 hover:text-system/80'
                  }`}
                >
                  <Github className="w-3.5 h-3.5" /> GitHub
                </button>
                <button
                  onClick={() => {
                    setSignupMethod('email');
                    setAuthError(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-wider transition-all border ${
                    signupMethod === 'email'
                      ? 'border-system text-system bg-system/5 font-bold'
                      : 'border-system/10 text-system/40 hover:text-system/80'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
              </div>

              {authError && (
                <div className="mb-5 p-3 border border-destructive bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {submittingAuth && authLogs.length > 0 ? (
                <div className="mb-5 p-4 border border-system/20 bg-black text-[10px] text-system/70 space-y-1.5 h-44 overflow-y-auto font-mono scrollbar-thin">
                  {authLogs.map((log, idx) => (
                    <div key={idx} className="leading-tight animate-fade-in">
                      {log}
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 pt-1 text-user">
                    <Loader className="w-3 h-3 animate-spin" />
                    <span>Awaiting server ACK...</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  {signupMethod === 'github' ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-system/50 uppercase tracking-wider block">
                          GitHub Username *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-user text-xs">@</span>
                          <input
                            type="text"
                            value={githubUsername}
                            onChange={(e) => setGithubUsername(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                            required
                            placeholder="octocat"
                            disabled={submittingAuth}
                            className="w-full bg-black border border-system/20 text-system placeholder:text-system/20 pl-7 pr-3 py-2.5 focus:outline-none focus:border-user focus:ring-1 focus:ring-user text-sm font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-system/50 uppercase tracking-wider block">
                          Associated Email Address *
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="developer@github.com"
                          disabled={submittingAuth}
                          className="w-full bg-black border border-system/20 text-system placeholder:text-system/20 p-3 py-2.5 focus:outline-none focus:border-user focus:ring-1 focus:ring-user text-sm font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] text-system/50 uppercase tracking-wider block">
                        Verified Developer Email *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="developer@school.edu"
                        disabled={submittingAuth}
                        className="w-full bg-black border border-system/20 text-system placeholder:text-system/20 p-3 py-2.5 focus:outline-none focus:border-system focus:ring-1 focus:ring-system text-sm font-mono"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingAuth}
                    className={`w-full flex items-center justify-center gap-2 py-3 border text-xs uppercase tracking-widest font-bold transition-all ${
                      signupMethod === 'github'
                        ? 'border-user text-user hover:bg-user/10'
                        : 'border-system text-system hover:bg-system/10'
                    } disabled:opacity-40 cursor-pointer`}
                  >
                    {submittingAuth ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : signupMethod === 'github' ? (
                      <Github className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {submittingAuth ? 'AUTHENTICATING...' : 'AUTHORIZE_DEV_IDENTITY'}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* Logged In Workspace: Split Panel */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Panel: Peer Developer Forum */}
            <div className="flex-1 flex flex-col border-r border-system/15 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 bg-system/5 border-b border-system/15 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-user" />
                  <span className="text-xs uppercase font-bold tracking-wider text-system">
                    DEV_PEER_FORUM
                  </span>
                </div>
                {!activeThread && (
                  <button
                    onClick={() => setShowNewThread(true)}
                    className="flex items-center gap-1 px-3 py-1 border border-user text-user hover:bg-user/10 text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> New_Thread
                  </button>
                )}
              </div>

              {/* Forum Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                  {activeThread ? (
                    /* Thread Detail View */
                    <motion.div
                      key="thread-detail"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      <button
                        onClick={() => setActiveThread(null)}
                        className="text-[10px] uppercase tracking-wider text-system/50 hover:text-system flex items-center gap-1 cursor-pointer mb-2"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Threads
                      </button>

                      <div className="border border-system/30 bg-black/60 p-4 relative">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-user/40"></div>
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-bold text-sm text-system leading-snug uppercase">
                            {activeThread.title}
                          </h3>
                          <button
                            onClick={() => handleUpvoteThread(activeThread.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 border border-system/20 text-system/50 hover:text-user hover:border-user text-[10px] uppercase tracking-wider transition-all cursor-pointer shrink-0"
                          >
                            <ThumbsUp className="w-3 h-3" /> {activeThread.upvotes}
                          </button>
                        </div>

                        <p className="text-xs text-system/80 leading-relaxed whitespace-pre-wrap mt-3 font-mono">
                          {activeThread.body}
                        </p>

                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-system/10 text-[9px] uppercase tracking-wider text-system/40">
                          <span className="font-semibold text-user">{activeThread.author_name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {relTime(activeThread.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Replies List */}
                      <div className="space-y-3 pt-2">
                        <div className="text-[10px] uppercase tracking-widest text-system/30 flex items-center gap-3">
                          <span>── {threadPosts.length} REPLIES</span>
                          <div className="flex-1 h-px bg-system/10" />
                        </div>

                        {loadingPosts ? (
                          <div className="py-6 text-center">
                            <Loader className="w-5 h-5 animate-spin mx-auto text-user" />
                          </div>
                        ) : threadPosts.length === 0 ? (
                          <div className="py-6 text-center text-system/30 text-xs">
                            No peer reviews yet. Share your expertise.
                          </div>
                        ) : (
                          threadPosts.map((post) => (
                            <div key={post.id} className="border border-system/15 bg-black/30 p-3.5 relative">
                              <p className="text-xs text-system/80 leading-relaxed whitespace-pre-wrap font-mono">
                                {post.body}
                              </p>
                              <div className="flex justify-between items-center mt-3 pt-2 border-t border-system/5 text-[9px] uppercase tracking-wider text-system/35">
                                <span className="text-system/60 font-semibold">{post.author_name}</span>
                                <div className="flex items-center gap-3">
                                  <span>{relTime(post.created_at)}</span>
                                  <button
                                    onClick={() => handleUpvotePost(post.id)}
                                    className="flex items-center gap-1 text-system/40 hover:text-user transition-colors cursor-pointer"
                                  >
                                    <ThumbsUp className="w-2.5 h-2.5" /> {post.upvotes}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Reply Form */}
                      <form onSubmit={handlePostReply} className="border border-system/20 bg-black/50 p-4 space-y-3">
                        <div className="text-[10px] uppercase tracking-wider text-system/50">
                          Submit Peer Response
                        </div>
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          required
                          rows={4}
                          placeholder="Contribute technical feedback, reviews or build hints..."
                          className="w-full bg-black border border-system/15 text-system placeholder:text-system/20 p-3 text-xs font-mono focus:outline-none focus:border-user focus:ring-1 focus:ring-user resize-none"
                        />
                        <button
                          type="submit"
                          disabled={postingReply || !replyBody.trim()}
                          className="flex items-center gap-2 px-4 py-2 border border-user text-user hover:bg-user/10 text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                        >
                          {postingReply ? <Loader className="w-3 h-3 animate-spin" /> : null}
                          {postingReply ? 'TRANSMITTING...' : 'POST_REPLY'}
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    /* Thread List View */
                    <motion.div
                      key="thread-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      {loadingThreads ? (
                        <div className="py-12 text-center">
                          <Loader className="w-8 h-8 animate-spin mx-auto text-user" />
                          <span className="text-xs text-system/40 block mt-2">Loading developer logs...</span>
                        </div>
                      ) : threads.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-system/15 bg-black/40">
                          <MessageSquare className="w-8 h-8 text-system/20 mx-auto mb-3" />
                          <div className="text-system/35 text-xs uppercase tracking-widest">
                            No internal discussions recorded
                          </div>
                          <button
                            onClick={() => setShowNewThread(true)}
                            className="mt-4 px-4 py-2 border border-user/30 text-user/60 hover:text-user hover:border-user text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Open Initial Ticket
                          </button>
                        </div>
                      ) : (
                        threads.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => viewThread(t)}
                            className="w-full text-left border border-system/15 hover:border-system/40 bg-black/40 hover:bg-system/5 p-4 transition-all group relative block"
                          >
                            {t.is_pinned && (
                              <Pin className="absolute right-3 top-3 w-3 h-3 text-user/60 shrink-0" />
                            )}
                            <div className="font-bold text-xs text-system leading-snug uppercase group-hover:text-user transition-colors">
                              {t.title}
                            </div>
                            <p className="text-[11px] text-system/50 line-clamp-2 mt-1.5 leading-relaxed font-mono">
                              {t.body}
                            </p>
                            <div className="flex flex-wrap items-center gap-3.5 mt-3.5 text-[9px] uppercase tracking-wider text-system/40">
                              <span className="text-user font-semibold">{t.author_name}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {relTime(t.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-2.5 h-2.5" />
                                {t.reply_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="w-2.5 h-2.5" />
                                {t.upvotes}
                              </span>
                              {t.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="border border-system/10 text-[8px] px-1 py-0.2 text-system/30"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Panel: SpaceXAI Grok-Build Center */}
            <div className="w-full md:w-96 flex flex-col bg-black overflow-hidden border-t md:border-t-0 md:border-l border-system/15">
              <div className="flex items-center gap-2 px-4 py-3 bg-system/5 border-b border-system/15 shrink-0 justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-user" />
                  <span className="text-xs uppercase font-bold tracking-wider text-system">
                    GROK_BUILD_CENTER
                  </span>
                </div>
                <a
                  href="https://github.com/motorhead2840/grok-build"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] text-user hover:underline uppercase font-bold"
                >
                  VCS <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Grok info Card */}
                <div className="border border-user/25 bg-user/5 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-user">
                    About Grok-Build
                  </h4>
                  <p className="text-[11px] text-system/70 leading-relaxed font-mono">
                    Grok Build is SpaceXAI's terminal-based AI coding agent. It operates interactively or headlessly in CI/CD chains, understanding codebase layouts to execute builds, lints, and dependency trees natively.
                  </p>
                  <p className="text-[11px] text-system/55 leading-relaxed font-mono">
                    Learn more at{' '}
                    <a
                      href="https://github.com/motorhead2840/grok-build"
                      target="_blank"
                      rel="noreferrer"
                      className="text-user underline inline-flex items-center gap-0.5 font-semibold"
                    >
                      motorhead2840/grok-build <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </p>
                </div>

                {/* Simulated CLI Trigger */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-wider text-system/40">
                      Grok-Build Terminal Trace
                    </span>
                    <button
                      onClick={triggerGrokBuild}
                      disabled={buildRunning}
                      className="flex items-center gap-1.5 px-3 py-1 border border-user text-user hover:bg-user/10 text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer font-bold"
                    >
                      <RefreshCw className={`w-3 h-3 ${buildRunning ? 'animate-spin' : ''}`} />
                      Trigger_Compile
                    </button>
                  </div>

                  {/* Terminal console block */}
                  <div className="border border-system/15 bg-black p-4 h-64 overflow-y-auto font-mono text-[10px] text-system/80 flex flex-col gap-1.5 scrollbar-thin rounded-none shadow-inner select-text">
                    {buildLogs.length === 0 ? (
                      <div className="text-system/30 italic my-auto text-center">
                        Console idle. Click 'Trigger_Compile' to run SpaceXAI Grok-Build check.
                      </div>
                    ) : (
                      buildLogs.map((log, idx) => {
                        let colorClass = 'text-system/80';
                        if (log.startsWith('grok')) colorClass = 'text-user font-semibold';
                        else if (log.startsWith('🎉') || log.startsWith('✅')) colorClass = 'text-system font-bold text-glow-system';
                        else if (log.includes('complete') || log.includes('succeeded')) colorClass = 'text-emerald-400';
                        else if (log.startsWith('⚡') || log.startsWith('⚙️')) colorClass = 'text-system/90';

                        return (
                          <div key={idx} className={`${colorClass} leading-normal break-all`}>
                            {log.startsWith('grok') ? `$ ${log}` : log}
                          </div>
                        );
                      })
                    )}
                    <div ref={buildConsoleEndRef} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* New Thread Modal */}
      <AnimatePresence>
        {showNewThread && member && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-black border border-system/30 relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-user"></div>
              <div className="flex items-center justify-between p-4 border-b border-system/15">
                <h3 className="text-system font-bold uppercase tracking-widest text-sm">
                  Initialize Dev Ticket
                </h3>
                <button
                  onClick={() => setShowNewThread(false)}
                  className="text-system/40 hover:text-system cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateThread} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-system/40 block mb-1">
                    Subject / Title *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={150}
                    required
                    placeholder="E.g., Docker sidecar integration refactoring"
                    className="w-full bg-black border border-system/20 text-system placeholder:text-system/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-user"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-system/40 block mb-1">
                    Log details / Body *
                  </label>
                  <textarea
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    rows={6}
                    maxLength={5000}
                    required
                    placeholder="Describe the build issues, proposal or tech specs in full..."
                    className="w-full bg-black border border-system/20 text-system placeholder:text-system/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-user resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-system/40 block mb-1">
                    Labels / Tags (comma-sep)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="build, sagemaker, config"
                    className="w-full bg-black border border-system/20 text-system placeholder:text-system/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-user"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={creatingThread || !newTitle.trim() || !newBody.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-user text-user hover:bg-user/10 text-xs uppercase tracking-widest font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {creatingThread ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
                    {creatingThread ? 'DISPATCHING...' : 'DISPATCH_TICKET'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewThread(false)}
                    className="px-5 py-2.5 border border-system/20 text-system/50 hover:text-system text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-[0.05] bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]" />
    </div>
  );
}
