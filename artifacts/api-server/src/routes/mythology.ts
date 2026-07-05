/**
 * World Mythology Video Channel — /api/mythology/*
 * Stories generated/narrated by NVIDIA Nemotron (NIM API)
 * Cosmos-style world foundation content for each mythology tradition
 */
import { Router } from "express";
import { logger } from "../lib/logger.js";
import { kafka } from "../lib/kafkaProducer.js";

const router = Router();
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

// ─── Static episode catalog ──────────────────────────────────────────────────
// Each "episode" is a mythology story unit. Narratives are generated on demand
// by Nemotron; the catalog provides metadata + cover metadata.

export const EPISODE_CATALOG = [
  { id: "greek-01", tradition: "Greek",    title: "The Forge of Hephaestus",      duration: "18 min", era: "Classical",   tags: ["olympians", "craft", "fire"],       cover_accent: "system" },
  { id: "greek-02", tradition: "Greek",    title: "Persephone and the Iron Gate",  duration: "22 min", era: "Classical",   tags: ["underworld", "seasons", "grief"],   cover_accent: "mentor" },
  { id: "hindu-01", tradition: "Hindu",    title: "Samudra Manthan — The Churning",duration: "31 min", era: "Vedic",       tags: ["creation", "amrita", "cosmic"],     cover_accent: "user"   },
  { id: "hindu-02", tradition: "Hindu",    title: "Arjuna at the Crossroads",      duration: "26 min", era: "Epic",        tags: ["dharma", "war", "Gita"],            cover_accent: "system" },
  { id: "norse-01", tradition: "Norse",    title: "Yggdrasil — The World Tree",    duration: "19 min", era: "Viking Age",  tags: ["cosmos", "tree", "fate"],           cover_accent: "mentor" },
  { id: "norse-02", tradition: "Norse",    title: "Ragnarök — The Last Winter",    duration: "28 min", era: "Viking Age",  tags: ["apocalypse", "gods", "twilight"],   cover_accent: "user"   },
  { id: "egyptian-01", tradition: "Egyptian", title: "Ra and the Serpent Apophis",  duration: "21 min", era: "New Kingdom", tags: ["sun", "chaos", "underworld"],     cover_accent: "user"   },
  { id: "egyptian-02", tradition: "Egyptian", title: "Isis and the Broken God",     duration: "25 min", era: "Old Kingdom", tags: ["resurrection", "love", "magic"],  cover_accent: "mentor" },
  { id: "aztec-01",  tradition: "Aztec",   title: "Quetzalcoatl's Long Return",    duration: "23 min", era: "Post-Classic",tags: ["feathered-serpent", "return", "prophecy"], cover_accent: "system" },
  { id: "aztec-02",  tradition: "Aztec",   title: "The Five Suns of Creation",     duration: "30 min", era: "Post-Classic",tags: ["cosmos", "sacrifice", "cycles"],   cover_accent: "user"   },
  { id: "japanese-01",tradition: "Japanese","title": "Izanagi and the River of Death","duration": "20 min","era": "Kojiki",tags: ["creation", "death", "purification"],"cover_accent": "system"},
  { id: "celtic-01", tradition: "Celtic",  title: "Cú Chulainn's Final Stand",     duration: "27 min", era: "Iron Age",    tags: ["hero", "war", "fate"],              cover_accent: "mentor" },
];

// ─── NVIDIA NIM helper ────────────────────────────────────────────────────────

async function generateNarrative(tradition: string, title: string): Promise<string> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not configured");

  const resp = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      messages: [
        {
          role: "system",
          content: `You are a world mythology scholar and storyteller creating rich, accurate, 
beautifully written episode narratives for an educational mythology channel called COSMOS_LORE. 
Write in an immersive, scholarly yet accessible tone. Use vivid descriptions of the cosmic and 
physical world. Ground every narrative in real mythological sources.`,
        },
        {
          role: "user",
          content: `Write a detailed, immersive episode narrative for the ${tradition} mythology episode titled "${title}".
          
Structure your response as:
**ORIGIN** — 2-3 sentences on the historical/cultural context
**THE STORY** — the core narrative, 300-400 words, vivid and accurate
**COSMIC SIGNIFICANCE** — 2-3 sentences on what this myth explains about the universe or human nature
**CHARACTERS** — list 3-5 key figures with one-line descriptions
**CONNECTIONS** — 1-2 sentences linking this myth to similar stories in other traditions`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!resp.ok) throw new Error(`NIM error ${resp.status}`);
  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "";
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/mythology/episodes
router.get("/episodes", (req, res) => {
  const { tradition, episode_id } = req.query as { tradition?: string; episode_id?: string };
  const episodes = tradition
    ? EPISODE_CATALOG.filter((e) => e.tradition.toLowerCase() === tradition.toLowerCase())
    : EPISODE_CATALOG;
  // Emit view event when a specific episode is opened
  if (episode_id) {
    const ep = EPISODE_CATALOG.find((e) => e.id === episode_id);
    if (ep) void kafka.studentMythologyViewed({ episode_id: ep.id, tradition: ep.tradition, narrative_requested: false });
  }
  res.json(episodes);
});

// GET /api/mythology/traditions
router.get("/traditions", (_req, res) => {
  const traditions = [...new Set(EPISODE_CATALOG.map((e) => e.tradition))];
  res.json(traditions.map((t) => ({
    name: t,
    count: EPISODE_CATALOG.filter((e) => e.tradition === t).length,
  })));
});

// POST /api/mythology/narrative — generate full episode narrative on demand
router.post("/narrative", async (req, res) => {
  try {
    const { episode_id } = req.body as { episode_id: string };
    const episode = EPISODE_CATALOG.find((e) => e.id === episode_id);
    if (!episode) { res.status(404).json({ error: "Episode not found" }); return; }

    const narrative = await generateNarrative(episode.tradition, episode.title);
    void kafka.studentMythologyViewed({ episode_id: episode.id, tradition: episode.tradition, narrative_requested: true });
    res.json({ episode, narrative });
  } catch (err) {
    logger.error({ err }, "mythology.narrative");
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("NVIDIA_API_KEY")) {
      res.status(503).json({ error: "NVIDIA NIM not configured" });
    } else {
      res.status(502).json({ error: "Narrative generation unavailable" });
    }
  }
});

export default router;
