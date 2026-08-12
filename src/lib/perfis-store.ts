import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  is_admin: boolean;
  is_accepted: boolean;
  foto_url: string | null;
  data_nascimento: string | null;
  periodo: string | null;
  criado_at: string;
}

const EVENT = "perfil:atualizado";

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function onPerfilChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export async function getProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("[getProfile]", error.message);
    return null;
  }
  
  if (!data) return null;

  return {
    ...data,
    is_admin: !!data.is_admin,
    is_accepted: !!data.is_accepted,
    periodo: (data as any).periodo ?? null,
    criado_at: data.criado_at || new Date().toISOString()
  } as Profile;
}

export async function listAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("criado_at", { ascending: false });

  if (error) {
    console.error("[listAllProfiles]", error.message);
    return [];
  }
  return (data || []).map(d => ({
    ...d,
    is_admin: !!d.is_admin,
    is_accepted: !!d.is_accepted,
    periodo: (d as any).periodo ?? null,
    criado_at: d.criado_at || new Date().toISOString()
  })) as Profile[];
}

export async function acceptProfile(id: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_accepted: true })
    .eq("id", id);
  if (error) throw error;
  emit();
}

/**
 * Força uma releitura do perfil em todas as telas abertas.
 * A sala de espera usa isso para descobrir sozinha que a Naty já aceitou.
 */
export function refreshPerfil() {
  emit();
}

/**
 * Tira o acesso de quem já tinha sido aceita: ela volta para a sala de espera
 * sem perder nada do que já criou. Só admin consegue (o banco também exige).
 */
export async function revokeProfile(id: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_accepted: false })
    .eq("id", id);
  if (error) throw error;
  emit();
}

/**
 * Escuta mudanças na tabela de perfis em tempo real.
 * É o que faz a fila da Naty e a sala de espera reagirem na hora: quando ela
 * aceita alguém, a aluna entra sem esperar o próximo ciclo de verificação.
 * O RLS continua valendo — cada uma só recebe evento do que já podia ler.
 *
 * Vários componentes na mesma tela precisam disso, mas o Supabase recusa duas
 * assinaturas no mesmo tópico — o que derrubava a página. Por isso o app inteiro
 * compartilha UM canal só, e cada componente apenas entra na lista de avisados.
 * Se o tempo real falhar (rede, socket bloqueado), o app segue funcionando:
 * quem depende disso tem verificação periódica de reserva.
 */
const ouvintesRealtime = new Set<() => void>();
let canalRealtime: ReturnType<typeof supabase.channel> | null = null;

export function assinarPerfisRealtime(cb: () => void) {
  if (typeof window === "undefined") return () => {};

  ouvintesRealtime.add(cb);

  if (!canalRealtime) {
    try {
      canalRealtime = supabase
        .channel("perfis-tempo-real")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => ouvintesRealtime.forEach((fn) => fn()),
        )
        .subscribe();
    } catch (e) {
      console.error("[realtime perfis]", e);
      canalRealtime = null;
    }
  }

  return () => {
    ouvintesRealtime.delete(cb);
    if (ouvintesRealtime.size === 0 && canalRealtime) {
      try {
        supabase.removeChannel(canalRealtime);
      } catch {
        /* o canal já morreu junto com a página */
      }
      canalRealtime = null;
    }
  };
}

/** Quantas alunas estão na fila esperando aprovação. Só admin enxerga. */
export async function countPendentes(): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_accepted", false)
    .eq("is_admin", false);
  if (error) return 0;
  return count ?? 0;
}

export async function updateProfile(id: string, patch: Partial<Profile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw error;
  emit();
}

export async function getPerfilAtivoId(): Promise<string | null> {
  const p = await getProfile();
  return p?.id || null;
}

export function usePerfilAtivo() {
  const [perfil, setPerfil] = useState<Profile | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const p = await getProfile();
      if (!alive) return;
      setPerfil(p);
      setCarregado(true);
    };
    load();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    const off = onPerfilChange(load);
    // Aceitou/removeu do outro lado? A tela se atualiza sozinha, na hora.
    const offRealtime = assinarPerfisRealtime(load);

    return () => {
      alive = false;
      subscription.unsubscribe();
      off();
      offRealtime();
    };
  }, []);

  return { perfil, carregado };
}

// Compatibilidade com código antigo
export const listPerfis = listAllProfiles;
export const updatePerfil = updateProfile;
export const deletePerfil = async (id: string) => {
  // Não deletamos o auth.user facilmente pelo client side, mas limpamos o profile
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
  emit();
};
