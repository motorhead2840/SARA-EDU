/**
 * Typed API helpers for the Scholarship scheme.
 * Used by both the public Scholarship page and the Mentor Dashboard tab.
 */

const BASE = (import.meta.env.BASE_URL ?? '').replace(/\/$/, '');

async function apiFetch<T = unknown>(
  path: string,
  opts?: RequestInit,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  Object.assign(headers, opts?.headers ?? {});

  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export const getCurrentExam = () =>
  apiFetch<{ exam: ScholarshipExam | null }>('/scholarship/current');

export const getExamQuestions = (examId: string) =>
  apiFetch<{ questions: ScholarshipQuestion[] }>(`/scholarship/exam/${examId}/questions`);

export const submitExamAnswers = (body: {
  exam_id: string;
  full_name: string;
  email: string;
  age: number;
  answers: Record<string, string | number>;
}) =>
  apiFetch<{ success: boolean; submission_id: string; auto_score: number }>(
    '/scholarship/submit',
    { method: 'POST', body: JSON.stringify(body) }
  );

export const getWinners = (examId?: string) =>
  apiFetch<{ winners: ScholarshipWinner[] }>(
    `/scholarship/winners${examId ? `?exam_id=${examId}` : ''}`
  );

// ─── Mentor-gated ─────────────────────────────────────────────────────────────

export const listExams = (token: string) =>
  apiFetch<{ exams: ScholarshipExam[] }>('/scholarship/exams', {}, token);

export const createExam = (
  token: string,
  body: { title: string; description: string; month: number; year: number; opens_at?: string; closes_at?: string }
) =>
  apiFetch<{ exam: ScholarshipExam }>('/scholarship/exam', { method: 'POST', body: JSON.stringify(body) }, token);

export const addQuestion = (
  token: string,
  examId: string,
  body: {
    order_num: number;
    question_text: string;
    question_type: 'mcq' | 'short_answer';
    options?: string[];
    correct_option?: number;
    max_score?: number;
  }
) =>
  apiFetch<{ question: ScholarshipQuestion }>(
    `/scholarship/exam/${examId}/question`,
    { method: 'POST', body: JSON.stringify(body) },
    token
  );

export const getMentorQuestions = (token: string, examId: string) =>
  apiFetch<{ questions: ScholarshipQuestion[] }>(
    `/scholarship/exam/${examId}/questions/mentor`,
    {},
    token
  );

export const deleteQuestion = (token: string, qid: string) =>
  apiFetch<{ success: boolean }>(`/scholarship/question/${qid}`, { method: 'DELETE' }, token);

export const setExamStatus = (token: string, examId: string, status: string) =>
  apiFetch<{ exam: ScholarshipExam }>(
    `/scholarship/exam/${examId}/status`,
    { method: 'PUT', body: JSON.stringify({ status }) },
    token
  );

export const getSubmissions = (token: string, examId: string) =>
  apiFetch<{ submissions: ScholarshipSubmission[] }>(
    `/scholarship/exam/${examId}/submissions`,
    {},
    token
  );

export const scoreSubmission = (token: string, sid: string, mentor_score: number) =>
  apiFetch<{ submission: ScholarshipSubmission }>(
    `/scholarship/submission/${sid}/score`,
    { method: 'PUT', body: JSON.stringify({ mentor_score }) },
    token
  );

export const grantScholarships = (token: string, examId: string) =>
  apiFetch<{ success: boolean; granted: number }>(
    `/scholarship/exam/${examId}/grant`,
    { method: 'POST' },
    token
  );

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScholarshipExam {
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

export interface ScholarshipQuestion {
  id: string;
  exam_id: string;
  order_num: number;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  options: string[] | null;
  correct_option?: number;
  max_score: number;
}

export interface ScholarshipSubmission {
  id: string;
  exam_id: string;
  full_name: string;
  email: string;
  age: number;
  answers: Record<string, string | number>;
  auto_score: number;
  mentor_score: number;
  total_score: number;
  rank: number | null;
  scholarship_granted: boolean;
  submitted_at: string;
  scored_at: string | null;
}

export interface ScholarshipWinner {
  first_name: string;
  last_initial: string;
  age: number;
  rank: number;
  total_score: number;
  exam_title: string;
  month: number;
  year: number;
}
