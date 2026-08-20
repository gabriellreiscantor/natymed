import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  GraduationCap,
  History,
  Layers,
  Upload,
  User as UserIcon,
  LogOut,
} from "lucide-react";
import { usePerfilAtivo } from "@/lib/perfis-store";
import { Shield } from "lucide-react";
import { trocarPerfil } from "@/components/PerfilGate";
import { iniciais } from "@/lib/upload-avatar";

const items = [
  { to: "/dashboard", label: "Início", curto: "Início", icon: Upload },
  { to: "/resumos", label: "Resumos", curto: "Resumos", icon: BookOpen },
  { to: "/questoes", label: "Questões", curto: "Questões", icon: FileText },
  { to: "/flashcards", label: "Flashcards", curto: "Cards", icon: Layers },
  { to: "/faculdade", label: "Faculdade", curto: "Facul", icon: GraduationCap },
  { to: "/historico", label: "Histórico", curto: "Histórico", icon: History },
] as const;

export function AppNav() {
  const { perfil } = usePerfilAtivo();
  const location = useLocation();
  const router = useRouter();
  const isPublic = location.pathname === "/";
  // No Início não faz sentido oferecer "voltar": já é a primeira tela de dentro.
  const isInicio = location.pathname === "/dashboard";
  // Atalho só para o dono. O banco é quem realmente barra o acesso;
  // aqui é só para não poluir a barra das meninas.
  const ehDono = perfil?.email?.toLowerCase() === "ghabriellreis@gmail.com";

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
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        {/* ---------- CELULAR: barra compacta ---------- */}
        {/* Com 6 destinos não cabe menu no topo em tela pequena: aqui fica só
            identidade + perfil, e a navegação vai para a barra de baixo. */}
        <div className="flex items-center gap-2 px-3 py-2 sm:hidden">
          {!isInicio && (
            <button
              type="button"
              onClick={voltar}
              aria-label="Voltar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-pink-200 bg-white/70 text-pink-600 shadow-sm active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <Link to="/dashboard" className="flex min-w-0 flex-1 items-center gap-2">
            <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-tr from-pink-200 to-rose-100 shadow-md ring-2 ring-white">
              <img
                src="/nath-logo.jpeg"
                alt="Estudo Rosa"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-serif text-lg leading-tight text-rose-950">
                Estudo Rosa
              </span>
              <span className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-pink-400">
                Medgatas por Amor {"<"}3
              </span>
            </span>
          </Link>

          {perfil && (
            <div className="flex shrink-0 items-center gap-0.5">
              {ehDono && (
                <Link
                  to="/admin"
                  aria-label="Painel do dono"
                  className="grid h-9 w-9 place-items-center rounded-full text-pink-400 active:scale-95"
                >
                  <Shield className="h-4 w-4" />
                </Link>
              )}
              <Link
                to="/perfil"
                aria-label="Meu perfil"
                className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-pink-200 bg-pink-100 text-[10px] font-bold text-pink-700 shadow-sm"
              >
                {perfil.foto_url ? (
                  <img
                    src={perfil.foto_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  iniciais(perfil.nome) || <UserIcon className="h-4 w-4" />
                )}
              </Link>
              <button
                onClick={trocarPerfil}
                aria-label="Sair da conta"
                className="grid h-9 w-9 place-items-center rounded-full text-pink-400 active:scale-95"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ---------- COMPUTADOR: layout completo ---------- */}
        <div className="mx-auto hidden max-w-5xl flex-col gap-3 px-4 py-3 sm:flex sm:items-center sm:py-4">
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

          <div className="relative flex w-full items-center justify-center gap-2">
            <Link
              to="/dashboard"
              className="group flex items-center gap-6 transition-transform hover:scale-[1.02]"
            >
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
                <span className="whitespace-nowrap font-serif text-5xl tracking-tight text-rose-950 leading-none">
                  Estudo Rosa
                </span>
                <span className="mt-2 text-base font-bold uppercase leading-none tracking-[0.3em] text-pink-400">
                  Medgatas por Amor {"<"}3
                </span>
              </div>
            </Link>

            {perfil && (
              <div className="absolute right-0 flex items-center gap-1">
                {ehDono && (
                  <Link
                    to="/admin"
                    title="Painel do dono"
                    className="grid h-8 w-8 place-items-center rounded-full text-pink-400 hover:bg-pink-50 hover:text-pink-600"
                  >
                    <Shield className="h-4 w-4" />
                  </Link>
                )}
                <Link
                  to="/perfil"
                  className="flex items-center gap-1.5 rounded-full border border-pink-200 bg-white/70 py-1 pl-1 pr-2.5 text-xs text-pink-700 shadow-sm hover:bg-pink-50"
                  title="Meu perfil"
                >
                  <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-pink-100 text-[10px] font-semibold text-pink-700">
                    {perfil.foto_url ? (
                      <img
                        src={perfil.foto_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
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

          <nav className="flex items-center justify-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-rose-dark"
                  activeProps={{
                    className:
                      "flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm",
                  }}
                  activeOptions={{ exact: true }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ---------- CELULAR: navegação fixa embaixo ---------- */}
      {/* Ícone em cima e rótulo curto embaixo: cada item fica com a largura
          inteira do dedo, sem texto cortado, em qualquer telefone.
          O padding extra respeita a barra de gestos do iPhone. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors active:bg-pink-50"
                activeProps={{
                  className:
                    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold text-rose-dark transition-colors active:bg-pink-50",
                }}
                activeOptions={{ exact: true }}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="leading-none">{item.curto}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
