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

    return () => {
      alive = false;
      subscription.unsubscribe();
      off();
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
