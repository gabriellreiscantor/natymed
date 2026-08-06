type PdfJsLib = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfJsLib> | null = null;

function installPdfJsPolyfills() {
  // pdfjs-dist v4.5+ uses Promise.withResolvers, missing on Safari < 17.4.
  const P = Promise as unknown as {
    withResolvers?: <T>() => {
      promise: Promise<T>;
      resolve: (v: T | PromiseLike<T>) => void;
      reject: (r?: unknown) => void;
    };
  };
  if (typeof P.withResolvers !== "function") {
    P.withResolvers = function <T>() {
      let resolve!: (v: T | PromiseLike<T>) => void;
      let reject!: (r?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

async function loadPdfJs() {
  if (typeof window === "undefined") {
    throw new Error("A leitura de PDF só funciona no navegador.");
  }

  installPdfJsPolyfills();

  pdfjsPromise ??= Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]).then(([pdfjsLib, worker]) => {
    const workerSrc = (worker as { default: string }).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    return pdfjsLib;
  });

  return pdfjsPromise;
}



export interface Resumo {
  titulo: string;
  texto: string;
}

export interface Questao {
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  gabarito: string;
  explicacao: string;
}

export interface ParsedPdf {
  resumos: Resumo[];
  questoes: Questao[];
}

export type PdfProgress = (info: { page: number; total: number }) => void;

export async function extractTextFromPdf(
  file: File,
  onProgress?: PdfProgress,
): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: buf,
    useWorkerFetch: false,
  }).promise;
  const total = pdf.numPages;
  let full = "";
  for (let i = 1; i <= total; i++) {
    onProgress?.({ page: i, total });
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let pageText = "";
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        pageText += "\n";
      } else if (pageText && !pageText.endsWith(" ")) {
        pageText += " ";
      }
      pageText += item.str;
      lastY = y;
    }
    full += pageText + "\n\n";
    // yield to UI
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress?.({ page: total, total });
  const extracted = normalizarTexto(full).trim();
  if (!extracted) {
    throw new Error(
      "Consegui abrir o PDF, mas ele não tem texto selecionável. Se for escaneado/foto, preciso de OCR para ler.",
    );
  }
  return extracted;
}

// Normaliza acentos e conserta encodings comuns quebrados em PDFs
function normalizarTexto(s: string): string {
  // Junta caracteres base + diacríticos combinantes (NFC) → "a"+"´" vira "á"
  let out = s.normalize("NFC");
  // Ligaturas tipográficas comuns
  const ligs: Record<string, string> = {
    "\uFB00": "ff", "\uFB01": "fi", "\uFB02": "fl",
    "\uFB03": "ffi", "\uFB04": "ffl", "\uFB05": "st", "\uFB06": "st",
  };
  out = out.replace(/[\uFB00-\uFB06]/g, (c) => ligs[c] ?? c);
  // Aspas/apóstrofos "smart" que às vezes viram diacríticos soltos
  out = out
    .replace(/\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u00A0/g, " ");
  // Diacríticos combinantes que ficaram órfãos (sem base) — remove
  out = out.replace(/(^|\s)([\u0300-\u036f]+)/g, "$1");
  return out;
}


export function parseStudyText(raw: string): ParsedPdf {
  const text = raw.replace(/\r\n/g, "\n");
  const resumos: Resumo[] = [];
  const questoes: Questao[] = [];

  // Split by ### markers
  const parts = text.split(/(?=###\s*(?:RESUMO|QUESTAO|QUESTÃO))/i);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const resumoMatch = trimmed.match(/^###\s*RESUMO\s*:?\s*(.*)/i);
    const questaoMatch = trimmed.match(/^###\s*(?:QUESTAO|QUESTÃO)\b/i);

    if (resumoMatch) {
      const firstLineEnd = trimmed.indexOf("\n");
      const titulo = resumoMatch[1].trim() || "Resumo";
      const corpo =
        firstLineEnd >= 0 ? trimmed.slice(firstLineEnd + 1).trim() : "";
      // stop at next ### (already split, but safe)
      const body = corpo.split(/###/)[0].trim();
      if (body) resumos.push({ titulo, texto: body });
    } else if (questaoMatch) {
      const body = trimmed.replace(/^###\s*(?:QUESTAO|QUESTÃO)\s*:?/i, "").trim();
      const questao = parseQuestao(body);
      if (questao) questoes.push(questao);
    }
  }

  return { resumos, questoes };
}

function parseQuestao(body: string): Questao | null {
  // Find alternatives A) B) C) D) E)
  const altRegex = /(^|\n)\s*([A-E])[)\.\-]\s*/g;
  const matches: { letra: string; index: number; matchLen: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = altRegex.exec(body)) !== null) {
    matches.push({
      letra: m[2].toUpperCase(),
      index: m.index + m[1].length,
      matchLen: m[0].length - m[1].length,
    });
  }
  if (matches.length < 2) return null;

  const enunciado = body.slice(0, matches[0].index).trim();

  // Find gabarito/explicacao end boundary
  const gabRegex = /GABARITO\s*:?\s*([A-E])/i;
  const explRegex = /EXPLICA(?:C|Ç)AO\s*:?\s*([\s\S]*?)(?=(?:\n\s*###)|$)/i;

  const gabMatch = body.match(gabRegex);
  const explMatch = body.match(explRegex);

  const endOfAlts = gabMatch
    ? body.indexOf(gabMatch[0])
    : explMatch
      ? body.indexOf(explMatch[0])
      : body.length;

  const alternativas: { letra: string; texto: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].matchLen;
    const end = i + 1 < matches.length ? matches[i + 1].index : endOfAlts;
    const texto = body.slice(start, end).trim();
    if (texto) alternativas.push({ letra: matches[i].letra, texto });
  }

  const gabarito = gabMatch ? gabMatch[1].toUpperCase() : "";
  const explicacao = explMatch ? explMatch[1].trim() : "";

  if (!enunciado || alternativas.length < 2 || !gabarito) return null;

  return { enunciado, alternativas, gabarito, explicacao };
}
