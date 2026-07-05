/**
 * Forum routes — /api/forum/*
 */
import { Router } from "express";
import { logger } from "../lib/logger.js";
import { kafka } from "../lib/kafkaProducer.js";
import {
  listCategories, listThreads, getThread,
  createThread, listPosts, createPost,
  upvoteThread, upvotePost,
} from "../lib/forumDb.js";

const router = Router();

// GET /api/forum/categories
router.get("/categories", async (_req, res) => {
  try {
    res.json(await listCategories());
  } catch (err) {
    logger.error({ err }, "forum.listCategories");
    res.status(500).json({ error: "Could not load categories" });
  }
});

// GET /api/forum/threads?category=slug&limit=30&offset=0
router.get("/threads", async (req, res) => {
  try {
    const { category, limit = "30", offset = "0" } = req.query as Record<string, string>;
    const threads = await listThreads(category, parseInt(limit), parseInt(offset));
    res.json(threads);
  } catch (err) {
    logger.error({ err }, "forum.listThreads");
    res.status(500).json({ error: "Could not load threads" });
  }
});

// GET /api/forum/threads/:id
router.get("/threads/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid thread id" }); return; }
    const thread = await getThread(id);
    if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
    const posts = await listPosts(thread.id);
    res.json({ thread, posts });
  } catch (err) {
    logger.error({ err }, "forum.getThread");
    res.status(500).json({ error: "Could not load thread" });
  }
});

// POST /api/forum/threads
router.post("/threads", async (req, res) => {
  try {
    const { category_id, title, body, author_name, tags } = req.body as {
      category_id: number;
      title: string;
      body: string;
      author_name?: string;
      tags?: string[];
    };
    if (!category_id || !title?.trim() || !body?.trim()) {
      res.status(400).json({ error: "category_id, title, and body are required" });
      return;
    }
    const thread = await createThread({
      category_id,
      title: title.trim().slice(0, 200),
      body: body.trim().slice(0, 8000),
      author_name: (author_name ?? "Anonymous").slice(0, 60),
      tags: (tags ?? []).slice(0, 5),
    });
    void kafka.studentForumPosted({ thread_id: thread.id, category_id, post_type: 'thread', author_name });
    res.status(201).json(thread);
  } catch (err) {
    logger.error({ err }, "forum.createThread");
    res.status(500).json({ error: "Could not create thread" });
  }
});

// POST /api/forum/threads/:id/reply
router.post("/threads/:id/reply", async (req, res) => {
  try {
    const threadId = parseInt(req.params.id, 10);
    if (isNaN(threadId) || threadId <= 0) { res.status(400).json({ error: "Invalid thread id" }); return; }
    const { body, author_name } = req.body as { body: string; author_name?: string };
    if (!body?.trim()) { res.status(400).json({ error: "body is required" }); return; }
    const post = await createPost({
      thread_id: threadId,
      body: body.trim().slice(0, 8000),
      author_name: (author_name ?? "Anonymous").slice(0, 60),
    });
    void kafka.studentForumPosted({ thread_id: threadId, category_id: 0, post_type: 'reply', author_name });
    res.status(201).json(post);
  } catch (err) {
    logger.error({ err }, "forum.createPost");
    res.status(500).json({ error: "Could not post reply" });
  }
});

// POST /api/forum/threads/:id/upvote
router.post("/threads/:id/upvote", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
    const upvotes = await upvoteThread(id);
    res.json({ upvotes });
  } catch (err) {
    logger.error({ err }, "forum.upvoteThread");
    res.status(500).json({ error: "Could not upvote" });
  }
});

// POST /api/forum/posts/:id/upvote
router.post("/posts/:id/upvote", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
    const upvotes = await upvotePost(id);
    res.json({ upvotes });
  } catch (err) {
    logger.error({ err }, "forum.upvotePost");
    res.status(500).json({ error: "Could not upvote" });
  }
});

export default router;
