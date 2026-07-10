import { pool } from '../db.js';

// ─────────────────────────────────────────────────────────────────────────────
// MIT OpenCourseWare Academic Seed Data
// Sources: ocw.mit.edu (public, Creative Commons BY-NC-SA 4.0)
// ─────────────────────────────────────────────────────────────────────────────

const disciplines = [
  { id: 'cs',    name: 'Computer Science & Engineering', icon: '💻', color: '#6366f1', sort_order: 1,
    description: 'Algorithms, systems, AI, security, databases, and the theoretical foundations of computing.' },
  { id: 'math',  name: 'Mathematics', icon: '∑', color: '#0ea5e9', sort_order: 2,
    description: 'Pure and applied mathematics: analysis, algebra, topology, probability, and combinatorics.' },
  { id: 'phys',  name: 'Physics', icon: '⚛', color: '#f59e0b', sort_order: 3,
    description: 'Classical mechanics, electromagnetism, quantum mechanics, statistical physics, and condensed matter.' },
  { id: 'bio',   name: 'Biology & Life Sciences', icon: '🧬', color: '#10b981', sort_order: 4,
    description: 'Molecular biology, genetics, biochemistry, cell biology, and modern biotechnology.' },
  { id: 'neuro', name: 'Neuroscience & Cognitive Science', icon: '🧠', color: '#ec4899', sort_order: 5,
    description: 'Structure and function of the nervous system, computational models of cognition, and neural engineering.' },
  { id: 'econ',  name: 'Economics & Statistics', icon: '📈', color: '#f97316', sort_order: 6,
    description: 'Micro and macroeconomics, econometrics, causal inference, and quantitative finance.' },
  { id: 'chem',  name: 'Chemistry', icon: '⚗', color: '#8b5cf6', sort_order: 7,
    description: 'Organic, inorganic, physical, and analytical chemistry with applications to materials and medicine.' },
  { id: 'eng',   name: 'Engineering (Cross-disciplinary)', icon: '⚙', color: '#64748b', sort_order: 8,
    description: 'Circuits, signal processing, control systems, computer architecture, and systems engineering.' },
];

const specializations = [
  // CS
  { id: 'cs-algo',    discipline_id: 'cs', sort_order: 1, name: 'Algorithms & Theory',
    description: 'Design, analysis and complexity of algorithms. Automata, computability, and computational complexity.',
    research_potential: 'Open problems in P vs NP, streaming algorithms, fine-grained complexity, parameterized complexity.' },
  { id: 'cs-ml',      discipline_id: 'cs', sort_order: 2, name: 'Machine Learning & AI',
    description: 'Supervised/unsupervised learning, deep learning, reinforcement learning, probabilistic reasoning.',
    research_potential: 'AI safety, interpretability, foundation models, sample efficiency, causal ML.' },
  { id: 'cs-sys',     discipline_id: 'cs', sort_order: 3, name: 'Systems & Networks',
    description: 'Operating systems, distributed systems, computer networks, and high-performance computing.',
    research_potential: 'Serverless architectures, consensus protocols, network measurement, hardware-software co-design.' },
  { id: 'cs-sec',     discipline_id: 'cs', sort_order: 4, name: 'Security & Cryptography',
    description: 'Threat models, cryptographic protocols, formal verification, and applied security.',
    research_potential: 'Post-quantum cryptography, secure computation (MPC/FHE), privacy-preserving ML, zero-knowledge proofs.' },
  { id: 'cs-db',      discipline_id: 'cs', sort_order: 5, name: 'Databases & Data Systems',
    description: 'Relational algebra, query optimisation, transaction processing, and large-scale data management.',
    research_potential: 'Learned query optimisers, streaming databases, vector databases for AI workloads.' },
  { id: 'cs-lang',    discipline_id: 'cs', sort_order: 6, name: 'Programming Languages & Compilers',
    description: 'Type theory, formal semantics, compiler construction, and program analysis.',
    research_potential: 'Dependent types, effect systems, verified compilation, language-based security.' },
  // Math
  { id: 'math-anal',  discipline_id: 'math', sort_order: 1, name: 'Analysis & Topology',
    description: 'Real and complex analysis, functional analysis, differential topology, and geometric analysis.',
    research_potential: 'Geometric flows, spectral theory, harmonic analysis on manifolds.' },
  { id: 'math-alg',   discipline_id: 'math', sort_order: 2, name: 'Algebra & Number Theory',
    description: 'Group theory, ring theory, Galois theory, algebraic number theory, and arithmetic geometry.',
    research_potential: 'Langlands programme, elliptic curves, representation theory, p-adic analysis.' },
  { id: 'math-prob',  discipline_id: 'math', sort_order: 3, name: 'Probability & Statistics',
    description: 'Measure-theoretic probability, stochastic processes, statistical inference, and information theory.',
    research_potential: 'High-dimensional statistics, random matrix theory, Bayesian nonparametrics.' },
  { id: 'math-num',   discipline_id: 'math', sort_order: 4, name: 'Numerical Methods & Applied Math',
    description: 'Numerical linear algebra, PDEs, optimisation, and scientific computing.',
    research_potential: 'Neural PDE solvers, randomised linear algebra, structure-preserving integrators.' },
  { id: 'math-comb',  discipline_id: 'math', sort_order: 5, name: 'Combinatorics & Discrete Math',
    description: 'Graph theory, enumerative combinatorics, extremal combinatorics, and coding theory.',
    research_potential: 'Algebraic combinatorics, additive combinatorics, Ramsey theory.' },
  // Physics
  { id: 'phys-qm',    discipline_id: 'phys', sort_order: 1, name: 'Quantum Mechanics & QFT',
    description: 'Non-relativistic and relativistic quantum mechanics, quantum field theory, and quantum optics.',
    research_potential: 'Quantum gravity, topological phases, quantum chaos, many-body localization.' },
  { id: 'phys-cm',    discipline_id: 'phys', sort_order: 2, name: 'Condensed Matter & Materials',
    description: 'Band theory, superconductivity, topological insulators, and strongly correlated systems.',
    research_potential: 'High-Tc superconductors, Moiré physics, quantum spin liquids, twistronics.' },
  { id: 'phys-stat',  discipline_id: 'phys', sort_order: 3, name: 'Statistical & Computational Physics',
    description: 'Equilibrium and non-equilibrium statistical mechanics, Monte Carlo, and molecular dynamics.',
    research_potential: 'Machine learning for physics, active matter, far-from-equilibrium systems.' },
  // Biology
  { id: 'bio-mol',    discipline_id: 'bio', sort_order: 1, name: 'Molecular Biology & Genetics',
    description: 'DNA replication, transcription, translation, gene regulation, and CRISPR-based editing.',
    research_potential: 'Base editing, epigenomics, RNA therapeutics, single-cell sequencing.' },
  { id: 'bio-comp',   discipline_id: 'bio', sort_order: 2, name: 'Computational Biology & Bioinformatics',
    description: 'Sequence analysis, structural bioinformatics, systems biology, and genomics pipelines.',
    research_potential: 'Protein structure prediction (AlphaFold extensions), multi-omics integration, drug target identification.' },
  // Neuroscience
  { id: 'neuro-sys',  discipline_id: 'neuro', sort_order: 1, name: 'Systems & Computational Neuroscience',
    description: 'Neural coding, network models, sensory processing, and reinforcement learning in brains.',
    research_potential: 'Connectomics, brain-computer interfaces, neuromorphic computing.' },
  { id: 'neuro-cog',  discipline_id: 'neuro', sort_order: 2, name: 'Cognitive Science & Psychology',
    description: 'Memory, perception, language, decision-making, and their neural substrates.',
    research_potential: 'Computational psychiatry, language models and cognition, embodied AI.' },
  // Economics
  { id: 'econ-micro', discipline_id: 'econ', sort_order: 1, name: 'Microeconomics & Game Theory',
    description: 'Consumer theory, market design, mechanism design, and strategic behaviour.',
    research_potential: 'Algorithmic mechanism design, platform economics, behavioural economics.' },
  { id: 'econ-stats', discipline_id: 'econ', sort_order: 2, name: 'Econometrics & Causal Inference',
    description: 'Regression, instrumental variables, difference-in-differences, and natural experiments.',
    research_potential: 'Double ML, synthetic control, policy evaluation with administrative data.' },
  // Chemistry
  { id: 'chem-org',   discipline_id: 'chem', sort_order: 1, name: 'Organic & Medicinal Chemistry',
    description: 'Organic reaction mechanisms, synthesis, natural products, and drug design.',
    research_potential: 'AI-guided synthesis planning, flow chemistry, photocatalysis.' },
  { id: 'chem-phys',  discipline_id: 'chem', sort_order: 2, name: 'Physical & Computational Chemistry',
    description: 'Thermodynamics, kinetics, quantum chemistry, and molecular simulation.',
    research_potential: 'ML force fields, free energy methods, photochemistry with ML.' },
  // Engineering
  { id: 'eng-arch',   discipline_id: 'eng', sort_order: 1, name: 'Computer Architecture & Digital Systems',
    description: 'Processor design, memory hierarchies, pipelining, and digital logic.',
    research_potential: 'Domain-specific accelerators, neuromorphic chips, in-memory computing.' },
  { id: 'eng-sig',    discipline_id: 'eng', sort_order: 2, name: 'Signal Processing & Control',
    description: 'Fourier analysis, filter design, feedback control, and state-space methods.',
    research_potential: 'Learning-based control, compressive sensing, quantum signal processing.' },
];

// ─── Courses ─────────────────────────────────────────────────────────────────

const courses: Array<{
  id: string; mit_course_num: string; title: string; description: string;
  level: string; discipline_id: string; specialization_id: string;
  url: string; semester: string; year: number; instructors: string[];
  topics: string[]; resource_types: string[]; units: number;
  hours_per_week: number; difficulty: number;
}> = [
  // ── Computer Science: Foundations ─────────────────────────────────────────
  { id:'6042',  mit_course_num:'6.042J', title:'Mathematics for Computer Science',
    description:'Elementary discrete mathematics for computer science and engineering. Topics: sets, relations, graph theory, formal logic, number theory, and probability.',
    level:'undergraduate', discipline_id:'cs', specialization_id:'cs-algo',
    url:'https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/',
    semester:'Spring', year:2015, instructors:['Prof. Albert Meyer','Prof. Adam Chlipala'],
    topics:['Discrete Mathematics','Logic','Graph Theory','Probability','Number Theory'],
    resource_types:['Lecture Notes','Problem Sets','Problem Set Solutions'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'6006',  mit_course_num:'6.006', title:'Introduction to Algorithms',
    description:'Mathematical modelling of computational problems, common algorithms, algorithmic paradigms, and data structures. Emphasises relationship between algorithms and programming; introduces basic performance measures.',
    level:'undergraduate', discipline_id:'cs', specialization_id:'cs-algo',
    url:'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/',
    semester:'Spring', year:2020, instructors:['Prof. Erik Demaine','Dr. Jason Ku','Prof. Justin Solomon'],
    topics:['Sorting','Hashing','Graphs','Shortest Paths','Dynamic Programming','Complexity'],
    resource_types:['Lecture Notes','Lecture Videos','Problem Sets','Exams'],
    units:12, hours_per_week:14, difficulty:3 },

  { id:'6046',  mit_course_num:'6.046J', title:'Design and Analysis of Algorithms',
    description:'Techniques for design and analysis of efficient algorithms: divide-and-conquer, randomisation, dynamic programming, greedy method, network flow, and NP-completeness.',
    level:'undergraduate', discipline_id:'cs', specialization_id:'cs-algo',
    url:'https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/',
    semester:'Spring', year:2015, instructors:['Prof. Erik Demaine','Prof. Srini Devadas','Prof. Nancy Lynch'],
    topics:['Divide and Conquer','Randomised Algorithms','Network Flow','NP-Completeness','Linear Programming'],
    resource_types:['Lecture Notes','Lecture Videos','Problem Sets','Recitation Videos'],
    units:12, hours_per_week:16, difficulty:4 },

  { id:'6854',  mit_course_num:'6.854J', title:'Advanced Algorithms',
    description:'Graduate-level treatment of advanced algorithmic techniques: amortised analysis, approximation algorithms, online algorithms, parallel algorithms, and streaming.',
    level:'graduate', discipline_id:'cs', specialization_id:'cs-algo',
    url:'https://ocw.mit.edu/courses/6-854j-advanced-algorithms-fall-2008/',
    semester:'Fall', year:2008, instructors:['Prof. David Karger'],
    topics:['Amortised Analysis','Approximation Algorithms','Online Algorithms','Parallel Algorithms','Streaming'],
    resource_types:['Lecture Notes','Problem Sets','Readings'],
    units:12, hours_per_week:18, difficulty:5 },

  { id:'18404', mit_course_num:'18.404J', title:'Theory of Computation',
    description:'Automata theory, computability, and computational complexity. Regular and context-free languages, decidability, Turing machines, and complexity classes P, NP, PSPACE.',
    level:'undergraduate', discipline_id:'cs', specialization_id:'cs-algo',
    url:'https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/',
    semester:'Fall', year:2020, instructors:['Prof. Michael Sipser'],
    topics:['Finite Automata','Context-Free Grammars','Turing Machines','Decidability','P vs NP','PSPACE'],
    resource_types:['Lecture Videos','Problem Sets','Exams'],
    units:12, hours_per_week:14, difficulty:4 },

  // ── CS: Machine Learning & AI ──────────────────────────────────────────────
  { id:'6034',  mit_course_num:'6.034', title:'Artificial Intelligence',
    description:'Broad introduction to AI: rule-based systems, constraint propagation, learning, neural nets, genetics-based methods, and probabilistic inference.',
    level:'undergraduate', discipline_id:'cs', specialization_id:'cs-ml',
    url:'https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/',
    semester:'Fall', year:2010, instructors:['Patrick Henry Winston'],
    topics:['Search','Knowledge Representation','Machine Learning','Neural Networks','Genetic Algorithms','Reasoning'],
    resource_types:['Lecture Videos','Problem Sets','Programming Assignments'],
    units:12, hours_per_week:12, difficulty:3 },

  { id:'6036',  mit_course_num:'6.036', title:'Introduction to Machine Learning',
    description:'Principles, algorithms, and applications of ML: regression, classification, neural networks, and unsupervised learning, from the point of view of modelling and prediction.',
    level:'undergraduate', discipline_id:'cs', specialization_id:'cs-ml',
    url:'https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/',
    semester:'Fall', year:2020, instructors:['Dr. Leslie Kaelbling','Dr. Tomás Lozano-Pérez'],
    topics:['Supervised Learning','Neural Networks','Deep Learning','Unsupervised Learning','Reinforcement Learning'],
    resource_types:['Lecture Notes','Lecture Videos','Problem Sets','Programming Assignments'],
    units:12, hours_per_week:14, difficulty:3 },

  { id:'6867',  mit_course_num:'6.867', title:'Machine Learning (Graduate)',
    description:'Graduate introduction to ML theory and methods. Covers statistical learning theory, kernel methods, support vector machines, graphical models, and Bayesian approaches.',
    level:'graduate', discipline_id:'cs', specialization_id:'cs-ml',
    url:'https://ocw.mit.edu/courses/6-867-machine-learning-fall-2006/',
    semester:'Fall', year:2006, instructors:['Prof. Tommi Jaakkola','Prof. Regina Barzilay'],
    topics:['Statistical Learning Theory','Kernel Methods','SVMs','Graphical Models','EM Algorithm','MCMC'],
    resource_types:['Lecture Notes','Problem Sets','Readings'],
    units:12, hours_per_week:18, difficulty:5 },

  { id:'6s897', mit_course_num:'6.S897', title:'Machine Learning for Healthcare',
    description:'Introduction to ML in healthcare: clinical data types, risk stratification, disease progression modelling, clinical NLP, and ethical considerations.',
    level:'graduate', discipline_id:'cs', specialization_id:'cs-ml',
    url:'https://ocw.mit.edu/courses/6-s897-machine-learning-for-healthcare-spring-2019/',
    semester:'Spring', year:2019, instructors:['Prof. Peter Szolovits','Prof. David Sontag'],
    topics:['Clinical Data','EHR Mining','Survival Analysis','Clinical NLP','Reinforcement Learning for Health','Fairness'],
    resource_types:['Lecture Videos','Lecture Notes','Readings'],
    units:12, hours_per_week:16, difficulty:4 },

  // ── CS: Systems ────────────────────────────────────────────────────────────
  { id:'6004',  mit_course_num:'6.004', title:'Computation Structures',
    description:'Architecture of digital systems: combinational and sequential logic, finite-state machines, pipelining, caches, virtual memory, and OS support.',
    level:'undergraduate', discipline_id:'cs', specialization_id:'cs-sys',
    url:'https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/',
    semester:'Spring', year:2017, instructors:['Prof. Silvina Hanono Wachman','Prof. Chris Terman'],
    topics:['Digital Logic','Finite State Machines','Assembly Language','Pipelining','Caches','Virtual Memory'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Labs'],
    units:12, hours_per_week:14, difficulty:3 },

  { id:'6033',  mit_course_num:'6.033', title:'Computer System Engineering',
    description:'Design of computer systems: reliability, availability, atomicity, transactions, naming, and privacy. Case studies of real systems including OS, networks, and databases.',
    level:'undergraduate', discipline_id:'cs', specialization_id:'cs-sys',
    url:'https://ocw.mit.edu/courses/6-033-computer-system-engineering-spring-2018/',
    semester:'Spring', year:2018, instructors:['Prof. Nickolai Zeldovich','Prof. Katrina LaCurts'],
    topics:['Operating Systems','Computer Networks','Distributed Systems','Atomicity','Fault Tolerance','Security'],
    resource_types:['Lecture Notes','Readings','Assignments'],
    units:12, hours_per_week:14, difficulty:3 },

  { id:'6824',  mit_course_num:'6.824', title:'Distributed Systems',
    description:'Design and implementation of distributed computer systems. Topics: fault tolerance, replication, consistency, Paxos, Raft, GFS, MapReduce, Spanner, and Zookeeper.',
    level:'graduate', discipline_id:'cs', specialization_id:'cs-sys',
    url:'https://ocw.mit.edu/courses/6-824-distributed-systems-spring-2020/',
    semester:'Spring', year:2020, instructors:['Prof. Robert Morris'],
    topics:['Fault Tolerance','Replication','Consistency','Paxos','Raft','MapReduce','Transactions'],
    resource_types:['Lecture Notes','Readings','Labs'],
    units:12, hours_per_week:18, difficulty:5 },

  { id:'6828',  mit_course_num:'6.828', title:'Operating System Engineering',
    description:'Fundamental OS concepts: virtual memory, threads, context switches, kernels, interrupts, system calls, and inter-process communication. Students build a UNIX-like OS (xv6).',
    level:'graduate', discipline_id:'cs', specialization_id:'cs-sys',
    url:'https://ocw.mit.edu/courses/6-828-operating-system-engineering-fall-2012/',
    semester:'Fall', year:2012, instructors:['Prof. Frans Kaashoek','Prof. Nickolai Zeldovich'],
    topics:['Virtual Memory','Threads','Scheduling','File Systems','System Calls','Networking'],
    resource_types:['Lecture Notes','Readings','Labs'],
    units:12, hours_per_week:20, difficulty:5 },

  // ── CS: Security ───────────────────────────────────────────────────────────
  { id:'6858',  mit_course_num:'6.858', title:'Computer Systems Security',
    description:'Design and implementation of secure systems. Threat models, software security, network security, web security, cryptography, and formal verification of security properties.',
    level:'graduate', discipline_id:'cs', specialization_id:'cs-sec',
    url:'https://ocw.mit.edu/courses/6-858-computer-systems-security-fall-2014/',
    semester:'Fall', year:2014, instructors:['Prof. Nickolai Zeldovich','Prof. James Mickens'],
    topics:['Threat Modelling','Buffer Overflows','Web Security','Network Security','Cryptography','Formal Methods'],
    resource_types:['Lecture Videos','Lecture Notes','Labs','Readings'],
    units:12, hours_per_week:16, difficulty:4 },

  { id:'6875',  mit_course_num:'6.875J', title:'Cryptography and Cryptanalysis',
    description:'Foundations of modern cryptography: one-way functions, pseudorandomness, public-key encryption, digital signatures, zero-knowledge proofs, and secure multi-party computation.',
    level:'graduate', discipline_id:'cs', specialization_id:'cs-sec',
    url:'https://ocw.mit.edu/courses/6-875-cryptography-and-cryptanalysis-spring-2005/',
    semester:'Spring', year:2005, instructors:['Prof. Shafi Goldwasser','Prof. Yael Tauman Kalai'],
    topics:['One-Way Functions','Public-Key Encryption','Digital Signatures','Zero-Knowledge Proofs','MPC','Lattice Cryptography'],
    resource_types:['Lecture Notes','Problem Sets','Readings'],
    units:12, hours_per_week:18, difficulty:5 },

  // ── CS: Databases ──────────────────────────────────────────────────────────
  { id:'6830',  mit_course_num:'6.830', title:'Database Systems',
    description:'Foundations of database systems: relational model, query optimisation, concurrency control, crash recovery, and distributed databases. Primary literature-based graduate course.',
    level:'graduate', discipline_id:'cs', specialization_id:'cs-db',
    url:'https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/',
    semester:'Fall', year:2010, instructors:['Prof. Samuel Madden','Prof. Robert Morris'],
    topics:['Relational Algebra','Query Optimisation','Transactions','MVCC','Distributed Databases','Column Stores'],
    resource_types:['Lecture Notes','Readings','Labs'],
    units:12, hours_per_week:16, difficulty:4 },

  // ── CS: Programming Languages ──────────────────────────────────────────────
  { id:'6035',  mit_course_num:'6.035', title:'Computer Language Engineering',
    description:'Compiler design and implementation: lexical analysis, parsing, semantic analysis, code generation, and optimisation. Students build a complete compiler.',
    level:'undergraduate', discipline_id:'cs', specialization_id:'cs-lang',
    url:'https://ocw.mit.edu/courses/6-035-computer-language-engineering-spring-2010/',
    semester:'Spring', year:2010, instructors:['Prof. Martin Rinard'],
    topics:['Lexical Analysis','Parsing','ASTs','Type Checking','Code Generation','Optimisation'],
    resource_types:['Lecture Notes','Projects','Problem Sets'],
    units:12, hours_per_week:18, difficulty:4 },

  // ── Mathematics: Calculus & Analysis ──────────────────────────────────────
  { id:'1801',  mit_course_num:'18.01', title:'Single Variable Calculus',
    description:'Differentiation and integration of functions of one variable, with applications. Infinite series, Taylor series, and introduction to differential equations.',
    level:'introductory', discipline_id:'math', specialization_id:'math-anal',
    url:'https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/',
    semester:'Fall', year:2006, instructors:['Prof. David Jerison'],
    topics:['Limits','Differentiation','Integration','Sequences and Series','Taylor Series','ODEs'],
    resource_types:['Lecture Notes','Lecture Videos','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:1 },

  { id:'1802',  mit_course_num:'18.02', title:'Multivariable Calculus',
    description:'Vector and multivariable calculus: vectors, matrices, partial derivatives, double and triple integrals, vector fields, line integrals, and surface integrals (Green\'s, Stokes\', and divergence theorems).',
    level:'introductory', discipline_id:'math', specialization_id:'math-anal',
    url:'https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/',
    semester:'Fall', year:2007, instructors:['Prof. Denis Auroux'],
    topics:['Vectors','Partial Derivatives','Multiple Integrals','Vector Fields','Green\'s Theorem','Stokes\' Theorem'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'1803',  mit_course_num:'18.03', title:'Differential Equations',
    description:'First-order ODEs, second-order linear equations, Laplace transforms, systems of linear equations, Fourier series, and an introduction to PDEs.',
    level:'undergraduate', discipline_id:'math', specialization_id:'math-anal',
    url:'https://ocw.mit.edu/courses/18-03-differential-equations-spring-2010/',
    semester:'Spring', year:2010, instructors:['Prof. Arthur Mattuck','Prof. Haynes Miller'],
    topics:['First-Order ODEs','Second-Order ODEs','Laplace Transform','Systems','Fourier Series','PDEs'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'18100', mit_course_num:'18.100A', title:'Real Analysis',
    description:'Fundamentals of mathematical analysis: sequences and series, continuity, differentiability, Riemann integral, sequences of functions, and uniform convergence.',
    level:'undergraduate', discipline_id:'math', specialization_id:'math-anal',
    url:'https://ocw.mit.edu/courses/18-100a-real-analysis-fall-2020/',
    semester:'Fall', year:2020, instructors:['Prof. Casey Rodriguez'],
    topics:['Real Numbers','Sequences','Limits','Continuity','Differentiation','Riemann Integration','Metric Spaces'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets'],
    units:12, hours_per_week:14, difficulty:4 },

  // ── Mathematics: Algebra ───────────────────────────────────────────────────
  { id:'1806',  mit_course_num:'18.06', title:'Linear Algebra',
    description:'Systems of linear equations, vector spaces, matrices, determinants, eigenvalues and eigenvectors, and positive definite matrices. Visualisation-focused approach.',
    level:'undergraduate', discipline_id:'math', specialization_id:'math-alg',
    url:'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/',
    semester:'Spring', year:2010, instructors:['Prof. Gilbert Strang'],
    topics:['Systems of Equations','Matrix Factorisation','Orthogonality','Eigenvalues','SVD','Positive Definite Matrices'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'18701', mit_course_num:'18.701', title:'Algebra I',
    description:'Groups, group homomorphisms, symmetry groups, bilinear forms, linear groups, and an introduction to rings and fields.',
    level:'undergraduate', discipline_id:'math', specialization_id:'math-alg',
    url:'https://ocw.mit.edu/courses/18-701-algebra-i-fall-2010/',
    semester:'Fall', year:2010, instructors:['Prof. Michael Artin'],
    topics:['Groups','Homomorphisms','Symmetry','Group Actions','Rings','Fields','Bilinear Forms'],
    resource_types:['Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:14, difficulty:4 },

  // ── Mathematics: Probability & Stats ──────────────────────────────────────
  { id:'1805',  mit_course_num:'18.05', title:'Introduction to Probability and Statistics',
    description:'Probability models, conditional probability, Bayes\' theorem, discrete and continuous distributions, confidence intervals, hypothesis testing, and linear regression.',
    level:'undergraduate', discipline_id:'math', specialization_id:'math-prob',
    url:'https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/',
    semester:'Spring', year:2022, instructors:['Dr. Jeremy Orloff','Dr. Jonathan Bloom'],
    topics:['Probability','Bayes\'s Theorem','Distributions','Inference','Hypothesis Testing','Regression'],
    resource_types:['Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'1865',  mit_course_num:'18.650', title:'Statistics for Applications',
    description:'Rigorous statistics: maximum likelihood estimation, hypothesis testing, linear regression, principal components analysis, and an introduction to causal inference.',
    level:'undergraduate', discipline_id:'math', specialization_id:'math-prob',
    url:'https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/',
    semester:'Fall', year:2016, instructors:['Prof. Philippe Rigollet'],
    topics:['MLE','Confidence Intervals','Hypothesis Testing','Regression','PCA','Causal Inference'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:14, difficulty:3 },

  // ── Mathematics: Numerical Methods ─────────────────────────────────────────
  { id:'18335', mit_course_num:'18.335J', title:'Introduction to Numerical Methods',
    description:'Advanced numerical analysis: floating-point arithmetic, numerical linear algebra, polynomial interpolation, quadrature, ODEs, and optimisation.',
    level:'graduate', discipline_id:'math', specialization_id:'math-num',
    url:'https://ocw.mit.edu/courses/18-335j-introduction-to-numerical-methods-spring-2019/',
    semester:'Spring', year:2019, instructors:['Prof. Steven G. Johnson'],
    topics:['Floating-Point','LU/QR/SVD','Iterative Solvers','Interpolation','Quadrature','ODE Integrators','Optimisation'],
    resource_types:['Lecture Notes','Problem Sets'],
    units:12, hours_per_week:16, difficulty:5 },

  // ── Physics ─────────────────────────────────────────────────────────────────
  { id:'801',   mit_course_num:'8.01', title:'Physics I: Classical Mechanics',
    description:'Introduction to classical mechanics: Newton\'s laws, work, energy, momentum, rotation, oscillations, and gravitation. Walter Lewin\'s legendary lecture series.',
    level:'introductory', discipline_id:'phys', specialization_id:null as any,
    url:'https://ocw.mit.edu/courses/8-01-physics-i-classical-mechanics-fall-1999/',
    semester:'Fall', year:1999, instructors:['Prof. Walter Lewin'],
    topics:['Newton\'s Laws','Work and Energy','Momentum','Rotational Motion','Oscillations','Gravitation'],
    resource_types:['Lecture Videos','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:1 },

  { id:'802',   mit_course_num:'8.02', title:'Physics II: Electricity and Magnetism',
    description:'Electrostatics, magnetostatics, Faraday\'s law, Maxwell\'s equations, electromagnetic waves, and circuits. Walter Lewin\'s lecture series.',
    level:'introductory', discipline_id:'phys', specialization_id:null as any,
    url:'https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2002/',
    semester:'Spring', year:2002, instructors:['Prof. Walter Lewin'],
    topics:['Electrostatics','Gauss\'s Law','Magnetism','Faraday\'s Law','Maxwell\'s Equations','Electromagnetic Waves'],
    resource_types:['Lecture Videos','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'804',   mit_course_num:'8.04', title:'Quantum Physics I',
    description:'Experimental basis of quantum mechanics, wave-particle duality, Schrödinger equation, uncertainty principle, hydrogen atom, and spin.',
    level:'undergraduate', discipline_id:'phys', specialization_id:'phys-qm',
    url:'https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/',
    semester:'Spring', year:2016, instructors:['Prof. Barton Zwiebach'],
    topics:['Wave–Particle Duality','Schrödinger Equation','Uncertainty Principle','Quantum States','Hydrogen Atom','Angular Momentum'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:14, difficulty:3 },

  { id:'805',   mit_course_num:'8.05', title:'Quantum Physics II',
    description:'Time-independent perturbation theory, variational methods, WKB approximation, time-dependent perturbation theory, addition of angular momenta, and introduction to quantum field theory.',
    level:'undergraduate', discipline_id:'phys', specialization_id:'phys-qm',
    url:'https://ocw.mit.edu/courses/8-05-quantum-physics-ii-fall-2013/',
    semester:'Fall', year:2013, instructors:['Prof. Barton Zwiebach'],
    topics:['Perturbation Theory','Variational Methods','WKB Approximation','Scattering','Addition of Angular Momenta'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets'],
    units:12, hours_per_week:16, difficulty:4 },

  { id:'8333',  mit_course_num:'8.333', title:'Statistical Mechanics I: Particles',
    description:'Probabilistic approach to large systems: thermodynamics, kinetic theory, classical and quantum statistical mechanics, phase transitions, and critical phenomena.',
    level:'graduate', discipline_id:'phys', specialization_id:'phys-stat',
    url:'https://ocw.mit.edu/courses/8-333-statistical-mechanics-i-statistical-mechanics-of-particles-fall-2013/',
    semester:'Fall', year:2013, instructors:['Prof. Mehran Kardar'],
    topics:['Thermodynamics','Kinetic Theory','Ensemble Theory','Quantum Statistics','Phase Transitions','Renormalization Group'],
    resource_types:['Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:18, difficulty:5 },

  // ── Biology ─────────────────────────────────────────────────────────────────
  { id:'701',   mit_course_num:'7.01SC', title:'Fundamentals of Biology',
    description:'Biochemistry, molecular biology, genetics, and recombinant DNA. Covers central dogma, gene regulation, cell division, and the principles underlying modern biotechnology.',
    level:'undergraduate', discipline_id:'bio', specialization_id:'bio-mol',
    url:'https://ocw.mit.edu/courses/7-01sc-fundamentals-of-biology-fall-2011/',
    semester:'Fall', year:2011, instructors:['Prof. Eric Lander','Prof. Robert Weinberg','Prof. Tyler Jacks'],
    topics:['Biochemistry','DNA Replication','Transcription','Translation','Gene Regulation','Genetics','Recombinant DNA'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'703',   mit_course_num:'7.03', title:'Genetics',
    description:'Mendelian and molecular genetics, gene mapping, chromosome structure, genomics, epigenetics, and population genetics.',
    level:'undergraduate', discipline_id:'bio', specialization_id:'bio-mol',
    url:'https://ocw.mit.edu/courses/7-03-genetics-fall-2004/',
    semester:'Fall', year:2004, instructors:['Prof. Chris Kaiser','Prof. Gerry Fink'],
    topics:['Mendelian Genetics','Gene Mapping','Chromosome Structure','Mutation','Genomics','Population Genetics'],
    resource_types:['Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:3 },

  { id:'7091',  mit_course_num:'7.91J', title:'Foundations of Computational and Systems Biology',
    description:'Algorithms for sequence alignment, genome assembly, gene finding, protein structure prediction, regulatory network modelling, and statistical analysis of biological data.',
    level:'graduate', discipline_id:'bio', specialization_id:'bio-comp',
    url:'https://ocw.mit.edu/courses/7-91j-foundations-of-computational-and-systems-biology-spring-2014/',
    semester:'Spring', year:2014, instructors:['Prof. Christopher Burge','Prof. David Gifford','Prof. Ernest Fraenkel'],
    topics:['Sequence Alignment','Genome Assembly','Gene Finding','Structure Prediction','Network Analysis','Statistical Genomics'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets'],
    units:12, hours_per_week:16, difficulty:4 },

  // ── Neuroscience ─────────────────────────────────────────────────────────────
  { id:'901',   mit_course_num:'9.01', title:'Introduction to Neuroscience',
    description:'Mammalian nervous system: organisation of the brain, neural signalling, sensory and motor systems, learning, memory, language, and neural disorders.',
    level:'undergraduate', discipline_id:'neuro', specialization_id:'neuro-sys',
    url:'https://ocw.mit.edu/courses/9-01-introduction-to-neuroscience-fall-2007/',
    semester:'Fall', year:2007, instructors:['Prof. Gerald Schneider'],
    topics:['Neuronal Physiology','Synaptic Transmission','Sensory Systems','Motor Control','Learning','Memory','Language'],
    resource_types:['Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'940',   mit_course_num:'9.40', title:'Introduction to Neural Computation',
    description:'Computational models of neurons and neural networks: integrate-and-fire models, Hodgkin-Huxley, synaptic models, networks, associative memory, and reinforcement learning.',
    level:'undergraduate', discipline_id:'neuro', specialization_id:'neuro-sys',
    url:'https://ocw.mit.edu/courses/9-40-introduction-to-neural-computation-spring-2018/',
    semester:'Spring', year:2018, instructors:['Prof. Michale Fee'],
    topics:['Hodgkin-Huxley Model','Synaptic Plasticity','Hopfield Networks','Perceptrons','Backpropagation','Reinforcement Learning'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets'],
    units:12, hours_per_week:12, difficulty:3 },

  { id:'9641',  mit_course_num:'9.641J', title:'Introduction to Neural Networks',
    description:'Biologically inspired models: perceptrons, backpropagation, Hopfield networks, Boltzmann machines, competitive learning, and self-organisation maps.',
    level:'graduate', discipline_id:'neuro', specialization_id:'neuro-sys',
    url:'https://ocw.mit.edu/courses/9-641j-introduction-to-neural-networks-spring-2005/',
    semester:'Spring', year:2005, instructors:['Prof. Sebastian Seung'],
    topics:['Perceptrons','Backpropagation','Recurrent Nets','Hopfield Networks','Boltzmann Machines','Self-Organising Maps'],
    resource_types:['Lecture Notes','Problem Sets'],
    units:12, hours_per_week:14, difficulty:4 },

  // ── Economics ─────────────────────────────────────────────────────────────
  { id:'1401',  mit_course_num:'14.01', title:'Principles of Microeconomics',
    description:'Supply and demand, consumer theory, production theory, market equilibrium, market failures, and welfare economics.',
    level:'introductory', discipline_id:'econ', specialization_id:'econ-micro',
    url:'https://ocw.mit.edu/courses/14-01-principles-of-microeconomics-fall-2018/',
    semester:'Fall', year:2018, instructors:['Prof. Jonathan Gruber'],
    topics:['Supply and Demand','Elasticity','Consumer Theory','Production','Market Structure','Externalities','Public Goods'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:10, difficulty:1 },

  { id:'1430',  mit_course_num:'14.30', title:'Introduction to Statistical Methods in Economics',
    description:'Probability theory, statistical inference, and their application to economics. Estimation, hypothesis testing, regression, and introduction to causal inference.',
    level:'undergraduate', discipline_id:'econ', specialization_id:'econ-stats',
    url:'https://ocw.mit.edu/courses/14-30-introduction-to-statistical-methods-in-economics-spring-2009/',
    semester:'Spring', year:2009, instructors:['Prof. Victor Chernozhukov'],
    topics:['Probability','Statistical Inference','Regression','IV Estimation','Differences-in-Differences','Causal Inference'],
    resource_types:['Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:3 },

  // ── Chemistry ─────────────────────────────────────────────────────────────
  { id:'5111',  mit_course_num:'5.111', title:'Principles of Chemical Science',
    description:'Quantum mechanics of atoms, chemical bonding, molecular structure, spectroscopy, acid-base chemistry, and thermodynamics.',
    level:'introductory', discipline_id:'chem', specialization_id:'chem-phys',
    url:'https://ocw.mit.edu/courses/5-111-principles-of-chemical-science-fall-2008/',
    semester:'Fall', year:2008, instructors:['Prof. Catherine Drennan','Dr. Elizabeth Vogel Taylor'],
    topics:['Quantum Mechanics','Atomic Structure','Chemical Bonding','Thermodynamics','Acid-Base Chemistry','Spectroscopy'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'560',   mit_course_num:'5.60', title:'Thermodynamics and Kinetics',
    description:'Thermodynamic state functions, Gibbs free energy, equilibrium, chemical kinetics, and statistical thermodynamics.',
    level:'undergraduate', discipline_id:'chem', specialization_id:'chem-phys',
    url:'https://ocw.mit.edu/courses/5-60-thermodynamics-kinetics-spring-2008/',
    semester:'Spring', year:2008, instructors:['Prof. Moungi Bawendi'],
    topics:['Thermodynamics','Gibbs Energy','Equilibrium','Kinetics','Electrochemistry','Statistical Mechanics'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:3 },

  // ── Engineering ───────────────────────────────────────────────────────────
  { id:'6002',  mit_course_num:'6.002', title:'Circuits and Electronics',
    description:'Lumped circuit abstraction, linear circuits, amplifiers, digital circuits, and MOSFET devices. Foundations for all of electrical engineering and computer architecture.',
    level:'introductory', discipline_id:'eng', specialization_id:'eng-arch',
    url:'https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/',
    semester:'Spring', year:2007, instructors:['Prof. Anant Agarwal','Prof. Jeffrey Lang'],
    topics:['Lumped Circuits','Nodal Analysis','Amplifiers','MOSFET','Digital Circuits','Feedback'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Labs','Exams'],
    units:12, hours_per_week:12, difficulty:2 },

  { id:'6003',  mit_course_num:'6.003', title:'Signal Processing',
    description:'Continuous-time and discrete-time signal processing: Fourier series and transforms, Laplace and Z-transforms, sampling, filtering, modulation, and feedback.',
    level:'undergraduate', discipline_id:'eng', specialization_id:'eng-sig',
    url:'https://ocw.mit.edu/courses/6-003-signal-processing-fall-2011/',
    semester:'Fall', year:2011, instructors:['Prof. Dennis Freeman'],
    topics:['Fourier Transform','Laplace Transform','Z-Transform','Sampling','Filters','Modulation','Feedback Systems'],
    resource_types:['Lecture Videos','Lecture Notes','Problem Sets','Exams'],
    units:12, hours_per_week:12, difficulty:3 },
];

// ─── Prerequisites ────────────────────────────────────────────────────────────

const prerequisites: Array<{ course_id: string; prereq_id: string; required: boolean }> = [
  // Algorithms chain
  { course_id:'6006',  prereq_id:'6042',  required:true  },
  { course_id:'6006',  prereq_id:'1806',  required:false },
  { course_id:'6046',  prereq_id:'6006',  required:true  },
  { course_id:'6854',  prereq_id:'6046',  required:true  },
  { course_id:'18404', prereq_id:'6042',  required:true  },
  { course_id:'18404', prereq_id:'6006',  required:false },
  // ML chain
  { course_id:'6036',  prereq_id:'1806',  required:true  },
  { course_id:'6036',  prereq_id:'1865',  required:false },
  { course_id:'6867',  prereq_id:'6036',  required:true  },
  { course_id:'6867',  prereq_id:'1865',  required:true  },
  { course_id:'6s897', prereq_id:'6036',  required:true  },
  { course_id:'6034',  prereq_id:'6042',  required:true  },
  // Systems chain
  { course_id:'6033',  prereq_id:'6004',  required:false },
  { course_id:'6824',  prereq_id:'6033',  required:true  },
  { course_id:'6828',  prereq_id:'6033',  required:true  },
  { course_id:'6858',  prereq_id:'6033',  required:true  },
  { course_id:'6875',  prereq_id:'1806',  required:true  },
  { course_id:'6875',  prereq_id:'18404', required:false },
  { course_id:'6830',  prereq_id:'6033',  required:true  },
  { course_id:'6035',  prereq_id:'6004',  required:true  },
  // Math chain
  { course_id:'1802',  prereq_id:'1801',  required:true  },
  { course_id:'1803',  prereq_id:'1802',  required:true  },
  { course_id:'1806',  prereq_id:'1802',  required:true  },
  { course_id:'18100', prereq_id:'1802',  required:true  },
  { course_id:'18701', prereq_id:'1806',  required:true  },
  { course_id:'1865',  prereq_id:'1805',  required:true  },
  { course_id:'1865',  prereq_id:'1806',  required:true  },
  { course_id:'18335', prereq_id:'1806',  required:true  },
  { course_id:'18335', prereq_id:'1803',  required:true  },
  // Physics chain
  { course_id:'802',   prereq_id:'801',   required:true  },
  { course_id:'804',   prereq_id:'802',   required:true  },
  { course_id:'804',   prereq_id:'1803',  required:true  },
  { course_id:'805',   prereq_id:'804',   required:true  },
  { course_id:'8333',  prereq_id:'802',   required:true  },
  { course_id:'8333',  prereq_id:'18100', required:false },
  // Bio/Neuro chain
  { course_id:'703',   prereq_id:'701',   required:true  },
  { course_id:'7091',  prereq_id:'701',   required:true  },
  { course_id:'7091',  prereq_id:'6006',  required:false },
  { course_id:'940',   prereq_id:'901',   required:true  },
  { course_id:'940',   prereq_id:'1806',  required:true  },
  { course_id:'9641',  prereq_id:'940',   required:true  },
  { course_id:'9641',  prereq_id:'6036',  required:false },
  // Econ chain
  { course_id:'1430',  prereq_id:'1401',  required:true  },
  { course_id:'1430',  prereq_id:'1802',  required:false },
  // Chem chain
  { course_id:'560',   prereq_id:'5111',  required:true  },
  { course_id:'560',   prereq_id:'1802',  required:false },
  // Eng chain
  { course_id:'6003',  prereq_id:'6002',  required:true  },
  { course_id:'6003',  prereq_id:'1803',  required:true  },
];

// ─── Course modules (syllabus) ─────────────────────────────────────────────────

const modules: Array<{ course_id: string; week: number; unit: string; title: string; description: string; topics: string[] }> = [
  // 6.006 Introduction to Algorithms
  { course_id:'6006', week:1, unit:'1', title:'Introduction and Peak Finding',
    description:'What is an algorithm? Asymptotic notation, peak finding problem.', topics:['Asymptotic Analysis','Peak Finding','Divide and Conquer'] },
  { course_id:'6006', week:2, unit:'2', title:'Sorting and Recurrences',
    description:'Merge sort, recurrence relations, master theorem.', topics:['Merge Sort','Recurrences','Master Theorem'] },
  { course_id:'6006', week:3, unit:'3', title:'Hashing',
    description:'Hash functions, chaining, open addressing, universal hashing.', topics:['Hash Tables','Collision Resolution','Amortised Analysis'] },
  { course_id:'6006', week:5, unit:'4', title:'Heaps and Priority Queues',
    description:'Binary heaps, heap sort, priority queues.', topics:['Heaps','Priority Queues','Heapsort'] },
  { course_id:'6006', week:6, unit:'5', title:'Binary Search Trees',
    description:'BSTs, AVL trees, and augmented data structures.', topics:['BST','AVL Trees','Augmentation'] },
  { course_id:'6006', week:8, unit:'6', title:'Graph Algorithms',
    description:'BFS, DFS, topological sort, and strongly connected components.', topics:['BFS','DFS','Topological Sort','SCC'] },
  { course_id:'6006', week:10, unit:'7', title:'Shortest Paths',
    description:'Bellman-Ford, Dijkstra\'s algorithm, and DAG relaxation.', topics:['Bellman-Ford','Dijkstra','DAG Shortest Path'] },
  { course_id:'6006', week:12, unit:'8', title:'Dynamic Programming',
    description:'DP design paradigm: memoisation, subproblem graphs, and sequence alignment.', topics:['Memoisation','Sequence Alignment','Edit Distance','LCS'] },

  // 18.06 Linear Algebra modules
  { course_id:'1806', week:1, unit:'1', title:'Geometry of Linear Equations',
    description:'Row picture vs column picture, matrix-vector products, elimination.', topics:['Linear Equations','Elimination','Matrices'] },
  { course_id:'1806', week:3, unit:'2', title:'Vector Spaces and Subspaces',
    description:'Column space, null space, four fundamental subspaces.', topics:['Vector Spaces','Column Space','Null Space','Rank'] },
  { course_id:'1806', week:5, unit:'3', title:'Orthogonality and Projection',
    description:'Gram-Schmidt, QR decomposition, least squares.', topics:['Orthogonality','Gram-Schmidt','QR','Least Squares'] },
  { course_id:'1806', week:7, unit:'4', title:'Eigenvalues and Eigenvectors',
    description:'Diagonalisation, symmetric matrices, and spectral theorem.', topics:['Eigenvalues','Diagonalisation','Spectral Theorem'] },
  { course_id:'1806', week:9, unit:'5', title:'SVD and Principal Component Analysis',
    description:'Singular value decomposition and principal component analysis.', topics:['SVD','PCA','Low-Rank Approximation'] },
  { course_id:'1806', week:11, unit:'6', title:'Positive Definite Matrices',
    description:'Tests for positive definiteness, Cholesky decomposition, and applications.', topics:['Positive Definiteness','Cholesky','Quadratic Forms'] },

  // 6.034 AI modules
  { course_id:'6034', week:1, unit:'1', title:'Search Algorithms',
    description:'Depth-first, breadth-first, hill climbing, beam search, A*.', topics:['Search','Heuristics','A*'] },
  { course_id:'6034', week:3, unit:'2', title:'Constraint Satisfaction',
    description:'Constraint propagation, backtracking, arc consistency.', topics:['CSP','Backtracking','Arc Consistency'] },
  { course_id:'6034', week:5, unit:'3', title:'Knowledge Representation',
    description:'Semantic networks, ontologies, frames, rules.', topics:['Ontologies','Logic','Knowledge Bases'] },
  { course_id:'6034', week:7, unit:'4', title:'Machine Learning Basics',
    description:'Decision trees, nearest neighbours, SVM.', topics:['Decision Trees','kNN','SVM','Perceptron'] },
  { course_id:'6034', week:9, unit:'5', title:'Neural Networks',
    description:'Perceptrons, backpropagation, deep architectures.', topics:['Neural Networks','Backpropagation','Deep Learning'] },
  { course_id:'6034', week:11, unit:'6', title:'Probabilistic Reasoning',
    description:'Bayesian networks, Naive Bayes, hidden Markov models.', topics:['Bayesian Networks','HMMs','Inference'] },

  // Quantum Physics modules
  { course_id:'804', week:1, unit:'1', title:'Wave-Particle Duality',
    description:'Double-slit experiment, photoelectric effect, de Broglie wavelength.', topics:['Wave-Particle Duality','Photoelectric Effect','de Broglie'] },
  { course_id:'804', week:3, unit:'2', title:'Schrödinger Equation',
    description:'Time-dependent and time-independent Schrödinger equation, particle in a box.', topics:['Schrödinger Equation','Stationary States','Particle in a Box'] },
  { course_id:'804', week:5, unit:'3', title:'Uncertainty Principle',
    description:'Heisenberg\'s uncertainty principle, commutators, and operators.', topics:['Uncertainty Principle','Operators','Commutators'] },
  { course_id:'804', week:7, unit:'4', title:'Quantum Harmonic Oscillator',
    description:'Ladder operators, energy spectrum, coherent states.', topics:['Harmonic Oscillator','Ladder Operators','Coherent States'] },
  { course_id:'804', week:9, unit:'5', title:'Hydrogen Atom',
    description:'Central force problem, radial equation, spherical harmonics, energy levels.', topics:['Hydrogen Atom','Spherical Harmonics','Energy Levels'] },
  { course_id:'804', week:11, unit:'6', title:'Angular Momentum and Spin',
    description:'Orbital angular momentum, spin-1/2, addition of angular momenta.', topics:['Angular Momentum','Spin','Pauli Matrices'] },
];

// ─── Research Topics ──────────────────────────────────────────────────────────

const researchTopics = [
  { id:'rt-ai-safety', discipline_id:'cs', specialization_id:'cs-ml', sort_order:1,
    title:'AI Safety & Alignment',
    description:'Ensuring that increasingly capable AI systems reliably pursue human values and remain under meaningful human oversight.',
    why_it_matters:'Frontier AI systems are being deployed in critical decisions. Alignment failures could be catastrophic and hard to reverse.',
    open_questions:['How do we specify human values formally?','What causes reward hacking and how to prevent it?','Can we verify that a trained model is aligned?','What are the limits of RLHF?','How do we build interpretable models?'],
    key_skills:['Deep Learning','Reinforcement Learning','Formal Verification','Decision Theory','Statistics'],
    career_paths:['AI Safety Researcher (academia)','AI Policy Analyst','ML Engineer (alignment teams at frontier labs)'],
    difficulty:5 },

  { id:'rt-quantum-comp', discipline_id:'cs', specialization_id:'cs-algo', sort_order:2,
    title:'Quantum Computing & Quantum Algorithms',
    description:'Exploiting quantum mechanical phenomena to solve computational problems that are intractable for classical computers.',
    why_it_matters:'Quantum computers could break current cryptography and exponentially speed up certain optimisation and simulation problems.',
    open_questions:['What is the full complexity-theoretic relationship between BQP and classical classes?','Can we achieve fault-tolerant computation at scale?','What new problems have quantum advantage?','How do we compile quantum circuits efficiently?'],
    key_skills:['Quantum Mechanics','Linear Algebra','Complexity Theory','Quantum Information Theory'],
    career_paths:['Quantum Software Engineer','Quantum Algorithms Researcher','Quantum Hardware Researcher'],
    difficulty:5 },

  { id:'rt-crypto-privacy', discipline_id:'cs', specialization_id:'cs-sec', sort_order:3,
    title:'Modern Cryptography & Privacy',
    description:'Post-quantum cryptography, zero-knowledge proofs, fully homomorphic encryption, and private computation for an AI-era world.',
    why_it_matters:'Quantum computers threaten RSA/ECC; privacy-preserving computation is critical for ML on sensitive data.',
    open_questions:['Can we build efficient FHE for practical ML?','What are the limits of ZK-proofs in practice?','How do we migrate the internet to post-quantum standards?'],
    key_skills:['Abstract Algebra','Number Theory','Cryptography','Complexity Theory','Lattices'],
    career_paths:['Cryptography Researcher','Security Engineer','ZK Protocol Designer'],
    difficulty:5 },

  { id:'rt-comp-bio', discipline_id:'bio', specialization_id:'bio-comp', sort_order:1,
    title:'Computational Biology & Genomics',
    description:'Machine learning and algorithmic approaches to understanding genomes, gene regulation, protein structure, and disease mechanisms.',
    why_it_matters:'Sequencing costs have collapsed; the bottleneck is now computational interpretation of massive genomic datasets.',
    open_questions:['Can we predict protein-protein interactions at proteome scale?','How do non-coding variants affect gene regulation?','What drives aging at the molecular level?','Can we design novel proteins with AI?'],
    key_skills:['Bioinformatics','Machine Learning','Statistics','Molecular Biology','Python/R'],
    career_paths:['Computational Biologist','Biotech ML Researcher','Drug Discovery Scientist'],
    difficulty:4 },

  { id:'rt-distributed-sys', discipline_id:'cs', specialization_id:'cs-sys', sort_order:4,
    title:'Distributed Systems & Consensus',
    description:'Theory and practice of building reliable, consistent, and high-performance systems across many machines.',
    why_it_matters:'Almost all internet infrastructure is distributed; correctness of consensus protocols is safety-critical.',
    open_questions:['Can we build consensus protocols with sub-millisecond latency?','What are the limits of geo-distributed consistency?','How do blockchains change the threat model?'],
    key_skills:['Distributed Algorithms','Operating Systems','Computer Networks','Formal Methods'],
    career_paths:['Distributed Systems Engineer','Database Researcher','Infrastructure Architect'],
    difficulty:4 },

  { id:'rt-neural-eng', discipline_id:'neuro', specialization_id:'neuro-sys', sort_order:1,
    title:'Neural Engineering & Brain–Computer Interfaces',
    description:'Building interfaces between the nervous system and computers for therapeutic and augmentation purposes.',
    why_it_matters:'BCIs can restore motor function after paralysis and open new ways to study the brain at high resolution.',
    open_questions:['How do we decode motor intent from neural signals in real time?','Can we write information back to the brain reliably?','What signal-processing methods work best for chronic implants?'],
    key_skills:['Signal Processing','Neuroscience','Machine Learning','Embedded Systems'],
    career_paths:['Neural Engineer','BCI Researcher','Neurotech Startup Founder'],
    difficulty:4 },

  { id:'rt-causal-ml', discipline_id:'econ', specialization_id:'econ-stats', sort_order:1,
    title:'Causal Inference & Causal ML',
    description:'Moving beyond correlation: identifying causal effects from observational data and building AI systems that reason about interventions.',
    why_it_matters:'Most real-world decisions require causal understanding; association-based ML fails in distribution shift and policy evaluation.',
    open_questions:['Can we identify causal graphs from purely observational data?','How do we combine experimental and observational data?','What is the right causal framework for RL?'],
    key_skills:['Econometrics','Statistics','Graph Theory','Machine Learning','Probability'],
    career_paths:['Causal ML Researcher','Policy Analyst','Data Scientist (Tech/Policy)'],
    difficulty:4 },

  { id:'rt-ml-theory', discipline_id:'math', specialization_id:'math-prob', sort_order:1,
    title:'Mathematical Foundations of Machine Learning',
    description:'Statistical learning theory, information-theoretic bounds, optimisation landscapes, and the mathematics of deep learning.',
    why_it_matters:'Understanding *why* ML works is the key to making it more reliable, efficient, and trustworthy.',
    open_questions:['Why do over-parameterised neural nets generalise?','What explains double descent?','Can we give tight sample complexity bounds for transformers?'],
    key_skills:['Probability Theory','Linear Algebra','Optimisation','Information Theory','Functional Analysis'],
    career_paths:['ML Theory Researcher','Applied Mathematics Professor','Research Scientist'],
    difficulty:5 },

  { id:'rt-condensed-matter', discipline_id:'phys', specialization_id:'phys-cm', sort_order:1,
    title:'Topological Phases & Quantum Materials',
    description:'Exotic phases of matter — topological insulators, Weyl semimetals, and fractional quantum Hall states — that are characterised by global topological invariants.',
    why_it_matters:'Topological materials could enable fault-tolerant qubits and next-generation spintronic devices.',
    open_questions:['Can we realise non-Abelian anyons experimentally?','What new topological phases exist in non-equilibrium systems?','How do interactions modify topological classification?'],
    key_skills:['Quantum Mechanics','Condensed Matter Physics','Group Theory','Topology'],
    career_paths:['Condensed Matter Physicist','Quantum Materials Researcher','Quantum Hardware Engineer'],
    difficulty:5 },

  { id:'rt-nlp', discipline_id:'cs', specialization_id:'cs-ml', sort_order:3,
    title:'Natural Language Processing & Large Language Models',
    description:'Building systems that understand and generate human language: transformers, pretraining, fine-tuning, and the emerging science of in-context learning.',
    why_it_matters:'LLMs are transforming how software is written, science is done, and knowledge is accessed.',
    open_questions:['How do LLMs store and retrieve factual knowledge?','What are the limits of in-context learning?','How do we reduce hallucination reliably?','Can language models reason?'],
    key_skills:['Deep Learning','Attention Mechanisms','Probability','Linguistics','Distributed Training'],
    career_paths:['NLP Research Scientist','Foundation Model Engineer','AI Product Researcher'],
    difficulty:4 },
];

// ─── Research topic ↔ course links ────────────────────────────────────────────

const topicCourseLinks: Array<{ research_topic_id: string; course_id: string; importance: string }> = [
  // AI Safety
  { research_topic_id:'rt-ai-safety', course_id:'6036',  importance:'essential' },
  { research_topic_id:'rt-ai-safety', course_id:'6867',  importance:'essential' },
  { research_topic_id:'rt-ai-safety', course_id:'1806',  importance:'essential' },
  { research_topic_id:'rt-ai-safety', course_id:'1865',  importance:'recommended' },
  { research_topic_id:'rt-ai-safety', course_id:'6034',  importance:'recommended' },
  { research_topic_id:'rt-ai-safety', course_id:'18404', importance:'recommended' },
  // Quantum Computing
  { research_topic_id:'rt-quantum-comp', course_id:'804',   importance:'essential' },
  { research_topic_id:'rt-quantum-comp', course_id:'805',   importance:'essential' },
  { research_topic_id:'rt-quantum-comp', course_id:'1806',  importance:'essential' },
  { research_topic_id:'rt-quantum-comp', course_id:'18404', importance:'essential' },
  { research_topic_id:'rt-quantum-comp', course_id:'6875',  importance:'recommended' },
  { research_topic_id:'rt-quantum-comp', course_id:'8333',  importance:'recommended' },
  // Cryptography
  { research_topic_id:'rt-crypto-privacy', course_id:'6875', importance:'essential' },
  { research_topic_id:'rt-crypto-privacy', course_id:'18701',importance:'essential' },
  { research_topic_id:'rt-crypto-privacy', course_id:'6858', importance:'essential' },
  { research_topic_id:'rt-crypto-privacy', course_id:'18404',importance:'recommended' },
  { research_topic_id:'rt-crypto-privacy', course_id:'1806', importance:'recommended' },
  // Computational Biology
  { research_topic_id:'rt-comp-bio', course_id:'701',  importance:'essential' },
  { research_topic_id:'rt-comp-bio', course_id:'7091', importance:'essential' },
  { research_topic_id:'rt-comp-bio', course_id:'703',  importance:'essential' },
  { research_topic_id:'rt-comp-bio', course_id:'6036', importance:'recommended' },
  { research_topic_id:'rt-comp-bio', course_id:'1865', importance:'recommended' },
  { research_topic_id:'rt-comp-bio', course_id:'6006', importance:'supplementary' },
  // Distributed Systems
  { research_topic_id:'rt-distributed-sys', course_id:'6824', importance:'essential' },
  { research_topic_id:'rt-distributed-sys', course_id:'6828', importance:'essential' },
  { research_topic_id:'rt-distributed-sys', course_id:'6033', importance:'essential' },
  { research_topic_id:'rt-distributed-sys', course_id:'6830', importance:'recommended' },
  { research_topic_id:'rt-distributed-sys', course_id:'6046', importance:'recommended' },
  // Neural Engineering
  { research_topic_id:'rt-neural-eng', course_id:'901',  importance:'essential' },
  { research_topic_id:'rt-neural-eng', course_id:'940',  importance:'essential' },
  { research_topic_id:'rt-neural-eng', course_id:'6003', importance:'essential' },
  { research_topic_id:'rt-neural-eng', course_id:'6036', importance:'recommended' },
  { research_topic_id:'rt-neural-eng', course_id:'9641', importance:'recommended' },
  // Causal ML
  { research_topic_id:'rt-causal-ml', course_id:'1430', importance:'essential' },
  { research_topic_id:'rt-causal-ml', course_id:'1865', importance:'essential' },
  { research_topic_id:'rt-causal-ml', course_id:'1401', importance:'recommended' },
  { research_topic_id:'rt-causal-ml', course_id:'6036', importance:'recommended' },
  { research_topic_id:'rt-causal-ml', course_id:'1805', importance:'supplementary' },
  // ML Theory
  { research_topic_id:'rt-ml-theory', course_id:'1806',  importance:'essential' },
  { research_topic_id:'rt-ml-theory', course_id:'18100', importance:'essential' },
  { research_topic_id:'rt-ml-theory', course_id:'1865',  importance:'essential' },
  { research_topic_id:'rt-ml-theory', course_id:'6867',  importance:'essential' },
  { research_topic_id:'rt-ml-theory', course_id:'18335', importance:'recommended' },
  // Condensed Matter
  { research_topic_id:'rt-condensed-matter', course_id:'804',  importance:'essential' },
  { research_topic_id:'rt-condensed-matter', course_id:'805',  importance:'essential' },
  { research_topic_id:'rt-condensed-matter', course_id:'8333',importance:'essential' },
  { research_topic_id:'rt-condensed-matter', course_id:'802',  importance:'recommended' },
  { research_topic_id:'rt-condensed-matter', course_id:'1806', importance:'recommended' },
  // NLP
  { research_topic_id:'rt-nlp', course_id:'6036',  importance:'essential' },
  { research_topic_id:'rt-nlp', course_id:'6867',  importance:'essential' },
  { research_topic_id:'rt-nlp', course_id:'1806',  importance:'essential' },
  { research_topic_id:'rt-nlp', course_id:'6046',  importance:'recommended' },
  { research_topic_id:'rt-nlp', course_id:'18404', importance:'supplementary' },
];

// ─── Seed runner ──────────────────────────────────────────────────────────────

export async function seedAcademicData(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Disciplines
    for (const d of disciplines) {
      await client.query(
        `INSERT INTO academic_disciplines (id, name, icon, description, color, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [d.id, d.name, d.icon, d.description, d.color, d.sort_order]
      );
    }

    // Specializations
    for (const s of specializations) {
      await client.query(
        `INSERT INTO academic_specializations (id, discipline_id, name, description, research_potential, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.discipline_id, s.name, s.description, s.research_potential, s.sort_order]
      );
    }

    // Courses
    for (const c of courses) {
      await client.query(
        `INSERT INTO ocw_courses
           (id, mit_course_num, title, description, level, discipline_id, specialization_id,
            url, semester, year, instructors, topics, resource_types, units, hours_per_week, difficulty)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.mit_course_num, c.title, c.description, c.level, c.discipline_id,
         c.specialization_id ?? null, c.url, c.semester, c.year,
         c.instructors, c.topics, c.resource_types, c.units, c.hours_per_week, c.difficulty]
      );
    }

    // Prerequisites
    for (const p of prerequisites) {
      await client.query(
        `INSERT INTO ocw_course_prerequisites (course_id, prereq_id, required)
         VALUES ($1,$2,$3) ON CONFLICT (course_id, prereq_id) DO NOTHING`,
        [p.course_id, p.prereq_id, p.required]
      );
    }

    // Modules
    for (const m of modules) {
      await client.query(
        `INSERT INTO ocw_course_modules (course_id, week, unit, title, description, topics)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [m.course_id, m.week, m.unit, m.title, m.description, m.topics]
      );
    }

    // Research topics
    for (const rt of researchTopics) {
      await client.query(
        `INSERT INTO research_topics
           (id, discipline_id, specialization_id, title, description, why_it_matters,
            open_questions, key_skills, career_paths, difficulty, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [rt.id, rt.discipline_id, rt.specialization_id, rt.title, rt.description, rt.why_it_matters,
         rt.open_questions, rt.key_skills, rt.career_paths, rt.difficulty, rt.sort_order]
      );
    }

    // Topic↔course links
    for (const l of topicCourseLinks) {
      await client.query(
        `INSERT INTO research_topic_courses (research_topic_id, course_id, importance)
         VALUES ($1,$2,$3) ON CONFLICT (research_topic_id, course_id) DO NOTHING`,
        [l.research_topic_id, l.course_id, l.importance]
      );
    }

    await client.query('COMMIT');
    console.log('[Academic] Seed complete: %d disciplines, %d specializations, %d courses, %d research topics',
      disciplines.length, specializations.length, courses.length, researchTopics.length);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
