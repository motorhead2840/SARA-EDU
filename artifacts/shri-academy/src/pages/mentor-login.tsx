import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Terminal, Lock, UserPlus, KeyRound, AlertTriangle } from 'lucide-react';
import { mentorLogin, mentorRegister } from '@/lib/mentor-api';

export default function MentorLogin() {
  const [, setLocation] = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regCode, setRegCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        const data = await mentorRegister({ email, password, registration_code: regCode });
        localStorage.setItem('mentor_token', data.token);
        setLocation('/mentor');
      } else {
        const data = await mentorLogin({ email, password });
        localStorage.setItem('mentor_token', data.token);
        setLocation('/mentor');
      }
    } catch (err: any) {
      setError(err.message || 'AUTHENTICATION_FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-black text-system font-mono overflow-hidden selection:bg-system/30 selection:text-system">
      <header className="p-4 border-b border-system/20 bg-black/80 backdrop-blur z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-mentor" />
          <div>
            <h1 className="text-lg font-bold tracking-widest text-glow-mentor uppercase text-mentor leading-tight">MENTOR_PORTAL</h1>
            <div className="text-[10px] uppercase text-mentor/60 tracking-[0.2em]">AUTHENTICATION_TERMINAL</div>
          </div>
        </div>
        <div className="text-xs uppercase text-system/60">SYS_AUTH_READY</div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative">
        {/* Decorative Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(139,92,246,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.2)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        <div className="w-full max-w-md border border-mentor/30 bg-black/50 backdrop-blur p-6 sm:p-8 relative z-10 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-mentor/50"></div>
          
          <div className="mb-8 text-center">
            <Lock className="w-12 h-12 text-mentor opacity-80 mx-auto mb-4" />
            <h2 className="text-xl text-mentor tracking-widest uppercase text-glow-mentor">
              {isRegister ? 'INITIALIZE_ACCESS' : 'SECURE_LOGIN'}
            </h2>
          </div>

          {error && (
            <div className="mb-6 p-3 border border-destructive bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="uppercase break-all">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs text-mentor/70 uppercase tracking-wider block">EMAIL_ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-mentor/30 text-mentor placeholder:text-mentor/30 p-3 focus:outline-none focus:border-mentor focus:ring-1 focus:ring-mentor focus:border-glow-mentor transition-all rounded-none font-mono"
                placeholder="mentor@school.edu"
                data-testid="mentor-email"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-mentor/70 uppercase tracking-wider block">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-mentor/30 text-mentor placeholder:text-mentor/30 p-3 focus:outline-none focus:border-mentor focus:ring-1 focus:ring-mentor focus:border-glow-mentor transition-all rounded-none font-mono"
                placeholder="••••••••"
                data-testid="mentor-password"
                disabled={isLoading}
              />
            </div>

            {isRegister && (
              <div className="space-y-1">
                <label className="text-xs text-mentor/70 uppercase tracking-wider block flex items-center gap-2">
                  REGISTRATION_CODE
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mentor/50" />
                  <input
                    type="text"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    required
                    className="w-full bg-black/50 border border-mentor/30 text-mentor placeholder:text-mentor/30 p-3 pl-10 focus:outline-none focus:border-mentor focus:ring-1 focus:ring-mentor focus:border-glow-mentor transition-all rounded-none font-mono uppercase"
                    placeholder="XXXX-XXXX-XXXX"
                    data-testid="mentor-reg-code"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full border border-mentor text-mentor hover:bg-mentor hover:text-black py-3 uppercase tracking-widest font-bold transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-mentor mt-4 flex justify-center items-center gap-2"
              data-testid={isRegister ? 'mentor-register-btn' : 'mentor-login-btn'}
            >
              {isLoading ? (
                'PROCESSING...'
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" /> CREATE_ACCOUNT
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> AUTHENTICATE
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-mentor/50 hover:text-mentor transition-colors uppercase tracking-widest cursor-pointer"
              data-testid="mode-toggle-link"
              disabled={isLoading}
            >
              {isRegister ? '[ BACK_TO_LOGIN ]' : '[ REQUEST_ACCESS ]'}
            </button>
          </div>
        </div>
      </main>

      {/* Visual Glitch Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px]"></div>
    </div>
  );
}
