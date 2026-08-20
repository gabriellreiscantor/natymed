import { useEffect, useState } from "react";
import { Folder, FolderPlus, Loader2 } from "lucide-react";

import {
  CORES_MODULO,
  createModuloRetornando,
  listModulos,
  type Modulo,
} from "@/lib/modulos-store";
import { moverEstudo } from "@/lib/study-store";

/**
 * Perguntado logo depois do upload: onde este material deve ficar?
 * As pastas de Resumos e de Questões são listas separadas, então perguntamos
 * a de Resumos (a tela principal) e a Naty ajusta Questões na aba de lá.
 */
export function EscolherPasta({
  estudoId,
  nomeEstudo,
  onPronto,
}: {
  estudoId: string;
  nomeEstudo: string;
  onPronto: () => void;
}) {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [criando, setCriando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listModulos("resumos").then(setModulos);
  }, []);

  async function guardarEm(moduloId: string | null) {
    setSalvando(true);
    try {
      if (moduloId) await moverEstudo(estudoId, "resumos", moduloId);
      onPronto();
    } catch {
      setSalvando(false);
    }
  }

  async function criarEGuardar() {
    const nome = nomeNovo.trim();
    if (!nome) return;
    setSalvando(true);
    try {
      const id = await createModuloRetornando(
        nome,
        CORES_MODULO[modulos.length % CORES_MODULO.length],
        "resumos",
      );
      await moverEstudo(estudoId, "resumos", id);
      onPronto();
    } catch {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-pink-950/25 px-4 pb-24 backdrop-blur-sm sm:items-center sm:pb-4">
      <div className="w-full max-w-md rounded-[2rem] border border-pink-100 bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-pink-50 text-pink-500">
          <Folder className="h-6 w-6" />
        </div>
        <h2 className="text-center font-serif text-2xl text-pink-800">
          Onde guardar?
        </h2>
        <p className="mt-1 text-center text-sm text-pink-600/80">
          <strong>{nomeEstudo}</strong> foi enviado! Escolha a pasta dos
          resumos. 💗
        </p>

        {criando ? (
          <div className="mt-5 space-y-3">
            <input
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") criarEGuardar();
                if (e.key === "Escape") setCriando(false);
              }}
              placeholder="Nome da pasta (ex: Módulo 1)"
              autoFocus
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/30 px-4 py-3 text-sm text-pink-800 outline-none placeholder:text-pink-300 focus:border-pink-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCriando(false)}
                className="flex-1 rounded-full border border-border bg-background py-2.5 text-sm font-medium text-muted-foreground"
              >
                Voltar
              </button>
              <button
                onClick={criarEGuardar}
                disabled={!nomeNovo.trim() || salvando}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-pink-500 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar e guardar
              </button>
            </div>
          </div>
        ) : (
          <>
            {modulos.length > 0 && (
              <ul className="mt-5 max-h-56 space-y-1.5 overflow-y-auto">
                {modulos.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => guardarEm(m.id)}
                      disabled={salvando}
                      className="flex w-full items-center gap-2.5 rounded-2xl border border-border bg-background px-3 py-2.5 text-left transition-all hover:border-primary/50 disabled:opacity-50"
                    >
                      <Folder
                        className="h-5 w-5 shrink-0"
                        style={{ color: m.cor }}
                        fill={`${m.cor}33`}
                      />
                      <span className="truncate text-sm font-medium text-pink-800">
                        {m.nome}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setCriando(true)}
              disabled={salvando}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-pink-200 py-3 text-sm font-bold text-pink-600 transition-all hover:border-pink-400 hover:bg-pink-50 disabled:opacity-50"
            >
              <FolderPlus className="h-4 w-4" />
              Criar nova pasta
            </button>

            <button
              onClick={() => guardarEm(null)}
              disabled={salvando}
              className="mt-3 w-full text-xs text-pink-400 underline underline-offset-4 hover:text-pink-600 disabled:opacity-50"
            >
              Deixar fora das pastas
            </button>
          </>
        )}
      </div>
    </div>
  );
}
