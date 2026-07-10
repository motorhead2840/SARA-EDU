/**
 * Database operations for the Scholarship Scheme.
 *
 * Monthly exam → top 100 students → free lifetime subscription.
 * Uses the existing pg pool (raw SQL, matching project conventions).
 */

import { pool } from '../db.js';

// ─── Schema init ──────────────────────────────────────────────────────────────

export async function initScholarshipSchema(): Promise<void> {
  // Expand subscription_source CHECK to include 'scholarship'
  // Idempotent: re-running ADD CONSTRAINT with the same name is a no-op on PG.
  await pool.query(`
    ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_subscription_source_check;
    ALTER TABLE users
      ADD CONSTRAINT users_subscription_source_check
        CHECK (subscription_source IN ('stripe','crypto','scholarship'));
  `).catch(() => {}); // ignore if users table not yet created

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scholarship_exams (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      month       INT  NOT NULL CHECK (month BETWEEN 1 AND 12),
      year        INT  NOT NULL CHECK (year >= 2024),
      status      TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','open','closed','graded')),
      opens_at    TIMESTAMPTZ,
      closes_at   TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (month, year)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scholarship_questions (
      id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      exam_id        TEXT NOT NULL REFERENCES scholarship_exams(id) ON DELETE CASCADE,
      order_num      INT  NOT NULL,
      question_text  TEXT NOT NULL,
      question_type  TEXT NOT NULL DEFAULT 'mcq'
        CHECK (question_type IN ('mcq','short_answer')),
      options        JSONB,        -- for mcq: ["A","B","C","D"]
      correct_option INT,          -- for mcq: 0-based index
      max_score      INT  NOT NULL DEFAULT 10,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (exam_id, order_num)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scholarship_submissions (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      exam_id         TEXT NOT NULL REFERENCES scholarship_exams(id) ON DELETE CASCADE,
      full_name       TEXT NOT NULL,
      email           TEXT NOT NULL,
      age             INT  NOT NULL CHECK (age >= 5 AND age <= 99),
      answers         JSONB NOT NULL DEFAULT '{}',
      auto_score      NUMERIC(6,2) NOT NULL DEFAULT 0,
      mentor_score    NUMERIC(6,2) NOT NULL DEFAULT 0,
      total_score     NUMERIC(6,2) GENERATED ALWAYS AS (auto_score + mentor_score) STORED,
      rank            INT,
      scholarship_granted BOOLEAN NOT NULL DEFAULT FALSE,
      submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      scored_at       TIMESTAMPTZ,
      UNIQUE (exam_id, email)   -- one attempt per exam per email
    );
  `);

  // Indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_scholarship_submissions_exam
      ON scholarship_submissions(exam_id, total_score DESC);
    CREATE INDEX IF NOT EXISTS idx_scholarship_submissions_email
      ON scholarship_submissions(email);
    CREATE INDEX IF NOT EXISTS idx_scholarship_exams_status
      ON scholarship_exams(status);
  `);
}

// ─── Exam CRUD ────────────────────────────────────────────────────────────────

export async function createExam(data: {
  title: string;
  description: string;
  month: number;
  year: number;
  opens_at?: string;
  closes_at?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO scholarship_exams (title, description, month, year, opens_at, closes_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.title, data.description, data.month, data.year, data.opens_at ?? null, data.closes_at ?? null]
  );
  return rows[0];
}

export async function listExams() {
  const { rows } = await pool.query(
    `SELECT e.*,
       (SELECT COUNT(*) FROM scholarship_submissions s WHERE s.exam_id = e.id) AS submission_count
     FROM scholarship_exams e
     ORDER BY e.year DESC, e.month DESC`
  );
  return rows;
}

export async function getExam(id: string) {
  const { rows } = await pool.query(
    `SELECT e.*,
       (SELECT COUNT(*) FROM scholarship_submissions s WHERE s.exam_id = e.id) AS submission_count
     FROM scholarship_exams e WHERE e.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getCurrentOpenExam() {
  const { rows } = await pool.query(
    `SELECT e.*,
       (SELECT COUNT(*) FROM scholarship_submissions s WHERE s.exam_id = e.id) AS submission_count
     FROM scholarship_exams e
     WHERE e.status = 'open'
     ORDER BY e.year DESC, e.month DESC
     LIMIT 1`
  );
  return rows[0] ?? null;
}

export async function setExamStatus(id: string, status: string) {
  const { rows } = await pool.query(
    `UPDATE scholarship_exams SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return rows[0];
}

// ─── Question CRUD ────────────────────────────────────────────────────────────

export async function addQuestion(data: {
  exam_id: string;
  order_num: number;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  options?: string[];
  correct_option?: number;
  max_score?: number;
}) {
  const { rows } = await pool.query(
    `INSERT INTO scholarship_questions
       (exam_id, order_num, question_text, question_type, options, correct_option, max_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      data.exam_id,
      data.order_num,
      data.question_text,
      data.question_type,
      data.options ? JSON.stringify(data.options) : null,
      data.correct_option ?? null,
      data.max_score ?? 10,
    ]
  );
  return rows[0];
}

export async function getQuestions(exam_id: string, includeSolutions = false) {
  const { rows } = await pool.query(
    `SELECT id, exam_id, order_num, question_text, question_type,
            options, max_score
            ${includeSolutions ? ', correct_option' : ''}
     FROM scholarship_questions
     WHERE exam_id = $1
     ORDER BY order_num ASC`,
    [exam_id]
  );
  return rows;
}

export async function deleteQuestion(id: string) {
  await pool.query(`DELETE FROM scholarship_questions WHERE id = $1`, [id]);
}

// ─── Submission CRUD ──────────────────────────────────────────────────────────

export async function submitExam(data: {
  exam_id: string;
  full_name: string;
  email: string;
  age: number;
  answers: Record<string, string | number>;
}) {
  // Auto-grade MCQ answers
  const { rows: qs } = await pool.query(
    `SELECT id, question_type, correct_option, max_score
     FROM scholarship_questions WHERE exam_id = $1`,
    [data.exam_id]
  );

  let autoScore = 0;
  for (const q of qs) {
    if (q.question_type === 'mcq' && q.correct_option !== null) {
      const ans = data.answers[q.id];
      if (ans !== undefined && Number(ans) === Number(q.correct_option)) {
        autoScore += Number(q.max_score);
      }
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO scholarship_submissions
       (exam_id, full_name, email, age, answers, auto_score)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (exam_id, email) DO NOTHING
     RETURNING *`,
    [data.exam_id, data.full_name, data.email, data.age, JSON.stringify(data.answers), autoScore]
  );
  return rows[0] ?? null; // null = duplicate (already submitted)
}

export async function getSubmissions(exam_id: string) {
  const { rows } = await pool.query(
    `SELECT * FROM scholarship_submissions
     WHERE exam_id = $1
     ORDER BY total_score DESC, submitted_at ASC`,
    [exam_id]
  );
  return rows;
}

export async function scoreSubmission(id: string, mentor_score: number) {
  const { rows } = await pool.query(
    `UPDATE scholarship_submissions
     SET mentor_score = $2, scored_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, mentor_score]
  );
  return rows[0];
}

// ─── Grant top-100 scholarships (atomic, idempotent) ─────────────────────────

export async function grantScholarships(exam_id: string): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Reset all prior winner flags for this exam (idempotent re-grant)
    await client.query(
      `UPDATE scholarship_submissions
       SET scholarship_granted = FALSE, rank = NULL
       WHERE exam_id = $1`,
      [exam_id]
    );

    // 2. Rank every submission for this exam by score DESC, then by earliest submit
    await client.query(
      `UPDATE scholarship_submissions s
       SET rank = sub.rn
       FROM (
         SELECT id,
                ROW_NUMBER() OVER (ORDER BY total_score DESC, submitted_at ASC) AS rn
         FROM scholarship_submissions
         WHERE exam_id = $1
       ) sub
       WHERE s.id = sub.id`,
      [exam_id]
    );

    // 3. Mark top 100 as granted
    await client.query(
      `UPDATE scholarship_submissions
       SET scholarship_granted = TRUE
       WHERE exam_id = $1 AND rank <= 100`,
      [exam_id]
    );

    // 4. Fetch the winning emails
    const { rows: winners } = await client.query<{ email: string }>(
      `SELECT email FROM scholarship_submissions
       WHERE exam_id = $1 AND rank <= 100`,
      [exam_id]
    );

    // 5. Apply lifetime subscriptions — all-or-nothing inside the transaction
    let applied = 0;
    for (const w of winners) {
      const result = await client.query(
        `UPDATE users
         SET subscription_tier       = 'high',
             subscription_source     = 'scholarship',
             subscription_expires_at = '2099-12-31 23:59:59+00'
         WHERE email = $1`,
        [w.email]
      );
      applied += result.rowCount ?? 0;
    }

    // 6. Transition exam to graded
    await client.query(
      `UPDATE scholarship_exams SET status = 'graded' WHERE id = $1`,
      [exam_id]
    );

    await client.query('COMMIT');
    return applied; // count of user accounts actually updated
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Public winners (anonymised) ─────────────────────────────────────────────

export async function getWinners(exam_id?: string) {
  const where = exam_id
    ? `WHERE s.scholarship_granted = TRUE AND s.exam_id = $1`
    : `WHERE s.scholarship_granted = TRUE`;
  const params = exam_id ? [exam_id] : [];

  const { rows } = await pool.query(
    `SELECT
       SPLIT_PART(s.full_name, ' ', 1) AS first_name,
       LEFT(SPLIT_PART(s.full_name, ' ', 2), 1) AS last_initial,
       s.age,
       s.rank,
       s.total_score,
       e.title AS exam_title,
       e.month,
       e.year
     FROM scholarship_submissions s
     JOIN scholarship_exams e ON e.id = s.exam_id
     ${where}
     ORDER BY e.year DESC, e.month DESC, s.rank ASC`,
    params
  );
  return rows;
}
