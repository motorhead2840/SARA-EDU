/**
 * Scholarship scheme routes.
 *
 * Public:
 *   GET  /api/scholarship/current          – current open exam (no questions)
 *   GET  /api/scholarship/exam/:id/questions – questions for open exam (no solutions)
 *   POST /api/scholarship/submit           – submit exam answers
 *   GET  /api/scholarship/winners          – past winners (anonymised)
 *
 * Mentor-gated:
 *   GET  /api/scholarship/exams            – list all exams
 *   POST /api/scholarship/exam             – create exam
 *   POST /api/scholarship/exam/:id/question – add question
 *   DELETE /api/scholarship/question/:qid  – delete question
 *   PUT  /api/scholarship/exam/:id/status  – open / close / grade
 *   GET  /api/scholarship/exam/:id/submissions – list submissions
 *   PUT  /api/scholarship/submission/:sid/score – score a submission
 *   POST /api/scholarship/exam/:id/grant   – rank + grant top-100
 */

import { Router } from 'express';
import { requireMentor } from '../middleware/requireMentor.js';
import {
  createExam,
  listExams,
  getExam,
  getCurrentOpenExam,
  setExamStatus,
  addQuestion,
  getQuestions,
  deleteQuestion,
  submitExam,
  getSubmissions,
  scoreSubmission,
  grantScholarships,
  getWinners,
} from '../lib/scholarshipDb.js';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

/** Current open exam metadata (no questions, no solutions). */
router.get('/current', async (_req, res) => {
  try {
    const exam = await getCurrentOpenExam();
    res.json({ exam });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current exam' });
  }
});

/** Questions for a specific exam (public, strips solutions). */
router.get('/exam/:id/questions', async (req, res): Promise<void> => {
  try {
    const examId = req.params['id'] as string;
    const exam = await getExam(examId);
    if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }
    if (exam.status !== 'open' && exam.status !== 'graded') {
      res.status(403).json({ error: 'Exam is not open' }); return;
    }
    const questions = await getQuestions(examId, false);
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

/** Submit exam answers. */
router.post('/submit', async (req, res): Promise<void> => {
  try {
    const { exam_id, full_name, email, age, answers } = req.body as {
      exam_id: string;
      full_name: string;
      email: string;
      age: number;
      answers: Record<string, string | number>;
    };

    if (!exam_id || !full_name?.trim() || !email?.trim() || !age || !answers) {
      res.status(400).json({ error: 'Missing required fields' }); return;
    }
    if (!email.includes('@')) {
      res.status(400).json({ error: 'Invalid email' }); return;
    }
    if (age < 5 || age > 99) {
      res.status(400).json({ error: 'Age must be between 5 and 99' }); return;
    }

    const exam = await getExam(exam_id);
    if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }
    if (exam.status !== 'open') {
      res.status(403).json({ error: 'This exam is no longer accepting submissions' }); return;
    }

    if (exam.closes_at && new Date(exam.closes_at) < new Date()) {
      res.status(403).json({ error: 'Exam submission window has closed' }); return;
    }

    const submission = await submitExam({ exam_id, full_name: full_name.trim(), email: email.trim().toLowerCase(), age: Number(age), answers });
    if (!submission) {
      res.status(409).json({ error: 'You have already submitted this exam' }); return;
    }

    res.json({ success: true, submission_id: submission.id, auto_score: submission.auto_score });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

/** Past winners – anonymised (first name + last initial). */
router.get('/winners', async (req, res) => {
  try {
    const { exam_id } = req.query as { exam_id?: string };
    const winners = await getWinners(exam_id);
    res.json({ winners });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch winners' });
  }
});

// ─── Mentor-gated ─────────────────────────────────────────────────────────────

/** List all exams. */
router.get('/exams', requireMentor, async (_req, res) => {
  try {
    const exams = await listExams();
    res.json({ exams });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list exams' });
  }
});

/** Create a new exam. */
router.post('/exam', requireMentor, async (req, res): Promise<void> => {
  try {
    const { title, description, month, year, opens_at, closes_at } = req.body as {
      title: string;
      description: string;
      month: number;
      year: number;
      opens_at?: string;
      closes_at?: string;
    };
    if (!title?.trim() || !month || !year) {
      res.status(400).json({ error: 'title, month, and year are required' }); return;
    }
    const exam = await createExam({ title: title.trim(), description: description?.trim() ?? '', month: Number(month), year: Number(year), opens_at, closes_at });
    res.json({ exam });
  } catch (err: any) {
    if (err.code === '23505') { res.status(409).json({ error: 'An exam already exists for that month/year' }); return; }
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

/** Add a question to an exam. */
router.post('/exam/:id/question', requireMentor, async (req, res): Promise<void> => {
  try {
    const examId = req.params['id'] as string;
    const { order_num, question_text, question_type, options, correct_option, max_score } = req.body as {
      order_num: number;
      question_text: string;
      question_type: 'mcq' | 'short_answer';
      options?: string[];
      correct_option?: number;
      max_score?: number;
    };
    if (!question_text?.trim() || !question_type) {
      res.status(400).json({ error: 'question_text and question_type are required' }); return;
    }
    if (question_type === 'mcq' && (correct_option === undefined || !options?.length)) {
      res.status(400).json({ error: 'MCQ questions require options and correct_option' }); return;
    }
    const question = await addQuestion({
      exam_id: examId,
      order_num: Number(order_num),
      question_text: question_text.trim(),
      question_type,
      options,
      correct_option,
      max_score,
    });
    res.json({ question });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add question' });
  }
});

/** Get questions with solutions (mentor view). */
router.get('/exam/:id/questions/mentor', requireMentor, async (req, res): Promise<void> => {
  try {
    const questions = await getQuestions(req.params['id'] as string, true);
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

/** Delete a question. */
router.delete('/question/:qid', requireMentor, async (req, res): Promise<void> => {
  try {
    await deleteQuestion(req.params['qid'] as string);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

/** Change exam status: draft → open → closed → graded. */
router.put('/exam/:id/status', requireMentor, async (req, res): Promise<void> => {
  try {
    const examId = req.params['id'] as string;
    const { status } = req.body as { status: string };
    if (!['draft','open','closed','graded'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' }); return;
    }
    const exam = await setExamStatus(examId, status);
    if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }
    res.json({ exam });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update exam status' });
  }
});

/** List all submissions for an exam. */
router.get('/exam/:id/submissions', requireMentor, async (req, res): Promise<void> => {
  try {
    const submissions = await getSubmissions(req.params['id'] as string);
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/** Score a single submission (for short-answer questions). */
router.put('/submission/:sid/score', requireMentor, async (req, res): Promise<void> => {
  try {
    const { mentor_score } = req.body as { mentor_score: number };
    if (mentor_score === undefined || Number.isNaN(Number(mentor_score))) {
      res.status(400).json({ error: 'mentor_score is required' }); return;
    }
    const sub = await scoreSubmission(req.params['sid'] as string, Number(mentor_score));
    if (!sub) { res.status(404).json({ error: 'Submission not found' }); return; }
    res.json({ submission: sub });
  } catch (err) {
    res.status(500).json({ error: 'Failed to score submission' });
  }
});

/** Rank all submissions, mark top 100 as scholarship winners, grant lifetime subscriptions. */
router.post('/exam/:id/grant', requireMentor, async (req, res): Promise<void> => {
  try {
    const examId = req.params['id'] as string;
    const exam = await getExam(examId);
    if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }
    // Strict lifecycle gate: only 'closed' exams may be granted
    if (exam.status !== 'closed') {
      res.status(400).json({
        error: exam.status === 'open'
          ? 'Close the exam before granting scholarships'
          : exam.status === 'draft'
          ? 'Open and then close the exam before granting scholarships'
          : 'Scholarships have already been granted for this exam. Re-open and re-close it before re-granting.',
      }); return;
    }
    const granted = await grantScholarships(examId);
    res.json({ success: true, granted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to grant scholarships' });
  }
});

export default router;
