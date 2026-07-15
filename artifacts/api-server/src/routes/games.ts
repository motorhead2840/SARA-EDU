/**
 * Nemotron-powered interactive games — /api/games/*
 * Uses NVIDIA NIM API (OpenAI-compatible) with nvidia/llama-3.1-nemotron-70b-instruct
 */
import { Router } from "express";
import { logger } from "../lib/logger.js";
import { kafka } from "../lib/kafkaProducer.js";

const router = Router();

const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

type GameType = "quiz" | "riddle" | "myth-match" | "code-challenge";

interface GamePromptConfig {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: string;
}

function buildGamePrompt(type: GameType, topic: string): GamePromptConfig {
  switch (type) {
    case "quiz":
      return {
        systemPrompt: `You are NEMOTRON — an elite AI game engine for Shri Academy students. 
Generate educational multiple-choice quiz questions. Always respond with valid JSON only, no markdown.`,
        userPrompt: `Generate a challenging multiple-choice quiz question about: "${topic}".
Return JSON with this exact shape:
{
  "question": "...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct": "A",
  "explanation": "...",
  "difficulty": "medium",
  "topic": "${topic}"
}`,
        responseSchema: "quiz",
      };

    case "riddle":
      return {
        systemPrompt: `You are NEMOTRON — an AI riddle master for Shri Academy. 
Craft clever educational riddles. Always respond with valid JSON only, no markdown.`,
        userPrompt: `Create an educational riddle related to: "${topic}".
Return JSON with this exact shape:
{
  "riddle": "...",
  "hint": "...",
  "answer": "...",
  "explanation": "...",
  "topic": "${topic}"
}`,
        responseSchema: "riddle",
      };

    case "myth-match":
      return {
        systemPrompt: `You are NEMOTRON — a world mythology expert AI for Shri Academy.
Generate myth-matching game content. Always respond with valid JSON only, no markdown.`,
        userPrompt: `Generate a mythology matching challenge for: "${topic || "world mythologies"}".
Create 4 pairs of mythological figures/symbols and their descriptions.
Return JSON with this exact shape:
{
  "culture": "...",
  "title": "...",
  "pairs": [
    { "id": "1", "term": "Zeus", "match": "King of the Olympian gods, ruler of Mount Olympus" },
    { "id": "2", "term": "...", "match": "..." },
    { "id": "3", "term": "...", "match": "..." },
    { "id": "4", "term": "...", "match": "..." }
  ]
}`,
        responseSchema: "myth-match",
      };

    case "code-challenge":
      return {
        systemPrompt: `You are NEMOTRON — an AI coding challenge engine for Shri Academy.
Generate educational coding puzzles. Always respond with valid JSON only, no markdown.`,
        userPrompt: `Create a beginner-to-intermediate coding challenge about: "${topic || "algorithms"}".
Return JSON with this exact shape:
{
  "title": "...",
  "description": "...",
  "starter_code": "# Write your solution here\ndef solve(...):\n    pass",
  "expected_output": "...",
  "hints": ["hint 1", "hint 2"],
  "topic": "${topic}"
}`,
        responseSchema: "code-challenge",
      };
  }
}

async function callNemotron(system: string, user: string): Promise<string> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY is not configured");

  const isOpenAI = key.startsWith("sk-");
  const url = isOpenAI ? "https://api.openai.com/v1/chat/completions" : `${NVIDIA_BASE}/chat/completions`;
  const model = isOpenAI ? "gpt-4o" : "nvidia/llama-3.1-nemotron-70b-instruct";

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
      max_tokens: 1024,
      top_p: 0.9,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`NVIDIA NIM error ${resp.status}: ${body}`);
  }

  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "";
}

function parseJsonContent(raw: string): unknown {
  // Strip markdown code fences if present
  let stripped = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  // Find the first { or [ and trim any preamble text the model may have added
  const jsonStart = stripped.search(/[{[]/);
  if (jsonStart > 0) stripped = stripped.slice(jsonStart);
  // Find the last } or ] and trim trailing text
  const jsonEnd = Math.max(stripped.lastIndexOf("}"), stripped.lastIndexOf("]"));
  if (jsonEnd >= 0 && jsonEnd < stripped.length - 1) stripped = stripped.slice(0, jsonEnd + 1);
  return JSON.parse(stripped);
}

// POST /api/games/generate
router.post("/generate", async (req, res) => {
  try {
    const { type = "quiz", topic = "general knowledge" } = req.body as {
      type?: GameType;
      topic?: string;
    };

    const validTypes: GameType[] = ["quiz", "riddle", "myth-match", "code-challenge"];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
      return;
    }

    const sanitizedTopic = String(topic).slice(0, 120);
    const { systemPrompt, userPrompt, responseSchema } = buildGamePrompt(type, sanitizedTopic);

    const raw = await callNemotron(systemPrompt, userPrompt);
    const gameData = parseJsonContent(raw);

    void kafka.studentGamePlayed({ game_type: type, topic: sanitizedTopic, completed: true });

    res.json({ type, schema: responseSchema, data: gameData });
  } catch (err) {
    logger.error({ err }, "games.generate");
    const msg = err instanceof Error ? err.message : "Game generation failed";
    if (msg.includes("NVIDIA_API_KEY")) {
      res.status(503).json({ error: "NVIDIA NIM not configured — add NVIDIA_API_KEY secret" });
    } else {
      res.status(502).json({ error: "Game engine unavailable. Try again in a moment." });
    }
  }
});

// GET /api/games/types
router.get("/types", (_req, res) => {
  res.json([
    { id: "quiz",           name: "Knowledge Duel",    icon: "⬡", description: "Nemotron fires curriculum questions. Answer fast." },
    { id: "riddle",         name: "Riddle Forge",       icon: "◈", description: "Solve AI-crafted riddles that test lateral thinking." },
    { id: "myth-match",     name: "Myth Match",         icon: "◉", description: "Match mythological figures to their legends." },
    { id: "code-challenge", name: "Code Gauntlet",      icon: "▣", description: "Solve programming challenges generated by Nemotron." },
  ]);
});

export default router;
