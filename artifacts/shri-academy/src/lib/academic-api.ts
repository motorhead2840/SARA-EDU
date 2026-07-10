function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Use root-relative /api/... so frontend and API share the same origin path.
  return fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  }).then(r => {
    if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error ?? r.statusText)));
    return r.json() as Promise<T>;
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Discipline {
  id: string; name: string; icon: string; description: string; color: string;
  sort_order: number; course_count: number; specialization_count: number;
}

export interface Specialization {
  id: string; discipline_id: string; name: string; description: string;
  research_potential: string; sort_order: number; course_count: number;
}

export interface OcwCourse {
  id: string; mit_course_num: string; title: string; description: string;
  level: string; discipline_id: string; specialization_id: string | null;
  url: string; semester: string; year: number;
  instructors: string[]; topics: string[]; resource_types: string[];
  units: number; hours_per_week: number; difficulty: number;
  discipline_name: string; discipline_color: string;
  specialization_name: string | null;
  prerequisite_ids?: string[];
}

export interface CourseModule {
  id: number; course_id: string; week: number; unit: string;
  title: string; description: string; topics: string[];
}

export interface CourseDetail extends OcwCourse {
  prerequisites: Array<{ id: string; mit_course_num: string; title: string; level: string; required: boolean }>;
  modules: CourseModule[];
  discipline_icon: string;
  specialization_description: string | null;
}

export interface ResearchTopic {
  id: string; discipline_id: string; specialization_id: string | null;
  title: string; description: string; why_it_matters: string;
  open_questions: string[]; key_skills: string[]; career_paths: string[];
  difficulty: number; sort_order: number;
  discipline_name: string; discipline_color: string; discipline_icon: string;
  specialization_name: string | null; course_count: number;
}

export interface ResearchTopicDetail extends ResearchTopic {
  courses: Array<OcwCourse & { importance: 'essential' | 'recommended' | 'supplementary' }>;
}

export interface ResearchMilestone {
  phase: number; title: string; duration_weeks: string;
  courses: OcwCourse[]; course_ids_requested: string[];
  goals: string[]; deliverable: string;
}

export interface ResearchPlan {
  research_title: string; summary: string; discipline: string;
  specialization: string; closest_topic_id: string | null;
  difficulty: number; estimated_months: number;
  milestones: ResearchMilestone[];
  open_problems: string[]; key_papers: string[]; next_step: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

export const getDisciplines = () =>
  apiFetch<{ disciplines: Discipline[] }>('/academic/disciplines').then(r => r.disciplines);

export const getSpecializations = (discipline_id?: string) => {
  const q = discipline_id ? `?discipline_id=${discipline_id}` : '';
  return apiFetch<{ specializations: Specialization[] }>(`/academic/specializations${q}`).then(r => r.specializations);
};

export const getCourses = (opts: {
  discipline_id?: string; specialization_id?: string;
  level?: string; search?: string; limit?: number; offset?: number;
} = {}) => {
  const params = new URLSearchParams();
  if (opts.discipline_id)     params.set('discipline_id', opts.discipline_id);
  if (opts.specialization_id) params.set('specialization_id', opts.specialization_id);
  if (opts.level)             params.set('level', opts.level);
  if (opts.search)            params.set('search', opts.search);
  if (opts.limit)             params.set('limit', String(opts.limit));
  if (opts.offset)            params.set('offset', String(opts.offset));
  const q = params.toString() ? `?${params}` : '';
  return apiFetch<{ courses: OcwCourse[] }>(`/academic/courses${q}`).then(r => r.courses);
};

export const getCourse = (id: string) =>
  apiFetch<{ course: CourseDetail }>(`/academic/courses/${id}`).then(r => r.course);

export const getResearchTopics = (discipline_id?: string) => {
  const q = discipline_id ? `?discipline_id=${discipline_id}` : '';
  return apiFetch<{ topics: ResearchTopic[] }>(`/academic/research-topics${q}`).then(r => r.topics);
};

export const getResearchTopic = (id: string) =>
  apiFetch<{ topic: ResearchTopicDetail }>(`/academic/research-topics/${id}`).then(r => r.topic);

export const mentorResearch = (opts: {
  interest: string; user_email?: string; background?: string;
}) =>
  // Routes: /api/shri/research/mentor → Node proxy → Python /shri-api/research/mentor
  apiFetch<{ plan: ResearchPlan }>('/shri/research/mentor', {
    method: 'POST', body: JSON.stringify(opts),
  });

export const saveResearchProfile = (opts: {
  user_email: string; interest_text: string;
  discipline_id?: string; topic_ids?: string[]; ai_plan?: object;
}) => apiFetch<{ profile: object }>('/academic/research-profile', {
  method: 'POST', body: JSON.stringify(opts),
});
