/**
 * prerender.mjs
 * Post-build static pre-rendering for SEO.
 *
 * Run after `vite build`. For each public marketing route:
 *   1. Injects per-route <title>, <meta>, <link rel="canonical"> into <head>
 *   2. Adds a visually-hidden static content block (<h1> + body text) into <body>
 *      that is readable by Googlebot and AI crawlers but hidden from sighted users.
 *   3. Writes dist/public/{route}/index.html so the static server serves the
 *      correct pre-rendered HTML for each URL path without any server-side logic.
 *
 * The SPA still hydrates normally — React replaces #root content; the static
 * SEO block lives outside #root and persists invisibly after hydration.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist/public');
const DOMAIN = 'https://sri-learn.ai';

// ── Per-route metadata & static content ──────────────────────────────────────
const ROUTES = [
  {
    path: '/',
    title: 'SRI Learn — AI-Powered Learning DAO | Earn SARA Tokens',
    description:
      "SRI Learn is the world's first AI-powered Learning DAO — earn SARA tokens for peer-reviewed research, verified credentials, and completing learning tracks.",
    h1: "The World's First AI-Powered Learning DAO.",
    body:
      'A decentralized learning protocol where knowledge is incentivised, verified, and owned by learners. Earn SARA tokens by completing courses, publishing peer-reviewed research, and achieving verified credentials on-chain.',
  },
  {
    path: '/pricing',
    title: 'Pricing — SRI Learn | Free, Scholar & Academic Pro Plans',
    description:
      'SRI Learn offers three plans: Free (5 intro courses), Scholar (500+ tracks, AI tutor, certificates), and Academic Pro (SARA rewards, Abhaya safety tools, DAO governance).',
    h1: 'Simple, Transparent Pricing',
    body:
      'Start free with 5 intro courses. Upgrade to Scholar for full access to 500+ learning tracks and an AI tutor. Go Academic Pro for SARA token rewards, DAO governance, and Abhaya AI safety tools.',
  },
  {
    path: '/token',
    title: 'SARA Token — SRI Learn | Earn Crypto Rewards for Learning',
    description:
      'Earn SARA tokens on SRI Learn by completing verified learning milestones, contributing peer-reviewed research, and helping other learners. On-chain credentials, real rewards.',
    h1: 'SARA Rewards Token',
    body:
      'SARA is the native utility token of the SRI Learn ecosystem. Earn rewards for completing lessons, hitting learning targets, acing challenges, and contributing to the community. All milestones verified on-chain.',
  },
  {
    path: '/architecture',
    title: 'Platform Architecture — SRI Learn | Adaptive AI Learning System',
    description:
      "SRI Learn's architecture: continuous learner understanding, adaptive curriculum generation, and Abhaya AI safety protections. Lightning-fast responses with privacy-by-design.",
    h1: 'Platform Architecture',
    body:
      'Built on three pillars: continuous listening and understanding of each learner, adaptive curriculum that evolves in real time, and Abhaya safety protections that ensure every response is helpful, kind, and age-appropriate.',
  },
  {
    path: '/pedagogy',
    title: "Pedagogy — SRI Learn | Talk, Don't Test | Three-Stage Learning",
    description:
      "SRI Learn's pedagogy: three stages — Getting Comfortable, Finding What You Love, Taking the Lead. Our Talk, Don't Test philosophy puts conversation-driven learning before assessment.",
    h1: 'Our Pedagogy',
    body:
      "Our three-stage learning journey builds confidence first, then discovers passions, then develops mastery. We believe in Talk, Don't Test — conversation-driven learning over standardised exams.",
  },
  {
    path: '/blueprint',
    title: 'Blueprint — SRI Learn | Roadmap & Core Values',
    description:
      "SRI Learn's blueprint: core values including Confidence Before Content and personalised learning paths, with a roadmap from 2024 research through 2026 global launch.",
    h1: 'The SRI Learn Blueprint',
    body:
      'From foundational research in 2024 to global launch in 2026 — the SRI Learn blueprint is built on the principle that confidence must come before content. Every learner deserves their own path.',
  },
  {
    path: '/pitch',
    title: 'Investment Pitch — SRI Learn | AI Learning DAO for a Broken System',
    description:
      'SRI Learn addresses the global education crisis and the fast-growing homeschooling market with a safety-first, AI-powered Learning DAO backed by SARA tokenomics.',
    h1: 'The SRI Learn Opportunity',
    body:
      'Global education is broken. SRI Learn addresses the $10T+ education market with a safety-first, AI-powered Learning DAO that rewards learners for genuine knowledge creation, verified credentials, and community contribution.',
  },
  {
    path: '/knowledge-feed',
    title: 'Knowledge Feed — SRI Learn | Merit-Scored Articles by Learners',
    description:
      'Browse peer-reviewed articles written by SRI Learn community members. AI and peer merit scoring rewards high-quality research with SARA tokens.',
    h1: 'Knowledge Feed',
    body:
      'Articles written by SRI learners, merit-scored by AI and peers. High-merit contributions earn SARA rewards. Browse the latest research, insights, and discoveries from the community.',
  },
  {
    path: '/news-feed',
    title: 'News Feed — SRI Learn | Research from 40+ Trusted Sources',
    description:
      'Your personalised learning news feed curated from over 40 trusted sources including Nature, MIT Technology Review, and more — filtered by your interests.',
    h1: 'Your Feed',
    body:
      'Curated from over 40 trusted sources including Nature and MIT Technology Review. Personalised to your learning interests — Neuroscience, AI, Physics, Climate Science, and beyond.',
  },
  {
    path: '/abhaya',
    title: 'Abhaya Safety System — SRI Learn | AI Content Guardian',
    description:
      "The Abhaya Safety Guardian reviews every AI response on SRI Learn to ensure content is helpful, kind, and age-appropriate — built-in protection for every learner.",
    h1: 'Abhaya: The Safety Guardian',
    body:
      "Abhaya is SRI Learn's built-in AI safety system. Every response is reviewed before reaching the learner — ensuring content is always helpful, kind, and age-appropriate, with no exceptions.",
  },
  {
    path: '/choose-path',
    title: 'Choose Your Path — SRI Learn | Academia or Self-Development',
    description:
      'Begin your SRI Learn journey by choosing your community: Academia for institutional research and verified credentials, or Self-Dev for personal growth and practical skills.',
    h1: 'Where do you want to grow?',
    body:
      'Two learning communities, one platform. Choose Academia for institutional research, peer review, and on-chain credential verification — or Self-Dev for personal growth and practical skill building.',
  },
  {
    path: '/brag-sheet',
    title: 'Learner Portfolio — SRI Learn | On-Chain Verified Credentials',
    description:
      'SRI Learn learner portfolios: on-chain verified credentials, merit scores, published research, and SARA token earnings — cryptographically verified and permanently on-chain.',
    h1: 'Verified Learning Portfolio',
    body:
      'Your on-chain academic portfolio: verified credentials, merit scores, published research, and SARA token earnings. All achievements are cryptographically verified and permanently on-chain.',
  },
];

// ── HTML manipulation helpers ─────────────────────────────────────────────────

/** Replace the generic <title> with a route-specific one. */
function injectTitle(html, title) {
  return html.replace(/<title>[^<]*<\/title>/, `<title>${escHtml(title)}</title>`);
}

/** Replace meta name="description" content with route-specific copy. */
function injectDescription(html, description) {
  return html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escAttr(description)}" />`,
  );
}

/**
 * Replace existing og:url and canonical tags with route-specific values.
 * Operates as a replace (not append) to avoid duplicate conflicting tags.
 */
function injectCanonical(html, url, route) {
  const escaped = escAttr(url);

  // Replace og:url — must exist; abort loudly if missing so builds fail visibly
  if (!/<meta property="og:url"[^>]*>/.test(html)) {
    throw new Error(`[prerender] og:url tag not found in HTML shell (route ${route})`);
  }
  html = html.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${escaped}" />`,
  );

  // Replace canonical — must exist
  if (!/<link rel="canonical"[^>]*>/.test(html)) {
    throw new Error(`[prerender] canonical tag not found in HTML shell (route ${route})`);
  }
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${escaped}" />`,
  );

  return html;
}

/**
 * Inject a visually-hidden (sr-only) static content block just before #root.
 * Screen readers and crawlers read it; sighted users do not see it.
 * React hydration leaves it untouched because it lives outside #root.
 */
function injectStaticContent(html, h1, body) {
  const block = `\n    <!-- static SEO content — crawler-visible, visually hidden -->\n    <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">\n      <h1>${escHtml(h1)}</h1>\n      <p>${escHtml(body)}</p>\n    </div>`;
  return html.replace('<div id="root"></div>', `${block}\n    <div id="root"></div>`);
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const baseHtml = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');

  for (const route of ROUTES) {
    const canonicalUrl = `${DOMAIN}${route.path}`;

    let html = baseHtml;
    html = injectTitle(html, route.title);
    html = injectDescription(html, route.description);
    html = injectCanonical(html, canonicalUrl, route.path);
    html = injectStaticContent(html, route.h1, route.body);

    if (route.path === '/') {
      await fs.writeFile(path.join(DIST, 'index.html'), html, 'utf8');
    } else {
      const dir = path.join(DIST, route.path.replace(/^\//, ''));
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'index.html'), html, 'utf8');
    }

    console.log(`  pre-rendered ${route.path}`);
  }

  console.log(`\nPre-rendering complete — ${ROUTES.length} routes.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
