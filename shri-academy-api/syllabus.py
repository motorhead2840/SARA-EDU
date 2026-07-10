"""
syllabus.py — Single source of truth for Shri Academy syllabus knowledge chunks.

Imported by both main.py (ChromaDB seeding) and sagemaker/generate_data.py (training data).
"""

SYLLABUS_CHUNKS: list[tuple[str, str]] = [
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
    (
        "math_number_theory_sequences",
        "Number Theory and Sequences: Prime numbers have exactly two factors (1 and themselves). "
        "Fundamental theorem of arithmetic: every integer > 1 is a unique product of primes. "
        "HCF (highest common factor) via prime factorisation or Euclidean algorithm. "
        "LCM = product / HCF. Arithmetic sequences: aₙ = a + (n-1)d; sum Sₙ = n/2 · (2a + (n-1)d). "
        "Geometric sequences: aₙ = arⁿ⁻¹; sum Sₙ = a(1-rⁿ)/(1-r); infinite sum S∞ = a/(1-r) when |r|<1. "
        "Proof techniques: direct proof, proof by contradiction, proof by induction. "
        "Mathematical induction: (1) base case (show true for n=1), (2) inductive step (assume true for n=k, "
        "prove for n=k+1). Modular arithmetic: a ≡ b (mod n) means n divides (a-b); used in cryptography.",
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
        "search tree O(log n) search on balanced trees. Graph: vertices + edges; directed/undirected, weighted/unweighted. "
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
    # ── Motivational Speech (Admiral William H. McRaven) ──────────────────────────
    (
        "motivational_mcraven_lesson1_make_bed",
        "Lesson 1 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): If you want to change the world, start off "
        "by making your bed. If you make your bed every morning, you will have accomplished the first "
        "task of the day. It will give you a small sense of pride, and it will encourage you to do "
        "another task, and another, and another. By the end of the day, that one task completed will "
        "have turned into many tasks completed. Making your bed will also reinforce the fact that the "
        "little things in life matter. If you can't do the little things right, you will never do "
        "the big things right. And, if by chance you have a miserable day, you will come home to a bed "
        "that is made — that you made — and a made bed gives you encouragement that tomorrow will be better.",
    ),
    (
        "motivational_mcraven_lesson2_find_someone",
        "Lesson 2 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): You can't go it alone. Find someone to help you "
        "paddle. In Navy SEAL training, the importance of teamwork is learned quickly. No one can make "
        "it through training alone, and no one can make it through life alone. You need people who will "
        "help you row, who will support you in times of hardship, and who will be there for you when things "
        "get tough. Find someone to share your journey, respect everyone, and remember that collaboration "
        "and mutual support are essential for overcoming life's greatest challenges.",
    ),
    (
        "motivational_mcraven_lesson3_heart_size",
        "Lesson 3 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): Only the size of your heart matters. During SEAL "
        "training, candidates of all physical shapes, backgrounds, and sizes are tested. What matters is "
        "not your height, your physical strength, or your background, but the size of your heart — your "
        "determination, your willpower, and your spirit. Do not judge people by their appearance or "
        "limitations. True greatness is found in the courage and resilience of the heart. A strong spirit "
        "can overcome any physical limitation.",
    ),
    (
        "motivational_mcraven_lesson4_sugar_cookie",
        "Lesson 4 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): Get over being a sugar cookie and keep moving "
        "forward. In SEAL training, if a student fails a uniform inspection, they must run into the ocean "
        "fully clothed, then roll around in the sand until they are covered in sand from head to toe — "
        "known as a 'sugar cookie'. The student has to stay in that uniform all day. The lesson is that "
        "life is not always fair. Sometimes, no matter how hard you prepare or how well you perform, you "
        "will fail or be treated unfairly. Get over it, accept the setback, and keep moving forward. Do "
        "not complain; keep fighting.",
    ),
    (
        "motivational_mcraven_lesson5_the_circus",
        "Lesson 5 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): Don't be afraid of the circus. In SEAL training, "
        "the 'circus' is extra physical training at the end of the day for those who failed to meet the "
        "daily standards. It is exhausting and designed to make you quit. But those who persevered "
        "through the circuses found that the extra workouts actually made them stronger, faster, and more "
        "resilient. Do not fear failure or extra hardship. Embrace adversity as an opportunity for growth; "
        "persistence through additional challenges makes you stronger.",
    ),
    (
        "motivational_mcraven_lesson6_obstacle_headfirst",
        "Lesson 6 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): Sometimes you have to slide down the obstacle "
        "head first. To break a speed record on a dangerous obstacle course, a student decided to slide "
        "down a high wire head-first instead of feet-first, which was a risky and unconventional move. "
        "It worked. The lesson is that to achieve great things, you must be willing to take calculated "
        "risks, challenge traditional norms, and act decisively in the face of fear. Do not let fear "
        "hold you back from finding bold solutions.",
    ),
    (
        "motivational_mcraven_lesson7_sharks",
        "Lesson 7 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): Don't back down from the sharks. During SEAL "
        "training, candidates must complete a night swim in waters known to have sharks. They are taught "
        "that if a shark begins to circle them, they must stand their ground, not swim away in fear, "
        "and if it attacks, punch it in the snout. The lesson is to confront your fears and difficulties "
        "head-on. Do not let bullies or intimidating challenges scare you into backing down. Show courage "
        "in the face of danger.",
    ),
    (
        "motivational_mcraven_lesson8_darkest_moments",
        "Lesson 8 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): Be your very best in the darkest moments. One of "
        "the toughest SEAL training missions involves swimming underwater beneath a ship to place an "
        "explosive, in total darkness and deafening noise. It is a moment where you can easily become "
        "disoriented and panic. The lesson is that in your life's most difficult, painful, and darkest "
        "moments, you must find your inner strength, maintain composure, and be your absolute best. "
        "Let your discipline and commitment guide you through the darkness.",
    ),
    (
        "motivational_mcraven_lesson9_sing_in_mud",
        "Lesson 9 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): Start singing when you're up to your neck in mud. "
        "During 'Hell Week', candidates are forced to spend hours in freezing, deep mud while instructors "
        "try to pressure them into quitting. In a moment of extreme despair, one candidate began to "
        "sing, and others joined in. The song gave everyone hope, warmth, and the strength to endure. "
        "One person can make a difference and lift an entire group's spirits. Maintain hope and optimism, "
        "and inspire others to keep going when times are toughest.",
    ),
    (
        "motivational_mcraven_lesson10_never_quit",
        "Lesson 10 from Admiral William H. McRaven's 2014 UT Austin Commencement Address "
        "(YouTube Video: https://youtu.be/TBuIGBCF9jc): Don't ever, ever ring the bell. In SEAL training, "
        "there is a brass bell hanging in the center of the compound. If you want to quit, all you have "
        "to do is walk up and ring the bell three times, and you can leave immediately. But if you ring "
        "it, you will regret it for the rest of your life. The ultimate lesson is: never give up. No "
        "matter how hard the challenge, how deep the pain, or how long the struggle, never quit on your "
        "dreams or yourself.",
    ),
]
