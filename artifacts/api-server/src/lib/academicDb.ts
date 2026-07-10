import { pool } from '../db.js';

// ─────────────────────────────────────────────────────────────────────────────
// Schema initialisation
// ─────────────────────────────────────────────────────────────────────────────

export async function initAcademicSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic_disciplines (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      icon        TEXT NOT NULL DEFAULT '📚',
      description TEXT NOT NULL DEFAULT '',
      color       TEXT NOT NULL DEFAULT '#6366f1',
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS academic_specializations (
      id            TEXT PRIMARY KEY,
      discipline_id TEXT NOT NULL REFERENCES academic_disciplines(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      research_potential TEXT NOT NULL DEFAULT '',
      sort_order    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ocw_courses (
      id                TEXT PRIMARY KEY,
      mit_course_num    TEXT NOT NULL,
      title             TEXT NOT NULL,
      description       TEXT NOT NULL DEFAULT '',
      level             TEXT NOT NULL CHECK (level IN ('introductory','undergraduate','graduate','advanced')),
      discipline_id     TEXT NOT NULL REFERENCES academic_disciplines(id),
      specialization_id TEXT REFERENCES academic_specializations(id),
      url               TEXT NOT NULL DEFAULT '',
      semester          TEXT NOT NULL DEFAULT '',
      year              INTEGER,
      instructors       TEXT[] NOT NULL DEFAULT '{}',
      topics            TEXT[] NOT NULL DEFAULT '{}',
      resource_types    TEXT[] NOT NULL DEFAULT '{}',
      units             INTEGER NOT NULL DEFAULT 0,
      hours_per_week    INTEGER NOT NULL DEFAULT 0,
      difficulty        INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ocw_course_prerequisites (
      course_id TEXT NOT NULL REFERENCES ocw_courses(id) ON DELETE CASCADE,
      prereq_id TEXT NOT NULL REFERENCES ocw_courses(id) ON DELETE CASCADE,
      required  BOOLEAN NOT NULL DEFAULT TRUE,
      PRIMARY KEY (course_id, prereq_id)
    );

    CREATE TABLE IF NOT EXISTS ocw_course_modules (
      id          SERIAL PRIMARY KEY,
      course_id   TEXT NOT NULL REFERENCES ocw_courses(id) ON DELETE CASCADE,
      week        INTEGER NOT NULL DEFAULT 0,
      unit        TEXT NOT NULL DEFAULT '',
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      topics      TEXT[] NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS research_topics (
      id                  TEXT PRIMARY KEY,
      discipline_id       TEXT NOT NULL REFERENCES academic_disciplines(id),
      specialization_id   TEXT REFERENCES academic_specializations(id),
      title               TEXT NOT NULL,
      description         TEXT NOT NULL DEFAULT '',
      why_it_matters      TEXT NOT NULL DEFAULT '',
      open_questions      TEXT[] NOT NULL DEFAULT '{}',
      key_skills          TEXT[] NOT NULL DEFAULT '{}',
      career_paths        TEXT[] NOT NULL DEFAULT '{}',
      difficulty          INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
      sort_order          INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS research_topic_courses (
      research_topic_id TEXT NOT NULL REFERENCES research_topics(id) ON DELETE CASCADE,
      course_id         TEXT NOT NULL REFERENCES ocw_courses(id) ON DELETE CASCADE,
      importance        TEXT NOT NULL DEFAULT 'recommended' CHECK (importance IN ('essential','recommended','supplementary')),
      PRIMARY KEY (research_topic_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS student_research_profiles (
      id              SERIAL PRIMARY KEY,
      user_email      TEXT NOT NULL,
      interest_text   TEXT NOT NULL,
      discipline_id   TEXT REFERENCES academic_disciplines(id),
      topic_ids       TEXT[] NOT NULL DEFAULT '{}',
      ai_plan         JSONB,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ocw_courses_discipline   ON ocw_courses(discipline_id);
    CREATE INDEX IF NOT EXISTS idx_ocw_courses_spec         ON ocw_courses(specialization_id);
    CREATE INDEX IF NOT EXISTS idx_ocw_courses_level        ON ocw_courses(level);
    CREATE INDEX IF NOT EXISTS idx_research_topics_disc     ON research_topics(discipline_id);
    CREATE INDEX IF NOT EXISTS idx_student_profiles_email   ON student_research_profiles(user_email);
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function getDisciplines() {
  const { rows } = await pool.query(
    `SELECT d.*,
            COUNT(DISTINCT c.id)::int AS course_count,
            COUNT(DISTINCT s.id)::int AS specialization_count
     FROM academic_disciplines d
     LEFT JOIN academic_specializations s ON s.discipline_id = d.id
     LEFT JOIN ocw_courses c ON c.discipline_id = d.id
     GROUP BY d.id
     ORDER BY d.sort_order, d.name`
  );
  return rows;
}

export async function getSpecializations(discipline_id?: string) {
  const params: string[] = [];
  const where = discipline_id ? `WHERE s.discipline_id = $1` : '';
  if (discipline_id) params.push(discipline_id);
  const { rows } = await pool.query(
    `SELECT s.*,
            COUNT(DISTINCT c.id)::int AS course_count
     FROM academic_specializations s
     LEFT JOIN ocw_courses c ON c.specialization_id = s.id
     ${where}
     GROUP BY s.id
     ORDER BY s.sort_order, s.name`,
    params
  );
  return rows;
}

export async function getCourses(opts: {
  discipline_id?: string;
  specialization_id?: string;
  level?: string;
  search?: string;
  ids?: string[];        // fetch specific course IDs (for milestone enrichment)
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const params: (string | number | string[])[] = [];
  let p = 1;

  if (opts.ids && opts.ids.length > 0) {
    conditions.push(`c.id = ANY(${p++})`);
    params.push(opts.ids);
  }
  if (opts.discipline_id)      { conditions.push(`c.discipline_id = ${p++}`);      params.push(opts.discipline_id); }
  if (opts.specialization_id)  { conditions.push(`c.specialization_id = ${p++}`);  params.push(opts.specialization_id); }
  if (opts.level)              { conditions.push(`c.level = ${p++}`);              params.push(opts.level); }
  if (opts.search) {
    conditions.push(`(c.title ILIKE ${p} OR c.description ILIKE ${p} OR c.mit_course_num ILIKE ${p})`);
    params.push(`%${opts.search}%`); p++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit  = opts.ids?.length ? Math.max(opts.ids.length, opts.limit ?? 50) : (opts.limit ?? 50);
  const offset = opts.offset ?? 0;

  const { rows } = await pool.query(
    `SELECT c.*,
            d.name AS discipline_name, d.color AS discipline_color,
            s.name AS specialization_name,
            (SELECT array_agg(pr_c.id) FROM ocw_course_prerequisites pr
             JOIN ocw_courses pr_c ON pr_c.id = pr.prereq_id
             WHERE pr.course_id = c.id) AS prerequisite_ids
     FROM ocw_courses c
     JOIN academic_disciplines d ON d.id = c.discipline_id
     LEFT JOIN academic_specializations s ON s.id = c.specialization_id
     ${where}
     ORDER BY c.difficulty, c.mit_course_num
     LIMIT ${p++} OFFSET ${p++}`,
    [...params, limit, offset]
  );
  return rows;
}

export async function getCourse(id: string) {
  const { rows } = await pool.query(
    `SELECT c.*,
            d.name AS discipline_name, d.color AS discipline_color, d.icon AS discipline_icon,
            s.name AS specialization_name, s.description AS specialization_description
     FROM ocw_courses c
     JOIN academic_disciplines d ON d.id = c.discipline_id
     LEFT JOIN academic_specializations s ON s.id = c.specialization_id
     WHERE c.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const course = rows[0];

  const { rows: prereqs } = await pool.query(
    `SELECT c2.id, c2.mit_course_num, c2.title, c2.level, pr.required
     FROM ocw_course_prerequisites pr
     JOIN ocw_courses c2 ON c2.id = pr.prereq_id
     WHERE pr.course_id = $1`,
    [id]
  );
  const { rows: modules } = await pool.query(
    `SELECT * FROM ocw_course_modules WHERE course_id = $1 ORDER BY week, unit, title`,
    [id]
  );
  return { ...course, prerequisites: prereqs, modules };
}

export async function getResearchTopics(discipline_id?: string) {
  const params: string[] = [];
  const where = discipline_id ? `WHERE rt.discipline_id = $1` : '';
  if (discipline_id) params.push(discipline_id);
  const { rows } = await pool.query(
    `SELECT rt.*,
            d.name AS discipline_name, d.color AS discipline_color, d.icon AS discipline_icon,
            s.name AS specialization_name,
            COUNT(DISTINCT rtc.course_id)::int AS course_count
     FROM research_topics rt
     JOIN academic_disciplines d ON d.id = rt.discipline_id
     LEFT JOIN academic_specializations s ON s.id = rt.specialization_id
     LEFT JOIN research_topic_courses rtc ON rtc.research_topic_id = rt.id
     ${where}
     GROUP BY rt.id, d.name, d.color, d.icon, s.name
     ORDER BY rt.sort_order, rt.title`,
    params
  );
  return rows;
}

export async function getResearchTopic(id: string) {
  const { rows } = await pool.query(
    `SELECT rt.*, d.name AS discipline_name, d.color AS discipline_color, d.icon AS discipline_icon
     FROM research_topics rt
     JOIN academic_disciplines d ON d.id = rt.discipline_id
     WHERE rt.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const { rows: courses } = await pool.query(
    `SELECT c.id, c.mit_course_num, c.title, c.level, c.difficulty, c.description,
            rtc.importance,
            d.name AS discipline_name, d.color AS discipline_color
     FROM research_topic_courses rtc
     JOIN ocw_courses c ON c.id = rtc.course_id
     JOIN academic_disciplines d ON d.id = c.discipline_id
     WHERE rtc.research_topic_id = $1
     ORDER BY CASE rtc.importance WHEN 'essential' THEN 1 WHEN 'recommended' THEN 2 ELSE 3 END, c.difficulty`,
    [id]
  );
  return { ...rows[0], courses };
}

export async function getPrerequisiteTree(course_id: string, depth = 0): Promise<any[]> {
  if (depth > 5) return [];
  const { rows } = await pool.query(
    `SELECT c.id, c.mit_course_num, c.title, c.level, c.difficulty, pr.required
     FROM ocw_course_prerequisites pr
     JOIN ocw_courses c ON c.id = pr.prereq_id
     WHERE pr.course_id = $1`,
    [course_id]
  );
  const result = [];
  for (const r of rows) {
    const nested = await getPrerequisiteTree(r.id, depth + 1);
    result.push({ ...r, prerequisites: nested });
  }
  return result;
}

export async function saveResearchProfile(opts: {
  user_email: string;
  interest_text: string;
  discipline_id?: string;
  topic_ids?: string[];
  ai_plan?: object;
}) {
  const { rows } = await pool.query(
    `INSERT INTO student_research_profiles
       (user_email, interest_text, discipline_id, topic_ids, ai_plan)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      opts.user_email,
      opts.interest_text,
      opts.discipline_id ?? null,
      opts.topic_ids ?? [],
      opts.ai_plan ? JSON.stringify(opts.ai_plan) : null,
    ]
  );
  return rows[0];
}

export async function getResearchProfiles(user_email: string) {
  const { rows } = await pool.query(
    `SELECT * FROM student_research_profiles
     WHERE user_email = $1
     ORDER BY created_at DESC`,
    [user_email]
  );
  return rows;
}

export async function isSeeded(): Promise<boolean> {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM academic_disciplines`);
  return (rows[0]?.n ?? 0) > 0;
}
