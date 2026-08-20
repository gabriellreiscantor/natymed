import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, FolderPlus, Loader2, Pencil, Trash2 } from "lucide-react";

import { alertarBonito, confirmarBonito } from "@/components/ConfirmDialog";
import {
  CORES_MODULO,
  createModulo,
  deleteModulo,
  listModulos,
  moverModulo,
  onModulosChange,
  updateModulo,
  type Modulo,
} from "@/lib/modulos-store";

/** Bolinha colorida + nome. Usada em todas as telas que mostram módulo. */
export function EtiquetaModulo({
  modulo,
  className = "",
}: {
  modulo: Pick<Modulo, "nome" | "cor"> | null | undefined;
  className?: string;
}) {
  if (!modulo) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${className}`}
      style={{ backgroundColor: `${modulo.cor}22`, color: modulo.cor }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: modulo.cor }}
      />
      {modulo.nome}
    </span>
  );
}

/** Painel de criação e edição. Só a Naty enxerga (o banco também exige). */
export function GerenciarModulos() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState<string>(CORES_MODULO[0]);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");

  const recarregar = () => listModulos().then(setModulos);

  useEffect(() => {
    recarregar();
    return onModulosChange(recarregar);
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n || salvando) return;
    setSalvando(true);
    try {
      await createModulo(n, cor);
      setNome("");
      // Próxima cor da paleta, para os módulos não saírem todos iguais.
      const i = CORES_MODULO.indexOf(cor as (typeof CORES_MODULO)[number]);
      setCor(CORES_MODULO[(i + 1) % CORES_MODULO.length]);
    } catch (err) {
      alertarBonito(
        err instanceof Error ? err.message : "Não consegui criar o módulo. 🌷",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function remover(m: Modulo) {
    const ok = await confirmarBonito({
      titulo: `Apagar "${m.nome}"?`,
      mensagem:
        "O módulo some, mas nenhum material ou baralho é apagado — eles só ficam sem módulo e você pode reorganizar depois.",
      confirmar: "Apagar módulo",
    });
    if (!ok) return;
    try {
      await deleteModulo(m.id);
    } catch (err) {
      alertarBonito(
        err instanceof Error ? err.message : "Não consegui apagar. 🌷",
      );
    }
  }

  return (
    <section className="rounded-3xl border border-pink-100 bg-white/70 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <FolderPlus className="h-4 w-4 text-pink-500" />
        <h2 className="font-serif text-xl text-pink-800">Módulos</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Pastas para organizar resumos, questões e flashcards. Como resumos e
        questões vêm do mesmo PDF, marcar o módulo no material organiza as duas
        telas de uma vez.
      </p>

      <form onSubmit={adicionar} className="mb-5 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do módulo (ex: Módulo 1 — Metabolismo)"
            className="flex-1 rounded-full border border-pink-100 bg-pink-50/30 px-5 py-2.5 text-sm text-pink-800 outline-none placeholder:text-pink-300 focus:border-pink-300"
          />
          <button
            type="submit"
            disabled={salvando || !nome.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-100 transition-all hover:bg-pink-600 active:scale-95 disabled:opacity-40"
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4" />
            )}
            Criar
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
            Cor
          </span>
          {CORES_MODULO.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCor(c)}
              aria-label={`Cor ${c}`}
              className={`h-6 w-6 rounded-full transition-transform ${
                cor === c ? "scale-110 ring-2 ring-pink-400 ring-offset-2" : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </form>

      {modulos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-pink-200 p-6 text-center text-sm text-pink-400">
          Nenhum módulo ainda. Crie o primeiro aí em cima! 🌸
        </p>
      ) : (
        <ul className="space-y-2">
          {modulos.map((m, i) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-2xl bg-pink-50/50 px-3 py-2"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: m.cor }}
              />

              {editando === m.id ? (
                <input
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                  onBlur={async () => {
                    const n = rascunho.trim();
                    if (n && n !== m.nome) await updateModulo(m.id, { nome: n });
                    setEditando(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setEditando(null);
                  }}
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-pink-200 bg-white px-2 py-1 text-sm text-pink-800 outline-none"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-pink-800">
                  {m.nome}
                </span>
              )}

              <div className="flex shrink-0 items-center gap-1">
                {CORES_MODULO.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    onClick={() => updateModulo(m.id, { cor: c })}
                    aria-label={`Mudar para ${c}`}
                    className="h-4 w-4 rounded-full opacity-40 transition-opacity hover:opacity-100"
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  onClick={() => moverModulo(m.id, -1, modulos)}
                  disabled={i === 0}
                  aria-label="Subir"
                  className="grid h-7 w-7 place-items-center rounded-full text-pink-400 hover:bg-white disabled:opacity-20"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moverModulo(m.id, 1, modulos)}
                  disabled={i === modulos.length - 1}
                  aria-label="Descer"
                  className="grid h-7 w-7 place-items-center rounded-full text-pink-400 hover:bg-white disabled:opacity-20"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setEditando(m.id);
                    setRascunho(m.nome);
                  }}
                  aria-label="Renomear"
                  className="grid h-7 w-7 place-items-center rounded-full text-pink-400 hover:bg-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remover(m)}
                  aria-label="Apagar"
                  className="grid h-7 w-7 place-items-center rounded-full text-pink-300 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
