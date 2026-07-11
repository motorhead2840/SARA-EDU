import { Link } from "wouter";
import { ArrowRight, Key, Shield, Award, Database, Cpu, HelpCircle } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { motion } from "framer-motion";

export default function Sv() {
  const values = [
    {
      icon: "🧒",
      title: "Varje student är unik",
      desc: "Ingen lär sig på exakt samma sätt. Vissa lär sig bäst genom att läsa, andra genom att göra eller titta. SRI Learn anpassar sig efter varje individ.",
    },
    {
      icon: "💪",
      title: "Självförtroende före innehåll",
      desc: "Innan vi lär ut något säkerställer vi att du känner dig redo att lära. En student med gott självförtroende tar till sig kunskap mycket mer effektivt.",
    },
    {
      icon: "🎯",
      title: "Syftesdrivet lärande",
      desc: "Studenter lär sig bäst när de förstår varför något är viktigt. Varje lektion kopplar till verkliga mål, praktisk nytta och ren nyfikenhet.",
    },
  ];

  const infrastructureFeatures = [
    {
      icon: <Database className="w-6 h-6 text-[#4040FF]" />,
      title: "AWS Cloud & ECS-orkestrering",
      desc: "Vår API-server körs på robusta AWS ECS-instanser för säker och skalbar hantering av datatrafik, med tillförlitlig persistens i PostgreSQL.",
    },
    {
      icon: <Cpu className="w-6 h-6 text-[#0D9488]" />,
      title: "Confluent Cloud MSK-integration",
      desc: "Realtidsmeddelanden och händelseströmmar hanteras via Confluent Cloud för blixtsnabb datasynkronisering och analytisk precision.",
    },
    {
      icon: <Key className="w-6 h-6 text-amber-500" />,
      title: "Ethereum-blockkedja & SARA Token",
      desc: "Använder AWS Managed Blockchain och Sepolia-testnätet för säker utfärdande av on-chain-meriter och distribution av SARA-tokens.",
    },
  ];

  return (
    <div className="overflow-x-hidden bg-gradient-to-b from-[#EEF2FF] to-white min-h-screen">
      
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 flex flex-col lg:flex-row items-center gap-16 relative">
        <div className="flex-1 flex flex-col items-start relative z-10 w-full lg:max-w-[600px]">
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#E5E7EB] bg-white/60 backdrop-blur-sm text-xs font-bold tracking-widest text-[#6B7280] mb-8 uppercase">
            SRI Lärandeprotokoll
          </div>

          <h1 className="font-black text-5xl md:text-7xl leading-[0.95] tracking-tight mb-8 text-[#0F0F1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Världens första <br />
            <span className="text-[#4040FF]">AI-drivna</span> <br />
            Lärande-DAO.
          </h1>

          <p className="text-lg md:text-xl text-[#6B7280] leading-relaxed mb-10 max-w-lg font-medium">
            Ett decentraliserat utbildningsprotokoll där kunskap uppmuntras, verifieras och ägs av studenterna. Tjäna SARA-tokens genom att slutföra kurser, bidra till expertgranskad forskning och uppnå verifierade meriter på blockkedjan.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/choose-path"
              className="w-full sm:w-auto bg-[#0F0F1A] text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-black transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-black/10">
              Utforska kurser <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/choose-path"
              className="w-full sm:w-auto bg-white border-2 border-[#E5E7EB] text-[#0F0F1A] px-8 py-4 rounded-full font-bold text-sm tracking-wide flex items-center justify-center hover:border-[#0F0F1A] transition-colors">
              Läs mer
            </Link>
          </div>

          {/* SARA Cryptographic ID Widget */}
          <div className="mt-16 bg-white p-6 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] border border-[#E5E7EB] max-w-sm w-full relative group hover:shadow-[0_20px_40px_-15px_rgba(64,64,255,0.12)] transition-shadow">
            <div className="text-[10px] font-bold tracking-widest text-[#6B7280] mb-4 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4040FF]" />
              Verifiering av student
            </div>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#4040FF] flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1 text-[#0F0F1A]" style={{ fontFamily: "'Inter', sans-serif" }}>SARA Kryptografiskt ID</h3>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#F3F4F6] text-[10px] font-bold text-[#6B7280] tracking-wider uppercase">
                  <span>⬡</span> Plånbok ej ansluten
                </div>
              </div>
            </div>

            <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
              Anslut din Web3-identitet för att göra anspråk på dina unika lärandenycklar och delta i expertgranskning på kedjan.
            </p>

            <WalletButton variant="dark" className="w-full justify-center" />
          </div>
        </div>

        {/* Hero visual */}
        <div className="flex-1 relative w-full flex justify-center lg:justify-end mt-12 lg:mt-0">
          <div className="absolute -top-12 -right-8 w-64 h-64 bg-[#4040FF] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-[#0D9488] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="relative z-10 w-full max-w-lg aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-[#4040FF]/10 border-[8px] border-white/60 transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-10" />
            <img
              src="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&auto=format&fit=crop&q=60"
              alt="Nature Cliff"
              className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-700"
            />
          </div>
        </div>
      </main>

      {/* Statistics Section */}
      <section className="bg-white border-y border-[#E5E7EB] py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
          {[
            { value: "38,000+", label: "Aktiva studenter" },
            { value: "14,000",  label: "Forskningsrapporter" },
            { value: "180+",    label: "Institutioner" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-black text-[#4040FF] mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>{s.value}</p>
              <p className="text-xs text-[#6B7280] font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#0F0F1A] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              Våra grundläggande värderingar
            </h2>
            <p className="text-lg text-[#6B7280] max-w-2xl mx-auto font-medium">
              Vår pedagogiska filosofi bygger på att placera studentens välmående, engagemang och praktiska förståelse i centrum för all inlärning.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-[#E5E7EB] hover:shadow-xl transition-all duration-300">
                <span className="text-4xl block mb-6">{v.icon}</span>
                <h3 className="text-xl font-bold text-[#0F0F1A] mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>{v.title}</h3>
                <p className="text-[#6B7280] leading-relaxed text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#0F0F1A] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              Skalbar & säker infrastruktur
            </h2>
            <p className="text-lg text-[#6B7280] max-w-2xl mx-auto font-medium">
              Vi bygger nästa generations utbildningsplattform på beprövad, modern cloud- och blockkedje-teknik.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {infrastructureFeatures.map((f, i) => (
              <div key={i} className="bg-slate-50 p-8 rounded-3xl border border-[#E5E7EB] flex flex-col items-start hover:bg-slate-100/50 transition-colors">
                <div className="p-3 bg-white rounded-2xl border border-[#E5E7EB] mb-6">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-[#0F0F1A] mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>{f.title}</h3>
                <p className="text-[#6B7280] leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Section (Abhaya Gate) */}
      <section className="py-24 bg-gradient-to-r from-[#0F0F1A] to-[#1F1F35] text-white">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="inline-block px-4 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-bold tracking-widest mb-6 uppercase">
              Abhaya Säkerhetssystem
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
              En trygg AI-mentor för alla åldrar
            </h2>
            <p className="text-[#A1A1AA] leading-relaxed mb-6 font-medium">
              Abhaya är SRI Learns inbyggda AI-säkerhetsvakt. Genom ett avancerat, termodynamiskt fasutsläckningssystem granskas varje AI-svar innan det når studenten. Detta garanterar att allt pedagogiskt innehåll alltid är till hjälp, vänligt, tillförlitligt och åldersanpassat – utan undantag.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <Shield className="w-5 h-5" /> 100% Säkert & Granskat
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              <Award className="w-5 h-5 text-amber-400" /> SARA Lärandeekonomi
            </h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed mb-6">
              SARA är den inbyggda utility-token för hela vårt lärande-DAO. Studenter belönas direkt till sin plånbok för verifierade akademiska framsteg, slutförda kurser och peer-review-bidrag.
            </p>
            <div className="border-t border-white/10 pt-6">
              <Link href="/choose-path" className="inline-flex items-center gap-2 text-[#4040FF] hover:text-[#5c5cff] font-bold text-sm">
                Kom igång nu <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
