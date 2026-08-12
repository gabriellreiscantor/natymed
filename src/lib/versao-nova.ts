/**
 * Quando publicamos uma versão nova, os arquivos JS antigos deixam de existir
 * no servidor. Quem estava com a página aberta continua com o HTML velho, que
 * aponta para um arquivo que sumiu — e qualquer carregamento sob demanda
 * (o leitor de PDF, por exemplo) quebra com:
 *
 *   Failed to fetch dynamically imported module: .../assets/pdf-XXXX.js
 *
 * Aqui a gente reconhece esse caso e recarrega a página uma única vez, para a
 * aluna pegar a versão nova sem precisar saber o que aconteceu.
 */

const CHAVE = "recarregou_por_versao_nova";

/** O erro é de arquivo que sumiu no deploy (e não falta de internet)? */
export function ehErroDeVersaoAntiga(erro: unknown): boolean {
  const msg =
    erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro ?? "");
  return (
    /dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
}

/**
 * Recarrega uma vez só. A trava fica na sessão da aba: se mesmo depois de
 * recarregar o erro voltar, a gente para e mostra a mensagem, em vez de
 * deixar a página num laço de recarregamento.
 */
export function recarregarUmaVezPorVersaoNova(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(CHAVE)) return false;
    window.sessionStorage.setItem(CHAVE, "1");
  } catch {
    // Sem sessionStorage (aba anônima restrita) não dá para travar o laço:
    // melhor não recarregar do que arriscar recarregar sem parar.
    return false;
  }
  window.location.reload();
  return true;
}

/** Chamado depois de um carregamento bem-sucedido: libera a trava. */
export function limparTravaDeVersao(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}
