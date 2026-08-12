import { supabase } from "@/integrations/supabase/client";
import { getPerfilAtivoId } from "./perfis-store";

const EVENT = "faculdade:atualizado";

export function emitFaculdade() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function onFaculdadeChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export interface Materia {
  id: string;
  perfil_id: string;
  nome: string;
  periodo: string | null;
  cor: string;
  nota_final: number | null;
  media_para_passar: number;
  meta: number | null;
  total_aulas: number;
  faltas: number;
  limite_faltas_pct: number;
  anotacoes: string | null;
  criado_em: string;
}

export interface Avaliacao {
  id: string;
  materia_id: string;
  perfil_id: string;
  nome: string;
  data: string | null;
  nota: number | null;
  criado_em: string;
}

// ---------- Matérias ----------

export async function listMaterias(): Promise<Materia[]> {
  const perfilId = await getPerfilAtivoId();
  if (!perfilId) return [];
  const { data, error } = await supabase
    .from("materias")
    .select("*")
    .eq("perfil_id", perfilId)
    .order("criado_em", { ascending: true });
  if (error) {
    console.error("[materias]", error.message);
    return [];
  }
  return (data ?? []).map(normalizaMateria);
}

export async function createMateria(
  nome: string,
  periodo: string | null,
): Promise<Materia | null> {
  const perfilId = await getPerfilAtivoId();
  if (!perfilId) return null;
  const { data, error } = await supabase
    .from("materias")
    .insert({ perfil_id: perfilId, nome, periodo })
    .select("*")
    .single();
  if (error) {
    console.error("[criar materia]", error.message);
    return null;
  }
  emitFaculdade();
  return normalizaMateria(data);
}

export async function updateMateria(id: string, patch: Partial<Materia>) {
  const { error } = await supabase.from("materias").update(patch).eq("id", id);
  if (error) console.error("[update materia]", error.message);
  emitFaculdade();
}

export async function deleteMateria(id: string) {
  const { error } = await supabase.from("materias").delete().eq("id", id);
  if (error) console.error("[delete materia]", error.message);
  emitFaculdade();
}

// ---------- Avaliações ----------

export async function listAvaliacoes(materiaId?: string): Promise<Avaliacao[]> {
  const perfilId = await getPerfilAtivoId();
  if (!perfilId) return [];
  let q = supabase
    .from("avaliacoes")
    .select("*")
    .eq("perfil_id", perfilId)
    .order("data", { ascending: true, nullsFirst: false });
  if (materiaId) q = q.eq("materia_id", materiaId);
  const { data, error } = await q;
  if (error) {
    console.error("[avaliacoes]", error.message);
    return [];
  }
  return (data ?? []).map(normalizaAvaliacao);
}

export async function createAvaliacao(
  materiaId: string,
  nome: string,
  data: string | null,
  nota: number | null,
): Promise<void> {
  const perfilId = await getPerfilAtivoId();
  if (!perfilId) return;
  const { error } = await supabase.from("avaliacoes").insert({
    materia_id: materiaId,
    perfil_id: perfilId,
    nome,
    data,
    nota,
  });
  if (error) console.error("[criar avaliacao]", error.message);
  emitFaculdade();
}

export async function updateAvaliacao(id: string, patch: Partial<Avaliacao>) {
  const { error } = await supabase.from("avaliacoes").update(patch).eq("id", id);
  if (error) console.error("[update avaliacao]", error.message);
  emitFaculdade();
}

export async function deleteAvaliacao(id: string) {
  const { error } = await supabase.from("avaliacoes").delete().eq("id", id);
  if (error) console.error("[delete avaliacao]", error.message);
  emitFaculdade();
}

// ---------- Contas ----------

export interface SituacaoFaltas {
  usadas: number;
  limite: number;
  restantes: number;
  percentual: number;
  risco: "tranquilo" | "atencao" | "perigo";
}

/**
 * Quantas faltas ela ainda pode tomar. O limite sai da carga horária:
 * na maioria dos cursos são 25% das aulas.
 */
export function calcularFaltas(m: Materia): SituacaoFaltas | null {
  if (!m.total_aulas || m.total_aulas <= 0) return null;
  const limite = Math.floor((m.total_aulas * m.limite_faltas_pct) / 100);
  const restantes = Math.max(0, limite - m.faltas);
  const percentual = limite > 0 ? Math.min(100, (m.faltas / limite) * 100) : 0;
  const risco: SituacaoFaltas["risco"] =
    m.faltas >= limite ? "perigo" : percentual >= 70 ? "atencao" : "tranquilo";
  return { usadas: m.faltas, limite, restantes, percentual, risco };
}

export interface Meta {
  alvo: number;
  lancadas: number;
  pendentes: number;
  mediaAtual: number | null;
  precisaTirar: number | null;
  /** Já garantiu o alvo mesmo zerando o que falta. */
  jaGarantiu: boolean;
  /** Nem tirando 10 em tudo que falta ela alcança o alvo. */
  impossivel: boolean;
}

/**
 * "Quanto preciso tirar nas que faltam para fechar a média?"
 * Considera média simples entre todas as avaliações cadastradas —
 * as que já têm nota e as que ainda vão acontecer.
 */
export function calcularMeta(m: Materia, avaliacoes: Avaliacao[]): Meta | null {
  const total = avaliacoes.length;
  if (total === 0) return null;

  const alvo = m.meta ?? m.media_para_passar;
  const comNota = avaliacoes.filter((a) => a.nota !== null && a.nota !== undefined);
  const lancadas = comNota.length;
  const pendentes = total - lancadas;
  const soma = comNota.reduce((acc, a) => acc + Number(a.nota), 0);
  const mediaAtual = lancadas > 0 ? soma / lancadas : null;

  if (pendentes === 0) {
    const media = mediaAtual ?? 0;
    return {
      alvo,
      lancadas,
      pendentes,
      mediaAtual,
      precisaTirar: null,
      jaGarantiu: media >= alvo,
      impossivel: media < alvo,
    };
  }

  const precisa = (alvo * total - soma) / pendentes;
  return {
    alvo,
    lancadas,
    pendentes,
    mediaAtual,
    precisaTirar: Math.max(0, Number(precisa.toFixed(2))),
    jaGarantiu: precisa <= 0,
    impossivel: precisa > 10,
  };
}

export type Situacao = "aprovada" | "reprovada" | "andamento";

export function situacaoDaMateria(m: Materia): Situacao {
  if (m.nota_final === null || m.nota_final === undefined) return "andamento";
  return Number(m.nota_final) >= Number(m.media_para_passar)
    ? "aprovada"
    : "reprovada";
}

/** Média geral do semestre, só com as matérias que já têm nota final. */
export function mediaGeral(materias: Materia[]): number | null {
  const fechadas = materias.filter(
    (m) => m.nota_final !== null && m.nota_final !== undefined,
  );
  if (fechadas.length === 0) return null;
  const soma = fechadas.reduce((acc, m) => acc + Number(m.nota_final), 0);
  return soma / fechadas.length;
}

/** Provas futuras (sem nota lançada), da mais próxima para a mais distante. */
export function proximasProvas(
  avaliacoes: Avaliacao[],
  materias: Materia[],
): Array<Avaliacao & { materia: Materia | undefined; diasRestantes: number }> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const porId = new Map(materias.map((m) => [m.id, m]));

  return avaliacoes
    .filter((a) => a.data && (a.nota === null || a.nota === undefined))
    .map((a) => {
      const d = new Date(`${a.data}T00:00:00`);
      const dias = Math.round((d.getTime() - hoje.getTime()) / 86_400_000);
      return { ...a, materia: porId.get(a.materia_id), diasRestantes: dias };
    })
    .filter((a) => a.diasRestantes >= 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

// ---------- Normalização ----------

function normalizaMateria(d: any): Materia {
  return {
    id: d.id,
    perfil_id: d.perfil_id,
    nome: d.nome,
    periodo: d.periodo ?? null,
    cor: d.cor ?? "#ec4899",
    nota_final: d.nota_final === null ? null : Number(d.nota_final),
    media_para_passar: Number(d.media_para_passar ?? 7),
    meta: d.meta === null || d.meta === undefined ? null : Number(d.meta),
    total_aulas: Number(d.total_aulas ?? 0),
    faltas: Number(d.faltas ?? 0),
    limite_faltas_pct: Number(d.limite_faltas_pct ?? 25),
    anotacoes: d.anotacoes ?? null,
    criado_em: d.criado_em,
  };
}

function normalizaAvaliacao(d: any): Avaliacao {
  return {
    id: d.id,
    materia_id: d.materia_id,
    perfil_id: d.perfil_id,
    nome: d.nome,
    data: d.data ?? null,
    nota: d.nota === null || d.nota === undefined ? null : Number(d.nota),
    criado_em: d.criado_em,
  };
}
