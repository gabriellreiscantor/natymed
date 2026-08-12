import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, FileText, History, Layers, Upload, User as UserIcon, LogOut } from "lucide-react";
import { usePerfilAtivo } from "@/lib/perfis-store";
import { trocarPerfil } from "@/components/PerfilGate";
import { iniciais } from "@/lib/upload-avatar";

const items = [
  { to: "/dashboard", label: "Início", icon: Upload },
  { to: "/resumos", label: "Resumos", icon: BookOpen },
  { to: "/questoes", label: "Questões", icon: FileText },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/historico", label: "Histórico", icon: History },
] as const;

export function AppNav() {
  const { perfil } = usePerfilAtivo();
  const location = useLocation();
  const router = useRouter();
  const isPublic = location.pathname === "/";
  // No Início não faz sentido oferecer "voltar": já é a primeira tela de dentro.
  const isInicio = location.pathname === "/dashboard";

  if (isPublic) return null;

  function voltar() {
    // Se a aluna abriu o link direto (sem histórico na aba), o back do
    // navegador sairia do site. Nesse caso mandamos para o Início.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/dashboard" });
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:items-center sm:py-4">
        {!isInicio && (
          <div className="flex w-full justify-start">
            <button
              type="button"
              onClick={voltar}
              className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-pink-600 shadow-sm transition-all hover:bg-pink-50 active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
          </div>
        )}
        <div className="flex w-full items-center justify-between gap-2 sm:justify-center sm:relative">
          <Link to="/dashboard" className="flex items-center gap-6 group transition-transform hover:scale-[1.02]">
            <div className="relative">
              <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-gradient-to-tr from-pink-200 to-rose-100 shadow-xl ring-4 ring-white transition-all group-hover:shadow-pink-200/50">
                <img
                  src="/nath-logo.jpeg"
                  alt="Estudo Rosa"
                  className="h-full w-full object-cover"
                />
              </span>
              <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-white p-1 shadow-md">
                <div className="h-full w-full rounded-full bg-pink-400 animate-pulse" />
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="whitespace-nowrap font-serif text-4xl tracking-tight text-rose-950 leading-none sm:text-5xl">
                Estudo Rosa
              </span>
              <span className="text-sm font-bold uppercase tracking-[0.3em] text-pink-400 leading-none mt-2 sm:text-base">
                Medgatas por Amor {"<"}3
              </span>
            </div>
          </Link>

          {perfil && (
            <div className="flex items-center gap-1 sm:absolute sm:right-0">
              <Link
                to="/perfil"
                className="flex items-center gap-1.5 rounded-full border border-pink-200 bg-white/70 py-1 pl-1 pr-2.5 text-xs text-pink-700 shadow-sm hover:bg-pink-50"
                title="Meu perfil"
              >
                <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-pink-100 text-[10px] font-semibold text-pink-700">
                  {perfil.foto_url ? (
                    <img src={perfil.foto_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    iniciais(perfil.nome) || <UserIcon className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="max-w-[70px] truncate">{perfil.nome}</span>
              </Link>
              <button
                onClick={trocarPerfil}
                title="Trocar de perfil"
                className="grid h-8 w-8 place-items-center rounded-full text-pink-400 hover:bg-pink-50 hover:text-pink-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <nav className="flex w-full items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-sm sm:w-auto sm:gap-1 sm:justify-center">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-rose-dark sm:flex-none sm:gap-1.5 sm:px-3 sm:text-sm"
                activeProps={{
                  className:
                    "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-primary px-1.5 py-1.5 text-[11px] font-medium text-primary-foreground shadow-sm sm:flex-none sm:gap-1.5 sm:px-3 sm:text-sm",
                }}
                activeOptions={{ exact: true }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
