import { useEffect, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";

type Opts = {
  titulo?: string;
  mensagem: string;
  confirmar?: string;
  cancelar?: string;
  destrutivo?: boolean;
  tipo?: "confirm" | "alert";
};

type Estado = Opts & { resolve: (v: boolean) => void };

let externalOpen: ((opts: Opts) => Promise<boolean>) | null = null;

/** API imperativa: substitui window.confirm() e window.alert() com um modal temático. */
export function confirmarBonito(opts: Opts | string): Promise<boolean> {
  const o = typeof opts === "string" ? { mensagem: opts } : opts;
  if (!externalOpen) {
    if (o.tipo === "alert") {
      window.alert(o.mensagem);
      return Promise.resolve(true);
    }
    return Promise.resolve(window.confirm(o.mensagem));
  }
  return externalOpen(o);
}

export function alertarBonito(opts: Opts | string): Promise<boolean> {
  const o = typeof opts === "string" ? { mensagem: opts } : opts;
  return confirmarBonito({ ...o, tipo: "alert", destrutivo: false, confirmar: "Entendi" });
}

export function ConfirmDialogHost() {
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    externalOpen = (opts) =>
      new Promise<boolean>((resolve) => setEstado({ ...opts, resolve }));
    return () => {
      externalOpen = null;
    };
  }, []);

  useEffect(() => {
    if (!estado) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") fechar(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [estado]);

  function fechar(valor: boolean) {
    if (!estado) return;
    estado.resolve(valor);
    setEstado(null);
  }

  if (!estado) return null;

  const destrutivo = estado.destrutivo ?? true;

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-rose-950/25 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={() => fechar(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-pink-100 bg-card shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-7 text-center">
          <div
            className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
              estado.tipo === "alert"
                ? "bg-pink-100 text-pink-600"
                : destrutivo
                ? "bg-rose-100 text-rose-500"
                : "bg-pink-100 text-pink-600"
            }`}
          >
            {estado.tipo === "alert" ? (
              <Info className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <h3 className="mt-4 font-serif text-2xl text-rose-dark">
            {estado.titulo ?? (destrutivo ? "Tem certeza?" : "Confirmar")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {estado.mensagem}
          </p>
        </div>
        <div className={`flex flex-col-reverse gap-2 border-t border-pink-100/70 bg-pink-50/40 p-4 sm:flex-row ${estado.tipo === "alert" ? "sm:justify-center" : "sm:justify-end"}`}>
          {estado.tipo !== "alert" && (
            <button
              onClick={() => fechar(false)}
              className="rounded-full border border-pink-200 bg-white px-5 py-2 text-sm font-medium text-pink-700 hover:bg-pink-50"
            >
              {estado.cancelar ?? "Cancelar"}
            </button>
          )}
          <button
            onClick={() => fechar(true)}
            className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 ${
              destrutivo
                ? "bg-rose-500"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {estado.confirmar ?? (destrutivo ? "Excluir" : "Confirmar")}
          </button>
        </div>
      </div>
    </div>
  );
}
