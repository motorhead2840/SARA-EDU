/**
 * Forum DB — schema, seed, and query helpers
 * Tables: forum_categories, forum_threads, forum_posts
 */
import { pool } from "../db.js";

// ─── Schema ───────────────────────────────────────────────────────────────────

export async function initForumSchema(): Promise<void> {
  const db = pool;
  await db.query(`
    CREATE TABLE IF NOT EXISTS forum_categories (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      slug        TEXT NOT NULL UNIQUE,
      description TEXT,
      icon        TEXT DEFAULT '◈',
      color       TEXT DEFAULT 'system',
      thread_count INT DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS forum_threads (
      id          SERIAL PRIMARY KEY,
      category_id INT REFERENCES forum_categories(id) ON DELETE SET NULL,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT 'Anonymous',
      tags        TEXT[] DEFAULT '{}',
      upvotes     INT DEFAULT 0,
      view_count  INT DEFAULT 0,
      reply_count INT DEFAULT 0,
      is_pinned   BOOLEAN DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS forum_posts (
      id          SERIAL PRIMARY KEY,
      thread_id   INT REFERENCES forum_threads(id) ON DELETE CASCADE,
      body        TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT 'Anonymous',
      upvotes     INT DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dev_team_members (
      id          SERIAL PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      github_username TEXT,
      signup_method TEXT NOT NULL CHECK (signup_method IN ('github', 'email')),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id);
    CREATE INDEX IF NOT EXISTS idx_forum_threads_created ON forum_threads(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id);
  `);

  await seedCategories();
}

async function seedCategories(): Promise<void> {
  const db = pool;
  
  // Seed our special dev-team category first, in case of a partially or fully seeded DB
  await db.query(
    `INSERT INTO forum_categories (name, slug, description, icon, color)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (slug) DO NOTHING`,
    ["Dev Team Discussions", "dev-team", "Collaborate, share builds, and plan features for SHRI-ACADEMY.", "⚙", "user"]
  );

  const { rows } = await db.query("SELECT COUNT(*) FROM forum_categories");
  if (parseInt(rows[0].count) > 1) return; // count of 1 is just the dev-team category we inserted above

  const cats = [
    { name: "Science & Mathematics", slug: "science-math", description: "Explore the universe through equations and experiments.", icon: "⬡", color: "system" },
    { name: "World Mythology & Ancient Wisdom", slug: "mythology", description: "Deities, epics, and the cosmologies of every civilization.", icon: "◉", color: "mentor" },
    { name: "Coding & Artificial Intelligence", slug: "coding-ai", description: "Explore algorithms, models, and the machines we build.", icon: "▣", color: "user" },
    { name: "Philosophy & Ethics", slug: "philosophy", description: "Questions that outlive every answer ever given.", icon: "◈", color: "system" },
    { name: "Creative Arts & Expression", slug: "creative", description: "Music, writing, design, and making things that matter.", icon: "◎", color: "mentor" },
  ];

  for (const c of cats) {
    await db.query(
      `INSERT INTO forum_categories (name, slug, description, icon, color)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (slug) DO NOTHING`,
      [c.name, c.slug, c.description, c.icon, c.color]
    );
  }
}

// ─── Query helpers ─────────────────────────────────────────────────────────────

export async function listCategories() {
  const db = pool;
  const { rows } = await db.query(`
    SELECT c.*, COUNT(t.id)::int AS thread_count
    FROM forum_categories c
    LEFT JOIN forum_threads t ON t.category_id = c.id
    GROUP BY c.id ORDER BY c.id
  `);
  return rows;
}

export async function listThreads(categorySlug?: string, limit = 30, offset = 0) {
  const db = pool;
  if (categorySlug) {
    const { rows } = await db.query(`
      SELECT t.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
      FROM forum_threads t JOIN forum_categories c ON c.id = t.category_id
      WHERE c.slug = $1
      ORDER BY t.is_pinned DESC, t.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [categorySlug, limit, offset]);
    return rows;
  }
  const { rows } = await db.query(`
    SELECT t.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
    FROM forum_threads t LEFT JOIN forum_categories c ON c.id = t.category_id
    ORDER BY t.is_pinned DESC, t.updated_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  return rows;
}

export async function getThread(id: number) {
  const db = pool;
  await db.query("UPDATE forum_threads SET view_count = view_count + 1 WHERE id = $1", [id]);
  const { rows } = await db.query(`
    SELECT t.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
    FROM forum_threads t LEFT JOIN forum_categories c ON c.id = t.category_id
    WHERE t.id = $1
  `, [id]);
  return rows[0] ?? null;
}

export async function createThread(data: {
  category_id: number;
  title: string;
  body: string;
  author_name: string;
  tags?: string[];
}) {
  const db = pool;
  const { rows } = await db.query(`
    INSERT INTO forum_threads (category_id, title, body, author_name, tags)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [data.category_id, data.title, data.body, data.author_name, data.tags ?? []]);
  return rows[0];
}

export async function listPosts(threadId: number) {
  const db = pool;
  const { rows } = await db.query(`
    SELECT * FROM forum_posts WHERE thread_id = $1 ORDER BY created_at ASC
  `, [threadId]);
  return rows;
}

export async function createPost(data: {
  thread_id: number;
  body: string;
  author_name: string;
}) {
  const db = pool;
  const { rows } = await db.query(`
    INSERT INTO forum_posts (thread_id, body, author_name) VALUES ($1, $2, $3) RETURNING *
  `, [data.thread_id, data.body, data.author_name]);
  await db.query(
    "UPDATE forum_threads SET reply_count = reply_count + 1, updated_at = NOW() WHERE id = $1",
    [data.thread_id]
  );
  return rows[0];
}

export async function upvoteThread(id: number) {
  const db = pool;
  const { rows } = await db.query(
    "UPDATE forum_threads SET upvotes = upvotes + 1 WHERE id = $1 RETURNING upvotes",
    [id]
  );
  return rows[0]?.upvotes ?? 0;
}

export async function upvotePost(id: number) {
  const db = pool;
  const { rows } = await db.query(
    "UPDATE forum_posts SET upvotes = upvotes + 1 WHERE id = $1 RETURNING upvotes",
    [id]
  );
  return rows[0]?.upvotes ?? 0;
}

export async function createDevTeamMember(email: string, githubUsername: string | null, signupMethod: 'github' | 'email') {
  const db = pool;
  const { rows } = await db.query(`
    INSERT INTO dev_team_members (email, github_username, signup_method)
    VALUES ($1, $2, $3)
    ON CONFLICT (email) DO UPDATE SET github_username = $2, signup_method = $3
    RETURNING *
  `, [email, githubUsername, signupMethod]);
  return rows[0];
}

export async function getDevTeamMemberByEmail(email: string) {
  const db = pool;
  const { rows } = await db.query(
    "SELECT * FROM dev_team_members WHERE email = $1", [email]
  );
  return rows[0] ?? null;
}
