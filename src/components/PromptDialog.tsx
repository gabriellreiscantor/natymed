import { useState, useEffect } from "react";

type Opts = {
  titulo?: string;
  mensagem: string;
  confirmar?: string;
  cancelar?: string;
  placeholder?: string;
  valorPadrao?: string;
};

type Estado = Opts & { resolve: (v: string | null) => void };

let externalOpen: ((opts: Opts) => Promise<string | null>) | null = null;

/** API imperativa: substitui window.prompt() com um modal temático. */
export function promptBonito(opts: Opts | string): Promise<string | null> {
  const o = typeof opts === "string" ? { mensagem: opts } : opts;
  if (!externalOpen) {
    return Promise.resolve(window.prompt(o.mensagem, o.valorPadrao));
  }
  return externalOpen(o);
}

export function PromptDialogHost() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [valor, setValor] = useState("");

  useEffect(() => {
    externalOpen = (opts) =>
      new Promise<string | null>((resolve) => {
        setEstado({ ...opts, resolve });
        setValor(opts.valorPadrao || "");
      });
    return () => {
      externalOpen = null;
    };
  }, []);

  function fechar(v: string | null) {
    if (!estado) return;
    estado.resolve(v);
    setEstado(null);
    setValor("");
  }

  if (!estado) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-rose-950/25 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={() => fechar(null)}
    >
      <div
        role="dialog"
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <h3 className="font-serif text-2xl text-pink-700">
            {estado.titulo || "Renomear"}
          </h3>
          <p className="mt-2 text-sm text-pink-500/70">
            {estado.mensagem}
          </p>
          <input
            autoFocus
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={estado.placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") fechar(valor);
              if (e.key === "Escape") fechar(null);
            }}
            className="mt-4 w-full rounded-full border border-pink-100 bg-pink-50/30 px-6 py-3 text-pink-800 placeholder:text-pink-200 outline-none focus:border-pink-300 transition-all text-sm"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-pink-100/70 bg-pink-50/40 p-4 sm:flex-row sm:justify-end">
          <button
            onClick={() => fechar(null)}
            className="rounded-full border border-pink-200 bg-white px-5 py-2 text-sm font-medium text-pink-700 hover:bg-pink-50"
          >
            {estado.cancelar || "Cancelar"}
          </button>
          <button
            onClick={() => fechar(valor)}
            className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pink-600"
          >
            {estado.confirmar || "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
