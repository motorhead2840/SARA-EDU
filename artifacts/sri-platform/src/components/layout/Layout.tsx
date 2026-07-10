import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col text-[#0F0F1A] bg-[#EEF2FF] selection:bg-[#4040FF]/20 selection:text-[#4040FF]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar />
      <main className="flex-1 flex flex-col pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
