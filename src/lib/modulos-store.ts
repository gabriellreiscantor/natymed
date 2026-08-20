import { supabase } from "@/integrations/supabase/client";

const EVENT = "modulos:atualizado";

/** Cada tela tem as próprias pastas: não se misturam entre si. */
export type Secao = "resumos" | "questoes" | "flashcards";
/** Seções cujo conteúdo são materiais (PDFs). Flashcards usam baralhos. */
export type SecaoEstudo = "resumos" | "questoes";

export interface Modulo {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  secao: Secao;
  criado_em: string;
}

/** Paleta fixa: mantém a identidade rosa do site e evita cor ilegível. */
/**
 * Paleta fixa com nome, estilo Finder: a pessoa escolhe "Verde", não um
 * código hexadecimal. Nome também serve de rótulo acessível nos botões.
 */
export const CORES_MODULO_NOMEADAS = [
  { nome: "Rosa", cor: "#EC7FA9" },
  { nome: "Vermelho", cor: "#FB7185" },
  { nome: "Laranja", cor: "#FB923C" },
  { nome: "Amarelo", cor: "#FBBF24" },
  { nome: "Verde", cor: "#34D399" },
  { nome: "Azul", cor: "#60A5FA" },
  { nome: "Roxo", cor: "#C084FC" },
  { nome: "Cinza", cor: "#94A3B8" },
] as const;

export const CORES_MODULO: string[] = CORES_MODULO_NOMEADAS.map((c) => c.cor);

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function onModulosChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export async function listModulos(secao: Secao): Promise<Modulo[]> {
  const { data, error } = await supabase
    .from("modulos")
    .select("id, nome, cor, ordem, secao, criado_em")
    .eq("secao", secao)
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });
  if (error) {
    console.error("[modulos]", error.message);
    return [];
  }
  return (data ?? []) as Modulo[];
}

export async function createModulo(
  nome: string,
  cor: string,
  secao: Secao,
): Promise<void> {
  // Novo módulo entra no fim da lista da própria seção.
  const { data: ultimo } = await supabase
    .from("modulos")
    .select("ordem")
    .eq("secao", secao)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("modulos").insert({
    nome,
    cor,
    secao,
    ordem: (ultimo?.ordem ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  emit();
}

export async function updateModulo(
  id: string,
  patch: { nome?: string; cor?: string; ordem?: number },
): Promise<void> {
  const { error } = await supabase.from("modulos").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  emit();
}

/** O material não é apagado junto: fica sem módulo. */
export async function deleteModulo(id: string): Promise<void> {
  const { error } = await supabase.from("modulos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  emit();
}

export async function moverModulo(id: string, direcao: -1 | 1, lista: Modulo[]) {
  const i = lista.findIndex((m) => m.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return;
  // Troca a posição com o vizinho.
  await Promise.all([
    updateModulo(lista[i].id, { ordem: lista[j].ordem }),
    updateModulo(lista[j].id, { ordem: lista[i].ordem }),
  ]);
}

export async function setModuloDoBaralho(
  baralhoId: string,
  moduloId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("flashcard_baralhos")
    .update({ modulo_id: moduloId })
    .eq("id", baralhoId);
  if (error) throw new Error(error.message);
  emit();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("flashcards:atualizado"));
  }
}


/** Cria a pasta e já devolve o id, para mover o material logo em seguida. */
export async function createModuloRetornando(
  nome: string,
  cor: string,
  secao: Secao,
): Promise<string> {
  const { data: ultimo } = await supabase
    .from("modulos")
    .select("ordem")
    .eq("secao", secao)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("modulos")
    .insert({ nome, cor, secao, ordem: (ultimo?.ordem ?? 0) + 1 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  emit();
  return data.id;
}
