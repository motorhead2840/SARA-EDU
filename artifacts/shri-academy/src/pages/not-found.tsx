import { useLocation } from "wouter";
import { Terminal } from "lucide-react";

export default function NotFound() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-system">
      <div className="max-w-md w-full border border-system/30 p-8 border-glow-system bg-black relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-system/20"></div>
        
        <div className="flex flex-col items-center text-center gap-6">
          <Terminal className="w-16 h-16 text-system animate-pulse" />
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter text-glow-system uppercase">
              ERR_404
            </h1>
            <p className="text-system/60 uppercase tracking-widest text-sm">
              Sector <span className="text-user">[{location}]</span> Not Found
            </p>
          </div>
          
          <p className="text-sm text-system/80 border-l-2 border-system pl-4 text-left font-mono">
            CONNECTION_LOST
            <br />
            NO_SIGNAL_DETECTED
            <br />
            RETURN_TO_BASE_REQUIRED
          </p>
        </div>
      </div>
    </div>
  );
}
