import { Router } from 'express';
import {
  getDisciplines, getSpecializations, getCourses, getCourse,
  getResearchTopics, getResearchTopic, getPrerequisiteTree,
  saveResearchProfile, getResearchProfiles,
} from '../lib/academicDb.js';
import { kafka } from '../lib/kafkaProducer.js';
import { searchCourses } from '../lib/opensearchClient.js';

const router = Router();

// ─── Disciplines ──────────────────────────────────────────────────────────────

router.get('/disciplines', async (_req, res): Promise<void> => {
  try {
    const disciplines = await getDisciplines();
    res.json({ disciplines });
  } catch { res.status(500).json({ error: 'Failed to fetch disciplines' }); }
});

// ─── Specializations ──────────────────────────────────────────────────────────

router.get('/specializations', async (req, res): Promise<void> => {
  try {
    const { discipline_id } = req.query as { discipline_id?: string };
    const specializations = await getSpecializations(discipline_id);
    res.json({ specializations });
  } catch { res.status(500).json({ error: 'Failed to fetch specializations' }); }
});

// ─── Courses ──────────────────────────────────────────────────────────────────

router.get('/courses', async (req, res): Promise<void> => {
  try {
    const { discipline_id, specialization_id, level, search, limit, offset } =
      req.query as Record<string, string | undefined>;
    // Support ?ids=6006&ids=1806 or ?ids=6006,1806 for milestone enrichment
    const rawIds = req.query['ids'];
    const ids: string[] | undefined = rawIds
      ? (Array.isArray(rawIds) ? rawIds.map(String) : String(rawIds).split(',').filter(Boolean))
      : undefined;

    // Try OpenSearch for full-text queries; fall back to RDS
    let courses;
    if (search && !ids && process.env.OPENSEARCH_URL) {
      courses = await searchCourses(search, { discipline_id, level, size: limit ? Number(limit) : 20 });
      if (courses.length === 0) {
        // OpenSearch cold or empty — fall back to RDS
        courses = await getCourses({ discipline_id, specialization_id, level, search, ids,
          limit: limit ? Number(limit) : undefined, offset: offset ? Number(offset) : undefined });
      }
    } else {
      courses = await getCourses({ discipline_id, specialization_id, level, search, ids,
        limit: limit ? Number(limit) : undefined, offset: offset ? Number(offset) : undefined });
    }

    // Emit search event if this is a user-facing text search
    if (search) {
      void kafka.academicSearchQuery({
        query: search,
        discipline_id,
        level,
        results_count: courses.length,
        user_email: req.query['user_email'] as string | undefined,
      });
    }

    res.json({ courses });
  } catch { res.status(500).json({ error: 'Failed to fetch courses' }); }
});

router.get('/courses/:id', async (req, res): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const course = await getCourse(id);
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
    // Fire-and-forget Confluent event
    void kafka.academicCourseViewed({
      course_id: course.id,
      mit_course_num: course.mit_course_num,
      discipline_id: course.discipline_id,
      user_email: (req.query['user_email'] as string | undefined),
      session_id: (req.headers['x-session-id'] as string | undefined),
    });
    res.json({ course });
  } catch { res.status(500).json({ error: 'Failed to fetch course' }); }
});

router.get('/courses/:id/prerequisites', async (req, res): Promise<void> => {
  try {
    const tree = await getPrerequisiteTree(req.params['id'] as string);
    res.json({ prerequisites: tree });
  } catch { res.status(500).json({ error: 'Failed to fetch prerequisites' }); }
});

// ─── Research topics ──────────────────────────────────────────────────────────

router.get('/research-topics', async (req, res): Promise<void> => {
  try {
    const { discipline_id } = req.query as { discipline_id?: string };
    const topics = await getResearchTopics(discipline_id);
    res.json({ topics });
  } catch { res.status(500).json({ error: 'Failed to fetch research topics' }); }
});

router.get('/research-topics/:id', async (req, res): Promise<void> => {
  try {
    const topic = await getResearchTopic(req.params['id'] as string);
    if (!topic) { res.status(404).json({ error: 'Research topic not found' }); return; }
    res.json({ topic });
  } catch { res.status(500).json({ error: 'Failed to fetch research topic' }); }
});

// ─── Student research profiles ────────────────────────────────────────────────

router.post('/research-profile', async (req, res): Promise<void> => {
  try {
    const { user_email, interest_text, discipline_id, topic_ids, ai_plan } = req.body as {
      user_email: string; interest_text: string;
      discipline_id?: string; topic_ids?: string[]; ai_plan?: object;
    };
    if (!user_email?.trim() || !interest_text?.trim()) {
      res.status(400).json({ error: 'user_email and interest_text are required' }); return;
    }
    const profile = await saveResearchProfile({ user_email, interest_text, discipline_id, topic_ids, ai_plan });
    void kafka.academicProfileSaved({
      user_email,
      discipline_id,
      topic_ids: topic_ids ?? [],
    });
    res.json({ profile });
  } catch { res.status(500).json({ error: 'Failed to save research profile' }); }
});

// ─── OpenSearch full-text search ──────────────────────────────────────────────
// GET /academic/search?q=quantum&discipline_id=cs&level=graduate
// Falls back to RDS getCourses() when OpenSearch is unavailable.

router.get('/search', async (req, res): Promise<void> => {
  try {
    const { q = '', discipline_id, level } = req.query as Record<string, string | undefined>;
    let courses = await searchCourses(q, { discipline_id, level, size: 30 });
    if (courses.length === 0 && q) {
      courses = await getCourses({ search: q, discipline_id, level, limit: 30 });
    }
    void kafka.academicSearchQuery({
      query: q,
      discipline_id,
      level,
      results_count: courses.length,
      user_email: req.query['user_email'] as string | undefined,
    });
    res.json({ courses, source: process.env.OPENSEARCH_URL ? 'opensearch' : 'rds' });
  } catch { res.status(500).json({ error: 'Search failed' }); }
});

router.get('/research-profile/:email', async (req, res): Promise<void> => {
  try {
    const profiles = await getResearchProfiles(req.params['email'] as string);
    res.json({ profiles });
  } catch { res.status(500).json({ error: 'Failed to fetch research profiles' }); }
});

export default router;
