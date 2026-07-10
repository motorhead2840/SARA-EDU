import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronRight, MessageSquare, Eye, ThumbsUp, Pin, Plus, X, Loader, Clock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: number; name: string; slug: string; description: string;
  icon: string; color: string; thread_count: number;
}

interface Thread {
  id: number; category_id: number; title: string; body: string;
  author_name: string; tags: string[]; upvotes: number;
  view_count: number; reply_count: number; is_pinned: boolean;
  created_at: string; category_name: string; category_slug: string;
  category_color: string;
}

interface Post {
  id: number; thread_id: number; body: string;
  author_name: string; upvotes: number; created_at: string;
}

type View = 'categories' | 'threads' | 'thread';

const COLOR_MAP: Record<string, { text: string; border: string; bg: string }> = {
  system: { text: 'text-system', border: 'border-system/50', bg: 'bg-system/10' },
  mentor: { text: 'text-mentor', border: 'border-mentor/50', bg: 'bg-mentor/10' },
  user:   { text: 'text-user',   border: 'border-user/50',   bg: 'bg-user/10'   },
};
const cc = (color: string) => COLOR_MAP[color] ?? COLOR_MAP.system;

const fade = { initial: { opacity: 0, x: 12 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.2 } };

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[1,2,3].map((i) => (
        <div key={i} className="border border-system/10 p-4 space-y-2 animate-pulse">
          <div className="h-3 bg-system/10 w-2/3" />
          <div className="h-2 bg-system/5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

// ─── New Thread Modal ──────────────────────────────────────────────────────────

function NewThreadModal({
  category, onClose, onCreated
}: {
  category: Category;
  onClose: () => void;
  onCreated: (t: Thread) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState(() => localStorage.getItem('forum_author_name') ?? '');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const col = cc(category.color);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || body.trim().length < 10) { setError('Title and a meaningful body are required.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: category.id,
          title: title.trim(),
          body: body.trim(),
          author_name: author.trim() || 'Anonymous',
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Failed to create thread');
      const thread = await res.json() as Thread;
      localStorage.setItem('forum_author_name', author.trim());
      onCreated(thread);
    } catch {
      setError('Could not post — try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-black border border-system/30">
        <div className={`flex items-center justify-between p-4 border-b ${col.border}`}>
          <div>
            <div className={`text-[10px] uppercase tracking-widest ${col.text} mb-0.5`}>{category.name}</div>
            <h3 className="text-system font-bold uppercase tracking-widest text-sm">New Thread</h3>
          </div>
          <button onClick={onClose} className="text-system/40 hover:text-system"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-system/40 block mb-1">Title <span className="text-red-400">*</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
              className="w-full bg-black border border-system/30 text-system placeholder:text-system/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-system"
              placeholder="What's on your mind?" required />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-system/40 block mb-1">Body <span className="text-red-400">*</span></label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={8000}
              className="w-full bg-black border border-system/30 text-system placeholder:text-system/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-system resize-none"
              placeholder="Share your thoughts, questions, or ideas..." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-system/40 block mb-1">Your Name</label>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={60}
                className="w-full bg-black border border-system/30 text-system placeholder:text-system/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-system"
                placeholder="Anonymous" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-system/40 block mb-1">Tags (comma-sep)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)}
                className="w-full bg-black border border-system/30 text-system placeholder:text-system/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-system"
                placeholder="ai, learning, math" />
            </div>
          </div>
          {error && <div className="text-red-400 text-xs">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 border ${col.border} ${col.text} hover:${col.bg} text-xs uppercase tracking-widest transition-all disabled:opacity-40`}>
              {loading ? <Loader className="w-3 h-3 animate-spin" /> : null}
              {loading ? 'Posting...' : 'Create Thread'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-system/20 text-system/50 hover:text-system text-xs uppercase tracking-widest transition-all">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Category listing ──────────────────────────────────────────────────────────

function CategoryView({ categories, loading, onSelect }: {
  categories: Category[]; loading: boolean; onSelect: (c: Category) => void;
}) {
  return (
    <motion.div {...fade} className="space-y-4">
      <div className="text-[10px] uppercase tracking-widest text-system/30 flex items-center gap-3">
        <span>Channels</span><div className="flex-1 h-px bg-system/10" />
      </div>
      {loading ? <SkeletonRows /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => {
            const col = cc(cat.color);
            return (
              <motion.button key={cat.id} whileHover={{ scale: 1.01 }}
                onClick={() => onSelect(cat)}
                className={`text-left p-5 border ${col.border} bg-black hover:${col.bg} transition-all group`}>
                <div className="flex items-start justify-between">
                  <div className={`text-2xl mb-3 ${col.text}`}>{cat.icon}</div>
                  <div className={`text-[10px] uppercase tracking-widest ${col.text} border ${col.border} px-2 py-0.5`}>
                    {cat.thread_count} thread{cat.thread_count !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className={`font-bold text-sm uppercase tracking-wider mb-1 ${col.text}`}>{cat.name}</div>
                <div className="text-system/50 text-xs leading-relaxed">{cat.description}</div>
                <div className={`mt-4 flex items-center gap-1 text-[10px] uppercase tracking-widest ${col.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Browse <ChevronRight className="w-3 h-3" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Thread list ───────────────────────────────────────────────────────────────

function ThreadListView({ category, threads, loading, onThread, onNew }: {
  category: Category | null; threads: Thread[]; loading: boolean;
  onThread: (t: Thread) => void; onNew: () => void;
}) {
  return (
    <motion.div {...fade} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-system/30">
          {category ? category.name : 'All Threads'} — {threads.length} thread{threads.length !== 1 ? 's' : ''}
        </div>
        <button onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-wider transition-all">
          <Plus className="w-3 h-3" /> New Thread
        </button>
      </div>
      {loading ? <SkeletonRows /> : threads.length === 0 ? (
        <div className="py-16 text-center">
          <MessageSquare className="w-8 h-8 text-system/20 mx-auto mb-3" />
          <div className="text-system/30 text-xs uppercase tracking-widest">No threads yet — be the first</div>
          <button onClick={onNew}
            className="mt-4 px-4 py-2 border border-system/30 text-system/50 hover:text-system hover:border-system text-xs uppercase tracking-wider transition-all">
            Start a discussion
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const col = cc(t.category_color ?? 'system');
            return (
              <motion.button key={t.id} whileHover={{ x: 2 }}
                onClick={() => onThread(t)}
                className="w-full text-left border border-system/15 hover:border-system/40 bg-black hover:bg-system/5 p-4 transition-all group">
                <div className="flex items-start gap-3">
                  {t.is_pinned && <Pin className="w-3 h-3 text-user/60 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-system leading-snug truncate">{t.title}</div>
                      <ArrowRight className="w-4 h-4 text-system/20 group-hover:text-system/60 transition-colors shrink-0 mt-0.5" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] uppercase tracking-wider text-system/40">
                      <span>{t.author_name}</span>
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{relTime(t.created_at)}</span>
                      <span className={`border ${col.border} ${col.text} px-1.5 py-0.5`}>{t.category_name}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-2.5 h-2.5" />{t.upvotes}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5" />{t.reply_count}</span>
                      <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{t.view_count}</span>
                    </div>
                    {t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[8px] uppercase px-1 py-0.5 border border-system/15 text-system/40">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Thread detail ─────────────────────────────────────────────────────────────

function ThreadDetailView({ threadId, onBack }: { threadId: number; onBack: () => void }) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [replyAuthor, setReplyAuthor] = useState(() => localStorage.getItem('forum_author_name') ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [threadUpvotes, setThreadUpvotes] = useState(0);
  const [postUpvotes, setPostUpvotes] = useState<Record<number, number>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/forum/threads/${threadId}`)
      .then((r) => r.json())
      .then((d: { thread: Thread; posts: Post[] }) => {
        setThread(d.thread); setPosts(d.posts); setThreadUpvotes(d.thread.upvotes);
        const u: Record<number, number> = {};
        d.posts.forEach((p) => { u[p.id] = p.upvotes; });
        setPostUpvotes(u);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [threadId]);

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody.trim(), author_name: replyAuthor.trim() || 'Anonymous' }),
      });
      if (!res.ok) throw new Error();
      const post = await res.json() as Post;
      setPosts((p) => [...p, post]);
      setPostUpvotes((u) => ({ ...u, [post.id]: 0 }));
      setReplyBody('');
      localStorage.setItem('forum_author_name', replyAuthor.trim());
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  const upvoteThread = () => {
    fetch(`/api/forum/threads/${threadId}/upvote`, { method: 'POST' })
      .then((r) => r.json()).then((d: { upvotes: number }) => setThreadUpvotes(d.upvotes)).catch(() => {});
    setThreadUpvotes((u) => u + 1);
  };

  const upvotePost = (id: number) => {
    fetch(`/api/forum/posts/${id}/upvote`, { method: 'POST' })
      .then((r) => r.json()).then((d: { upvotes: number }) => setPostUpvotes((u) => ({ ...u, [id]: d.upvotes }))).catch(() => {});
    setPostUpvotes((u) => ({ ...u, [id]: (u[id] ?? 0) + 1 }));
  };

  if (loading) return <SkeletonRows />;
  if (!thread) return <div className="text-system/40 text-sm text-center py-16">Thread not found</div>;

  const col = cc(thread.category_color ?? 'system');

  return (
    <motion.div {...fade} className="space-y-6">
      {/* Original post */}
      <div className={`border ${col.border} bg-black`}>
        <div className={`px-5 py-3 border-b ${col.border} flex items-center justify-between`}>
          <div>
            <div className={`text-[9px] uppercase tracking-widest ${col.text} mb-0.5`}>{thread.category_name}</div>
            <h2 className="text-system font-bold text-lg leading-snug">{thread.title}</h2>
          </div>
          <button onClick={upvoteThread}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-system/20 text-system/50 hover:text-user hover:border-user text-xs uppercase tracking-wider transition-all">
            <ThumbsUp className="w-3 h-3" /> {threadUpvotes}
          </button>
        </div>
        <div className="p-5">
          <p className="text-system/80 text-sm leading-relaxed whitespace-pre-line">{thread.body}</p>
          <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-system/30">
            <span>{thread.author_name}</span>
            <span>{relTime(thread.created_at)}</span>
            {thread.tags.map((t) => <span key={t} className="border border-system/15 px-1.5 py-0.5 text-system/40">{t}</span>)}
          </div>
        </div>
      </div>

      {/* Replies */}
      {posts.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-system/30 flex items-center gap-3">
            <span>── {posts.length} Repl{posts.length === 1 ? 'y' : 'ies'}</span>
            <div className="flex-1 h-px bg-system/10" />
          </div>
          {posts.map((post, idx) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className="border border-system/15 bg-black p-4">
              <p className="text-system/80 text-sm leading-relaxed whitespace-pre-line mb-3">{post.body}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-system/30">
                  <span>{post.author_name}</span>
                  <span>{relTime(post.created_at)}</span>
                </div>
                <button onClick={() => upvotePost(post.id)}
                  className="flex items-center gap-1 text-system/30 hover:text-user text-[10px] uppercase tracking-wider transition-colors">
                  <ThumbsUp className="w-2.5 h-2.5" /> {postUpvotes[post.id] ?? post.upvotes}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <div ref={endRef} />

      {/* Reply form */}
      <form onSubmit={submitReply} className="border border-system/20 bg-black">
        <div className="px-4 py-3 border-b border-system/20 text-[10px] uppercase tracking-widest text-system/40">Post a Reply</div>
        <div className="p-4 space-y-3">
          <input value={replyAuthor} onChange={(e) => setReplyAuthor(e.target.value)} maxLength={60}
            className="w-full bg-black border border-system/20 text-system placeholder:text-system/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-system"
            placeholder="Your name (optional)" />
          <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={5} maxLength={8000}
            className="w-full bg-black border border-system/20 text-system placeholder:text-system/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-system resize-none"
            placeholder="Write your reply..." required />
          <button type="submit" disabled={submitting || !replyBody.trim()}
            className="flex items-center gap-2 px-5 py-2 border border-system text-system hover:bg-system/10 text-xs uppercase tracking-widest transition-all disabled:opacity-40">
            {submitting ? <Loader className="w-3 h-3 animate-spin" /> : null}
            {submitting ? 'Posting...' : 'Post Reply'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ForumPage() {
  const [view, setView] = useState<View>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [catsLoading, setCatsLoading] = useState(true);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);

  useEffect(() => {
    fetch('/api/forum/categories')
      .then((r) => r.json()).then((d: Category[]) => setCategories(d))
      .catch(console.error).finally(() => setCatsLoading(false));
  }, []);

  const loadThreads = (category: Category | null) => {
    setThreadsLoading(true);
    const url = category ? `/api/forum/threads?category=${category.slug}` : '/api/forum/threads';
    fetch(url).then((r) => r.json()).then((d: Thread[]) => setThreads(d))
      .catch(console.error).finally(() => setThreadsLoading(false));
  };

  const selectCategory = (cat: Category) => {
    setActiveCategory(cat);
    setView('threads');
    loadThreads(cat);
  };

  const browsAll = () => {
    setActiveCategory(null);
    setView('threads');
    loadThreads(null);
  };

  const selectThread = (t: Thread) => {
    setActiveThread(t);
    setView('thread');
  };

  // Breadcrumb
  const crumbs: { label: string; onClick: () => void }[] = [
    { label: 'Forum', onClick: () => { setView('categories'); setActiveThread(null); } },
    ...(view !== 'categories' ? [{ label: activeCategory?.name ?? 'All Threads', onClick: () => { setView('threads'); setActiveThread(null); } }] : []),
    ...(view === 'thread' && activeThread ? [{ label: activeThread.title.slice(0, 32) + (activeThread.title.length > 32 ? '…' : ''), onClick: () => {} }] : []),
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-system font-mono overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-system/20 bg-black/90 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/"><button className="flex items-center gap-1 text-system/60 hover:text-system text-xs uppercase tracking-wider transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button></Link>
          <div className="h-4 w-px bg-system/20" />
          <h1 className="text-sm font-bold tracking-widest text-glow-system uppercase">Student_Forum</h1>
        </div>
        {view === 'categories' && (
          <button onClick={browsAll}
            className="text-xs uppercase tracking-widest text-system/50 hover:text-system border border-system/20 hover:border-system px-3 py-1.5 transition-all">
            Browse All
          </button>
        )}
        {view === 'threads' && (
          <button onClick={() => {
            // If no category is selected (Browse All), pick the first category for the new thread
            if (!activeCategory && categories.length > 0) setActiveCategory(categories[0]);
            setShowNewThread(true);
          }}
            className="flex items-center gap-1 text-xs uppercase tracking-widest text-system border border-system hover:bg-system/10 px-3 py-1.5 transition-all">
            <Plus className="w-3 h-3" /> New Thread
          </button>
        )}
      </header>

      {/* Breadcrumb */}
      {crumbs.length > 1 && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-system/10 text-[10px] uppercase tracking-widest text-system/30 shrink-0 overflow-hidden">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-system/20 shrink-0" />}
              <button onClick={c.onClick} className={`truncate transition-colors ${i < crumbs.length - 1 ? 'hover:text-system cursor-pointer' : 'text-system/60 cursor-default'}`}>
                {c.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {view === 'categories' && (
              <CategoryView key="cats" categories={categories} loading={catsLoading} onSelect={selectCategory} />
            )}
            {view === 'threads' && (
              <ThreadListView key="threads" category={activeCategory} threads={threads} loading={threadsLoading}
                onThread={selectThread}
                onNew={() => setShowNewThread(true)} />
            )}
            {view === 'thread' && activeThread && (
              <ThreadDetailView key={`thread-${activeThread.id}`} threadId={activeThread.id} onBack={() => setView('threads')} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New thread modal */}
      <AnimatePresence>
        {showNewThread && activeCategory && (
          <NewThreadModal
            category={activeCategory}
            onClose={() => setShowNewThread(false)}
            onCreated={(t) => {
              setThreads((prev) => [t, ...prev]);
              setShowNewThread(false);
              setActiveThread(t);
              setView('thread');
            }}
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-[0.06] bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]" />
    </div>
  );
}
