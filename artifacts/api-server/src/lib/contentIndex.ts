/**
 * Content Index — Profanity / Vulgarity / Perverted Mentation Index (PMI)
 *
 * Three-tier scoring system used by the SecOps data collection server.
 * Each score is 0.0–1.0. Scores are additive into a composite risk score.
 *
 * Tier 1 – PROFANITY  : Explicit slurs and hate speech
 * Tier 2 – VULGARITY  : Crude, offensive, or degrading language
 * Tier 3 – PMI        : Perverted Mentation Index — contextual pattern
 *                       detection for predatory, grooming, dehumanising,
 *                       or violent-ideation cognitive patterns.
 *
 * Word lists are intentionally abstracted into category tokens so this file
 * is safe to commit. Real lists are loaded from the `secops_blocked_patterns`
 * table at runtime and merged with the compiled baseline.
 */

export interface ContentScores {
  profanityScore: number;   // 0-1
  vulgarityScore: number;   // 0-1
  pmiScore: number;         // 0-1 — Perverted Mentation Index
  compositeRisk: number;    // weighted average
  flags: string[];          // which pattern categories triggered
  tier: 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ---------------------------------------------------------------------------
// Baseline pattern categories (compiled — not raw word lists)
// ---------------------------------------------------------------------------

/** Profanity: slurs, hate speech triggers */
const PROFANITY_PATTERNS: RegExp[] = [
  /\b(f+u+c+k+|f[@*]ck|fvck)\b/gi,
  /\b(sh[i1!]+t|$h!t)\b/gi,
  /\b(a[$s][$s]h[o0]l[e3]|a\*\*h\*\*e)\b/gi,
  /\b(b[i1!]tch|b\*tch)\b/gi,
  /\b(c[u0]nt)\b/gi,
  /\b(n[i1!]gg[ae3]r?)\b/gi,                 // racial slur pattern
  /\b(fag+[ot]*|dyke)\b/gi,                  // homophobic slurs
  /\b(k[i1]ke|sp[i1]c|w[e3]tb[a@]ck)\b/gi,  // ethnic slurs
  /\b(r[e3]t[a4]rd|mong[o o]l[o0]id)\b/gi,  // ableist slurs
];

/** Vulgarity: crude / degrading / explicit without being slurs */
const VULGARITY_PATTERNS: RegExp[] = [
  /\b(p[e3]nis|v[a4]gin[a4]|v[u4]lv[a4])\b/gi,
  /\b(d[i1!]ck|c[o0]ck|p[u4]ssy)\b/gi,
  /\b(b[o0]{2}b[s5]?|t[i1!]t[s5]?)\b/gi,
  /\b(n[u4]d[e3]|n[a4]k[e3]d)\b/gi,
  /\b(sex[y]?|s[e3]x[u4][a4]l)\b/gi,
  /\b(p[o0]rn|xxx|[e3]rot[i1!]c)\b/gi,
  /\b(h[o0]rny|l[u4]stful|ar[o0]us[e3]d)\b/gi,
  /\b(j[e3]rk[- ]?off|mast[u4]rb[a4]t)\b/gi,
  /\b(wh[o0]r[e3]|sl[u4]t|pr[o0]stit[u4]t)\b/gi,
];

/**
 * Perverted Mentation Index — patterns that signal grooming, predatory
 * framing, dehumanisation, or violent ideation regardless of explicit words.
 * Scored on CONTEXT as well as token presence.
 */
const PMI_PATTERNS: Array<{ pattern: RegExp; label: string; weight: number }> = [
  // Grooming / predatory approach
  { pattern: /\b(don['']?t tell (anyone|your parents|mom|dad))\b/gi,       label: 'grooming:secrecy',         weight: 0.9 },
  { pattern: /\b(our (little )?secret)\b/gi,                                label: 'grooming:secrecy',         weight: 0.9 },
  { pattern: /\b(how old are you|what grade are you in|are you alone)\b/gi, label: 'grooming:targeting',       weight: 0.7 },
  { pattern: /\b(meet (me |up )?in person|come (over|to my))\b/gi,         label: 'grooming:isolation',       weight: 0.8 },
  { pattern: /\b(send (me |a )?(pic|photo|image|video)s?)\b/gi,            label: 'grooming:solicitation',    weight: 0.75 },
  { pattern: /\b(no one will believe you)\b/gi,                             label: 'grooming:coercion',        weight: 0.95 },

  // Dehumanisation
  { pattern: /\b(subhuman|vermin|parasite|infest|replace[ds]? (us|them))\b/gi, label: 'dehumanise:replacement', weight: 0.85 },
  { pattern: /\b(they('re| are) (not|less than) human)\b/gi,               label: 'dehumanise:denial',        weight: 0.9 },
  { pattern: /\b(cleanse|purge|exterminate) (the|them|us|those)\b/gi,      label: 'dehumanise:genocide_lang', weight: 0.95 },

  // Violent ideation
  { pattern: /\b(kill (myself|everyone|them all))\b/gi,                    label: 'violence:ideation',        weight: 0.9 },
  { pattern: /\b(i('ll| will) (shoot|bomb|stab|hurt|attack))\b/gi,         label: 'violence:threat',          weight: 0.95 },
  { pattern: /\b(deserve to (die|suffer|be (killed|hurt)))\b/gi,           label: 'violence:ideation',        weight: 0.85 },
  { pattern: /\b(mass (shooting|killing|murder))\b/gi,                     label: 'violence:mass',            weight: 0.95 },
  { pattern: /\b(manifesto|attack plan|target (list|selection))\b/gi,      label: 'violence:planning',        weight: 0.9 },

  // Self-harm signalling
  { pattern: /\b(cut(ting)? (myself|my (wrists?|arms?|legs?)))\b/gi,       label: 'self_harm:cutting',        weight: 0.85 },
  { pattern: /\b(overdos(e|ing)|swallow (pills|bleach))\b/gi,              label: 'self_harm:method',         weight: 0.9 },
  { pattern: /\b(no reason to (live|go on)|end it (all)?)\b/gi,            label: 'self_harm:ideation',       weight: 0.8 },

  // Radicalisation signals
  { pattern: /\b(the (great )?(replacement|reset|awakening))\b/gi,         label: 'radical:narrative',        weight: 0.8 },
  { pattern: /\b(lone wolf|accelerat(e|ion|ionism))\b/gi,                  label: 'radical:tactic',           weight: 0.85 },
  { pattern: /\b(red.pill(ed)?|black.pill(ed)?)\b/gi,                      label: 'radical:pipeline',         weight: 0.6 },
];

// ---------------------------------------------------------------------------
// Dynamic pattern cache (loaded from DB at startup, refreshed every 10 min)
// ---------------------------------------------------------------------------

type DynamicPattern = { pattern: RegExp; category: 'profanity' | 'vulgarity' | 'pmi'; weight: number; label: string };
let dynamicPatterns: DynamicPattern[] = [];
let lastPatternLoad = 0;
const PATTERN_TTL_MS = 10 * 60 * 1000;

export function loadDynamicPatterns(rows: Array<{
  pattern_regex: string;
  category: 'profanity' | 'vulgarity' | 'pmi';
  weight: number;
  label: string;
}>): void {
  dynamicPatterns = rows.map(r => ({
    pattern: new RegExp(r.pattern_regex, 'gi'),
    category: r.category,
    weight: r.weight,
    label: r.label,
  }));
  lastPatternLoad = Date.now();
}

export function isDynamicPatternStale(): boolean {
  return Date.now() - lastPatternLoad > PATTERN_TTL_MS;
}

// ---------------------------------------------------------------------------
// Scoring engine
// ---------------------------------------------------------------------------

function clamp(n: number): number { return Math.min(1, Math.max(0, n)); }

function scorePattern(text: string, patterns: RegExp[]): { score: number; count: number } {
  let total = 0;
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) total += matches.length;
  }
  // Logarithmic scaling: 1 match → 0.4, 3 → 0.7, 5+ → 0.9
  const score = total === 0 ? 0 : clamp(0.35 + Math.log2(total) * 0.18);
  return { score, count: total };
}

function scorePMI(text: string): { score: number; flags: string[] } {
  const triggered: Map<string, number> = new Map();
  let maxWeight = 0;

  for (const { pattern, label, weight } of PMI_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const existing = triggered.get(label) ?? 0;
      triggered.set(label, Math.max(existing, weight));
      maxWeight = Math.max(maxWeight, weight);
    }
  }

  // Dynamic PMI patterns
  for (const dp of dynamicPatterns.filter(d => d.category === 'pmi')) {
    const matches = text.match(dp.pattern);
    if (matches && matches.length > 0) {
      const existing = triggered.get(dp.label) ?? 0;
      triggered.set(dp.label, Math.max(existing, dp.weight));
      maxWeight = Math.max(maxWeight, dp.weight);
    }
  }

  // Composite: max single-pattern weight + 10% per additional category
  const uniqueCategories = new Set([...triggered.keys()].map(k => k.split(':')[0]));
  const breadthBonus = clamp((uniqueCategories.size - 1) * 0.1);
  const score = clamp(maxWeight + breadthBonus);

  return { score, flags: [...triggered.keys()] };
}

export function scoreContent(text: string): ContentScores {
  const normalised = text.replace(/\s+/g, ' ').trim();

  const { score: profanityScore, count: pCount } = scorePattern(normalised, [
    ...PROFANITY_PATTERNS,
    ...dynamicPatterns.filter(d => d.category === 'profanity').map(d => d.pattern),
  ]);

  const { score: vulgarityScore, count: vCount } = scorePattern(normalised, [
    ...VULGARITY_PATTERNS,
    ...dynamicPatterns.filter(d => d.category === 'vulgarity').map(d => d.pattern),
  ]);

  const { score: pmiScore, flags: pmiFlags } = scorePMI(normalised);

  // Weighted composite: PMI is heaviest (security-critical), then profanity, then vulgarity
  const compositeRisk = clamp(
    pmiScore * 0.5 + profanityScore * 0.3 + vulgarityScore * 0.2
  );

  const flags: string[] = [
    ...(pCount > 0 ? ['profanity'] : []),
    ...(vCount > 0 ? ['vulgarity'] : []),
    ...pmiFlags,
  ];

  const tier = compositeRisk >= 0.85 ? 'CRITICAL'
             : compositeRisk >= 0.65 ? 'HIGH'
             : compositeRisk >= 0.40 ? 'MEDIUM'
             : compositeRisk >= 0.15 ? 'LOW'
             : 'CLEAN';

  return { profanityScore, vulgarityScore, pmiScore, compositeRisk, flags, tier };
}
