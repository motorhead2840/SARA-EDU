import React, { useState, useEffect, useRef } from 'react';
import { useShriChat, useGetShriState, useResetShriSession, getGetShriStateQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Terminal, Send, Activity, Zap, ShieldAlert, Cpu, RefreshCw, Award, Pen, Gamepad2, BookOpen, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  circuit?: 'A' | 'B';
  contextUsed?: string[];
}

export default function Home({ isMentorObserver }: { isMentorObserver?: boolean }) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Poll state every 3 seconds
  const { data: shriState } = useGetShriState(
    { session_id: sessionId },
    { 
      query: { 
        refetchInterval: 3000,
        queryKey: getGetShriStateQueryKey({ session_id: sessionId })
      } 
    }
  );

  const chatMutation = useShriChat();
  const resetMutation = useResetShriSession();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    
    // Maintain focus
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);

    chatMutation.mutate(
      { data: { message: userMessage.text, session_id: sessionId } },
      {
        onSuccess: (data) => {
          const aiMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sender: 'ai',
            text: data.response,
            timestamp: new Date(),
            circuit: data.circuit,
            contextUsed: data.context_used
          };
          setMessages((prev) => [...prev, aiMessage]);
          
          // Update state optimistically with data from the response (except message_count — let polling handle it)
          queryClient.setQueryData(getGetShriStateQueryKey({ session_id: sessionId }), (old: any) => ({
            ...old,
            circuit: data.circuit,
            frustration_level: data.frustration_level,
            correct_streak: data.correct_streak,
            session_id: data.session_id,
          }));
        },
        onError: () => {
          const errorMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sender: 'ai',
            text: "SYS_ERR: Connection to SHRI interrupted. Retrying would be futile unless you speak clearly.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }
    );
  };

  const handleReset = () => {
    if (resetMutation.isPending) return;
    resetMutation.mutate(
      { data: { session_id: sessionId } },
      {
        onSuccess: () => {
          setMessages([]);
          queryClient.invalidateQueries({ queryKey: getGetShriStateQueryKey({ session_id: sessionId }) });
        }
      }
    );
  };

  const isCircuitA = shriState?.circuit === 'A';
  const frustrationLevel = shriState?.frustration_level || 0;
  const correctStreak = shriState?.correct_streak || 0;

  return (
    <div className={`flex flex-col bg-black text-system font-mono overflow-hidden selection:bg-system/30 selection:text-system ${isMentorObserver ? 'absolute inset-0' : 'h-[100dvh]'}`}>
      {/* Header StatusBar */}
      <header className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 border-b border-system/20 bg-black/80 backdrop-blur z-10 gap-3">
        
        {/* Title Area */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Cpu className="w-6 h-6 text-system" />
            <div className="absolute inset-0 bg-system/20 blur-md rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-widest text-glow-system uppercase leading-tight">Shri_Academy</h1>
            <div className="text-[10px] uppercase text-system/60 tracking-[0.2em]">Socratic_Tutor_Terminal</div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Circuit Indicator */}
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 border transition-all duration-300 ${
              isCircuitA 
                ? 'border-system/50 bg-system/10 text-system border-glow-system' 
                : 'border-mentor/50 bg-mentor/10 text-mentor border-glow-mentor'
            }`}
            data-testid="status-circuit"
          >
            {isCircuitA ? <Zap className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
            <span className="uppercase font-bold tracking-wider">
              {isCircuitA ? 'CIRCUIT A : SUPPORTIVE' : 'CIRCUIT B : SOCRATIC'}
            </span>
          </div>

          {/* Frustration Bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 border border-system/20 bg-black" data-testid="status-frustration">
            <span className="text-system/60 uppercase">Frustration</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div 
                  key={level} 
                  className={`w-2 h-4 ${
                    level <= frustrationLevel 
                      ? level >= 4 ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)]' 
                        : level >= 2 ? 'bg-user shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                        : 'bg-system shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                      : 'bg-system/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Streak Counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 border border-system/20 bg-black" data-testid="status-streak">
            <span className="text-system/60 uppercase">Streak</span>
            <span className={`font-bold ${correctStreak > 2 ? 'text-user text-glow-user' : 'text-system'}`}>
              {correctStreak.toString().padStart(2, '0')}
            </span>
          </div>

          {/* NVIDIA Feature Links */}
          {!isMentorObserver && (
            <>
              <a href="/drawing" onClick={(e) => { e.preventDefault(); window.history.pushState(null,'','/drawing'); window.dispatchEvent(new Event('popstate')); }}
                className="flex items-center gap-2 px-3 py-1.5 border border-system/40 text-system/70 hover:bg-system/10 hover:text-system transition-colors uppercase cursor-pointer"
                data-testid="nav-drawing">
                <Pen className="w-3 h-3" /><span className="hidden sm:inline">Draw</span>
              </a>
              <a href="/games" onClick={(e) => { e.preventDefault(); window.history.pushState(null,'','/games'); window.dispatchEvent(new Event('popstate')); }}
                className="flex items-center gap-2 px-3 py-1.5 border border-user/40 text-user/70 hover:bg-user/10 hover:text-user transition-colors uppercase cursor-pointer"
                data-testid="nav-games">
                <Gamepad2 className="w-3 h-3" /><span className="hidden sm:inline">Games</span>
              </a>
              <a href="/mythology" onClick={(e) => { e.preventDefault(); window.history.pushState(null,'','/mythology'); window.dispatchEvent(new Event('popstate')); }}
                className="flex items-center gap-2 px-3 py-1.5 border border-mentor/40 text-mentor/70 hover:bg-mentor/10 hover:text-mentor transition-colors uppercase cursor-pointer"
                data-testid="nav-mythology">
                <BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Lore</span>
              </a>
              <a href="/forum" onClick={(e) => { e.preventDefault(); window.history.pushState(null,'','/forum'); window.dispatchEvent(new Event('popstate')); }}
                className="flex items-center gap-2 px-3 py-1.5 border border-system/40 text-system/70 hover:bg-system/10 hover:text-system transition-colors uppercase cursor-pointer"
                data-testid="nav-forum">
                <MessageSquare className="w-3 h-3" /><span className="hidden sm:inline">Forum</span>
              </a>
              <a href="/dev-team" onClick={(e) => { e.preventDefault(); window.history.pushState(null,'','/dev-team'); window.dispatchEvent(new Event('popstate')); }}
                className="flex items-center gap-2 px-3 py-1.5 border border-user/40 text-user/70 hover:bg-user/10 hover:text-user transition-colors uppercase cursor-pointer"
                data-testid="nav-dev-team">
                <Terminal className="w-3 h-3" /><span className="hidden sm:inline">Dev Team</span>
              </a>
            </>
          )}

          {/* Research Navigator Link */}
          {!isMentorObserver && (
            <a
              href="/research"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/research');
                window.dispatchEvent(new Event('popstate'));
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-user/40 text-user/70 hover:bg-user/10 hover:text-user transition-colors uppercase cursor-pointer"
              data-testid="nav-research"
            >
              <Cpu className="w-3 h-3" />
              <span className="hidden sm:inline">Research</span>
            </a>
          )}

          {/* Scholarship Link */}
          {!isMentorObserver && (
            <a
              href="/scholarship"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/scholarship');
                window.dispatchEvent(new Event('popstate'));
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-mentor/40 text-mentor/70 hover:bg-mentor/10 hover:text-mentor transition-colors uppercase cursor-pointer"
              data-testid="nav-scholarship"
            >
              <Award className="w-3 h-3" />
              <span className="hidden sm:inline">Scholarship</span>
            </a>
          )}

          {/* Subscribe Link */}
          {!isMentorObserver && (
            <a 
              href="/subscribe"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/subscribe');
                window.dispatchEvent(new Event('popstate'));
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-user/50 text-user hover:bg-user/10 transition-colors uppercase cursor-pointer text-glow-user"
              data-testid="nav-subscribe"
            >
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">Upgrade</span>
            </a>
          )}

          {/* Reset Button */}
          <button 
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors uppercase cursor-pointer disabled:opacity-50"
            data-testid="button-reset"
          >
            <RefreshCw className={`w-3 h-3 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative">
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(6,182,212,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {isMentorObserver && (
          <div className="max-w-4xl mx-auto border border-mentor/50 bg-mentor/10 text-mentor px-4 py-2 mb-4 text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            ACTIVE_SESSION_MODE: MENTOR_OBSERVER | You are attending an AI tutoring session as a school mentor.
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md opacity-70">
              <Terminal className="w-12 h-12 mx-auto text-system opacity-50" />
              <p className="text-sm uppercase tracking-widest leading-relaxed">
                Terminal initialized.<br/>
                Subject: Photosynthesis & Cellular Respiration.<br/>
                Waiting for input...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 max-w-4xl mx-auto pb-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                data-testid={`message-${msg.sender}-${msg.id}`}
              >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60 mb-1">
                  {msg.sender === 'user' ? (
                    <>
                      <span className="text-user">USER_INPUT</span>
                      <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-mentor">{msg.circuit === 'A' ? 'SYS_SHRI_SUPPORT' : 'SYS_SHRI_SOCRATIC'}</span>
                      <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </>
                  )}
                </div>
                
                <div 
                  className={`relative max-w-[90%] sm:max-w-[85%] p-4 text-sm sm:text-base leading-relaxed typing-animation ${
                    msg.sender === 'user' 
                      ? 'bg-user/5 border border-user/30 text-user rounded-none' 
                      : 'bg-mentor/5 border border-mentor/30 text-mentor rounded-none'
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${msg.sender === 'user' ? 'bg-user' : 'bg-mentor'}`}></div>
                  
                  {msg.text.split('\n').map((line, i) => (
                    <span key={i} className="block min-h-[1.5em]">{line}</span>
                  ))}

                  {msg.sender === 'ai' && msg.contextUsed && msg.contextUsed.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-mentor/20">
                      <div className="text-[10px] uppercase tracking-wider text-mentor/50 mb-1 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Source_Fragments_Engaged
                      </div>
                      <ul className="text-xs text-mentor/70 space-y-1 list-disc pl-4 opacity-70">
                        {msg.contextUsed.map((ctx, i) => (
                          <li key={i} className="truncate max-w-xs sm:max-w-md">{ctx}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading State */}
            {chatMutation.isPending && (
              <div className="flex flex-col items-start gap-1" data-testid="message-loading">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60 mb-1">
                  <span className="text-mentor">SYS_SHRI_COMPUTING</span>
                </div>
                <div className="relative p-4 border border-mentor/30 bg-mentor/5 text-mentor flex items-center gap-2">
                  <div className="absolute top-0 left-0 w-1 h-full bg-mentor"></div>
                  <div className="flex gap-1">
                    <span className="w-2 h-4 bg-mentor animate-pulse"></span>
                    <span className="w-2 h-4 bg-mentor animate-pulse" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-4 bg-mentor animate-pulse" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-black border-t border-system/20 relative z-10">
        <form 
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto relative flex items-center"
        >
          <div className="absolute left-4 text-user font-bold text-lg select-none pointer-events-none opacity-80">
            {'>'}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={chatMutation.isPending}
            placeholder={chatMutation.isPending ? "SYSTEM PROCESSING..." : "AWAITING_INPUT"}
            className="w-full bg-black/50 border border-system/30 text-user placeholder:text-system/30 p-4 pl-10 pr-16 focus:outline-none focus:border-user focus:ring-1 focus:ring-user focus:border-glow-user transition-all rounded-none uppercase disabled:opacity-50"
            data-testid="input-chat"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || chatMutation.isPending}
            className="absolute right-2 p-2 text-system hover:text-user hover:bg-user/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            data-testid="button-submit"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </footer>
      
      {/* Visual Glitch / Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]"></div>
    </div>
  );
}
