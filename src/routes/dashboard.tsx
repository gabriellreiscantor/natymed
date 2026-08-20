import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { alertarBonito, confirmarBonito } from "@/components/ConfirmDialog";
import { CompletarNascimento } from "@/components/CompletarNascimento";
import { useEffect, useRef, useState } from "react";
import { BookOpen, FileText, Loader2, RotateCcw, Upload, Users, Check, X, Sparkles } from "lucide-react";
import { usePerfilAtivo, listAllProfiles, acceptProfile, revokeProfile, rejectProfile, undoRejectProfile, countPendentes, assinarPerfisRealtime } from "@/lib/perfis-store";

import { extractTextFromPdf, parseStudyText } from "@/lib/pdf-parser";
import { createStudy, loadCurrent, type CurrentStudy } from "@/lib/study-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Estudo Rosa — Correção automática para provas" },
      {
        name: "description",
        content:
          "Envie um PDF de estudo e transforme em resumos e quiz com correção automática.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { perfil } = usePerfilAtivo();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ page: number; total: number } | null>(null);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<CurrentStudy | null>(null);
  const [tab, setTab] = useState<"estudo" | "admin">("estudo");
  const [pendentes, setPendentes] = useState(0);

  // Sem isso a Naty só descobria que tem alguém na fila se abrisse a aba por acaso.
  useEffect(() => {
    if (!perfil?.is_admin) return;
    let alive = true;
    const contar = () => {
      countPendentes().then((n) => {
        if (alive) setPendentes(n);
      });
    };
    contar();
    // Tempo real: a bolinha muda no instante em que alguém se cadastra.
    // O intervalo fica como rede de segurança se a conexão cair.
    const offRealtime = assinarPerfisRealtime(contar);
    const id = window.setInterval(contar, 60_000);
    window.addEventListener("perfil:atualizado", contar);
    return () => {
      alive = false;
      offRealtime();
      window.clearInterval(id);
      window.removeEventListener("perfil:atualizado", contar);
    };
  }, [perfil?.is_admin]);

  useEffect(() => {
    const refresh = () => {
      loadCurrent().then(setCurrent);
    };
    refresh();
    window.addEventListener("estudo:atualizado", refresh);
    return () => window.removeEventListener("estudo:atualizado", refresh);
  }, []);

  async function handleFile(file: File) {
    if (loading) return;
    setError(null);
    setProgress(null);
    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setError("Ops! Só aceito arquivos PDF por aqui 💗");
      return;
    }
    setStage("Abrindo o PDF...");
    setLoading(true);

    try {
      const text = await extractTextFromPdf(file, (p) => {
        setProgress(p);
        setStage(`Lendo página ${p.page} de ${p.total}`);
      });
      setStage("Organizando resumos e questões...");
      const parsed = parseStudyText(text);
      if (parsed.resumos.length === 0 && parsed.questoes.length === 0) {
        throw new Error(
          "Não encontrei resumos nem questões. Verifique se o PDF segue o formato com ### RESUMO: e ### QUESTAO.",
        );
      }
      setStage("Salvando estudo...");
      await createStudy(file.name.replace(/\.pdf$/i, ""), parsed);
      navigate({ to: parsed.questoes.length > 0 ? "/questoes" : "/resumos" });
    } catch (e) {
      console.error("[upload PDF]", e);
      setError(
        e instanceof Error
          ? e.message
          : "Não consegui ler este PDF. Tente outro arquivo em PDF.",
      );
    } finally {
      setLoading(false);
      setProgress(null);
      setStage("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] py-10 sm:py-16">
      {perfil && <CompletarNascimento perfil={perfil} />}
      <div className="mx-auto max-w-5xl px-4">
        {/* Cabeçalho do Dashboard */}
        <div className="flex flex-col items-center text-center mb-12">
          <Link
            to="/perfil"
            className="group relative mb-8 block h-32 w-32 sm:h-40 sm:w-40 animate-in zoom-in duration-1000"
            title="Meu Perfil"
          >
            <div className="absolute inset-0 animate-pulse rounded-full bg-pink-200/50 blur-2xl" />
            <div className="relative h-full w-full overflow-hidden rounded-full border-8 border-white bg-pink-100 shadow-2xl ring-1 ring-pink-100 transition-transform duration-500 group-hover:scale-105 group-active:scale-95">
              {perfil?.foto_url ? (
                <>
                  <img src={perfil.foto_url} alt={perfil.nome} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-pink-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-pink-600 shadow-sm">
                      Meu Perfil
                    </span>
                  </div>
                </>
              ) : (
                // Sem foto: o convite fica sempre visível dentro da bolinha,
                // no lugar da florzinha (que não dizia o que fazer ali).
                <div className="grid h-full w-full place-items-center px-2">
                  <span className="rounded-full bg-white/90 px-3 py-1.5 text-center text-xs font-bold leading-tight text-pink-600 shadow-sm">
                    Adicione sua fotinha
                  </span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 rounded-full bg-white p-3 shadow-lg animate-bounce text-xl">
              ✨
            </div>
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2 text-sm font-medium text-secondary-foreground animate-in slide-in-from-top-4 duration-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Que bom te ver, {perfil?.nome || "princesa"}! 💗
          </span>

          {perfil?.is_admin && (
            <div className="mt-8 flex rounded-full bg-pink-50 p-1.5 shadow-sm border border-pink-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <button
                onClick={() => setTab("estudo")}
                className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
                  tab === "estudo" ? "bg-white text-pink-600 shadow-md" : "text-pink-400 hover:text-pink-500"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Área de Estudo
              </button>
              <button
                onClick={() => setTab("admin")}
                className={`relative flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
                  tab === "admin" ? "bg-white text-pink-600 shadow-md" : "text-pink-400 hover:text-pink-500"
                }`}
              >
                <Users className="h-4 w-4" />
                Aceitar Meds
                {pendentes > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-pink-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                    {pendentes}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {tab === "estudo" ? (
          <div className="animate-in fade-in duration-700">
            <div className="text-center">
              <h1 className="font-serif text-5xl text-pink-700 sm:text-7xl tracking-tight leading-tight">
                Pronta para<br/>brilhar hoje?
              </h1>
              
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground/90 font-medium">
                {perfil?.is_admin ? (
                  "Sua plataforma está pronta! Envie seus materiais para transformar o estudo em algo mágico para você e suas amigas."
                ) : (
                  "Explore os conteúdos incríveis que a Naty preparou. Cada resumo e cada questão foi pensado para ajudar você a conquistar seus sonhos!"
                )}
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {perfil?.is_admin && (
                  <button 
                    onClick={() => inputRef.current?.click()}
                    className="rounded-full bg-pink-500 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-pink-200 transition-all hover:bg-pink-600 hover:scale-105 active:scale-95"
                  >
                    Novo Estudo 📄
                  </button>
                )}
                <button 
                  onClick={() => navigate({ to: "/resumos" })}
                  className="rounded-full bg-white border-2 border-pink-100 px-8 py-3.5 text-base font-bold text-pink-600 shadow-lg shadow-pink-50/50 transition-all hover:bg-pink-50 hover:scale-105 active:scale-95"
                >
                  Ver Materiais 📚
                </button>
              </div>

              {perfil?.is_admin && (
                <div className="mt-16">
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFile(f);
                    }}
                    className={`flex ${loading ? "cursor-wait" : "cursor-pointer"} flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed bg-white/50 px-6 py-14 text-center shadow-inner transition-all ${
                      dragging
                        ? "border-pink-400 bg-pink-50/50 scale-[1.02]"
                        : "border-pink-200 hover:border-pink-400 hover:bg-pink-50/30"
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      disabled={loading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                    <div className="grid h-20 w-20 place-items-center rounded-3xl bg-pink-100 text-pink-500 shadow-sm">
                      {loading ? (
                        <Loader2 className="h-10 w-10 animate-spin" />
                      ) : (
                        <Upload className="h-10 w-10" />
                      )}
                    </div>
                    <p className="mt-6 font-serif text-2xl text-pink-700">
                      {loading ? stage || "Transformando PDF em magia..." : "Solte seu PDF aqui"}
                    </p>
                    {loading && progress ? (
                      <div className="mt-4 w-full max-w-sm">
                        <div className="h-3 w-full overflow-hidden rounded-full bg-pink-100 shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-500"
                            style={{ width: `${Math.round((progress.page / progress.total) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-sm font-medium text-pink-600">
                          {progress.page} de {progress.total} páginas processadas
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-base text-pink-400">
                        {loading ? "quase pronto, amor..." : "ou clique para selecionar do seu computador"}
                      </p>
                    )}
                  </label>
                </div>
              )}
                
              {!perfil?.is_admin && (
                <div className="mt-16">
                  <div className="rounded-[2.5rem] border border-pink-100 bg-white/40 p-10 text-center shadow-sm backdrop-blur-sm">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-3xl">
                      👸
                    </div>
                    <p className="text-lg text-pink-700 font-medium">
                      Apenas a <strong>Naty (Admin)</strong> pode enviar novos estudos para manter tudo organizadinho e com o padrão Estudo Rosa. ✨
                    </p>
                    <div className="mt-6 flex justify-center">
                      <button 
                        onClick={() => navigate({ to: "/resumos" })}
                        className="flex items-center gap-2 rounded-full bg-pink-100 px-6 py-3 text-pink-700 font-bold hover:bg-pink-200 transition-all shadow-sm"
                      >
                        📖 Explorar Resumos
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              {current && (
                <div className="mt-12 text-left rounded-3xl border border-pink-100 bg-white p-8 shadow-xl shadow-pink-50/50">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-pink-400">
                    Último Material Aberto
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-pink-800">{current.nome}</h2>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigate({ to: "/resumos" })}
                      className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-5 py-2.5 text-sm font-bold text-pink-700 transition-colors hover:bg-pink-100"
                    >
                      <BookOpen className="h-4 w-4" />
                      {current.resumos.length} resumos
                    </button>
                    <button
                      onClick={() => navigate({ to: "/questoes" })}
                      className="inline-flex items-center gap-2 rounded-full bg-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-100 transition-all hover:bg-pink-600"
                    >
                      <FileText className="h-4 w-4" />
                      Começar Quiz ({current.questoes.length} questões)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Aba Admin: Aceitar Meds */
          <AdminPanel />
        )}
      </div>
    </div>
  );
}

function AdminPanel() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const ps = await listAllProfiles();
    setProfiles(ps);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // A lista se atualiza sozinha quando alguém se cadastra ou é aceita,
    // sem a Naty precisar sair e voltar na aba.
    return assinarPerfisRealtime(load);
  }, []);

  const pendentes = profiles.filter(p => !p.is_accepted && !p.is_admin && !p.recusado_em);
  const aceitos = profiles.filter(p => p.is_accepted && !p.is_admin);
  const recusadas = profiles.filter(p => !p.is_accepted && !p.is_admin && p.recusado_em);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-10 text-center">
        <h2 className="font-serif text-4xl text-pink-700">Aceitar Meds ✨</h2>
        <p className="mt-2 text-pink-500/70 font-medium">Controle quem entra no seu consultório, Doutora Naty!</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Coluna: Esperando Aprovação */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-2">
            <Loader2 className={`h-4 w-4 text-amber-500 ${loading ? "animate-spin" : ""}`} />
            <h3 className="font-serif text-xl text-pink-800">Aguardando Aprovação ({pendentes.length})</h3>
          </div>
          
          <div className="space-y-3">
            {pendentes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-pink-100 p-10 text-center text-pink-400 text-sm">
                Nenhuma MedGata na fila por enquanto. 🌸
              </div>
            ) : (
              pendentes.map(p => (
                <ProfileRow key={p.id} profile={p} onAction={load} />
              ))
            )}
          </div>
        </section>

        {/* Coluna: Já no Consultório */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-2">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <h3 className="font-serif text-xl text-pink-800">Já no Consultório ({aceitos.length})</h3>
          </div>
          
          <div className="space-y-3">
            {aceitos.length === 0 ? (
              <div className="rounded-3xl border border-pink-50 bg-pink-50/20 p-10 text-center text-pink-400 text-sm italic">
                Ainda não temos médicas aceitas.
              </div>
            ) : (
              aceitos.map(p => (
                <ProfileRow key={p.id} profile={p} onAction={load} variant="accepted" />
              ))
            )}
          </div>
        </section>
      </div>

      {recusadas.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2 px-2">
            <X className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-serif text-xl text-pink-800">
              Recusadas ({recusadas.length})
            </h3>
          </div>
          <p className="mb-3 px-2 text-xs text-muted-foreground">
            Elas não entram no site e não aparecem na fila. Nada foi apagado —
            você pode devolver para a fila quando quiser.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {recusadas.map(p => (
              <ProfileRow key={p.id} profile={p} onAction={load} variant="rejected" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProfileRow({ profile, onAction, variant = "pending" }: { profile: any, onAction: () => void, variant?: "pending" | "accepted" | "rejected" }) {
  const [loading, setLoading] = useState(false);

  async function comAviso(acao: () => Promise<void>, erro: string) {
    setLoading(true);
    try {
      await acao();
      onAction();
    } catch (e) {
      alertarBonito(erro);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    const ok = await confirmarBonito({
      titulo: "Recusar solicitação?",
      mensagem: `${profile.nome} não vai entrar no site e sai da sua fila. Nada é apagado: você pode devolver para a fila depois, se mudar de ideia.`,
      confirmar: "Recusar",
    });
    if (!ok) return;
    comAviso(
      () => rejectProfile(profile.id),
      "Ops! Não consegui recusar essa solicitação. Tente novamente! 🌸",
    );
  }

  async function handleUndoReject() {
    comAviso(
      () => undoRejectProfile(profile.id),
      "Ops! Não consegui devolver ela para a fila. Tente novamente! 🌸",
    );
  }

  async function handleAccept() {
    setLoading(true);
    try {
      await acceptProfile(profile.id);
      onAction();
    } catch (e) {
      alertarBonito("Ops! Tive um problema ao aceitar essa MedGata. Tente novamente! 🌸");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    const ok = await confirmarBonito({
      titulo: "Tirar do consultório?",
      mensagem: `${profile.nome} volta para a sala de espera e perde o acesso aos materiais. Nada do que ela criou é apagado, e você pode aceitar de novo quando quiser.`,
      confirmar: "Tirar acesso",
    });
    if (!ok) return;
    setLoading(true);
    try {
      await revokeProfile(profile.id);
      onAction();
    } catch (e) {
      alertarBonito("Ops! Não consegui tirar o acesso dela. Tente novamente! 🌸");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group flex items-center justify-between gap-4 rounded-3xl border border-pink-50 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-pink-200">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-pink-100 ring-2 ring-white">
          {profile.foto_url ? (
            <img src={profile.foto_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-pink-400 font-bold">
              {profile.nome[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-pink-800 truncate">{profile.nome}</p>
          <p className="text-xs text-pink-400 truncate">{profile.email}</p>
          {profile.periodo && (
            <span className="mt-1 inline-block rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold text-pink-500">
              {profile.periodo}
            </span>
          )}
        </div>
      </div>
      
      {variant === "pending" ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-90 disabled:opacity-50"
            title="Recusar solicitação"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-100 transition-all hover:bg-pink-600 active:scale-90 disabled:opacity-50"
            title="Aceitar MedGata"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
          </button>
        </div>
      ) : variant === "rejected" ? (
        <button
          onClick={handleUndoReject}
          disabled={loading}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 py-2 text-xs font-bold text-pink-600 transition-all hover:bg-pink-50 active:scale-95 disabled:opacity-50"
          title="Devolver para a fila"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Devolver à fila
        </button>
      ) : (
        <button
          onClick={handleRevoke}
          disabled={loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-300 transition-all hover:bg-rose-100 hover:text-rose-500 active:scale-90 disabled:opacity-50"
          title="Tirar do consultório"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}
