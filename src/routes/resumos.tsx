import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Heart,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Volume2,
  Square,
  X,
} from "lucide-react";
import { speak, stopSpeak } from "@/lib/tts";

import {
  loadCurrent,
  loadMarcasResumo,
  saveResumos,
  setMarcaResumo,
  type CurrentStudy,
  type ResumoMarca,
} from "@/lib/study-store";
import { usePerfilAtivo } from "@/lib/perfis-store";
import { alertarBonito } from "@/components/ConfirmDialog";
import { StudyPicker } from "@/components/StudyPicker";

export const Route = createFileRoute("/resumos")({
  head: () => ({
    meta: [{ title: "Resumos — Estudo Rosa" }],
  }),
  component: ResumosPage,
});

type Filtro = "todos" | "nao_lidos" | "favoritos";

function ResumosPage() {
  const [current, setCurrent] = useState<CurrentStudy | null>(null);
  const [marcas, setMarcas] = useState<Map<number, ResumoMarca>>(new Map());
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const { perfil } = usePerfilAtivo();
  // Só quem enviou o material pode mexer nele: ele é o mesmo para todas.
  const podeEditar = !!perfil && !!current && current.perfil_id === perfil.id;

  useEffect(() => {
    const refresh = () => {
      loadCurrent().then(setCurrent);
    };
    refresh();
    window.addEventListener("estudo:atualizado", refresh);
    return () => window.removeEventListener("estudo:atualizado", refresh);
  }, []);

  useEffect(() => {
    if (!current) {
      setMarcas(new Map());
      return;
    }
    loadMarcasResumo(current.id).then(setMarcas);
  }, [current?.id]);

  async function salvarResumo(
    indice: number,
    dados: { titulo: string; texto: string },
  ) {
    if (!current) return;
    const novos = current.resumos.map((r, i) => (i === indice ? dados : r));
    // Atualiza a tela na hora; se o banco recusar, voltamos ao que estava.
    const anterior = current;
    setCurrent({ ...current, resumos: novos });
    try {
      await saveResumos(current.id, novos);
    } catch (e) {
      setCurrent(anterior);
      alertarBonito(
        e instanceof Error ? e.message : "Não consegui salvar esse resumo. 🌷",
      );
    }
  }

  async function acrescentarResumo() {
    if (!current) return;
    const novos = [...current.resumos, { titulo: "Novo resumo", texto: "" }];
    const anterior = current;
    setCurrent({ ...current, resumos: novos });
    try {
      await saveResumos(current.id, novos);
    } catch (e) {
      setCurrent(anterior);
      alertarBonito(
        e instanceof Error ? e.message : "Não consegui criar o resumo. 🌷",
      );
    }
  }

  /** Atualiza na tela na hora e grava no banco em seguida. */
  function alterarMarca(indice: number, patch: { lido?: boolean; favorito?: boolean }) {
    if (!current) return;
    const atual = marcas.get(indice) ?? { indice, lido: false, favorito: false };
    const novo = { ...atual, ...patch };
    setMarcas((m) => new Map(m).set(indice, novo));
    setMarcaResumo(current.id, indice, patch, atual);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-4xl">Resumos</h1>
        <p className="mt-2 text-muted-foreground">
          Escolha um estudo abaixo. 🌷
        </p>
      </div>

      <StudyPicker currentId={current?.id ?? null} onPick={() => {}} />

      {!current ? (
        <EmptyState />
      ) : current.resumos.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Este PDF não trouxe resumos. Vamos direto para as questões?
          </p>
          <Link
            to="/questoes"
            className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Ir para o quiz
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
            {current.nome}
          </p>

          <FiltroResumos
            filtro={filtro}
            onMudar={setFiltro}
            total={current.resumos.length}
            lidos={current.resumos.filter((_, i) => marcas.get(i)?.lido).length}
            favoritos={
              current.resumos.filter((_, i) => marcas.get(i)?.favorito).length
            }
          />

          <div className="space-y-6">
            {current.resumos.map((r, i) => {
              const marca = marcas.get(i);
              if (filtro === "nao_lidos" && marca?.lido) return null;
              if (filtro === "favoritos" && !marca?.favorito) return null;
              return (
                <ResumoCard
                  key={i}
                  index={i}
                  titulo={r.titulo}
                  texto={r.texto}
                  lido={!!marca?.lido}
                  favorito={!!marca?.favorito}
                  podeEditar={podeEditar}
                  onSalvar={(dados) => salvarResumo(i, dados)}
                  onAlterar={(patch) => alterarMarca(i, patch)}
                />
              );
            })}
          </div>

          {podeEditar && (
            <div className="mt-6 text-center">
              <button
                onClick={acrescentarResumo}
                className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-pink-200 bg-white/60 px-6 py-3 text-sm font-bold text-pink-600 transition-all hover:border-pink-400 hover:bg-pink-50 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Acrescentar resumo
              </button>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              to="/questoes"
              className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              Começar as questões
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function FiltroResumos({
  filtro,
  onMudar,
  total,
  lidos,
  favoritos,
}: {
  filtro: Filtro;
  onMudar: (f: Filtro) => void;
  total: number;
  lidos: number;
  favoritos: number;
}) {
  const opcoes: Array<{ id: Filtro; label: string; contagem: number }> = [
    { id: "todos", label: "Todos", contagem: total },
    { id: "nao_lidos", label: "Não lidos", contagem: total - lidos },
    { id: "favoritos", label: "Favoritos", contagem: favoritos },
  ];

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativo = o.id === filtro;
          return (
            <button
              key={o.id}
              onClick={() => onMudar(o.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                ativo
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-pink-200 bg-white text-pink-700 hover:bg-pink-50"
              }`}
            >
              {o.label}
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  ativo ? "bg-white/25" : "bg-pink-50"
                }`}
              >
                {o.contagem}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${total > 0 ? (lidos / total) * 100 : 0}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {lidos === total && total > 0
          ? "Você leu todos os resumos deste material! 💗"
          : `${lidos} de ${total} resumos lidos`}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
      <p className="text-muted-foreground">
        Nenhum estudo aberto. Escolha um da lista acima ou envie um novo PDF.
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
      >
        Enviar PDF
      </Link>
    </div>
  );
}

function ResumoCard({
  index,
  titulo,
  texto,
  lido,
  favorito,
  podeEditar,
  onSalvar,
  onAlterar,
}: {
  index: number;
  titulo: string;
  texto: string;
  lido: boolean;
  favorito: boolean;
  podeEditar: boolean;
  onSalvar: (dados: { titulo: string; texto: string }) => Promise<void>;
  onAlterar: (patch: { lido?: boolean; favorito?: boolean }) => void;
}) {
  const blocos = useMemo(() => parseResumo(texto), [texto]);
  const [lendo, setLendo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [rascunhoTitulo, setRascunhoTitulo] = useState(titulo);
  const [rascunhoTexto, setRascunhoTexto] = useState(texto);
  const [salvando, setSalvando] = useState(false);

  function abrirEdicao() {
    stopSpeak();
    setLendo(false);
    setRascunhoTitulo(titulo);
    setRascunhoTexto(texto);
    setEditando(true);
  }

  async function confirmar() {
    const t = rascunhoTitulo.trim();
    if (!t) return;
    setSalvando(true);
    try {
      await onSalvar({ titulo: t, texto: rascunhoTexto });
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => () => stopSpeak(), []);

  function toggleLeitura() {
    if (lendo) {
      stopSpeak();
      setLendo(false);
      return;
    }
    const texoLimpo = `${titulo}. ${textoParaFala(texto)}`;
    setLendo(true);
    speak(texoLimpo);
    const check = setInterval(() => {
      if (!window.speechSynthesis?.speaking) {
        setLendo(false);
        clearInterval(check);
      }
    }, 400);
  }

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      <div className="p-6 sm:p-7">
        {editando ? (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Editando o resumo {String(index + 1).padStart(2, "0")}
            </p>
            <input
              value={rascunhoTitulo}
              onChange={(e) => setRascunhoTitulo(e.target.value)}
              placeholder="Título do resumo"
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/30 px-4 py-2.5 font-serif text-xl text-foreground outline-none focus:border-pink-400"
            />
            <textarea
              value={rascunhoTexto}
              onChange={(e) => setRascunhoTexto(e.target.value)}
              rows={12}
              placeholder="Conteúdo do resumo. Use - no começo da linha para virar tópico e **texto** para negrito."
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/30 px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none focus:border-pink-400"
            />
            <p className="text-[11px] text-muted-foreground">
              Dica: comece a linha com <strong>-</strong> para virar tópico e use{" "}
              <strong>**assim**</strong> para deixar em negrito.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setEditando(false)}
                disabled={salvando}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/30 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={salvando || !rascunhoTitulo.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {salvando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Salvar
              </button>
            </div>
          </div>
        ) : (
        <>
        <header className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-rose-dark shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Resumo {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-0.5 font-serif text-2xl leading-tight text-foreground">
              {titulo}
            </h2>
          </div>
          {podeEditar && (
            <button
              onClick={abrirEdicao}
              title="Editar resumo"
              aria-label="Editar resumo"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-pink-200 bg-white text-pink-500 transition-colors hover:bg-pink-50 hover:text-pink-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onAlterar({ favorito: !favorito })}
            title={favorito ? "Tirar dos favoritos" : "Favoritar resumo"}
            aria-label={favorito ? "Tirar dos favoritos" : "Favoritar resumo"}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${
              favorito
                ? "border-pink-400 bg-pink-50 text-pink-500"
                : "border-pink-200 bg-white text-pink-300 hover:bg-pink-50 hover:text-pink-500"
            }`}
          >
            <Heart className={`h-4 w-4 ${favorito ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={toggleLeitura}
            title={lendo ? "Parar leitura" : "Ouvir resumo"}
            aria-label={lendo ? "Parar leitura" : "Ouvir resumo"}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${
              lendo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-pink-200 bg-white text-pink-600 hover:bg-pink-50"
            }`}
          >
            {lendo ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </header>

        <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-foreground/90">
          {blocos.map((b, i) => (
            <BlocoView key={i} bloco={b} />
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <button
            onClick={() => onAlterar({ lido: !lido })}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
              lido
                ? "border-[color:var(--success)]/40 bg-[color:var(--success-bg)] text-[color:var(--success)]"
                : "border-pink-200 bg-white text-pink-600 hover:bg-pink-50"
            }`}
          >
            <Check className="h-4 w-4" />
            {lido ? "Resumo lido" : "Marcar como lido"}
          </button>
        </div>
        </>
        )}
      </div>
    </article>
  );
}

// converte texto do PDF para uma versão limpa para leitura em voz alta
function textoParaFala(bruto: string): string {
  return bruto
    .replace(/\r/g, "")
    .replace(/-\n(\w)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^[\-•*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Bloco =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "titulo"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "definicoes"; itens: { termo: string; definicao: string }[] }
  | { tipo: "destaque"; texto: string };

function BlocoView({ bloco }: { bloco: Bloco }) {
  if (bloco.tipo === "titulo") {
    return (
      <h3 className="mt-2 flex items-center gap-2 font-serif text-lg text-rose-dark">
        <Sparkles className="h-4 w-4 text-primary" />
        {bloco.texto}
      </h3>
    );
  }
  if (bloco.tipo === "lista") {
    return (
      <ul className="space-y-2 pl-1">
        {bloco.itens.map((it, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="min-w-0 flex-1">{renderInline(it)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (bloco.tipo === "definicoes") {
    return (
      <dl className="space-y-2.5">
        {bloco.itens.map((it, i) => (
          <div
            key={i}
            className="rounded-2xl border border-primary/15 bg-secondary/30 p-3.5"
          >
            <dt className="font-semibold text-rose-dark">{it.termo}</dt>
            <dd className="mt-0.5 text-foreground/85">
              {renderInline(it.definicao)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  if (bloco.tipo === "destaque") {
    return (
      <blockquote className="rounded-2xl border-l-4 border-primary bg-secondary/40 p-4 italic text-foreground/85">
        {renderInline(bloco.texto)}
      </blockquote>
    );
  }
  return <p>{renderInline(bloco.texto)}</p>;
}

// destaca **negrito** e *itálico*
function renderInline(texto: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return partes.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return (
        <strong key={i} className="font-semibold text-rose-dark">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (/^\*[^*]+\*$/.test(p)) {
      return (
        <em key={i} className="text-foreground/80">
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function parseResumo(bruto: string): Bloco[] {
  if (!bruto) return [];

  // 1. normaliza quebras estranhas do PDF
  const limpo = bruto
    .replace(/\r/g, "")
    .replace(/-\n(\w)/g, "$1") // palavras hifenizadas
    .replace(/([^\n•\-*])\n(?![\n•\-\*\d])/g, "$1 ") // quebra solta -> espaço
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();

  const paragrafos = limpo.split(/\n\n+/);
  const blocos: Bloco[] = [];

  for (const p of paragrafos) {
    const linhas = p
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (linhas.length === 0) continue;

    // lista: 2+ linhas começando com marcador
    const eLista = linhas.length >= 2 && linhas.every((l) => /^([-•*]|\d+[.)])\s+/.test(l));
    if (eLista) {
      blocos.push({
        tipo: "lista",
        itens: linhas.map((l) => l.replace(/^([-•*]|\d+[.)])\s+/, "")),
      });
      continue;
    }

    // definições: 2+ linhas "Termo: definição" (termo curto sem ponto final)
    const defs = linhas
      .map((l) => {
        const m = l.match(/^([^:]{2,40}):\s+(.+)$/);
        if (!m) return null;
        if (/[.!?]$/.test(m[1])) return null;
        return { termo: m[1].trim(), definicao: m[2].trim() };
      })
      .filter(Boolean) as { termo: string; definicao: string }[];
    if (defs.length >= 2 && defs.length === linhas.length) {
      blocos.push({ tipo: "definicoes", itens: defs });
      continue;
    }

    // título: uma linha curta e sem ponto final
    if (
      linhas.length === 1 &&
      linhas[0].length <= 80 &&
      !/[.!?]$/.test(linhas[0]) &&
      /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]/.test(linhas[0])
    ) {
      // heurística: parece um subtítulo (poucas palavras, maiúsculo)
      const palavras = linhas[0].split(/\s+/).length;
      if (palavras <= 10) {
        blocos.push({ tipo: "titulo", texto: linhas[0] });
        continue;
      }
    }

    // destaque: parágrafo que começa com "Importante", "Atenção", "Dica"
    if (/^(importante|atenção|atencao|dica|obs|nota|lembre)/i.test(linhas[0])) {
      blocos.push({ tipo: "destaque", texto: linhas.join(" ") });
      continue;
    }

    blocos.push({ tipo: "paragrafo", texto: linhas.join(" ") });
  }

  return blocos;
}
