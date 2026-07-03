import { useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { motion, useInView } from 'framer-motion';

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Array<{ x: number, y: number, vx: number, vy: number, radius: number, alpha: number }> = [];
    const numParticles = 120;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.5 + 0.1
        });
      }
    };

    let rafId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        const colors = ['245,158,11', '16,185,129', '59,130,246']; // amber, emerald, sky
        const color = colors[Math.floor(p.x / canvas.width * colors.length) % colors.length];
        ctx.fillStyle = `rgba(${color}, ${p.alpha * 0.6})`;
        ctx.fill();
      });

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-60" />;
}

export default function Home() {
  const eqRef = useRef(null);
  const isEqInView = useInView(eqRef, { once: true, margin: "-100px" });

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <ParticleBackground />
      
      <div className="flex-1 max-w-7xl mx-auto px-6 flex flex-col justify-center relative z-10 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="font-mono text-accent text-sm md:text-base mb-8 uppercase tracking-widest border-l-2 border-accent pl-4">
            SRI Quantum Technologies · Confidential Patent Filing Blueprint · February 2026
          </div>
          
          <h1 className="font-serif text-5xl md:text-7xl lg:text-[5rem] leading-[1.1] mb-8 text-foreground">
            The <span className="bg-gradient-to-br from-[#E8C66A] to-[#C8A84B] bg-clip-text text-transparent">Ω-Manifold</span>:<br/>
            A Continuous-Variable Architecture for Autopoietic Computing
          </h1>
          
          <p className="font-sans text-xl md:text-2xl text-muted-foreground font-light leading-relaxed mb-12 max-w-3xl">
            Replacing discrete algorithmic violence with entropy minimization. Mapping Vedantic epistemology to thermodynamic phase transitions.
          </p>

          <div className="bg-[#111640]/50 backdrop-blur-sm border border-primary/20 rounded-lg p-6 mb-12 max-w-3xl">
            <div className="font-mono text-sm md:text-base flex flex-col sm:flex-row items-start sm:items-center justify-between text-[#E8C66A] tracking-wider mb-3 gap-2">
              <span>PARA</span>
              <span className="hidden sm:inline opacity-50">→</span>
              <span>PASYANTI</span>
              <span className="hidden sm:inline opacity-50">→</span>
              <span>MADHYAMA</span>
              <span className="hidden sm:inline opacity-50">→</span>
              <span>VAIKHARI</span>
            </div>
            <div className="font-sans text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between tracking-wide gap-1 sm:gap-0">
              <span className="w-full sm:w-auto text-center">Unmanifest Root</span>
              <span className="w-full sm:w-auto text-center">Internal Vision</span>
              <span className="w-full sm:w-auto text-center">Contemplative Formulation</span>
              <span className="w-full sm:w-auto text-center">Articulated Word</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            <Link 
              href="/architecture"
              className="inline-flex justify-center items-center px-8 py-4 bg-primary text-primary-foreground font-sans uppercase tracking-[0.15em] text-sm font-medium hover:bg-[#E8C66A] transition-colors"
              data-testid="button-explore-architecture"
            >
              Explore Architecture
            </Link>
            <Link 
              href="/blueprint"
              className="inline-flex justify-center items-center px-8 py-4 border border-accent text-accent font-sans uppercase tracking-[0.15em] text-sm font-medium hover:bg-accent/10 transition-colors"
              data-testid="button-read-blueprint"
            >
              Read Blueprint
            </Link>
          </div>
        </motion.div>

        <div className="mt-32 pt-24 border-t border-primary/10" ref={eqRef}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isEqInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, delay: 0.3 }}
            className="flex flex-col items-center justify-center text-center"
          >
            <h2 className="font-sans text-muted-foreground uppercase tracking-[0.2em] text-sm mb-12">
              The Fundamental Equation
            </h2>
            <div className="relative inline-block mb-16">
              <div className="absolute -inset-8 bg-accent/5 blur-3xl rounded-full" />
              <div className="bg-[#0B0F2E] border border-accent/30 shadow-[0_0_30px_rgba(79,172,254,0.15)] p-6 md:p-10">
                <div className="font-mono text-2xl md:text-4xl lg:text-5xl text-[#E8C66A] tracking-wider relative z-10 whitespace-nowrap overflow-x-auto max-w-full">
                  |Ω⟩ = ∫<sub className="text-xl -ml-2 mr-2">-∞</sub><sup className="text-xl -ml-2 mr-4">∞</sup> 
                  σ(t)·e<sup className="text-xl">iβ(t)</sup>·[υ(t) + ξ(t)] dω
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
              <div className="bg-[#0B0F2E] border border-primary/10 p-6 flex flex-col items-center">
                <span className="font-mono text-2xl text-primary mb-2">σ</span>
                <span className="font-serif text-lg mb-1">Sat / Truth</span>
                <span className="font-sans text-xs text-muted-foreground text-center">Amplitude</span>
              </div>
              <div className="bg-[#0B0F2E] border border-primary/10 p-6 flex flex-col items-center">
                <span className="font-mono text-2xl text-primary mb-2">β</span>
                <span className="font-serif text-lg mb-1">Subsistence</span>
                <span className="font-sans text-xs text-muted-foreground text-center">Pattern</span>
              </div>
              <div className="bg-[#0B0F2E] border border-primary/10 p-6 flex flex-col items-center">
                <span className="font-mono text-2xl text-primary mb-2">υ</span>
                <span className="font-serif text-lg mb-1">Value</span>
                <span className="font-sans text-xs text-muted-foreground text-center">Manifest</span>
              </div>
              <div className="bg-[#0B0F2E] border border-primary/10 p-6 flex flex-col items-center">
                <span className="font-mono text-2xl text-primary mb-2">ξ</span>
                <span className="font-serif text-lg mb-1">Stochastic Flux</span>
                <span className="font-sans text-xs text-muted-foreground text-center">Avidya</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
