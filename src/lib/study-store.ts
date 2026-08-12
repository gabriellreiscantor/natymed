import type { ParsedPdf } from "./pdf-parser";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { getPerfilAtivoId, getProfile } from "./perfis-store";

const CURRENT_ID_KEY = "estudo:atual_id";
const EVENT = "estudo:atualizado";

export interface CurrentStudy extends ParsedPdf {
  id: string;
  nome: string;
  criadoEm: string;
  perfil_id: string | null;
  compartilhado: boolean;
}

export interface StudyListItem {
  id: string;
  nome: string;
  criado_em: string;
  perfil_id: string | null;
  compartilhado: boolean;
  dono_nome?: string | null;
  dono_foto?: string | null;
}

export interface HistoryEntry {
  id: string;
  estudo_id: string | null;
  nome: string;
  /** "quiz" = prova valendo (entra no ranking). "revisao" = treino dos erros. */
  tipo?: string;
  nota: number;
  acertos: number;
  total: number;
  data: string;
  perfil_id: string | null;
  respostas: Record<string, string> | null;
}


function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

// ---------- Estudos ----------

export async function createStudy(
  nome: string,
  parsed: ParsedPdf,
): Promise<CurrentStudy> {
  const perfil = await getProfile();
  if (!perfil) {
    throw new Error(
      "Sua sessão expirou. Saia e entre de novo para enviar o material. 🌸",
    );
  }
  if (!perfil.is_admin) {
    throw new Error(
      "Só a Naty pode enviar novos materiais para o grupo. 💗",
    );
  }
  const perfilId = perfil.id;
  // A Naty (admin) sobe material para o grupo estudar: já nasce compartilhado,
  // senão ela precisaria liberar cada estudo na mão e as amigas não veriam nada.
  const compartilhado = true;
  const { data, error } = await supabase
    .from("estudos")
    .insert({
      nome,
      resumos: parsed.resumos as unknown as Json,
      questoes: parsed.questoes as unknown as Json,
      perfil_id: perfilId,
      compartilhado,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const study: CurrentStudy = {
    id: data.id,
    nome: data.nome,
    resumos: (data.resumos ?? []) as unknown as ParsedPdf["resumos"],
    questoes: (data.questoes ?? []) as unknown as ParsedPdf["questoes"],
    criadoEm: data.criado_em,
    perfil_id: data.perfil_id ?? null,
    compartilhado: !!data.compartilhado,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(CURRENT_ID_KEY, study.id);
  }
  emit();
  return study;
}

export async function loadCurrent(): Promise<CurrentStudy | null> {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(CURRENT_ID_KEY);
  const perfilId = await getPerfilAtivoId();

  const pick = async (whereId: string) => {
    const { data } = await supabase
      .from("estudos")
      .select("*")
      .eq("id", whereId)
      .maybeSingle();
    return data;
  };

  let data = id ? await pick(id) : null;

  // Fallback: abre um estudo sozinho em vez de deixar a tela vazia.
  // A Naty cai no material mais recente dela; a aluna, que não envia PDF,
  // cai no mais recente que a Naty compartilhou.
  if (!data && perfilId) {
    const { data: recente } = await supabase
      .from("estudos")
      .select("*")
      .eq("perfil_id", perfilId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    data = recente;
    if (data) localStorage.setItem(CURRENT_ID_KEY, data.id);
  }

  if (!data) {
    const { data: compartilhado } = await supabase
      .from("estudos")
      .select("*")
      .eq("compartilhado", true)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    data = compartilhado;
    if (data) localStorage.setItem(CURRENT_ID_KEY, data.id);
  }

  if (!data) return null;
  return {
    id: data.id,
    nome: data.nome,
    resumos: (data.resumos ?? []) as unknown as ParsedPdf["resumos"],
    questoes: (data.questoes ?? []) as unknown as ParsedPdf["questoes"],
    criadoEm: data.criado_em,
    perfil_id: data.perfil_id ?? null,
    compartilhado: !!data.compartilhado,
  };
}

export async function loadEstudoQuestoes(id: string): Promise<any[] | null> {
  const { data } = await supabase
    .from("estudos")
    .select("questoes")
    .eq("id", id)
    .maybeSingle();
  return (data?.questoes ?? null) as any[] | null;
}


export async function renameStudy(id: string, nome: string) {
  const limpo = nome.trim();
  if (!limpo) return;
  await supabase.from("estudos").update({ nome: limpo }).eq("id", id);
  emit();
}

export async function fetchDonos(
  ids: string[],
): Promise<Map<string, { nome: string; foto_url: string | null }>> {
  const filtered = ids.filter(Boolean);
  const map = new Map<string, { nome: string; foto_url: string | null }>();
  if (!filtered.length) return map;
  const { data } = await supabase
    .from("perfis_publicos")
    .select("id, nome, foto_url")
    .in("id", filtered);
  (data ?? []).forEach((p) => {
    map.set(p.id, { nome: p.nome, foto_url: p.foto_url });
  });
  return map;
}

export async function listMeusEstudos(): Promise<StudyListItem[]> {
  const perfilId = await getPerfilAtivoId();
  if (!perfilId) return [];
  const { data, error } = await supabase
    .from("estudos")
    .select("id, nome, criado_em, perfil_id, compartilhado")
    .eq("perfil_id", perfilId)
    .order("criado_em", { ascending: false });
  if (error) return [];
  return (data ?? []).map((e) => ({
    id: e.id,
    nome: e.nome,
    criado_em: e.criado_em,
    perfil_id: e.perfil_id ?? null,
    compartilhado: !!e.compartilhado,
  }));
}

export async function listCompartilhados(): Promise<StudyListItem[]> {
  const perfilId = await getPerfilAtivoId();
  const { data, error } = await supabase
    .from("estudos")
    .select("id, nome, criado_em, perfil_id, compartilhado")
    .eq("compartilhado", true)
    .order("criado_em", { ascending: false });
  if (error) return [];
  const items = (data ?? []).filter((e) => e.perfil_id !== perfilId);
  const donos = await fetchDonos(items.map((i) => i.perfil_id ?? ""));
  return items.map((e) => ({
    id: e.id,
    nome: e.nome,
    criado_em: e.criado_em,
    perfil_id: e.perfil_id ?? null,
    compartilhado: true,
    dono_nome: e.perfil_id ? donos.get(e.perfil_id)?.nome ?? null : null,
    dono_foto: e.perfil_id ? donos.get(e.perfil_id)?.foto_url ?? null : null,
  }));
}

export async function setCompartilhado(id: string, compartilhado: boolean) {
  await supabase.from("estudos").update({ compartilhado }).eq("id", id);
  emit();
}

export function setCurrentStudyId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_ID_KEY, id);
  emit();
}

export function clearCurrent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_ID_KEY);
  emit();
}

export async function deleteStudy(id: string) {
  await supabase.from("estudos").delete().eq("id", id);
  if (
    typeof window !== "undefined" &&
    localStorage.getItem(CURRENT_ID_KEY) === id
  ) {
    localStorage.removeItem(CURRENT_ID_KEY);
  }
  emit();
}

// ---------- Histórico ----------

export async function loadHistory(
  scope: "meu" | "todos" = "meu",
): Promise<HistoryEntry[]> {
  const perfilId = await getPerfilAtivoId();
  let q = supabase
    .from("historico")
    .select("id, estudo_id, nome, nota, acertos, total, data, perfil_id, respostas")
    .order("data", { ascending: false });
  if (scope === "meu" && perfilId) q = q.eq("perfil_id", perfilId);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map((h: any) => ({
    id: h.id,
    estudo_id: h.estudo_id ?? null,
    nome: h.nome,
    nota: Number(h.nota),
    acertos: h.acertos,
    total: h.total,
    data: h.data,
    perfil_id: h.perfil_id ?? null,
    respostas: h.respostas ?? null,
  }));
}

export async function addHistory(entry: Omit<HistoryEntry, "id" | "perfil_id">) {
  const perfilId = await getPerfilAtivoId();
  const { error } = await supabase.from("historico").insert({
    estudo_id: entry.estudo_id,
    nome: entry.nome,
    tipo: entry.tipo ?? "quiz",
    nota: entry.nota,
    acertos: entry.acertos,
    total: entry.total,
    data: entry.data,
    perfil_id: perfilId,
    respostas: (entry.respostas ?? null) as unknown as Json,
  });
  if (error) console.error("[historico]", error.message);
  emit();
}


export async function clearHistory() {
  const perfilId = await getPerfilAtivoId();
  if (perfilId) {
    await supabase.from("historico").delete().eq("perfil_id", perfilId);
  } else {
    await supabase
      .from("historico")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
  }
  emit();
}

// ---------- Progresso do quiz ----------

export interface QuizProgresso {
  respostas: Record<string, string>;
  finalizado: boolean;
}

export async function loadProgresso(
  estudoId: string,
): Promise<QuizProgresso | null> {
  const perfilId = await getPerfilAtivoId();
  if (!perfilId) return null;
  const { data } = await supabase
    .from("quiz_progresso")
    .select("respostas, finalizado")
    .eq("perfil_id", perfilId)
    .eq("estudo_id", estudoId)
    .maybeSingle();
  if (!data) return null;
  return {
    respostas: (data.respostas as Record<string, string>) ?? {},
    finalizado: !!data.finalizado,
  };
}

export async function saveProgresso(
  estudoId: string,
  progresso: QuizProgresso,
) {
  const perfilId = await getPerfilAtivoId();
  if (!perfilId) return;
  const { error } = await supabase.from("quiz_progresso").upsert(
    {
      perfil_id: perfilId,
      estudo_id: estudoId,
      respostas: progresso.respostas as unknown as Json,
      finalizado: progresso.finalizado,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "perfil_id,estudo_id" },
  );
  if (error) console.error("[quiz_progresso]", error.message);
}

export async function deleteProgresso(estudoId: string) {
  const perfilId = await getPerfilAtivoId();
  if (!perfilId) return;
  await supabase
    .from("quiz_progresso")
    .delete()
    .eq("perfil_id", perfilId)
    .eq("estudo_id", estudoId);
}


// ---------- Marcas de resumo (lido / favorito) ----------

export interface ResumoMarca {
  indice: number;
  lido: boolean;
  favorito: boolean;
}

/** Mapa indice -> marca, para o estudo aberto. */
export async function loadMarcasResumo(
  estudoId: string,
): Promise<Map<number, ResumoMarca>> {
  const perfilId = await getPerfilAtivoId();
  const mapa = new Map<number, ResumoMarca>();
  if (!perfilId) return mapa;
  const { data, error } = await supabase
    .from("resumo_marcas")
    .select("indice, lido, favorito")
    .eq("perfil_id", perfilId)
    .eq("estudo_id", estudoId);
  if (error) return mapa;
  (data ?? []).forEach((m: any) => {
    mapa.set(m.indice, {
      indice: m.indice,
      lido: !!m.lido,
      favorito: !!m.favorito,
    });
  });
  return mapa;
}

export async function setMarcaResumo(
  estudoId: string,
  indice: number,
  patch: { lido?: boolean; favorito?: boolean },
  atual?: ResumoMarca,
) {
  const perfilId = await getPerfilAtivoId();
  if (!perfilId) return;
  const { error } = await supabase.from("resumo_marcas").upsert(
    {
      perfil_id: perfilId,
      estudo_id: estudoId,
      indice,
      lido: patch.lido ?? atual?.lido ?? false,
      favorito: patch.favorito ?? atual?.favorito ?? false,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "perfil_id,estudo_id,indice" },
  );
  if (error) console.error("[marca resumo]", error.message);
}


// ---------- Ranking das questões ----------

export interface RankingQuestoes {
  perfil_id: string;
  nome: string;
  foto_url: string | null;
  provas: number;
  melhor: number;
  media: number;
}

/**
 * Ranking por melhor nota. Passe o id do estudo para ver só quem fez aquele
 * material, ou nada para o ranking geral. Rodadas de treino ficam de fora.
 */
export async function getRankingQuestoes(
  estudoId?: string | null,
): Promise<RankingQuestoes[]> {
  const { data, error } = await supabase.rpc("ranking_questoes", {
    p_estudo_id: estudoId ?? null,
  });
  if (error) {
    console.error("[ranking questoes]", error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    perfil_id: r.perfil_id,
    nome: r.nome,
    foto_url: r.foto_url ?? null,
    provas: Number(r.provas),
    melhor: Number(r.melhor),
    media: Number(r.media),
  }));
}

// ---------- Edição dos resumos ----------

/**
 * Regrava a lista de resumos de um estudo.
 * Os resumos vêm do PDF, mas o parser às vezes erra um título ou corta uma
 * frase — e às vezes ela só quer acrescentar uma observação da aula. Só a dona
 * do estudo consegue (o banco também exige isso).
 */
export async function saveResumos(
  estudoId: string,
  resumos: ParsedPdf["resumos"],
): Promise<void> {
  const { error } = await supabase
    .from("estudos")
    .update({ resumos: resumos as unknown as Json })
    .eq("id", estudoId);
  if (error) throw new Error(error.message);
  emit();
}
