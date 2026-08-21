import { useState } from "react";
import { Check, GripVertical, Loader2, Plus, Trash2, X } from "lucide-react";

import { alertarBonito, confirmarBonito } from "@/components/ConfirmDialog";
import type { Questao } from "@/lib/pdf-parser";

const LETRAS = ["A", "B", "C", "D", "E", "F"];

function questaoVazia(): Questao {
  return {
    enunciado: "",
    alternativas: [
      { letra: "A", texto: "" },
      { letra: "B", texto: "" },
      { letra: "C", texto: "" },
      { letra: "D", texto: "" },
    ],
    gabarito: "A",
    explicacao: "",
  };
}

/**
 * Editor de uma questão escrita à mão (sem PDF).
 * As letras são sempre recalculadas a partir da posição: se ela apagar a "B",
 * a antiga "C" vira "B" e o gabarito acompanha, senão a resposta certa
 * apontaria para a alternativa errada.
 */
function EditorQuestao({
  inicial,
  onSalvar,
  onCancelar,
}: {
  inicial: Questao;
  onSalvar: (q: Questao) => Promise<void>;
  onCancelar: () => void;
}) {
  const [enunciado, setEnunciado] = useState(inicial.enunciado);
  const [alternativas, setAlternativas] = useState(
    inicial.alternativas.map((a) => a.texto),
  );
  const [gabarito, setGabarito] = useState(
    Math.max(0, LETRAS.indexOf(inicial.gabarito)),
  );
  const [explicacao, setExplicacao] = useState(inicial.explicacao);
  const [salvando, setSalvando] = useState(false);

  const preenchidas = alternativas.filter((a) => a.trim()).length;
  const valido =
    enunciado.trim().length > 0 && preenchidas >= 2 && !!alternativas[gabarito]?.trim();

  function removerAlternativa(i: number) {
    if (alternativas.length <= 2) return;
    setAlternativas((as) => as.filter((_, k) => k !== i));
    // O gabarito acompanha o deslocamento das letras.
    setGabarito((g) => (i === g ? 0 : i < g ? g - 1 : g));
  }

  async function salvar() {
    if (!valido) return;
    setSalvando(true);
    try {
      await onSalvar({
        enunciado: enunciado.trim(),
        alternativas: alternativas
          .map((texto, i) => ({ letra: LETRAS[i], texto: texto.trim() }))
          .filter((a) => a.texto),
        gabarito: LETRAS[gabarito],
        explicacao: explicacao.trim(),
      });
    } catch (e) {
      alertarBonito(
        e instanceof Error ? e.message : "Não consegui salvar a questão. 🌷",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border-2 border-pink-200 bg-white p-5 shadow-sm">
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-pink-400">
          Enunciado
        </label>
        <textarea
          value={enunciado}
          onChange={(e) => setEnunciado(e.target.value)}
          rows={3}
          placeholder="Escreva a pergunta aqui..."
          autoFocus
          className="w-full rounded-2xl border border-pink-200 bg-pink-50/30 px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-pink-300 focus:border-pink-400"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-pink-400">
          Alternativas — toque na bolinha para marcar a correta
        </label>
        <ul className="space-y-2">
          {alternativas.map((texto, i) => {
            const correta = i === gabarito;
            return (
              <li key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGabarito(i)}
                  title="Marcar como correta"
                  aria-label={`Marcar ${LETRAS[i]} como correta`}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-all active:scale-90 ${
                    correta
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-pink-200 bg-white text-pink-500"
                  }`}
                >
                  {correta ? <Check className="h-4 w-4" /> : LETRAS[i]}
                </button>
                <input
                  value={texto}
                  onChange={(e) =>
                    setAlternativas((as) =>
                      as.map((v, k) => (k === i ? e.target.value : v)),
                    )
                  }
                  placeholder={`Alternativa ${LETRAS[i]}`}
                  className={`min-w-0 flex-1 rounded-2xl border bg-pink-50/30 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-pink-300 ${
                    correta
                      ? "border-emerald-300 focus:border-emerald-400"
                      : "border-pink-200 focus:border-pink-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => removerAlternativa(i)}
                  disabled={alternativas.length <= 2}
                  title="Remover alternativa"
                  aria-label="Remover alternativa"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-pink-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-20"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>

        {alternativas.length < LETRAS.length && (
          <button
            type="button"
            onClick={() => setAlternativas((as) => [...as, ""])}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-dashed border-pink-300 px-3 py-1.5 text-xs font-bold text-pink-600 hover:bg-pink-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Mais uma alternativa
          </button>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-pink-400">
          Explicação (aparece quando ela erra)
        </label>
        <textarea
          value={explicacao}
          onChange={(e) => setExplicacao(e.target.value)}
          rows={3}
          placeholder="Por que essa é a resposta certa? (opcional, mas ajuda muito)"
          className="w-full rounded-2xl border border-pink-200 bg-pink-50/30 px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-pink-300 focus:border-pink-400"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={onCancelar}
          disabled={salvando}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/30"
        >
          Cancelar
        </button>
        <button
          onClick={salvar}
          disabled={!valido || salvando}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Salvar questão
        </button>
      </div>

      {!valido && (
        <p className="text-[11px] text-muted-foreground">
          Faltam o enunciado, pelo menos duas alternativas preenchidas e a
          correta marcada.
        </p>
      )}
    </div>
  );
}

/**
 * Painel de administração das questões de um material.
 * Fica separado do quiz: aqui ela escreve e organiza, no quiz ela responde.
 */
export function AdminQuestoes({
  questoes,
  onSalvarTudo,
}: {
  questoes: Questao[];
  onSalvarTudo: (qs: Questao[]) => Promise<void>;
}) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);

  async function adicionar(q: Questao) {
    await onSalvarTudo([...questoes, q]);
    setCriando(false);
  }

  async function substituir(i: number, q: Questao) {
    await onSalvarTudo(questoes.map((antiga, k) => (k === i ? q : antiga)));
    setEditando(null);
  }

  async function apagar(i: number) {
    const ok = await confirmarBonito({
      titulo: "Apagar questão?",
      mensagem: `A questão ${i + 1} será removida deste material.`,
      confirmar: "Apagar",
    });
    if (ok) await onSalvarTudo(questoes.filter((_, k) => k !== i));
  }

  async function mover(i: number, direcao: -1 | 1) {
    const j = i + direcao;
    if (j < 0 || j >= questoes.length) return;
    const copia = [...questoes];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    await onSalvarTudo(copia);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {questoes.length} questão{questoes.length === 1 ? "" : "ões"} neste
          material
        </p>
        {!criando && editando === null && (
          <button
            onClick={() => setCriando(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nova questão
          </button>
        )}
      </div>

      {criando && (
        <EditorQuestao
          inicial={questaoVazia()}
          onSalvar={adicionar}
          onCancelar={() => setCriando(false)}
        />
      )}

      {questoes.length === 0 && !criando ? (
        <div className="rounded-3xl border border-dashed border-pink-200 p-10 text-center">
          <p className="text-sm text-pink-400">
            Nenhuma questão ainda. Crie a primeira aí em cima, ou envie um PDF no
            Início. 🌸
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {questoes.map((q, i) =>
            editando === i ? (
              <li key={i}>
                <EditorQuestao
                  inicial={q}
                  onSalvar={(nova) => substituir(i, nova)}
                  onCancelar={() => setEditando(null)}
                />
              </li>
            ) : (
              <li
                key={i}
                className="rounded-3xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary font-serif text-sm text-rose-dark">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-relaxed text-foreground/90">
                      {q.enunciado}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {q.alternativas.map((a) => (
                        <li
                          key={a.letra}
                          className={`text-xs ${
                            a.letra === q.gabarito
                              ? "font-bold text-[color:var(--success)]"
                              : "text-muted-foreground"
                          }`}
                        >
                          {a.letra}) {a.texto}
                          {a.letra === q.gabarito && " ✓"}
                        </li>
                      ))}
                    </ul>
                    {q.explicacao && (
                      <p className="mt-2 rounded-xl bg-secondary/40 p-2 text-xs leading-relaxed text-foreground/70">
                        {q.explicacao}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-1">
                  <button
                    onClick={() => mover(i, -1)}
                    disabled={i === 0}
                    title="Subir"
                    aria-label="Subir questão"
                    className="grid h-8 w-8 place-items-center rounded-full text-pink-400 hover:bg-pink-50 disabled:opacity-20"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                  <button
                    onClick={() => setEditando(i)}
                    className="rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs font-bold text-pink-600 hover:bg-pink-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => apagar(i)}
                    title="Apagar questão"
                    aria-label="Apagar questão"
                    className="grid h-8 w-8 place-items-center rounded-full text-pink-300 hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
