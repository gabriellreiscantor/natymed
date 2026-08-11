import { supabase } from "@/integrations/supabase/client";

const PERFIL_KEY = "flashcards:perfil_id";
const EVENT = "flashcards:atualizado";

export interface Perfil {
  id: string;
  nome: string;
  foto_url: string | null;
  criado_em: string;
}

export interface Baralho {
  id: string;
  perfil_id: string | null;
  titulo: string;
  criado_em: string;
}

export interface Flashcard {
  id: string;
  perfil_id: string | null;
  baralho_id: string | null;
  pergunta: string;
  resposta: string;
  criado_em: string;
}

export interface Sessao {
  id: string;
  perfil_id: string;
  acertos: number;
  erros: number;
  duvidas: number;
  total: number;
  pontuacao: number;
  data: string;
}

export interface RankingItem {
  perfil: Perfil;
  melhor: number;
  totalSessoes: number;
  totalAcertos: number;
}

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function onFlashcardsChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

// ---------- Perfil ativo ----------
export function getPerfilAtivoId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PERFIL_KEY);
}
export function setPerfilAtivoId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(PERFIL_KEY, id);
  else localStorage.removeItem(PERFIL_KEY);
  emit();
}

// ---------- Perfis ----------
export async function listPerfis(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from("flashcard_perfis")
    .select("id, nome, foto_url, criado_em")
    .order("criado_em", { ascending: true });
  if (error) {
    console.error("[perfis]", error.message);
    return [];
  }
  return data ?? [];
}

export async function createPerfil(
  id: string,
  nome: string,
  foto_url: string | null,
): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from("flashcard_perfis")
    .insert({ id, nome, foto_url })
    .select("id, nome, foto_url, criado_em")
    .single();
  if (error) {
    console.error("[criar perfil]", error.message);
    return null;
  }
  emit();
  return data;
}

/**
 * Garante que exista um flashcard_perfis com o mesmo id do perfil global,
 * espelhando nome e foto. Usado para reaproveitar o perfil já escolhido
 * na entrada do site, sem precisar cadastrar outro só pros flashcards.
 */
export async function ensureFlashcardPerfil(perfil: {
  id: string;
  nome: string;
  foto_url: string | null;
}): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from("flashcard_perfis")
    .upsert(
      { id: perfil.id, nome: perfil.nome, foto_url: perfil.foto_url },
      { onConflict: "id" },
    )
    .select("id, nome, foto_url, criado_em")
    .single();
  if (error) {
    console.error("[ensure flashcard perfil]", error.message);
    return null;
  }
  return data;
}

export async function updatePerfil(
  id: string,
  patch: { nome?: string; foto_url?: string | null },
): Promise<void> {
  const { error } = await supabase.from("flashcard_perfis").update(patch).eq("id", id);
  if (error) console.error("[update perfil]", error.message);
  emit();
}

export async function deletePerfil(id: string): Promise<void> {
  await supabase.from("flashcard_perfis").delete().eq("id", id);
  if (getPerfilAtivoId() === id) setPerfilAtivoId(null);
  emit();
}

// ---------- Baralhos ----------
export async function listBaralhos(perfilId?: string): Promise<Baralho[]> {
  let q = supabase
    .from("flashcard_baralhos")
    .select("id, perfil_id, titulo, criado_em")
    .order("criado_em", { ascending: false });
  if (perfilId) q = q.eq("perfil_id", perfilId);
  const { data, error } = await q;
  if (error) {
    console.error("[baralhos]", error.message);
    return [];
  }
  return data ?? [];
}

export async function createBaralho(
  perfilId: string,
  titulo: string,
): Promise<Baralho | null> {
  const { data, error } = await supabase
    .from("flashcard_baralhos")
    .insert({ perfil_id: perfilId, titulo })
    .select("id, perfil_id, titulo, criado_em")
    .single();
  if (error) {
    console.error("[criar baralho]", error.message);
    return null;
  }
  emit();
  return data;
}

export async function renameBaralho(id: string, titulo: string): Promise<void> {
  await supabase.from("flashcard_baralhos").update({ titulo }).eq("id", id);
  emit();
}

export async function deleteBaralho(id: string): Promise<void> {
  await supabase.from("flashcard_baralhos").delete().eq("id", id);
  emit();
}

// ---------- Cards ----------
export async function listCardsByBaralho(baralhoId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from("flashcards")
    .select("id, perfil_id, baralho_id, pergunta, resposta, criado_em")
    .eq("baralho_id", baralhoId)
    .order("criado_em", { ascending: false });
  if (error) {
    console.error("[cards]", error.message);
    return [];
  }
  return data ?? [];
}

export interface Deck {
  baralho: Baralho;
  perfil: Perfil;
  total: number;
}

/** Lista todos os baralhos (com dono e contagem). Visíveis pra todo mundo. */
export async function listDecks(): Promise<Deck[]> {
  const [perfis, baralhos, cards] = await Promise.all([
    listPerfis(),
    listBaralhos(),
    supabase.from("flashcards").select("baralho_id"),
  ]);
  const perfilPorId = new Map(perfis.map((p) => [p.id, p]));
  const contagem = new Map<string, number>();
  for (const row of cards.data ?? []) {
    if (!row.baralho_id) continue;
    contagem.set(row.baralho_id, (contagem.get(row.baralho_id) ?? 0) + 1);
  }
  const decks: Deck[] = [];
  for (const b of baralhos) {
    const perfil = b.perfil_id ? perfilPorId.get(b.perfil_id) : undefined;
    if (!perfil) continue;
    decks.push({ baralho: b, perfil, total: contagem.get(b.id) ?? 0 });
  }
  return decks.sort((a, b) => b.total - a.total);
}

export async function createCard(
  baralhoId: string,
  perfilId: string,
  pergunta: string,
  resposta: string,
): Promise<void> {
  const { error } = await supabase
    .from("flashcards")
    .insert({ baralho_id: baralhoId, perfil_id: perfilId, pergunta, resposta });
  if (error) console.error("[criar card]", error.message);
  emit();
}

export async function updateCard(
  id: string,
  patch: { pergunta?: string; resposta?: string },
): Promise<void> {
  await supabase.from("flashcards").update(patch).eq("id", id);
  emit();
}

export async function deleteCard(id: string): Promise<void> {
  await supabase.from("flashcards").delete().eq("id", id);
  emit();
}

// ---------- Sessões ----------
export async function addSessao(entry: Omit<Sessao, "id" | "data">): Promise<void> {
  const { error } = await supabase.from("flashcard_sessoes").insert({
    perfil_id: entry.perfil_id,
    acertos: entry.acertos,
    erros: entry.erros,
    duvidas: entry.duvidas,
    total: entry.total,
    pontuacao: entry.pontuacao,
  });
  if (error) console.error("[sessao]", error.message);
  emit();
}

export async function listSessoes(perfilId?: string): Promise<Sessao[]> {
  let q = supabase
    .from("flashcard_sessoes")
    .select("id, perfil_id, acertos, erros, duvidas, total, pontuacao, data")
    .order("data", { ascending: false });
  if (perfilId) q = q.eq("perfil_id", perfilId);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map((s) => ({ ...s, pontuacao: Number(s.pontuacao) }));
}

export async function getRanking(): Promise<RankingItem[]> {
  const [perfis, sessoes] = await Promise.all([listPerfis(), listSessoes()]);
  const map = new Map<string, RankingItem>();
  for (const p of perfis) {
    map.set(p.id, { perfil: p, melhor: 0, totalSessoes: 0, totalAcertos: 0 });
  }
  for (const s of sessoes) {
    const item = map.get(s.perfil_id);
    if (!item) continue;
    item.melhor = Math.max(item.melhor, s.pontuacao);
    item.totalSessoes += 1;
    item.totalAcertos += s.acertos;
  }
  return Array.from(map.values()).sort((a, b) => b.melhor - a.melhor);
}
