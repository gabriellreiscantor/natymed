import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, Target, X } from "lucide-react";

import {
  addHistory,
  deleteProgresso,
  loadCurrent,
  loadProgresso,
  saveProgresso,
  type CurrentStudy,
} from "@/lib/study-store";
import { StudyPicker } from "@/components/StudyPicker";
import { usePerfilAtivo } from "@/lib/perfis-store";


export const Route = createFileRoute("/questoes")({
  head: () => ({
    meta: [{ title: "Questões — Estudo Rosa" }],
  }),
  component: QuestoesPage,
});

function QuestoesPage() {
  const { perfil } = usePerfilAtivo();
  const [current, setCurrent] = useState<CurrentStudy | null>(null);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [finalizado, setFinalizado] = useState(false);
  const [salvo, setSalvo] = useState(false);
  // Quando ela pede para treinar só o que errou, guardamos os índices dessas
  // questões. É uma rodada de treino: não mexe no progresso salvo do quiz.
  const [somenteErros, setSomenteErros] = useState<number[] | null>(null);
  const [, setCarregando] = useState(true);
  const navigate = useNavigate();
  // Evita salvar antes de carregar o progresso remoto (não sobrescreve com {} vazio)
  const prontoParaSalvar = useRef(false);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      prontoParaSalvar.current = false;
      setCarregando(true);
      const cur = await loadCurrent();
      if (!alive) return;
      setCurrent(cur);
      if (cur) {
        const p = await loadProgresso(cur.id);
        if (!alive) return;
        setRespostas(p?.respostas ? mapKeysToNumber(p.respostas) : {});
        setFinalizado(Boolean(p?.finalizado));
        setSalvo(Boolean(p?.finalizado));
      } else {
        setRespostas({});
        setFinalizado(false);
        setSalvo(false);
      }
      setCarregando(false);
      // libera persistência no próximo tick para não disparar com o estado recém-carregado
      setTimeout(() => {
        prontoParaSalvar.current = true;
      }, 0);
    };
    refresh();
    window.addEventListener("estudo:atualizado", refresh);
    return () => {
      alive = false;
      window.removeEventListener("estudo:atualizado", refresh);
    };
  }, [perfil?.id]);

  const visiveis = useMemo(() => {
    if (!current) return [] as number[];
    return somenteErros ?? current.questoes.map((_, i) => i);
  }, [current, somenteErros]);

  const total = visiveis.length;
  const respondidas = visiveis.filter((i) => Boolean(respostas[i])).length;
  const acertos = useMemo(() => {
    if (!current) return 0;
    return visiveis.reduce(
      (acc, i) => acc + (respostas[i] === current.questoes[i].gabarito ? 1 : 0),
      0,
    );
  }, [current, respostas, visiveis]);

  /** Índices que ela errou na rodada que acabou de terminar. */
  const indicesErrados = useMemo(() => {
    if (!current) return [] as number[];
    return visiveis.filter(
      (i) => respostas[i] && respostas[i] !== current.questoes[i].gabarito,
    );
  }, [current, respostas, visiveis]);

  // Persiste progresso no Supabase sempre que muda
  useEffect(() => {
    if (!current || !prontoParaSalvar.current) return;
    // Treino de erros não sobrescreve o progresso do quiz completo.
    if (somenteErros) return;
    if (respondidas === 0 && !finalizado) return;
    saveProgresso(current.id, {
      respostas: Object.fromEntries(
        Object.entries(respostas).map(([k, v]) => [String(k), v]),
      ),
      finalizado,
    });
  }, [current, respostas, finalizado, respondidas, somenteErros]);

  useEffect(() => {
    if (!current || total === 0) return;
    if (respondidas === total && !finalizado) {
      setFinalizado(true);
    }
  }, [current, total, respondidas, finalizado]);

  useEffect(() => {
    if (finalizado && current && !salvo) {
      const nota = total > 0 ? Math.round((acertos / total) * 100) / 10 : 0;
      addHistory({
        estudo_id: current.id,
        nome: somenteErros ? `${current.nome} (revisão dos erros)` : current.nome,
        nota,
        acertos,
        total,
        data: new Date().toISOString(),
        respostas: Object.fromEntries(
          visiveis
            .filter((i) => respostas[i])
            .map((i) => [String(i), respostas[i]]),
        ),
      });

      setSalvo(true);
    }
  }, [finalizado, current, salvo, acertos, total, respostas, visiveis, somenteErros]);




  if (!current || current.questoes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-4xl">Questões</h1>
          <p className="mt-2 text-muted-foreground">Escolha um estudo.</p>
        </div>
        <StudyPicker currentId={current?.id ?? null} onPick={() => {}} />
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">
            {current
              ? "Este PDF não trouxe questões."
              : "Nenhum estudo aberto. Escolha um da lista acima ou envie um novo PDF."}
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Enviar PDF
          </Link>
        </div>
      </div>
    );
  }


  function refazer() {
    if (current) deleteProgresso(current.id);
    setSomenteErros(null);
    setRespostas({});
    setFinalizado(false);
    setSalvo(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Repetir 40 questões para treinar as 6 que errou desanima. Aqui ela refaz
   * só o que errou, mantendo as respostas certas de fora da rodada.
   */
  function treinarErros() {
    const erros = indicesErrados;
    if (erros.length === 0) return;
    setSomenteErros(erros);
    setRespostas((r) => {
      const limpo = { ...r };
      erros.forEach((i) => delete limpo[i]);
      return limpo;
    });
    setFinalizado(false);
    setSalvo(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function mapKeysToNumber(obj: Record<string, string>): Record<number, string> {
    const out: Record<number, string> = {};
    for (const [k, v] of Object.entries(obj)) out[Number(k)] = v;
    return out;
  }



  const nota = total > 0 ? Math.round((acertos / total) * 100) / 10 : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-4xl">Questões</h1>
      </div>

      <StudyPicker currentId={current.id} onPick={() => {}} />

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {current.nome}
        </p>
      </div>

      {somenteErros && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-200 bg-pink-50/60 px-4 py-3">
          <p className="text-sm font-medium text-pink-700">
            <Target className="mr-1.5 inline h-4 w-4" />
            Treinando só as {somenteErros.length} que você errou. Essa rodada não
            altera o quiz completo. 💗
          </p>
          <button
            onClick={refazer}
            className="rounded-full border border-pink-300 bg-white px-3 py-1.5 text-xs font-bold text-pink-600 hover:bg-pink-50"
          >
            Voltar ao quiz inteiro
          </button>
        </div>
      )}


      <div className="sticky top-[76px] z-20 mb-6 rounded-full border border-border bg-card/95 p-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3 px-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/60">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(respondidas / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {respondidas}/{total}
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {visiveis.map((i) => {
          const q = current.questoes[i];
          const escolhida = respostas[i];
          const respondida = Boolean(escolhida);
          return (
            <article
              key={i}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-baseline gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary font-serif text-sm text-rose-dark">
                  {i + 1}
                </span>
                <p className="text-[15px] leading-relaxed text-foreground/90">
                  {limparTexto(q.enunciado)}
                </p>
              </div>

              <div className="mt-5 space-y-2">
                {q.alternativas.map((a) => {
                  const isEscolhida = escolhida === a.letra;
                  const isCorreta = q.gabarito === a.letra;
                  let cls =
                    "border-border bg-background hover:border-primary/60 hover:bg-secondary/30";
                  if (respondida) {
                    if (isCorreta) {
                      cls =
                        "border-[color:var(--success)]/40 bg-[color:var(--success-bg)] text-[color:var(--success)]";
                    } else if (isEscolhida) {
                      cls =
                        "border-[color:var(--error)]/40 bg-[color:var(--error-bg)] text-[color:var(--error)]";
                    } else {
                      cls = "border-border bg-background/60 opacity-70";
                    }
                  }
                  return (
                    <button
                      key={a.letra}
                      disabled={respondida}
                      onClick={() =>
                        setRespostas((r) => ({ ...r, [i]: a.letra }))
                      }
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition-all disabled:cursor-default ${cls}`}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs font-semibold">
                        {a.letra}
                      </span>
                      <span className="min-w-0 flex-1">
                        {limparTexto(a.texto)}
                      </span>
                      {respondida && isCorreta && (
                        <Check className="h-5 w-5 shrink-0" />
                      )}
                      {respondida && !isCorreta && isEscolhida && (
                        <X className="h-5 w-5 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {respondida && q.explicacao && (
                <div className="mt-4 rounded-2xl bg-secondary/40 p-4 text-sm leading-relaxed text-secondary-foreground">
                  <p className="mb-1 font-semibold text-rose-dark">
                    Explicação
                  </p>
                  <p>{limparTexto(q.explicacao)}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {finalizado && (
        <div className="mt-10 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Sua nota
          </p>
          <p className="mt-2 font-serif text-7xl text-rose-dark">
            {nota.toFixed(1).replace(".", ",")}
          </p>
          <p className="mt-2 text-muted-foreground">
            {acertos} de {total} acertos
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-foreground/80">
            {mensagem(nota)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {indicesErrados.length > 0 && (
              <button
                onClick={treinarErros}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
              >
                <Target className="h-4 w-4" />
                Treinar só os {indicesErrados.length} que errei
              </button>
            )}
            <button
              onClick={refazer}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium ${
                indicesErrados.length > 0
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  : "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              {somenteErros ? "Refazer o quiz inteiro" : "Refazer o quiz"}
            </button>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/70"
            >
              Voltar ao início
            </button>
            <button
              onClick={() => navigate({ to: "/historico" })}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 text-sm font-medium text-foreground hover:bg-secondary/30"
            >
              Ver histórico
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function limparTexto(texto: string) {
  if (!texto) return "";
  return texto
    .replace(/-\n/g, "") // junta palavras hifenizadas quebradas
    .replace(/([^\n])\n(?!\n)/g, "$1 ") // quebra única vira espaço
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function mensagem(nota: number) {
  if (nota >= 9) return "Arrasou! 💗 Você mandou super bem.";
  if (nota >= 7) return "Muito bem! Está no caminho, continue firme. ✨";
  if (nota >= 5) return "Boa! Revisa os pontos que erraste e faz de novo.";
  return "Sem crise: revisa os resumos com carinho e tenta de novo. Você consegue! 🌷";
}
