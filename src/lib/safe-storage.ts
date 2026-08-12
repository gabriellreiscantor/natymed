/**
 * Armazenamento tolerante a lixo antigo.
 *
 * O domínio natymed.com.br já foi servido por outra hospedagem antes. O que
 * ficou salvo no navegador daquela época (sessão em formato antigo, cache de
 * service worker) fazia a página quebrar na hidratação: o HTML aparecia por um
 * instante e sumia.
 *
 * Aqui a gente garante que nada guardado no navegador consiga derrubar o app —
 * na dúvida, descarta o dado e segue para a tela de login.
 */

function temLocalStorage(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const teste = "__teste_storage__";
    window.localStorage.setItem(teste, "1");
    window.localStorage.removeItem(teste);
    return true;
  } catch {
    // Modo privado de alguns navegadores, ou cookies bloqueados.
    return false;
  }
}

const disponivel = temLocalStorage();

/** Guarda em memória quando o localStorage não pode ser usado. */
const memoria = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    if (!disponivel) return memoria.get(key) ?? null;
    try {
      const valor = window.localStorage.getItem(key);
      if (valor === null) return null;

      // A sessão do Supabase é sempre um JSON. Se o que está salvo não for
      // (resto de outra versão do app), descartamos em vez de estourar.
      if (key.startsWith("sb-")) {
        try {
          JSON.parse(valor);
        } catch {
          window.localStorage.removeItem(key);
          return null;
        }
      }
      return valor;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    if (!disponivel) {
      memoria.set(key, value);
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Cota cheia ou escrita bloqueada: não é motivo para derrubar a tela.
      memoria.set(key, value);
    }
  },

  removeItem(key: string): void {
    memoria.delete(key);
    if (!disponivel) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignora */
    }
  },
};

/**
 * Remove service workers e caches deixados pela hospedagem anterior.
 * Um service worker velho continua servindo arquivos que não existem mais,
 * o que quebra a página inteira mesmo com o deploy novo no ar.
 */
export function limparResiduosDeHospedagemAntiga(): void {
  if (typeof window === "undefined") return;

  try {
    navigator.serviceWorker?.getRegistrations?.().then((registros) => {
      registros.forEach((r) => r.unregister());
    });
  } catch {
    /* navegador sem suporte: tudo bem */
  }

  try {
    window.caches?.keys?.().then((chaves) => {
      chaves.forEach((c) => window.caches.delete(c));
    });
  } catch {
    /* idem */
  }
}
