consgue entender a plataforma?
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import logoAsset from "@/assets/nath-logo.jpeg.asset.json";
import heroImage from "@/assets/profile-hero.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estudo Rosa — Sua Plataforma Mágica de Estudos" },
      {
        name: "description",
        content: "Transforme seus PDFs em resumos e quizzes automáticos com o Estudo Rosa.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const medicalPhrases = [
    { text: "#medgata", top: "5%", left: "5%", rotate: "-15deg", opacity: 0.5 },
    { text: "Futura Dra.", top: "15%", left: "85%", rotate: "10deg", opacity: 0.4 },
    { text: "#medicinaporvalorhahaha", top: "45%", left: "2%", rotate: "5deg", opacity: 0.5 },
    { text: "Café + Anatomia", top: "10%", left: "75%", rotate: "-5deg", opacity: 0.4 },
    { text: "Plantão do Amor", top: "48%", left: "85%", rotate: "-10deg", opacity: 0.5 },
    { text: "Sobrevivendo ao Ciclo Básico", top: "68%", left: "2%", rotate: "12deg", opacity: 0.4 },
    { text: "#foconoestetoscopio", top: "68%", left: "80%", rotate: "-8deg", opacity: 0.4 },
    { text: "Dra. em Formação", top: "2%", left: "45%", rotate: "3deg", opacity: 0.4 },
    { text: "Cadê meu CRM?", top: "82%", left: "40%", rotate: "7deg", opacity: 0.4 },
    { text: "#estudaqueavidamuda", top: "35%", left: "90%", rotate: "-12deg", opacity: 0.5 },
  ];

  return (
    <div className="flex flex-col relative min-h-screen">
      {/* Floating Sparkles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="animate-sparkle absolute text-pink-300"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `-${Math.random() * 20}s`,
              fontSize: `${Math.random() * 20 + 10}px`,
            }}
          >
            <Sparkles className="fill-current opacity-50" />
          </div>
        ))}
      </div>

      {/* Background Floating Phrases */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0" aria-hidden="true">
        {medicalPhrases.map((phrase, i) => (
          <span
            key={i}
            className="absolute font-serif font-bold text-pink-500 animate-in fade-in duration-1000 whitespace-nowrap"
            style={{
              top: phrase.top,
              left: phrase.left,
              transform: `rotate(${phrase.rotate})`,
              opacity: phrase.opacity,
              fontSize: `${Math.random() * (1.5 - 1) + 1}rem`,
            }}
          >
            {phrase.text}
          </span>
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-transparent px-4 pt-20 pb-16 sm:pt-32 sm:pb-24">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-pink-50/50 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-pink-50/50 blur-3xl" />

        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-8 inline-flex animate-in fade-in slide-in-from-top-4 duration-700 items-center gap-2 rounded-full bg-pink-50 px-4 py-1.5 text-sm font-semibold text-pink-600 shadow-sm ring-1 ring-pink-100">
            <Sparkles className="h-4 w-4" />
            <span>O jeito mais fofo de aprender</span>
          </div>

          <div className="mb-10 flex justify-center animate-in zoom-in duration-1000">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-400 to-rose-300 opacity-75 blur transition duration-1000 group-hover:opacity-100" />
              <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-white shadow-2xl sm:h-64 sm:w-64">
                <img 
                  src="/nath-logo.jpeg" 
                  alt="Nath" 
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('profile-hero.png')) {
                      target.src = '/profile-hero.png';
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <h1 className="animate-in fade-in slide-in-from-bottom-4 duration-700 font-serif text-5xl font-bold tracking-tight text-pink-700 sm:text-7xl">
            Estude com<br />
            <span className="text-rose-dark">amor e foco.</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Uma plataforma feita exclusivamente para alunas bonitas que serão médicas incríveis! 🎀✨ Transformamos aqueles PDFs infinitos em resumos fofos e quizzes rápidos para você estudar com estilo e sem perder a pose. Porque a gente estuda muito, mas sempre de CRM e gloss na mão! 💅🩺
            <br /><br />
            Eu crio as questões e vocês estudam.
          </p>

          <div className="mt-12 flex animate-in fade-in slide-in-from-bottom-8 duration-1000 justify-center gap-4">
            <Link
              to="/dashboard"
              className="group relative inline-flex items-center gap-2 rounded-full bg-pink-500 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-pink-200 transition-all hover:bg-pink-600 hover:scale-105 active:scale-95"
            >
              Entrar na Plataforma
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-pink-50/30 px-4 py-20 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 sm:grid-cols-3">
            <FeatureCard
              icon={<BookOpen className="h-8 w-8 text-pink-500" />}
              title="Resumos Mágicos"
              description="Nossa IA organiza o conteúdo mais importante do seu PDF para você focar no que importa."
            />
            <FeatureCard
              icon={<CheckCircle2 className="h-8 w-8 text-pink-500" />}
              title="Quizzes Express"
              description="Teste seus conhecimentos na hora com questões geradas automaticamente do seu material."
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-pink-500" />}
              title="Identidade Visual"
              description="Estude em um ambiente calmo, bonito e feito pensando em você, com todo o charme do rosa."
            />
          </div>
        </div>
      </section>

      {/* Footer / Call to Action */}
      <footer className="bg-white px-4 py-12 text-center border-t border-pink-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-pink-50 shadow-sm ring-2 ring-pink-100">
            <img 
              src="/nath-logo.jpeg" 
              alt="Logo Estudo Rosa" 
              className="h-full w-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('profile-hero.png')) {
                  target.src = '/profile-hero.png';
                }
              }}
            />
          </div>
          <p className="text-sm font-medium text-pink-400">
            &copy; 2026 Estudo Rosa - Criado com 💗 para mentes brilhantes.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-md ring-1 ring-pink-50">
        {icon}
      </div>
      <h3 className="mb-3 font-serif text-2xl font-semibold text-pink-700">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
