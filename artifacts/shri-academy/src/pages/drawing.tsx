import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Pen, Eraser, Square, Circle, Minus, Type, Trash2, Download, Palette } from 'lucide-react';

type Tool = 'pen' | 'eraser' | 'line' | 'rect' | 'circle' | 'text';

const COLORS = ['#06B6D4', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#F97316', '#ffffff', '#94A3B8'];
const STROKES = [2, 4, 8, 14];

interface DrawState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  isDrawing: boolean;
  startX: number;
  startY: number;
  snapshot: ImageData | null;
}

export default function DrawingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<DrawState>({
    tool: 'pen', color: '#06B6D4', strokeWidth: 4,
    isDrawing: false, startX: 0, startY: 0, snapshot: null,
  });
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [textValue, setTextValue] = useState('');

  // Resize canvas to container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext('2d');
      const snapshot = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      // Fill black
      if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (snapshot) ctx.putImageData(snapshot, 0, 0);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const src = 'touches' in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);

    if (state.tool === 'text') {
      setTextPos({ x, y });
      setShowTextInput(true);
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    const snapshot = ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    setState((s) => ({ ...s, isDrawing: true, startX: x, startY: y, snapshot }));

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = state.tool === 'eraser' ? '#000' : state.color;
    ctx.lineWidth = state.tool === 'eraser' ? state.strokeWidth * 4 : state.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [state]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!state.isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);

    if (state.tool === 'pen' || state.tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
      return;
    }

    // Shape tools — restore snapshot then draw shape preview
    if (state.snapshot) ctx.putImageData(state.snapshot, 0, 0);
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.strokeWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();

    if (state.tool === 'line') {
      ctx.moveTo(state.startX, state.startY);
      ctx.lineTo(x, y);
    } else if (state.tool === 'rect') {
      ctx.rect(state.startX, state.startY, x - state.startX, y - state.startY);
    } else if (state.tool === 'circle') {
      const r = Math.sqrt((x - state.startX) ** 2 + (y - state.startY) ** 2);
      ctx.arc(state.startX, state.startY, r, 0, Math.PI * 2);
    }
    ctx.stroke();
  }, [state]);

  const endDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!state.isDrawing) return;
    setState((s) => ({ ...s, isDrawing: false, snapshot: null }));
  }, [state.isDrawing]);

  const commitText = () => {
    if (!textValue.trim()) { setShowTextInput(false); setTextValue(''); return; }
    const ctx = getCtx();
    if (!ctx) return;
    ctx.font = `${state.strokeWidth * 5 + 10}px monospace`;
    ctx.fillStyle = state.color;
    ctx.fillText(textValue, textPos.x, textPos.y);
    setShowTextInput(false);
    setTextValue('');
  };

  const clearCanvas = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `shri-drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pen',    icon: <Pen className="w-4 h-4" />,    label: 'PEN'    },
    { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'ERASE'  },
    { id: 'line',   icon: <Minus className="w-4 h-4" />,  label: 'LINE'   },
    { id: 'rect',   icon: <Square className="w-4 h-4" />, label: 'RECT'   },
    { id: 'circle', icon: <Circle className="w-4 h-4" />, label: 'CIRCLE' },
    { id: 'text',   icon: <Type className="w-4 h-4" />,   label: 'TEXT'   },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-system font-mono overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-system/20 bg-black/90 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="flex items-center gap-1 text-system/60 hover:text-system text-xs uppercase tracking-wider transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </Link>
          <div className="h-4 w-px bg-system/20" />
          <h1 className="text-sm font-bold tracking-widest text-glow-system uppercase">Drawing_Pad</h1>
          <span className="text-[10px] text-system/40 uppercase tracking-widest hidden sm:block">// text + diagrams only</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 px-3 py-1.5 border border-system/30 text-system/60 hover:text-system hover:border-system text-xs uppercase tracking-wider transition-all"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
          <button
            onClick={downloadCanvas}
            className="flex items-center gap-1 px-3 py-1.5 border border-user/50 text-user hover:bg-user/10 text-xs uppercase tracking-wider transition-all"
          >
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar toolbar */}
        <aside className="flex flex-col gap-2 p-3 border-r border-system/20 bg-black/60 w-14 sm:w-20 items-center shrink-0">
          {/* Tool selector */}
          <div className="text-[9px] uppercase text-system/30 tracking-widest mb-1 hidden sm:block">Tools</div>
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setState((s) => ({ ...s, tool: t.id }))}
              title={t.label}
              className={`w-9 h-9 flex flex-col items-center justify-center border transition-all text-[9px] uppercase gap-0.5 ${
                state.tool === t.id
                  ? 'border-system bg-system/20 text-system'
                  : 'border-system/20 text-system/40 hover:border-system/60 hover:text-system/70'
              }`}
            >
              {t.icon}
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}

          <div className="w-full h-px bg-system/20 my-1" />

          {/* Color swatches */}
          <div className="text-[9px] uppercase text-system/30 tracking-widest mb-1 hidden sm:block">Color</div>
          <div className="flex flex-col gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setState((s) => ({ ...s, color: c }))}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 border transition-all ${
                  state.color === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'
                }`}
              />
            ))}
          </div>

          <div className="w-full h-px bg-system/20 my-1" />

          {/* Stroke width */}
          <div className="text-[9px] uppercase text-system/30 tracking-widest mb-1 hidden sm:block">Size</div>
          {STROKES.map((w) => (
            <button
              key={w}
              onClick={() => setState((s) => ({ ...s, strokeWidth: w }))}
              className={`w-9 flex items-center justify-center py-1 border transition-all ${
                state.strokeWidth === w
                  ? 'border-system text-system'
                  : 'border-system/20 text-system/40 hover:border-system/60'
              }`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: Math.min(w * 2, 20), height: Math.min(w * 2, 20) }}
              />
            </button>
          ))}
        </aside>

        {/* Canvas area */}
        <div ref={containerRef} className="relative flex-1 bg-black overflow-hidden cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className="absolute inset-0 touch-none"
            style={{ cursor: state.tool === 'eraser' ? 'cell' : state.tool === 'text' ? 'text' : 'crosshair' }}
          />

          {/* Text input overlay */}
          {showTextInput && (
            <div
              className="absolute z-20"
              style={{ left: textPos.x, top: textPos.y - 10 }}
            >
              <input
                ref={textInputRef}
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') { setShowTextInput(false); setTextValue(''); } }}
                onBlur={commitText}
                className="bg-transparent border-b border-dashed font-mono focus:outline-none"
                style={{ color: state.color, fontSize: state.strokeWidth * 5 + 10, minWidth: 120, caretColor: state.color }}
                placeholder="type here..."
              />
            </div>
          )}

          {/* Canvas grid hint */}
          <div
            className="pointer-events-none absolute inset-0 opacity-5"
            style={{ backgroundImage: 'radial-gradient(circle, #06B6D4 1px, transparent 1px)', backgroundSize: '32px 32px' }}
          />

          {/* Current tool badge */}
          <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-system/30">
            <Palette className="w-3 h-3" />
            <span>{state.tool}</span>
            <span>/</span>
            <div className="w-3 h-3 rounded-full border border-system/30" style={{ backgroundColor: state.color }} />
          </div>
        </div>
      </div>

      {/* Scan line overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-[0.06] bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]" />
    </div>
  );
}
