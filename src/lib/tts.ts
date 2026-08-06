import { useEffect, useState } from "react";
import { alertarBonito } from "@/components/ConfirmDialog";

const KEY_RATE = "estudo-rosa:tts_rate";
const KEY_PITCH = "estudo-rosa:tts_pitch";
const KEY_VOLUME = "estudo-rosa:tts_volume";
const KEY_VOICE = "estudo-rosa:tts_voice_uri";
const EVENT = "tts:preferencia";

export type GeneroVoz = "feminina" | "masculina";

// Mantido para compatibilidade — hoje só suportamos feminina.
export function getGeneroVoz(): GeneroVoz {
  return "feminina";
}

function numPref(key: string, def: number, min: number, max: number): number {
  if (typeof window === "undefined") return def;
  const n = Number(localStorage.getItem(key));
  if (!Number.isFinite(n) || n < min || n > max) return def;
  return n;
}

export const getVelocidade = () => numPref(KEY_RATE, 1, 0.5, 1.6);
export const getPitch = () => numPref(KEY_PITCH, 1.05, 0.5, 1.8);
export const getVolume = () => numPref(KEY_VOLUME, 1, 0, 1);

export function getVoiceUri(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_VOICE);
}

function salvar(key: string, val: string) {
  localStorage.setItem(key, val);
  window.dispatchEvent(new Event(EVENT));
}

export const setVelocidade = (r: number) => salvar(KEY_RATE, String(r));
export const setPitch = (p: number) => salvar(KEY_PITCH, String(p));
export const setVolume = (v: number) => salvar(KEY_VOLUME, String(v));
export const setVoiceUri = (uri: string | null) =>
  uri ? salvar(KEY_VOICE, uri) : (localStorage.removeItem(KEY_VOICE), window.dispatchEvent(new Event(EVENT)));

function useNumPref(getter: () => number): [number, (n: number) => void] {
  const [v, setV] = useState<number>(getter());
  useEffect(() => {
    setV(getter());
    const upd = () => setV(getter());
    window.addEventListener(EVENT, upd);
    return () => window.removeEventListener(EVENT, upd);
  }, []);
  return [v, setV];
}

export function useVelocidade(): [number, (r: number) => void] {
  const [v, setV] = useNumPref(getVelocidade);
  return [v, (r) => { setVelocidade(r); setV(r); }];
}
export function usePitch(): [number, (p: number) => void] {
  const [v, setV] = useNumPref(getPitch);
  return [v, (p) => { setPitch(p); setV(p); }];
}
export function useVolume(): [number, (v: number) => void] {
  const [v, setV] = useNumPref(getVolume);
  return [v, (n) => { setVolume(n); setV(n); }];
}
export function useVoiceUri(): [string | null, (u: string | null) => void] {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    setV(getVoiceUri());
    const upd = () => setV(getVoiceUri());
    window.addEventListener(EVENT, upd);
    return () => window.removeEventListener(EVENT, upd);
  }, []);
  return [v, (u) => { setVoiceUri(u); setV(u); }];
}

// carrega vozes (Safari/Chrome carregam de forma assíncrona)
export function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }
    const now = window.speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    const t = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1200);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(t);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

const FEMININAS = /(luciana|maria|helena|fernanda|camila|francisca|vit[oó]ria|female|mulher|feminin)/i;
const MASCULINAS = /(felipe|daniel|ricardo|paulo|jo[aã]o|male|homem|masculin)/i;
const PT_PT = /(portugal|pt-PT|pt_PT|joana|catarina|madeira|lisbon|lisboa)/i;
export const PREMIUM = /(neural|natural|premium|enhanced|online|wavenet|google|microsoft|siri)/i;

function pontuarVoz(v: SpeechSynthesisVoice): number {
  let p = 0;
  if (PREMIUM.test(v.name)) p += 10;
  if (/pt[-_]BR/i.test(v.lang)) p += 5;
  else if (/^pt/i.test(v.lang)) p += 2;
  if (!v.localService) p += 2;
  return p;
}

/** Lista TODAS as vozes de português (BR primeiro, depois outras pt),
 *  ordenadas por qualidade. Se não houver nenhuma pt, devolve todas as
 *  vozes do dispositivo para a usuária ainda ter algo pra escolher. */
export async function listVozesPtBr(): Promise<SpeechSynthesisVoice[]> {
  const vozes = await getVoices();
  const br = vozes.filter((v) => /pt[-_]BR/i.test(v.lang));
  const outrasPt = vozes.filter(
    (v) => /^pt/i.test(v.lang) && !/pt[-_]BR/i.test(v.lang) && !PT_PT.test(v.name),
  );
  const lista = br.length > 0 ? [...br, ...outrasPt] : [...outrasPt];
  const ordenar = (arr: SpeechSynthesisVoice[]) =>
    [...arr].sort((a, b) => pontuarVoz(b) - pontuarVoz(a));
  if (lista.length === 0) return ordenar(vozes);
  return ordenar(lista);
}

async function escolherVozFeminina(): Promise<SpeechSynthesisVoice | null> {
  const br = await listVozesPtBr();
  if (br.length === 0) return null;
  const salva = getVoiceUri();
  if (salva) {
    const achou = br.find((v) => v.voiceURI === salva);
    if (achou) return achou;
  }
  const exata = br.find((v) => FEMININAS.test(v.name));
  if (exata) return exata;
  const neutra = br.find((v) => !MASCULINAS.test(v.name));
  return neutra ?? br[0];
}

/** Devolve a voz que será usada agora (para exibir no UI). */
export async function vozAtualEfetiva(): Promise<SpeechSynthesisVoice | null> {
  return escolherVozFeminina();
}

export async function speak(texto: string, _genero?: GeneroVoz, rate?: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    alertarBonito("Seu navegador não suporta a leitura em voz alta. Tente usar o Chrome ou Safari! 🌸");
    return;
  }
  window.speechSynthesis.cancel();
  const voz = await escolherVozFeminina();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "pt-BR";
  if (voz) u.voice = voz;
  u.rate = rate ?? getVelocidade();
  u.pitch = getPitch();
  u.volume = getVolume();
  window.speechSynthesis.speak(u);
}

export function stopSpeak() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
export function pauseSpeak() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.pause();
  }
}
export function resumeSpeak() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.resume();
  }
}
