import { supabase } from "@/integrations/supabase/client";

/**
 * Painel do dono. Tudo aqui passa por funções do banco que checam o e-mail
 * em auth.users — a tela só desenha o que o servidor já autorizou.
 */

export interface VisaoGeral {
  alunas_total: number;
  alunas_aceitas: number;
  alunas_pendentes: number;
  alunas_recusadas: number;
  admins: number;
  estudos: number;
  resumos: number;
  questoes: number;
  quizzes_feitos: number;
  nota_media: number | null;
  baralhos: number;
  cards: number;
  cards_com_imagem: number;
  sessoes_flashcard: number;
  materias: number;
  avaliacoes: number;
  resumos_lidos: number;
  ativas_7d: number;
  novas_7d: number;
}

export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  periodo: string | null;
  foto_url: string | null;
  is_admin: boolean;
  is_accepted: boolean;
  recusado_em: string | null;
  criado_at: string;
  ultimo_acesso: string | null;
  data_nascimento: string | null;
  quizzes: number;
  nota_media: number | null;
  melhor_nota: number | null;
  sessoes: number;
  melhor_flashcard: number | null;
  baralhos: number;
  cards: number;
  materias: number;
  resumos_lidos: number;
  ultima_atividade: string | null;
}

export type TipoAtividade =
  | "quiz"
  | "flashcard"
  | "baralho"
  | "estudo"
  | "materia"
  | "cadastro";

export interface Atividade {
  quando: string;
  tipo: TipoAtividade;
  quem: string;
  foto_url: string | null;
  descricao: string;
  detalhe: string | null;
}

/** Erro previsto: quem não é o dono recebe isso do banco. */
export class SemAcesso extends Error {}

function trata(error: { message?: string } | null): void {
  if (!error) return;
  if ((error.message ?? "").includes("Acesso restrito")) {
    throw new SemAcesso("Acesso restrito.");
  }
  throw new Error(error.message ?? "Erro inesperado.");
}

export async function carregarVisaoGeral(): Promise<VisaoGeral> {
  const { data, error } = await supabase.rpc("admin_visao_geral");
  trata(error);
  return data as unknown as VisaoGeral;
}

export async function carregarUsuarios(): Promise<UsuarioAdmin[]> {
  const { data, error } = await supabase.rpc("admin_usuarios");
  trata(error);
  return (data ?? []) as unknown as UsuarioAdmin[];
}

export async function carregarAtividade(limite = 60): Promise<Atividade[]> {
  const { data, error } = await supabase.rpc("admin_atividade", {
    p_limite: limite,
  });
  trata(error);
  return (data ?? []) as unknown as Atividade[];
}

/** "há 5 min", "ontem", "12/08" — leitura rápida na lista. */
export function tempoRelativo(iso: string | null): string {
  if (!iso) return "nunca";
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
