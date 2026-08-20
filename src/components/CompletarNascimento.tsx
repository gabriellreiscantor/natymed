import { useState } from "react";
import { CalendarHeart, Loader2, X } from "lucide-react";

import { mascaraData, validarData } from "@/lib/data-br";
import { updatePerfil, type Profile } from "@/lib/perfis-store";

const CHAVE_ADIADO = "nascimento_adiado";

/**
 * Quem se cadastrou antes da validação existir pode ter ficado sem data (ou com
 * a data recusada em silêncio). Em vez de deixar o campo vazio para sempre,
 * pedimos aqui, uma vez, no Início.
 */
export function CompletarNascimento({ perfil }: { perfil: Profile }) {
  const [valor, setValor] = useState("");
  const [tocou, setTocou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [fechado, setFechado] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(CHAVE_ADIADO) === "1";
    } catch {
      return false;
    }
  });

  const checagem = validarData(valor);
  const ok = !!checagem.iso;
  const mostrarErro = tocou && !ok && valor !== "";

  if (perfil.data_nascimento || fechado) return null;

  function adiar() {
    try {
      window.sessionStorage.setItem(CHAVE_ADIADO, "1");
    } catch {
      /* sem sessionStorage: fecha só nesta visita mesmo */
    }
    setFechado(true);
  }

  async function salvar() {
    if (!checagem.iso) {
      setTocou(true);
      return;
    }
    setSalvando(true);
    setErroSalvar(null);
    try {
      await updatePerfil(perfil.id, { data_nascimento: checagem.iso });
      setFechado(true);
    } catch (e) {
      setErroSalvar(
        e instanceof Error ? e.message : "Não consegui salvar. Tenta de novo?",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-pink-950/20 px-4 pb-24 backdrop-blur-sm sm:items-center sm:pb-4">
      <div className="w-full max-w-sm rounded-[2rem] border border-pink-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pink-50 text-pink-500">
            <CalendarHeart className="h-6 w-6" />
          </div>
          <button
            onClick={adiar}
            aria-label="Deixar para depois"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-pink-300 transition-colors hover:bg-pink-50 hover:text-pink-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="mt-4 font-serif text-2xl text-pink-800">
          Falta sua data de nascimento
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-pink-600/80">
          Ela não ficou salva no seu cadastro. Preenche rapidinho? 💗
        </p>

        <input
          value={valor}
          onChange={(e) => setValor(mascaraData(e.target.value))}
          onBlur={() => setTocou(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && ok) salvar();
          }}
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          autoFocus
          aria-invalid={mostrarErro}
          className={`mt-5 w-full rounded-2xl border bg-pink-50/30 px-5 py-3 text-center text-lg tracking-wider text-pink-800 outline-none transition-all placeholder:text-pink-200 ${
            mostrarErro
              ? "border-rose-400 focus:border-rose-500"
              : ok
                ? "border-emerald-300 focus:border-emerald-400"
                : "border-pink-100 focus:border-pink-300"
          }`}
        />
        {mostrarErro && (
          <p className="mt-2 text-center text-[11px] font-medium text-rose-500">
            {checagem.erro}
          </p>
        )}
        {erroSalvar && (
          <p className="mt-2 text-center text-[11px] font-medium text-rose-500">
            {erroSalvar}
          </p>
        )}

        <button
          onClick={salvar}
          disabled={!ok || salvando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-pink-500 py-3 font-bold text-white shadow-lg shadow-pink-100 transition-all hover:bg-pink-600 active:scale-[0.98] disabled:opacity-40"
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar
        </button>
        <button
          onClick={adiar}
          className="mt-3 w-full text-xs text-pink-400 underline underline-offset-4 hover:text-pink-600"
        >
          Deixar para depois
        </button>
      </div>
    </div>
  );
}
