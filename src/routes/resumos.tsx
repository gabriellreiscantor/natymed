import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Sparkles, Volume2, Square } from "lucide-react";
import { speak, stopSpeak } from "@/lib/tts";

import { loadCurrent, type CurrentStudy } from "@/lib/study-store";
import { StudyPicker } from "@/components/StudyPicker";

export const Route = createFileRoute("/resumos")({
  head: () => ({
    meta: [{ title: "Resumos — Estudo Rosa" }],
  }),
  component: ResumosPage,
});

function ResumosPage() {
  const [current, setCurrent] = useState<CurrentStudy | null>(null);

  useEffect(() => {
    const refresh = () => {
      loadCurrent().then(setCurrent);
    };
    refresh();
    window.addEventListener("estudo:atualizado", refresh);
    return () => window.removeEventListener("estudo:atualizado", refresh);
  }, []);

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

          <div className="space-y-6">
            {current.resumos.map((r, i) => (
              <ResumoCard key={i} index={i} titulo={r.titulo} texto={r.texto} />
            ))}
          </div>

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
}: {
  index: number;
  titulo: string;
  texto: string;
}) {
  const blocos = useMemo(() => parseResumo(texto), [texto]);
  const [lendo, setLendo] = useState(false);

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
