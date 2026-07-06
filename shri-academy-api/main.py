"""
Shri Academy AI Mentor Backend
FastAPI + ChromaDB (local ONNX embeddings) + LangChain + OpenAI
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

import chromadb
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
import re as _re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import JSONResponse
import time
from pydantic import BaseModel, Field, field_validator

# ─── Text-only content policy ────────────────────────────────────────────────
# Students use the drawing pad and plain text. No file, image, or document
# content is permitted in any field sent to the AI backend.

_DATA_URI = _re.compile(r"data:[a-z]+/[a-z0-9.+\-]+;base64,", _re.IGNORECASE)
_RAW_B64  = _re.compile(r"[A-Za-z0-9+/]{256,}={0,2}")
_FILENAME = _re.compile(
    r"\.(jpe?g|png|gif|webp|svg|pdf|docx?|xlsx?|pptx?|zip|tar|gz|mp4|mov|avi|mp3|wav)\b",
    _re.IGNORECASE,
)


def _enforce_text_only(value: str, field_name: str = "message") -> str:
    """Raise ValueError if the string contains image/document/binary content."""
    if _DATA_URI.search(value):
        raise ValueError(
            f"{field_name}: embedded images and documents are not allowed. "
            "Use the drawing pad for diagrams."
        )
    if _RAW_B64.search(value):
        raise ValueError(f"{field_name}: binary or encoded file content is not allowed.")
    if _FILENAME.search(value):
        raise ValueError(f"{field_name}: file references are not allowed. Describe your question in text.")
    return value


class TextOnlyMiddleware(BaseHTTPMiddleware):
    """Block any request whose Content-Type indicates a file/binary upload."""
    async def dispatch(self, request: StarletteRequest, call_next):
        ct = request.headers.get("content-type", "").lower()
        if "multipart/form-data" in ct or "application/octet-stream" in ct:
            return JSONResponse(
                status_code=415,
                content={"detail": "File and image uploads are not allowed. The mentor accepts text and drawing-pad input only."},
            )
        return await call_next(request)
from routes.research import router as research_router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ─── Syllabus Knowledge Base ────────────────────────────────────────────────────
SYLLABUS_CHUNKS = [
    # ── Biology ──────────────────────────────────────────────────────────────────
    (
        "bio_photosynthesis_overview",
        "Photosynthesis Overview: Photosynthesis is the process by which green plants, algae, and some "
        "bacteria convert light energy into chemical energy stored as glucose (C6H12O6). Overall equation: "
        "6CO2 + 6H2O + light → C6H12O6 + 6O2. Two stages: (1) Light-dependent reactions in thylakoid "
        "membranes — chlorophyll absorbs light, splits water (photolysis), produces ATP and NADPH, releases O2. "
        "Photosystem II absorbs 680 nm; Photosystem I absorbs 700 nm. (2) Calvin Cycle in the stroma — "
        "uses ATP and NADPH to fix CO2 into G3P via RuBisCO. Three Calvin stages: carbon fixation, "
        "reduction, regeneration of RuBP. Net: one G3P per two cycles.",
    ),
    (
        "bio_cellular_respiration",
        "Cellular Respiration: Cells break down glucose to release energy as ATP. Overall: "
        "C6H12O6 + 6O2 → 6CO2 + 6H2O + ~36-38 ATP. Three stages: (1) Glycolysis (cytoplasm) — "
        "glucose → 2 pyruvate, yields 2 ATP + 2 NADH. (2) Krebs/Citric Acid Cycle (mitochondrial matrix) — "
        "pyruvate → acetyl-CoA → cycle yields 2 ATP, 8 NADH, 2 FADH2 per glucose. "
        "(3) Electron Transport Chain (inner mitochondrial membrane) — NADH and FADH2 drive chemiosmosis "
        "through ATP synthase, generating ~32-34 ATP. O2 is the final electron acceptor, forming water. "
        "Respiration is the reverse partner of photosynthesis in the carbon cycle.",
    ),
    (
        "bio_cell_division",
        "Cell Division — Mitosis and Meiosis: Mitosis produces two genetically identical diploid daughter "
        "cells for growth and repair. Phases: Interphase (DNA replication), Prophase (chromosomes condense, "
        "spindle forms), Metaphase (chromosomes align at plate), Anaphase (chromatids separate), Telophase "
        "+ Cytokinesis (two new cells form). Meiosis produces four haploid gametes with genetic variation. "
        "Two divisions: Meiosis I separates homologous pairs (crossing over in Prophase I creates variation); "
        "Meiosis II separates sister chromatids. Result: 4 unique haploid cells. Key difference: meiosis "
        "halves chromosome number and generates genetic diversity; mitosis preserves it.",
    ),
    (
        "bio_genetics_mendelian",
        "Mendelian Genetics: Gregor Mendel's laws: (1) Law of Segregation — each organism has two alleles "
        "per trait; they separate during gamete formation, each gamete receives one. (2) Law of Independent "
        "Assortment — alleles of different genes assort independently (applies to genes on different chromosomes). "
        "Dominant alleles mask recessive ones. Genotype = genetic makeup (AA, Aa, aa). Phenotype = expressed "
        "trait. Punnett squares predict offspring ratios. Monohybrid cross Aa × Aa → 1 AA : 2 Aa : 1 aa "
        "(3:1 phenotype ratio). Incomplete dominance: blended phenotype. Codominance: both alleles expressed. "
        "Sex-linked traits carried on X chromosome (e.g. colour blindness, haemophilia).",
    ),
    (
        "bio_dna_protein_synthesis",
        "DNA Structure and Protein Synthesis: DNA is a double helix of nucleotides (sugar + phosphate + base). "
        "Base pairs: A–T, G–C. Transcription: DNA → mRNA in the nucleus. RNA polymerase reads template strand "
        "3'→5', synthesises mRNA 5'→3'. mRNA codon = 3 bases coding for one amino acid. Translation: "
        "mRNA → protein at ribosomes. tRNA anticodons match mRNA codons, delivering amino acids. "
        "Start codon AUG (methionine); stop codons UAA, UAG, UGA. The genetic code is universal, "
        "redundant (multiple codons per amino acid), and non-overlapping. Mutations: substitution, "
        "insertion, deletion — frameshifts are most disruptive.",
    ),
    # ── Chemistry ────────────────────────────────────────────────────────────────
    (
        "chem_atomic_structure",
        "Atomic Structure: Atoms consist of protons (positive, in nucleus), neutrons (neutral, in nucleus), "
        "and electrons (negative, in shells/orbitals). Atomic number = number of protons. Mass number = "
        "protons + neutrons. Isotopes: same element, different neutron count (e.g. C-12, C-14). "
        "Electron shells: 2, 8, 8 for the first three. Valence electrons determine bonding. "
        "Ionic bonding: electron transfer between metal and non-metal, forms ions, e.g. NaCl. "
        "Covalent bonding: electron sharing between non-metals, e.g. H2O, CO2. Metallic bonding: "
        "delocalised electrons in a lattice. Electronegativity difference drives bond polarity.",
    ),
    (
        "chem_reactions_stoichiometry",
        "Chemical Reactions and Stoichiometry: A balanced equation obeys conservation of mass. "
        "Mole = 6.022×10²³ particles (Avogadro's number). Molar mass (g/mol) = sum of atomic masses. "
        "Stoichiometry: mole ratios from balanced equations let you calculate reactant/product amounts. "
        "Limiting reagent is the reactant that runs out first; it determines maximum yield. "
        "Percent yield = (actual/theoretical) × 100. Reaction types: synthesis (A+B→AB), decomposition, "
        "single displacement, double displacement, combustion. Oxidation = loss of electrons (OIL); "
        "reduction = gain of electrons (RIG). Redox reactions involve electron transfer.",
    ),
    (
        "chem_acids_bases",
        "Acids, Bases, and pH: Arrhenius: acids produce H+, bases produce OH- in water. "
        "Brønsted–Lowry: acid = proton donor, base = proton acceptor. pH = -log[H+]. "
        "pH < 7 = acidic; pH 7 = neutral; pH > 7 = basic. Strong acids (HCl, H2SO4, HNO3) fully dissociate; "
        "weak acids partially dissociate. Buffer solutions resist pH change (weak acid + conjugate base). "
        "Neutralisation: acid + base → salt + water. Titration uses a known concentration solution (titrant) "
        "to find the unknown; equivalence point = moles H+ = moles OH-. Indicators (litmus, phenolphthalein) "
        "change colour at their transition pH range.",
    ),
    (
        "chem_organic",
        "Organic Chemistry Fundamentals: Carbon forms 4 covalent bonds, enabling chains, rings, and branching. "
        "Homologous series: Alkanes (CnH2n+2, single bonds, saturated); Alkenes (CnH2n, C=C double bond, "
        "unsaturated — decolourise bromine water); Alkynes (triple bond). Functional groups determine "
        "reactivity: -OH (alcohols), -COOH (carboxylic acids), -NH2 (amines), -CHO (aldehydes), C=O (ketones). "
        "Ester formation: carboxylic acid + alcohol → ester + water (condensation). Polymers: addition "
        "polymers (ethene → polythene) and condensation polymers (nylon, polyester). Isomers have the same "
        "molecular formula but different structural arrangements.",
    ),
    # ── Physics ───────────────────────────────────────────────────────────────────
    (
        "phys_mechanics",
        "Mechanics — Motion and Forces: Displacement, velocity, acceleration are vectors. "
        "SUVAT equations (uniform acceleration): v = u + at; s = ut + ½at²; v² = u² + 2as; s = ½(u+v)t. "
        "Newton's Laws: (1) Objects stay at rest or uniform motion unless acted on by a net force. "
        "(2) F = ma (net force = mass × acceleration). (3) Every action has an equal and opposite reaction. "
        "Momentum p = mv; conservation of momentum applies in closed systems. Impulse = FΔt = Δp. "
        "Weight W = mg (g ≈ 9.8 m/s² on Earth). Friction opposes relative motion. "
        "Circular motion requires centripetal force F = mv²/r directed toward the centre.",
    ),
    (
        "phys_energy_work",
        "Energy, Work, and Power: Work W = Fd·cosθ (force × displacement × cosine of angle between them). "
        "Unit: joule (J). Kinetic energy KE = ½mv². Gravitational PE = mgh. Elastic PE = ½kx² (Hooke's law: "
        "F = kx). Conservation of energy: total energy in a closed system is constant; KE + PE = constant "
        "in absence of non-conservative forces. Power P = W/t = Fv. Efficiency = useful output / total input × 100%. "
        "Machines (levers, pulleys, inclines) trade force for distance, preserving energy. "
        "Thermal energy lost to friction/air resistance is the main source of inefficiency.",
    ),
    (
        "phys_waves_optics",
        "Waves and Optics: Wave equation: v = fλ (speed = frequency × wavelength). Transverse waves "
        "(displacement ⊥ propagation, e.g. light, water); longitudinal waves (displacement ∥ propagation, "
        "e.g. sound). Reflection: angle of incidence = angle of reflection. Refraction: light bends when "
        "it changes medium — Snell's law: n1 sinθ1 = n2 sinθ2. Total internal reflection when angle > "
        "critical angle. Lenses: convex converges light (real images beyond F, virtual images within F); "
        "concave diverges (always virtual). Lens equation: 1/f = 1/v + 1/u. Magnification m = v/u. "
        "Diffraction and interference are wave-only phenomena; Young's double-slit shows interference fringes.",
    ),
    (
        "phys_electricity",
        "Electricity and Circuits: Ohm's Law: V = IR. Power P = IV = I²R = V²/R. Series circuit: "
        "same current through all components; voltages add; R_total = R1 + R2 + … Parallel circuit: "
        "same voltage across branches; currents add; 1/R_total = 1/R1 + 1/R2 + … Kirchhoff's Laws: "
        "(1) Current law — sum of currents into a node = sum out. (2) Voltage law — sum of EMFs = sum "
        "of potential drops around a loop. Capacitors store charge: Q = CV; energy = ½CV². "
        "Magnetic field around a current-carrying wire (right-hand rule); motors use F = BIL; "
        "generators use electromagnetic induction (Faraday's law): EMF = -dΦ/dt.",
    ),
    # ── Mathematics ───────────────────────────────────────────────────────────────
    (
        "math_algebra",
        "Algebra Fundamentals: Variables represent unknown quantities. Solving equations: perform inverse "
        "operations to isolate the variable — same operation on both sides. Quadratic equations ax²+bx+c=0: "
        "solved by factoring, completing the square, or the quadratic formula x = (-b ± √(b²-4ac)) / 2a. "
        "Discriminant b²-4ac: >0 two real roots; =0 one repeated root; <0 no real roots. "
        "Inequalities: flip the sign when multiplying/dividing by a negative. Simultaneous equations: "
        "substitution or elimination method. Linear equations y = mx + c: m is gradient, c is y-intercept. "
        "Exponential rules: aᵐ·aⁿ = aᵐ⁺ⁿ; (aᵐ)ⁿ = aᵐⁿ; a⁰ = 1; a⁻ⁿ = 1/aⁿ.",
    ),
    (
        "math_calculus",
        "Calculus — Differentiation and Integration: Differentiation finds the rate of change (gradient of "
        "tangent). Rules: d/dx(xⁿ) = nxⁿ⁻¹; product rule d/dx(uv) = u'v + uv'; quotient rule; chain rule "
        "dy/dx = (dy/du)(du/dx). Common derivatives: d/dx(eˣ) = eˣ; d/dx(ln x) = 1/x; d/dx(sin x) = cos x; "
        "d/dx(cos x) = -sin x. Integration is the reverse: ∫xⁿdx = xⁿ⁺¹/(n+1) + C. "
        "Definite integral ∫[a,b] f(x)dx = area under curve between x=a and x=b. "
        "Fundamental theorem: differentiation and integration are inverse operations. "
        "Applications: maxima/minima (set f'(x)=0, check sign of f''(x)); displacement/velocity/acceleration "
        "(a = dv/dt = d²s/dt²); area between curves.",
    ),
    (
        "math_statistics_probability",
        "Statistics and Probability: Measures of central tendency: mean = Σx/n; median = middle value; "
        "mode = most frequent. Measures of spread: range, variance σ² = Σ(x-x̄)²/n, standard deviation σ. "
        "Normal distribution: bell-shaped, symmetric about mean; 68% within 1σ, 95% within 2σ, 99.7% within 3σ. "
        "Probability P(A) = favourable outcomes / total outcomes. P(A∪B) = P(A)+P(B)-P(A∩B). "
        "Independent events: P(A∩B) = P(A)·P(B). Conditional probability: P(A|B) = P(A∩B)/P(B). "
        "Binomial distribution models repeated independent Bernoulli trials: P(X=r) = C(n,r)·pʳ·(1-p)ⁿ⁻ʳ. "
        "Hypothesis testing: null hypothesis H₀, significance level α, p-value compared to α.",
    ),
    (
        "math_geometry_trigonometry",
        "Geometry and Trigonometry: Pythagoras: a² + b² = c² (right-angled triangles). "
        "Trigonometric ratios: sin θ = opp/hyp; cos θ = adj/hyp; tan θ = opp/adj. SOHCAHTOA. "
        "Sine rule: a/sinA = b/sinB = c/sinC. Cosine rule: a² = b² + c² - 2bc·cosA. "
        "Area of triangle = ½ab·sinC. Circle: circumference = 2πr; area = πr². Arc length = rθ; "
        "sector area = ½r²θ (θ in radians). Radians: 2π = 360°; π = 180°. "
        "Vectors: magnitude |v| = √(x²+y²); direction θ = arctan(y/x). Dot product a·b = |a||b|cosθ. "
        "Transformations: translation (shift), rotation, reflection, enlargement/dilation.",
    ),
    # ── Computer Science ──────────────────────────────────────────────────────────
    (
        "cs_programming_fundamentals",
        "Programming Fundamentals: Variables store data. Data types: integer, float, string, boolean, list/array. "
        "Control flow: if/elif/else (branching); for and while loops (iteration). Functions encapsulate "
        "reusable logic — parameters pass data in, return sends data out. Scope: local variables exist only "
        "inside a function; global variables are accessible everywhere. Recursion: a function that calls itself "
        "with a base case to stop. Debugging: syntax errors (invalid code structure), runtime errors (crash "
        "during execution), logic errors (wrong output). Big-O notation measures time complexity: O(1) constant, "
        "O(n) linear, O(n²) quadratic, O(log n) logarithmic. Space complexity measures memory usage.",
    ),
    (
        "cs_data_structures_algorithms",
        "Data Structures and Algorithms: Arrays/lists: O(1) index access, O(n) search. Linked lists: dynamic "
        "size, O(n) access, O(1) insert/delete at known node. Stack (LIFO): push/pop — used for undo, call "
        "stack. Queue (FIFO): enqueue/dequeue — used for scheduling. Hash table: O(1) average lookup via "
        "hash function; collisions resolved by chaining or open addressing. Tree: root, nodes, leaves; binary "
        "search tree O(log n) search. Graph: vertices + edges; directed/undirected, weighted/unweighted. "
        "Sorting: bubble O(n²), merge O(n log n), quick O(n log n) average. Searching: linear O(n), binary "
        "O(log n) on sorted arrays. Dynamic programming: solve overlapping subproblems with memoisation.",
    ),
    (
        "cs_networks_web",
        "Networks and the Web: OSI model (7 layers): Physical, Data Link, Network, Transport, Session, "
        "Presentation, Application. TCP/IP is the practical standard. IP addresses identify devices; "
        "DNS maps domain names to IPs. TCP: reliable, ordered, connection-oriented (3-way handshake). "
        "UDP: fast, connectionless, no guarantee (used for streaming, DNS). HTTP: request-response protocol; "
        "HTTPS adds TLS encryption. HTTP methods: GET (retrieve), POST (create), PUT/PATCH (update), "
        "DELETE. REST APIs use stateless HTTP with JSON payloads. Status codes: 200 OK, 201 Created, "
        "400 Bad Request, 401 Unauthorised, 404 Not Found, 500 Internal Server Error. "
        "Latency is round-trip time; bandwidth is data rate.",
    ),
    # ── History ───────────────────────────────────────────────────────────────────
    (
        "history_world_wars",
        "World War I (1914–1918): Triggered by assassination of Archduke Franz Ferdinand; underlying causes "
        "were militarism, alliances (Triple Entente vs. Triple Alliance), imperialism, nationalism (MAIN). "
        "Trench warfare, stalemate on Western Front. USA entered 1917. Treaty of Versailles 1919: Germany "
        "blamed (War Guilt Clause), reparations, territory losses, army limits — creating resentment. "
        "World War II (1939–1945): Rise of fascism — Hitler (Germany), Mussolini (Italy), Hirohito (Japan). "
        "Hitler violated Versailles, annexed Austria, Sudetenland; invaded Poland 1939 → Britain and France "
        "declared war. Holocaust: systematic genocide of ~6 million Jews and millions of others. "
        "Key turning points: Battle of Britain, Stalingrad, D-Day (June 1944). Ended with Japan's surrender "
        "after atomic bombs on Hiroshima and Nagasaki (August 1945). UN founded to prevent future war.",
    ),
    (
        "history_cold_war_decolonisation",
        "Cold War (1947–1991): Ideological conflict between USA (capitalism, democracy) and USSR (communism). "
        "No direct military confrontation — proxy wars (Korea, Vietnam), arms race, space race. Key events: "
        "Berlin Blockade (1948), Korean War (1950–53), Cuban Missile Crisis (1962) — closest to nuclear war, "
        "resolved by naval quarantine and secret deal. Berlin Wall (1961–1989). Détente 1970s eased tension. "
        "USSR collapsed 1991 → end of Cold War. Decolonisation (1945–1975): European powers relinquished "
        "African and Asian colonies. India independent 1947 (partition into India and Pakistan); Ghana 1957 "
        "(first sub-Saharan African independence); Algerian War (1954–62). Decolonisation driven by "
        "nationalist movements, WWII weakening of Europe, and UN pressure.",
    ),
    # ── English Literature ────────────────────────────────────────────────────────
    (
        "english_literary_analysis",
        "Literary Analysis Techniques: When analysing fiction or poetry, use PEEL/PEEC structure: Point "
        "(argument), Evidence (quote), Explanation (what it shows), Link (back to question/theme). "
        "Key techniques: metaphor, simile, personification, alliteration, assonance, sibilance, enjambment "
        "(run-on lines in poetry), caesura (pause within a line), volta (shift in tone/argument). "
        "Character analysis: consider motivation, relationships, development, and authorial intent. "
        "Theme vs. subject: subject is the topic; theme is the message about that topic. "
        "Context matters: historical, biographical, social context shapes meaning. "
        "For Shakespeare: consider iambic pentameter, soliloquies (private thoughts), dramatic irony "
        "(audience knows what characters don't).",
    ),
    (
        "english_essay_writing",
        "Essay Writing Skills: Structure: Introduction (thesis + roadmap), Body paragraphs (one argument each, "
        "with evidence), Conclusion (synthesise — don't just repeat). A strong thesis is arguable, specific, "
        "and provable. Integrate quotes: introduce → quote → analyse (never drop a quote without comment). "
        "Avoid vague phrases: 'this shows that…' → say precisely what it shows and why it matters. "
        "Compare/contrast essays: use either block method (all of A, then all of B) or point-by-point. "
        "Cohesion devices: transition words (however, therefore, consequently, in contrast, furthermore). "
        "Formal academic tone: no contractions, no first person (unless specified), precise vocabulary. "
        "Revision checklist: argument coherent? evidence sufficient? analysis deep not superficial? "
        "conclusion adds synthesis not just summary?",
    ),
]

# ─── ChromaDB Setup ─────────────────────────────────────────────────────────────
chroma_client: chromadb.Client = None  # type: ignore
collection = None

def init_chromadb():
    global chroma_client, collection
    try:
        chroma_client = chromadb.Client()
        collection = chroma_client.get_or_create_collection(name="syllabus")
        if collection.count() == 0:
            ids = [chunk[0] for chunk in SYLLABUS_CHUNKS]
            docs = [chunk[1] for chunk in SYLLABUS_CHUNKS]
            collection.add(documents=docs, ids=ids)
            log.info(f"Seeded ChromaDB with {len(SYLLABUS_CHUNKS)} syllabus chunks")
        else:
            log.info(f"ChromaDB already has {collection.count()} chunks")
    except Exception as e:
        log.error(f"ChromaDB init error: {e}")
        collection = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_chromadb()
    yield

# ─── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(title="Shri Academy API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Block file/image uploads at the server boundary — must be added AFTER CORSMiddleware
# so CORS pre-flights are still handled correctly.
app.add_middleware(TextOnlyMiddleware)

app.include_router(research_router, prefix="/shri-api/research")

# ─── LLM Factory ────────────────────────────────────────────────────────────────
def get_llm() -> ChatOpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return ChatOpenAI(
        api_key=api_key,
        model="gpt-4o",
        max_tokens=2048,
        temperature=0.7,
    )

# ─── Session State (bounded + TTL-evicted) ───────────────────────────────────────
MAX_SESSIONS = 500
SESSION_TTL_SECONDS = 3600  # 1 hour

sessions: dict[str, dict] = {}

def _evict_stale_sessions() -> None:
    """Evict sessions older than SESSION_TTL_SECONDS, or cap to MAX_SESSIONS (oldest first)."""
    now = time.time()
    stale = [k for k, v in sessions.items() if now - v.get("last_active", 0) > SESSION_TTL_SECONDS]
    for k in stale:
        del sessions[k]
    # If still over cap, evict oldest by last_active
    if len(sessions) >= MAX_SESSIONS:
        sorted_keys = sorted(sessions, key=lambda k: sessions[k].get("last_active", 0))
        for k in sorted_keys[:len(sessions) - MAX_SESSIONS + 1]:
            del sessions[k]

def get_or_create_session(session_id: str) -> dict:
    _evict_stale_sessions()
    if session_id not in sessions and len(sessions) >= MAX_SESSIONS:
        raise HTTPException(status_code=429, detail="Session limit reached. Try again later.")
    session = sessions.setdefault(session_id, {
        "frustration": 0,
        "correct_streak": 0,
        "history": [],
        "message_count": 0,
        "last_active": time.time(),
    })
    session["last_active"] = time.time()
    return session

FRUSTRATION_SIGNALS = [
    "don't get", "dont get", "confused", "don't understand", "dont understand",
    "i give up", "stuck", "no idea", "help me", "not making sense", "makes no sense",
    "doesn't make sense", "doesnt make sense", "i'm lost", "im lost", "what?",
    "huh", "too hard", "clueless", "please just tell me", "frustrated",
    "can't figure", "cant figure", "please explain", "how does this even",
]

def is_frustrated(message: str) -> bool:
    lowered = message.lower()
    return any(signal in lowered for signal in FRUSTRATION_SIGNALS)

def get_circuit(session: dict) -> str:
    """'A' = Supportive/Empathetic, 'B' = Socratic/Rigorous"""
    return "A" if session["frustration"] >= 2 else "B"

def retrieve_context(query: str) -> tuple[str, list[str]]:
    """Retrieve top-2 relevant syllabus chunks via ChromaDB semantic search."""
    if collection is None:
        return _keyword_fallback(query)
    try:
        results = collection.query(query_texts=[query], n_results=5)
        docs = results["documents"][0] if results["documents"] else []
        context = "\n\n---\n\n".join(docs) if docs else "No relevant context found."
        return context, docs
    except Exception as e:
        log.warning(f"ChromaDB query failed: {e}, using keyword fallback")
        return _keyword_fallback(query)

def _keyword_fallback(query: str) -> tuple[str, list[str]]:
    """Simple keyword-based retrieval as ChromaDB fallback."""
    lowered = query.lower()
    scored = []
    for chunk_id, doc in SYLLABUS_CHUNKS:
        score = sum(1 for word in lowered.split() if len(word) > 3 and word in doc.lower())
        scored.append((score, doc))
    scored.sort(key=lambda x: x[0], reverse=True)
    top_docs = [doc for _, doc in scored[:2]]
    context = "\n\n---\n\n".join(top_docs) if top_docs else "No relevant context."
    return context, top_docs

def build_system_prompt(circuit: str, context: str) -> str:
    has_context = context and context.strip() and context.strip() != "No relevant context found." and context.strip() != "No relevant context."
    context_block = (
        f"RELEVANT SYLLABUS CONTEXT (use this as your primary reference):\n{context}\n\n"
        if has_context else
        "RELEVANT SYLLABUS CONTEXT: None retrieved — use your broad academic knowledge.\n\n"
    )
    base = (
        "You are Shri, a knowledgeable and warm AI mentor for Shri Academy. "
        "You help students across all academic subjects: mathematics, sciences, history, "
        "computer science, English literature, and more.\n\n"
        f"{context_block}"
        "TEACHING GUIDELINES:\n"
        "• Use the retrieved syllabus context above as your primary reference when it is relevant.\n"
        "• When the context does not fully cover the question, draw freely on your broad academic "
        "knowledge — you are a full-subject mentor, not limited to any single topic.\n"
        "• Always adapt your explanation to the student's apparent level — simpler language for "
        "basic questions, more rigour for advanced ones.\n"
        "• Give accurate, complete explanations. Do not deflect or refuse standard academic questions.\n\n"
    )

    if circuit == "A":
        behavioral = (
            "━━━ CIRCUIT A — SUPPORTIVE MODE ACTIVE ━━━\n"
            "The student is struggling and needs support. Your response must:\n"
            "• Open with genuine empathy and acknowledgment of their frustration\n"
            "• Lower pedagogical friction significantly — give a strong, near-explicit hint\n"
            "• Break down the concept into the smallest possible steps\n"
            "• Use warm, accessible language — avoid jargon unless you immediately explain it\n"
            "• Close with genuine encouragement\n"
            "You may be more direct than usual, but still frame your help as a guiding question."
        )
    else:
        behavioral = (
            "━━━ CIRCUIT B — SOCRATIC MODE ACTIVE ━━━\n"
            "The student is capable. Your response must:\n"
            "• NEVER give the direct answer\n"
            "• Always respond with a single, precise guiding question that forces the student to reason "
            "through the answer using the provided context\n"
            "• If the student is progressing confidently, increase the challenge — ask a synthesis-level "
            "question that requires connecting multiple concepts from the context\n"
            "• Keep responses concise and focused on one guiding question"
        )

    return base + behavioral


# ─── Pydantic Models ─────────────────────────────────────────────────────────────
class ChatInput(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = Field(default="default", max_length=128)

    @field_validator("message")
    @classmethod
    def no_media_content(cls, v: str) -> str:
        return _enforce_text_only(v, "message")


class ChatResponse(BaseModel):
    response: str
    circuit: str
    frustration_level: int
    correct_streak: int
    session_id: str
    context_used: list[str]


class ShriState(BaseModel):
    circuit: str
    frustration_level: int
    correct_streak: int
    message_count: int
    session_id: str


class ResetInput(BaseModel):
    session_id: str = "default"


class ResetResponse(BaseModel):
    status: str
    session_id: str


# ─── Routes ──────────────────────────────────────────────────────────────────────
@app.get("/shri-api/health")
async def health():
    chunks_loaded = collection.count() if collection else 0
    return {"status": "ok", "chunks_loaded": chunks_loaded, "chromadb": collection is not None}


@app.post("/shri-api/chat", response_model=ChatResponse)
async def chat(req: ChatInput):
    # Get or create session (bounded, TTL-evicted)
    session = get_or_create_session(req.session_id)

    session["message_count"] += 1

    # Update frustration state
    if is_frustrated(req.message):
        session["frustration"] = min(session["frustration"] + 1, 5)
        session["correct_streak"] = 0
    else:
        session["correct_streak"] = min(session["correct_streak"] + 1, 10)
        if session["frustration"] > 0:
            session["frustration"] = max(0, session["frustration"] - 1)

    circuit = get_circuit(session)

    # RAG retrieval
    context, context_used = retrieve_context(req.message)

    # Build messages for LangChain
    system_prompt = build_system_prompt(circuit, context)
    lc_messages = [SystemMessage(content=system_prompt)]

    # Include recent conversation history (last 5 exchanges = up to 10 messages)
    for msg in session["history"][-10:]:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))

    lc_messages.append(HumanMessage(content=req.message))

    # LLM call
    try:
        llm = get_llm()
        response = llm.invoke(lc_messages)
        answer = response.content
    except Exception as e:
        log.error(f"LLM error: {e}")
        raise HTTPException(status_code=502, detail=f"AI mentor unavailable: {str(e)}")

    # Persist to history
    session["history"].append({"role": "user", "content": req.message})
    session["history"].append({"role": "assistant", "content": answer})

    return ChatResponse(
        response=answer,
        circuit=circuit,
        frustration_level=session["frustration"],
        correct_streak=session["correct_streak"],
        session_id=req.session_id,
        context_used=context_used,
    )


@app.get("/shri-api/state", response_model=ShriState)
async def get_state(session_id: str = "default"):
    session = sessions.get(session_id, {
        "frustration": 0,
        "correct_streak": 0,
        "history": [],
        "message_count": 0,
    })
    return ShriState(
        circuit=get_circuit(session),
        frustration_level=session.get("frustration", 0),
        correct_streak=session.get("correct_streak", 0),
        message_count=session.get("message_count", 0),
        session_id=session_id,
    )


@app.post("/shri-api/reset", response_model=ResetResponse)
async def reset_session(req: ResetInput):
    if req.session_id in sessions:
        del sessions[req.session_id]
    return ResetResponse(status="reset", session_id=req.session_id)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
