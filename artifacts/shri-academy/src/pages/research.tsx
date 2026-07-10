import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  BookOpen, Search, Brain, ChevronRight, ChevronDown, ArrowLeft,
  ExternalLink, Star, Clock, Layers, Target, Lightbulb, Zap,
  FlaskConical, GraduationCap, Trophy, Send, RefreshCw, CheckCircle,
  Lock, Unlock, AlertCircle, Map, Compass, BookMarked, Users,
} from 'lucide-react';
import {
  getDisciplines, getSpecializations, getCourses, getCourse,
  getResearchTopics, getResearchTopic, mentorResearch,
  type Discipline, type Specialization, type OcwCourse,
  type CourseDetail, type ResearchTopic, type ResearchTopicDetail,
  type ResearchPlan,
} from '@/lib/academic-api';

// ─── Difficulty indicator ─────────────────────────────────────────────────────

function DifficultyDots({ n, color = 'text-system' }: { n: number; color?: string }) {
  return (
    <div className="flex gap-0.5" aria-label={`Difficulty ${n} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i < n ? color : 'bg-system/10'}`} />
      ))}
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const cls: Record<string, string> = {
    introductory:  'border-green-500/50 text-green-400',
    undergraduate: 'border-system/40 text-system/70',
    graduate:      'border-user/50 text-user',
    advanced:      'border-mentor/50 text-mentor',
  };
  return (
    <span className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-widest font-bold ${cls[level] ?? 'border-system/30 text-system/50'}`}>
      {level}
    </span>
  );
}

function ImportanceBadge({ importance }: { importance: string }) {
  const cls: Record<string, string> = {
    essential:      'bg-mentor/20 text-mentor border-mentor/40',
    recommended:    'bg-system/10 text-system/70 border-system/30',
    supplementary:  'bg-system/5 text-system/40 border-system/20',
  };
  return (
    <span className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-widest font-bold ${cls[importance] ?? ''}`}>
      {importance}
    </span>
  );
}

// ─── Course card ──────────────────────────────────────────────────────────────

function CourseCard({ course, onClick, importance }: {
  course: OcwCourse & { importance?: string };
  onClick?: () => void;
  importance?: string;
}) {
  const diffColor = ['','text-green-400 bg-green-500','text-system/70 bg-system/60','text-user bg-user','text-mentor bg-mentor','text-destructive bg-destructive'][course.difficulty] ?? '';
  return (
    <div
      onClick={onClick}
      className={`border border-system/20 p-4 hover:border-system/50 transition-all group ${onClick ? 'cursor-pointer' : ''} bg-black/40`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <span className="text-[10px] font-bold font-mono text-system/50 bg-system/5 px-1.5 py-0.5 border border-system/20">
            {course.mit_course_num}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-system/90 text-sm font-medium group-hover:text-system transition-colors leading-snug">{course.title}</p>
            {importance && <ImportanceBadge importance={importance} />}
          </div>
          <p className="text-system/40 text-xs mt-1 leading-relaxed line-clamp-2">{course.description}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <LevelBadge level={course.level} />
            <DifficultyDots n={course.difficulty} color={diffColor.split(' ')[0]} />
            {course.hours_per_week > 0 && (
              <span className="text-system/30 text-[10px] flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />{course.hours_per_week}h/wk
              </span>
            )}
            {course.instructors?.[0] && (
              <span className="text-system/30 text-[10px] truncate max-w-32">{course.instructors[0]}</span>
            )}
          </div>
          {course.topics?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {course.topics.slice(0, 4).map(t => (
                <span key={t} className="text-[9px] text-system/40 border border-system/15 px-1.5 py-0.5 bg-system/5">{t}</span>
              ))}
            </div>
          )}
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-system/20 group-hover:text-system/60 shrink-0 mt-1 transition-colors" />}
      </div>
    </div>
  );
}

// ─── Course detail drawer ─────────────────────────────────────────────────────

function CourseDetailDrawer({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCourse(courseId).then(c => { setCourse(c); setLoading(false); }).catch(() => setLoading(false));
  }, [courseId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-black border-l border-system/30 h-full overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-black/95 border-b border-system/20 px-6 py-4 flex items-center justify-between gap-3 z-10">
          <button onClick={onClose} className="text-system/40 hover:text-system transition-colors flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {course && (
            <a href={course.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-user hover:text-user/80 transition-colors uppercase tracking-wider">
              <ExternalLink className="w-3.5 h-3.5" /> Open on MIT OCW
            </a>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-system/30 animate-spin" />
          </div>
        ) : !course ? (
          <div className="flex-1 flex items-center justify-center text-system/30 text-sm">Course not found</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Title block */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-system/50 text-sm bg-system/5 border border-system/20 px-2 py-0.5">{course.mit_course_num}</span>
                <LevelBadge level={course.level} />
              </div>
              <h2 className="text-xl font-bold text-system tracking-wide leading-snug">{course.title}</h2>
              {course.instructors?.length > 0 && (
                <p className="text-system/50 text-sm mt-1">{course.instructors.join(' · ')}</p>
              )}
              <p className="text-system/30 text-xs mt-0.5">{course.semester} {course.year}</p>
            </div>

            {/* Description */}
            <div className="border-l-2 border-system/20 pl-4">
              <p className="text-system/70 text-sm leading-relaxed">{course.description}</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Hours/Week', value: `${course.hours_per_week}h` },
                { label: 'Units', value: String(course.units) },
                { label: 'Difficulty', value: '' },
              ].map(s => (
                <div key={s.label} className="border border-system/20 bg-system/5 p-3 text-center">
                  <p className="text-[10px] text-system/40 uppercase tracking-wider mb-1">{s.label}</p>
                  {s.value
                    ? <p className="text-system font-bold text-lg">{s.value}</p>
                    : <div className="flex justify-center mt-1"><DifficultyDots n={course.difficulty} color="bg-system" /></div>}
                </div>
              ))}
            </div>

            {/* Prerequisites */}
            {course.prerequisites?.length > 0 && (
              <div>
                <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Prerequisites
                </h3>
                <div className="space-y-2">
                  {course.prerequisites.map(p => (
                    <div key={p.id} className="flex items-center gap-3 text-sm">
                      {p.required
                        ? <Lock className="w-3.5 h-3.5 text-user shrink-0" />
                        : <Unlock className="w-3.5 h-3.5 text-system/30 shrink-0" />}
                      <span className="font-mono text-system/50 text-xs">{p.mit_course_num}</span>
                      <span className="text-system/70">{p.title}</span>
                      {!p.required && <span className="text-system/30 text-[10px]">(recommended)</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics covered */}
            {course.topics?.length > 0 && (
              <div>
                <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Layers className="w-3 h-3" /> Topics Covered
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {course.topics.map(t => (
                    <span key={t} className="text-xs text-system/60 border border-system/20 bg-system/5 px-2 py-1">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Syllabus modules */}
            {course.modules?.length > 0 && (
              <div>
                <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <BookMarked className="w-3 h-3" /> Syllabus
                </h3>
                <div className="space-y-2">
                  {course.modules.map((m, i) => (
                    <div key={m.id ?? i} className="border-l-2 border-system/20 pl-4 py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-system/30 font-mono">
                          {m.week > 0 ? `Wk ${m.week}` : `U${m.unit}`}
                        </span>
                        <p className="text-system/80 text-sm font-medium">{m.title}</p>
                      </div>
                      {m.description && <p className="text-system/40 text-xs mt-0.5 leading-relaxed">{m.description}</p>}
                      {m.topics?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {m.topics.map(t => (
                            <span key={t} className="text-[9px] text-system/30 bg-system/5 border border-system/10 px-1.5 py-0.5">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {course.resource_types?.length > 0 && (
              <div>
                <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3">Available Resources</h3>
                <div className="flex flex-wrap gap-2">
                  {course.resource_types.map(r => (
                    <span key={r} className="text-xs border border-system/20 text-system/60 px-2 py-1 flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-green-400" />{r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* OCW link */}
            {course.url && (
              <a href={course.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 border border-system/30 text-system/60 hover:border-system/60 hover:text-system transition-all text-sm uppercase tracking-wider">
                <ExternalLink className="w-4 h-4" /> Open Full Course on MIT OpenCourseWare
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Research topic panel ─────────────────────────────────────────────────────

function ResearchTopicPanel({ topicId, onStartPlan }: {
  topicId: string;
  onStartPlan: (t: ResearchTopicDetail) => void;
}) {
  const [topic, setTopic] = useState<ResearchTopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getResearchTopic(topicId).then(t => { setTopic(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, [topicId]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <RefreshCw className="w-6 h-6 text-system/30 animate-spin" />
    </div>
  );
  if (!topic) return null;

  const importanceOrder: Record<string, number> = { essential: 1, recommended: 2, supplementary: 3 };

  return (
    <div className="flex-1 overflow-y-auto">
      {selectedCourse && (
        <CourseDetailDrawer courseId={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}

      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="border-b border-system/20 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: topic.discipline_color }} className="text-lg">{topic.discipline_icon}</span>
            <span className="text-system/40 text-xs uppercase tracking-wider">{topic.discipline_name}</span>
            {topic.specialization_name && <>
              <span className="text-system/20">·</span>
              <span className="text-system/40 text-xs uppercase tracking-wider">{topic.specialization_name}</span>
            </>}
          </div>
          <h2 className="text-2xl font-bold text-system tracking-wide">{topic.title}</h2>
          <div className="flex items-center gap-4 mt-2">
            <DifficultyDots n={topic.difficulty} color="bg-mentor" />
            <span className="text-system/40 text-xs">{topic.course_count} recommended courses</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-system/80 text-sm leading-relaxed">{topic.description}</p>
          {topic.why_it_matters && (
            <div className="mt-4 border border-user/20 bg-user/5 p-4">
              <p className="text-[10px] text-user/60 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Why It Matters
              </p>
              <p className="text-user/80 text-sm leading-relaxed">{topic.why_it_matters}</p>
            </div>
          )}
        </div>

        {/* Open questions */}
        {topic.open_questions?.length > 0 && (
          <div>
            <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <FlaskConical className="w-3 h-3" /> Open Research Questions
            </h3>
            <div className="space-y-2">
              {topic.open_questions.map((q, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-mentor/50 text-xs font-mono shrink-0 mt-0.5">Q{i+1}</span>
                  <p className="text-system/70 text-sm">{q}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key skills */}
        {topic.key_skills?.length > 0 && (
          <div>
            <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Target className="w-3 h-3" /> Key Skills to Build
            </h3>
            <div className="flex flex-wrap gap-2">
              {topic.key_skills.map(s => (
                <span key={s} className="text-xs border border-mentor/30 text-mentor/70 bg-mentor/5 px-2.5 py-1">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Career paths */}
        {topic.career_paths?.length > 0 && (
          <div>
            <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <GraduationCap className="w-3 h-3" /> Career Paths
            </h3>
            <div className="space-y-1">
              {topic.career_paths.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-system/60">
                  <ChevronRight className="w-3.5 h-3.5 text-system/30 shrink-0" />{c}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses */}
        {topic.courses?.length > 0 && (
          <div>
            <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Recommended Courses
            </h3>
            <div className="space-y-2">
              {[...topic.courses]
                .sort((a, b) => (importanceOrder[a.importance] ?? 9) - (importanceOrder[b.importance] ?? 9))
                .map(c => (
                  <CourseCard key={c.id} course={c} importance={c.importance}
                    onClick={() => setSelectedCourse(c.id)} />
                ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => onStartPlan(topic)}
          className="w-full py-4 border border-mentor/50 bg-mentor/5 text-mentor hover:bg-mentor/10 transition-all text-sm uppercase tracking-widest font-bold flex items-center justify-center gap-2"
        >
          <Brain className="w-4 h-4" /> Generate My AI Research Plan for This Topic
        </button>
      </div>
    </div>
  );
}

// ─── AI Research Mentor panel ─────────────────────────────────────────────────

function AIMentorPanel({ initialInterest = '', onClose }: {
  initialInterest?: string;
  onClose: () => void;
}) {
  const [interest, setInterest] = useState(initialInterest);
  const [background, setBackground] = useState('');
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!interest.trim()) return;
    setLoading(true); setError(''); setPlan(null);
    try {
      const res = await mentorResearch({ interest, background: background || undefined });
      setPlan(res.plan);
    } catch (e: any) {
      setError(e.message ?? 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-3xl bg-black border-l border-mentor/30 h-full overflow-y-auto flex flex-col">
        {selectedCourse && (
          <CourseDetailDrawer courseId={selectedCourse} onClose={() => setSelectedCourse(null)} />
        )}

        {/* Header */}
        <div className="sticky top-0 bg-black/95 border-b border-mentor/20 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-mentor text-glow-mentor" />
              <h2 className="text-sm font-bold text-mentor uppercase tracking-widest text-glow-mentor">AI Research Mentor</h2>
            </div>
            <button onClick={onClose} className="text-system/30 hover:text-system transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          <p className="text-system/40 text-xs mt-1">Describe your research interest → get a personalised roadmap</p>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Input form */}
          {!plan && (
            <div className="space-y-4">
              <div>
                <label htmlFor="interest" className="block text-[10px] text-system/50 uppercase tracking-wider mb-2">
                  What do you want to research? *
                </label>
                <textarea
                  id="interest" rows={4}
                  value={interest} onChange={e => setInterest(e.target.value)}
                  placeholder="e.g. I want to research how to make AI systems safer and more aligned with human values..."
                  className="w-full bg-black/80 border border-system/30 text-system/80 p-4 text-sm placeholder:text-system/20 focus:outline-none focus:border-mentor/50 rounded-none resize-none"
                />
              </div>
              <div>
                <label htmlFor="bg" className="block text-[10px] text-system/50 uppercase tracking-wider mb-2">
                  Your current background (optional)
                </label>
                <input
                  id="bg" type="text"
                  value={background} onChange={e => setBackground(e.target.value)}
                  placeholder="e.g. I know calculus and can code in Python"
                  className="w-full bg-black/80 border border-system/30 text-system/80 p-3 text-sm placeholder:text-system/20 focus:outline-none focus:border-mentor/50 rounded-none"
                />
              </div>
              {error && (
                <div className="border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
              <button
                onClick={handleGenerate} disabled={loading || !interest.trim()}
                className="w-full py-4 border border-mentor/50 bg-mentor/5 text-mentor hover:bg-mentor/15 transition-all text-sm uppercase tracking-widest font-bold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating your research plan…</>
                  : <><Brain className="w-4 h-4" /> Generate Research Roadmap</>}
              </button>
              {loading && (
                <p className="text-center text-system/30 text-xs">
                  Analysing OCW database · Mapping prerequisites · Building your personalised path…
                </p>
              )}
            </div>
          )}

          {/* Research Plan output */}
          {plan && (
            <div className="space-y-6">
              {/* Reset */}
              <button onClick={() => setPlan(null)}
                className="flex items-center gap-1.5 text-xs text-system/40 hover:text-system transition-colors uppercase tracking-wider">
                <ArrowLeft className="w-3.5 h-3.5" /> New Query
              </button>

              {/* Plan header */}
              <div className="border border-mentor/30 bg-mentor/5 p-5">
                <p className="text-[10px] text-mentor/60 uppercase tracking-widest mb-1">Your Research Roadmap</p>
                <h3 className="text-lg font-bold text-mentor leading-snug">{plan.research_title}</h3>
                <p className="text-system/70 text-sm mt-2 leading-relaxed">{plan.summary}</p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center">
                    <p className="text-[10px] text-system/40 uppercase">Field</p>
                    <p className="text-system text-xs font-bold mt-0.5">{plan.discipline}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-system/40 uppercase">Duration</p>
                    <p className="text-system text-xs font-bold mt-0.5">~{plan.estimated_months} months</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-system/40 uppercase">Difficulty</p>
                    <div className="flex justify-center mt-1">
                      <DifficultyDots n={plan.difficulty} color="bg-mentor" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Next step */}
              <div className="border border-user/20 bg-user/5 p-4 flex items-start gap-3">
                <Zap className="w-4 h-4 text-user shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-user/60 uppercase tracking-widest mb-1">Start Today</p>
                  <p className="text-user/90 text-sm font-medium">{plan.next_step}</p>
                </div>
              </div>

              {/* Milestones */}
              <div>
                <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Map className="w-3 h-3" /> Learning Roadmap
                </h3>
                <div className="space-y-4">
                  {plan.milestones.map((ms, i) => (
                    <div key={ms.phase} className="border border-system/20 overflow-hidden">
                      <div className="bg-system/5 border-b border-system/20 px-4 py-3 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full border border-mentor/50 bg-mentor/10 flex items-center justify-center shrink-0">
                          <span className="text-mentor text-xs font-bold">{ms.phase}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-system/90 text-sm font-bold">{ms.title}</p>
                          <p className="text-system/40 text-[10px]">{ms.duration_weeks}</p>
                        </div>
                        <span className="text-[10px] border border-system/20 text-system/40 px-2 py-0.5">
                          Phase {ms.phase}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Courses for this milestone */}
                        {ms.courses?.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] text-system/40 uppercase tracking-wider flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> Courses
                            </p>
                            {ms.courses.map(c => (
                              <CourseCard key={c.id} course={c} onClick={() => setSelectedCourse(c.id)} />
                            ))}
                          </div>
                        ) : ms.course_ids_requested?.length > 0 ? (
                          <div className="text-system/30 text-xs italic">
                            Courses: {ms.course_ids_requested.join(', ')} — open full course browser for details
                          </div>
                        ) : null}

                        {/* Goals */}
                        {ms.goals?.length > 0 && (
                          <div>
                            <p className="text-[10px] text-system/40 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Target className="w-3 h-3" /> Goals
                            </p>
                            {ms.goals.map((g, gi) => (
                              <div key={gi} className="flex gap-2 text-sm text-system/60 mt-1">
                                <CheckCircle className="w-3.5 h-3.5 text-system/30 shrink-0 mt-0.5" />{g}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Deliverable */}
                        {ms.deliverable && (
                          <div className="border-l-2 border-mentor/30 pl-3">
                            <p className="text-[10px] text-mentor/50 uppercase tracking-wider mb-0.5">Milestone Deliverable</p>
                            <p className="text-mentor/80 text-sm">{ms.deliverable}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open problems */}
              {plan.open_problems?.length > 0 && (
                <div>
                  <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FlaskConical className="w-3 h-3" /> Open Research Problems You Could Tackle
                  </h3>
                  <div className="space-y-2">
                    {plan.open_problems.map((p, i) => (
                      <div key={i} className="flex gap-3 items-start border border-system/15 bg-system/5 p-3">
                        <span className="text-mentor/50 text-xs font-mono shrink-0">P{i+1}</span>
                        <p className="text-system/70 text-sm">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key papers */}
              {plan.key_papers?.length > 0 && (
                <div>
                  <h3 className="text-[10px] text-system/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BookMarked className="w-3 h-3" /> Seminal Papers to Read
                  </h3>
                  <div className="space-y-1">
                    {plan.key_papers.map((p, i) => (
                      <div key={i} className="flex gap-2 text-sm text-system/60 italic">
                        <span className="text-system/30 shrink-0">{i+1}.</span>{p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Research page ───────────────────────────────────────────────────────

export default function ResearchPage() {
  const [, setLocation] = useLocation();

  // State
  const [disciplines, setDisciplines]     = useState<Discipline[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [researchTopics, setResearchTopics]   = useState<ResearchTopic[]>([]);
  const [courses, setCourses]             = useState<OcwCourse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Filters
  const [activeDiscipline, setActiveDiscipline]   = useState<string | null>(null);
  const [activeSpec, setActiveSpec]               = useState<string | null>(null);
  const [activeView, setActiveView]               = useState<'topics' | 'courses'>('topics');
  const [searchQuery, setSearchQuery]             = useState('');
  const [levelFilter, setLevelFilter]             = useState('');

  // Panels
  const [selectedTopicId, setSelectedTopicId]     = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId]   = useState<string | null>(null);
  const [showMentor, setShowMentor]               = useState(false);
  const [mentorSeed, setMentorSeed]               = useState('');

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load
  useEffect(() => {
    Promise.all([getDisciplines(), getResearchTopics()])
      .then(([discs, topics]) => { setDisciplines(discs); setResearchTopics(topics); })
      .finally(() => setLoading(false));
  }, []);

  // Load specs when discipline changes
  useEffect(() => {
    if (!activeDiscipline) { setSpecializations([]); setActiveSpec(null); return; }
    getSpecializations(activeDiscipline).then(setSpecializations);
    setActiveSpec(null);
  }, [activeDiscipline]);

  // Debounced course search
  const fetchCourses = useCallback((disc: string | null, spec: string | null, search: string, level: string) => {
    setCoursesLoading(true);
    getCourses({ discipline_id: disc ?? undefined, specialization_id: spec ?? undefined,
      search: search || undefined, level: level || undefined, limit: 60 })
      .then(setCourses)
      .finally(() => setCoursesLoading(false));
  }, []);

  useEffect(() => {
    if (activeView !== 'courses') return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchCourses(activeDiscipline, activeSpec, searchQuery, levelFilter), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [activeView, activeDiscipline, activeSpec, searchQuery, levelFilter, fetchCourses]);

  // Filtered research topics
  const filteredTopics = researchTopics.filter(t =>
    (!activeDiscipline || t.discipline_id === activeDiscipline) &&
    (!searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-black text-system flex flex-col" style={{ fontFamily: 'monospace' }}>
      {/* ── Header ── */}
      <header className="border-b border-system/20 bg-black/90 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation('/')} className="text-system/30 hover:text-system transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Compass className="w-5 h-5 text-mentor text-glow-mentor" />
          <div>
            <h1 className="text-sm font-bold text-mentor uppercase tracking-widest text-glow-mentor">RESEARCH NAVIGATOR</h1>
            <p className="text-[10px] text-system/30 uppercase">MIT OpenCourseWare · Academic Database</p>
          </div>
        </div>
        <button
          onClick={() => { setMentorSeed(''); setShowMentor(true); }}
          className="flex items-center gap-2 px-4 py-2 border border-mentor/50 bg-mentor/5 text-mentor hover:bg-mentor/10 transition-all text-xs uppercase tracking-widest font-bold"
        >
          <Brain className="w-4 h-4" /> AI Research Mentor
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar: Disciplines ── */}
        <aside className="w-52 border-r border-system/20 overflow-y-auto shrink-0 hidden md:block bg-black/60">
          <div className="p-3">
            <p className="text-[10px] text-system/30 uppercase tracking-widest px-2 py-2">Disciplines</p>
            <button
              onClick={() => { setActiveDiscipline(null); setActiveSpec(null); }}
              className={`w-full text-left px-3 py-2 text-xs transition-all flex items-center gap-2 ${!activeDiscipline ? 'text-system bg-system/10 border-l-2 border-system' : 'text-system/40 hover:text-system/70 hover:bg-system/5'}`}
            >
              <span>All</span>
            </button>
            {loading ? (
              <div className="space-y-1 mt-2 px-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-system/5 animate-pulse rounded" />)}
              </div>
            ) : disciplines.map(d => (
              <button
                key={d.id}
                onClick={() => setActiveDiscipline(d.id === activeDiscipline ? null : d.id)}
                className={`w-full text-left px-3 py-2 text-xs transition-all flex items-center gap-2 ${
                  activeDiscipline === d.id
                    ? 'text-system bg-system/10 border-l-2'
                    : 'text-system/40 hover:text-system/70 hover:bg-system/5'
                }`}
                style={activeDiscipline === d.id ? { borderColor: d.color } : {}}
              >
                <span className="text-base shrink-0">{d.icon}</span>
                <span className="leading-tight">{d.name}</span>
                <span className="ml-auto text-[9px] text-system/20 shrink-0">{d.course_count}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="border-b border-system/20 bg-black/50 px-4 py-3 flex flex-wrap items-center gap-3">
            {/* View toggle */}
            <div className="flex border border-system/20">
              {(['topics','courses'] as const).map(v => (
                <button key={v} onClick={() => setActiveView(v)}
                  className={`px-4 py-1.5 text-xs uppercase tracking-widest transition-all ${
                    activeView === v ? 'bg-system/10 text-system' : 'text-system/40 hover:text-system/60'
                  }`}>
                  {v === 'topics' ? <><FlaskConical className="w-3 h-3 inline mr-1" />Research Topics</> : <><BookOpen className="w-3 h-3 inline mr-1" />Browse Courses</>}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-system/30" />
              <input
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeView === 'topics' ? 'Search research topics…' : 'Search courses, topics…'}
                className="w-full bg-black border border-system/20 text-system/80 pl-9 pr-3 py-1.5 text-xs placeholder:text-system/20 focus:outline-none focus:border-system/50"
              />
            </div>

            {/* Level filter (courses only) */}
            {activeView === 'courses' && (
              <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
                className="bg-black border border-system/20 text-system/60 px-3 py-1.5 text-xs focus:outline-none focus:border-system/50">
                <option value="">All Levels</option>
                <option value="introductory">Introductory</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
              </select>
            )}
          </div>

          {/* Specialization chips */}
          {activeDiscipline && specializations.length > 0 && (
            <div className="border-b border-system/15 px-4 py-2 flex gap-2 overflow-x-auto bg-black/30">
              <button
                onClick={() => setActiveSpec(null)}
                className={`shrink-0 px-3 py-1 text-[10px] uppercase tracking-widest border transition-all ${
                  !activeSpec ? 'border-system/50 text-system bg-system/10' : 'border-system/20 text-system/40 hover:border-system/40'
                }`}>
                All Areas
              </button>
              {specializations.map(s => (
                <button key={s.id}
                  onClick={() => setActiveSpec(s.id === activeSpec ? null : s.id)}
                  className={`shrink-0 px-3 py-1 text-[10px] uppercase tracking-widest border transition-all ${
                    activeSpec === s.id ? 'border-mentor/50 text-mentor bg-mentor/5' : 'border-system/15 text-system/30 hover:border-system/30'
                  }`}>
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {/* ── Research Topics view ── */}
            {activeView === 'topics' && (
              selectedTopicId ? (
                <div className="flex-1 flex flex-col h-full">
                  <div className="border-b border-system/20 px-4 py-2 bg-black/50">
                    <button onClick={() => setSelectedTopicId(null)}
                      className="flex items-center gap-1.5 text-xs text-system/40 hover:text-system transition-colors uppercase tracking-wider">
                      <ArrowLeft className="w-3.5 h-3.5" /> All Research Topics
                    </button>
                  </div>
                  <ResearchTopicPanel topicId={selectedTopicId}
                    onStartPlan={(t) => { setMentorSeed(`I want to research ${t.title}`); setShowMentor(true); }} />
                </div>
              ) : (
                <div className="p-4 sm:p-6">
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 border border-system/20 animate-pulse bg-system/5" />)}
                    </div>
                  ) : filteredTopics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-system/30">
                      <FlaskConical className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm uppercase tracking-wider">No research topics found</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <h2 className="text-xs text-system/40 uppercase tracking-widest">
                          {filteredTopics.length} research areas · Click to explore · Use AI Mentor for a personalised roadmap
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTopics.map(t => (
                          <button key={t.id} onClick={() => setSelectedTopicId(t.id)}
                            className="border border-system/20 p-5 text-left hover:border-system/50 transition-all group bg-black/40 hover:bg-system/5">
                            <div className="flex items-start gap-3 mb-3">
                              <span className="text-2xl shrink-0" style={{ color: t.discipline_color }}>{t.discipline_icon}</span>
                              <div className="min-w-0">
                                <p className="text-[10px] text-system/30 uppercase tracking-wider mb-1">{t.discipline_name}</p>
                                <h3 className="text-system/90 font-bold text-sm leading-snug group-hover:text-system transition-colors">{t.title}</h3>
                              </div>
                            </div>
                            <p className="text-system/50 text-xs leading-relaxed line-clamp-3 mb-3">{t.description}</p>
                            <div className="flex items-center justify-between">
                              <DifficultyDots n={t.difficulty} color="bg-mentor" />
                              <span className="text-[10px] text-system/30">{t.course_count} courses</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            )}

            {/* ── Courses view ── */}
            {activeView === 'courses' && (
              <div className="p-4 sm:p-6">
                {coursesLoading ? (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <div key={i} className="h-28 border border-system/20 animate-pulse bg-system/5" />)}
                  </div>
                ) : courses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-system/30">
                    <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm uppercase tracking-wider">No courses found</p>
                    <p className="text-xs mt-2">Select a discipline or search to browse</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-system/30 uppercase tracking-wider mb-4">{courses.length} courses</p>
                    <div className="space-y-2">
                      {courses.map(c => (
                        <CourseCard key={c.id} course={c} onClick={() => setSelectedCourseId(c.id)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawers & Panels */}
      {selectedCourseId && (
        <CourseDetailDrawer courseId={selectedCourseId} onClose={() => setSelectedCourseId(null)} />
      )}
      {showMentor && (
        <AIMentorPanel initialInterest={mentorSeed} onClose={() => { setShowMentor(false); setMentorSeed(''); }} />
      )}
    </div>
  );
}
