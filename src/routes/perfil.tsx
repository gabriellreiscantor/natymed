import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { alertarBonito, confirmarBonito } from "@/components/ConfirmDialog";
import { useEffect, useRef, useState } from "react";
import { Lock, LogOut, Pencil, Trash2, Trophy, Volume2, Plus } from "lucide-react";
// Senha manual removida em favor de Auth/OTP
import {
  deletePerfil,
  updatePerfil,
  usePerfilAtivo,
} from "@/lib/perfis-store";
import { iniciais, uploadAvatarBlob, urlToFile } from "@/lib/upload-avatar";
import { loadHistory, type HistoryEntry } from "@/lib/study-store";
import { trocarPerfil } from "@/components/PerfilGate";
import { AvatarEditor } from "@/components/AvatarEditor";
import {
  speak,
  stopSpeak,
  useVelocidade,
  usePitch,
  useVolume,
  useVoiceUri,
  listVozesPtBr,
  vozAtualEfetiva,
  PREMIUM,
} from "@/lib/tts";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Estudo Rosa" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { perfil, carregado } = usePerfilAtivo();
  const navigate = useNavigate();
  const [historico, setHistorico] = useState<HistoryEntry[]>([]);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState("");
  const [subindo, setSubindo] = useState(false);
  const [editandoFile, setEditandoFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (perfil) setNome(perfil.nome);
  }, [perfil?.id, perfil?.nome]);

  useEffect(() => {
    if (!perfil) return;
    loadHistory("meu").then(setHistorico);
  }, [perfil?.id]);

  if (!carregado) return null;
  if (!perfil) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p>Escolha um perfil primeiro.</p>
      </div>
    );
  }

  const totalProvas = historico.length;
  const melhor = totalProvas ? Math.max(...historico.map((h) => h.nota)) : 0;
  const media = totalProvas
    ? historico.reduce((a, h) => a + h.nota, 0) / totalProvas
    : 0;

  async function handleBlob(blob: Blob) {
    setSubindo(true);
    try {
      const url = await uploadAvatarBlob(blob);
      await updatePerfil(perfil!.id, { foto_url: url });
      setEditandoFile(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      alertarBonito({ titulo: "Ops!", mensagem: msg });
    } finally {
      setSubindo(false);
    }
  }

  async function salvarNome() {
    if (!nome.trim() || nome.trim() === perfil!.nome) {
      setEditandoNome(false);
      return;
    }
    await updatePerfil(perfil!.id, { nome: nome.trim() });
    setEditandoNome(false);
  }

  async function excluir() {
    if (!(await confirmarBonito({
      titulo: "Excluir perfil?",
      mensagem: `O perfil "${perfil!.nome}" e todos os seus estudos e histórico serão apagados.`,
      confirmar: "Excluir perfil",
    }))) return;
    await deletePerfil(perfil!.id);
    import("@/components/PerfilGate").then(m => m.logoutGlobal());
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-pink-100 bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative group">
            <button
              onClick={() => inputRef.current?.click()}
              className="relative grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-pink-100 text-2xl font-semibold text-pink-700 ring-4 ring-pink-200 transition-all hover:ring-pink-400 sm:h-36 sm:w-36"
            >
              {perfil.foto_url ? (
                <img src={perfil.foto_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 p-4 text-center">
                  <Plus className="h-6 w-6 opacity-40" />
                  <span className="text-[10px] leading-tight font-medium uppercase tracking-tighter">Adicione sua fotinha aqui</span>
                </div>
              )}
            </button>
            {subindo && (
              <span className="absolute inset-0 z-10 grid place-items-center rounded-full bg-white/70 text-xs font-bold text-pink-600 backdrop-blur-[2px]">
                enviando...
              </span>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setEditandoFile(f);
                e.target.value = "";
              }}
            />
            {perfil.foto_url && (
              <button
                onClick={async () => {
                  if (await confirmarBonito({
                    titulo: "Remover foto?",
                    mensagem: "Sua fotinha será removida do perfil.",
                    confirmar: "Sim, remover"
                  })) {
                    await updatePerfil(perfil.id, { foto_url: null });
                  }
                }}
                className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-white text-rose-400 shadow-md ring-1 ring-rose-100 hover:text-rose-600"
                title="Remover foto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-white text-pink-500 shadow-md ring-2 ring-pink-50 hover:bg-pink-50 transition-transform active:scale-90"
              title={perfil.foto_url ? "Trocar foto" : "Adicionar foto"}
            >
              {perfil.foto_url ? <Pencil className="h-4 w-4" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left">
            {editandoNome ? (
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="rounded-full border border-pink-200 bg-pink-50/40 px-4 py-1.5 text-lg text-pink-800 outline-none focus:border-pink-400"
                />
                <button
                  onClick={salvarNome}
                  className="rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                >
                  Salvar
                </button>
                <button
                  onClick={() => { setEditandoNome(false); setNome(perfil.nome); }}
                  className="text-sm text-muted-foreground"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="font-serif text-3xl text-rose-dark">{perfil.nome}</h1>
                <button
                  onClick={() => setEditandoNome(true)}
                  className="grid h-8 w-8 place-items-center rounded-full text-pink-400 hover:bg-pink-50 hover:text-pink-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Membro desde {new Date(perfil.criado_at).toLocaleDateString("pt-BR")}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
              <button
                onClick={trocarPerfil}
                className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs text-pink-700 hover:bg-pink-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Trocar Perfil
              </button>
              <button
                onClick={() => {
                  import("@/components/PerfilGate").then(m => m.logoutGlobal());
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs text-pink-700 hover:bg-pink-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 rotate-180" />
                Sair da Plataforma
              </button>
              <button
                onClick={excluir}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir perfil
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Provas feitas" value={String(totalProvas)} />
        <StatCard label="Nota média" value={media.toFixed(1).replace(".", ",")} />
        <StatCard
          label="Melhor nota"
          value={melhor.toFixed(1).replace(".", ",")}
          icon={<Trophy className="h-4 w-4 text-amber-400" />}
        />
      </div>

      <VozConfig />
      <SenhaConfig />
      <ConviteAdmin />

      <div className="mt-6">
        <h2 className="mb-3 font-serif text-2xl">Seu histórico</h2>
        {historico.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Ainda sem provas feitas. 🌸
          </div>
        ) : (
          <div className="space-y-3">
            {historico.slice(0, 10).map((h) => (
              <div
                key={h.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{h.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.data).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}{" "}• {h.acertos}/{h.total} acertos
                  </p>
                </div>
                <div
                  className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-serif text-2xl ${
                    h.nota >= 7
                      ? "bg-[color:var(--success-bg)] text-[color:var(--success)]"
                      : h.nota >= 5
                      ? "bg-secondary text-rose-dark"
                      : "bg-[color:var(--error-bg)] text-[color:var(--error)]"
                  }`}
                >
                  {h.nota.toFixed(1).replace(".", ",")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editandoFile && (
        <AvatarEditor
          file={editandoFile}
          onCancel={() => setEditandoFile(null)}
          onSave={handleBlob}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-serif text-3xl text-rose-dark">{value}</p>
    </div>
  );
}

function VozConfig() {
  const [rate, setRate] = useVelocidade();
  const [pitch, setPitch] = usePitch();
  const [volume, setVolume] = useVolume();
  const [voiceUri, setVoiceUri] = useVoiceUri();
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);
  const [vozAtual, setVozAtual] = useState<string>("");
  const suportado =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!suportado) return;
    const carregar = () => {
      listVozesPtBr().then(setVozes);
      vozAtualEfetiva().then((v) =>
        setVozAtual(v ? `${v.name} (${v.lang})` : "nenhuma voz encontrada"),
      );
    };
    carregar();
    const ss = window.speechSynthesis;
    ss.addEventListener?.("voiceschanged", carregar);
    return () => ss.removeEventListener?.("voiceschanged", carregar);
  }, [suportado, voiceUri]);

  function testar() {
    stopSpeak();
    // pequeno delay pra Safari não engolir a fala logo após cancel()
    setTimeout(() => {
      speak(
        "Oi! Sou sua leitora dos resumos. Vamos estudar juntas com carinho e atenção?",
      );
    }, 60);
  }

  const temPt = vozes.some((v) => /^pt/i.test(v.lang));

  return (
    <div className="mt-6 rounded-3xl border border-pink-100 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Volume2 className="h-5 w-5 text-pink-500" />
        <h2 className="font-serif text-2xl">Leitura em voz alta</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Estas configurações valem em todo o site e são salvas no seu
        dispositivo. Usamos a voz nativa do seu aparelho — 100% gratuita.
      </p>

      {!suportado && (
        <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-xs text-rose-600">
          Seu navegador não suporta leitura em voz alta.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary bg-pink-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-lg">👩</span>
            <span className="font-medium">Feminina</span>
            <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
              ativa
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Voz padrão do Estudo Rosa.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-pink-200 bg-white p-4 opacity-70">
          <div className="flex items-center gap-3">
            <span className="text-lg">👨</span>
            <span className="font-medium">Masculina</span>
            <span className="ml-auto rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-pink-600">
              em breve
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Estamos escolhendo uma voz masculina bem natural. 🌷
          </p>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="tts-voice" className="text-sm font-medium text-rose-dark">
          Voz específica
        </label>
        {vozes.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-600">
            Nenhuma voz encontrada no seu dispositivo ainda. Toque em "Testar
            leitura" uma vez — alguns navegadores só carregam as vozes depois
            da primeira fala.
          </p>
        ) : (
          <>
            <select
              id="tts-voice"
              value={voiceUri ?? ""}
              onChange={(e) => setVoiceUri(e.target.value || null)}
              className="mt-2 w-full rounded-2xl border border-pink-200 bg-white px-3 py-2 text-sm text-rose-dark outline-none focus:border-pink-400"
            >
              <option value="">Melhor disponível (automático)</option>
              {vozes.map((v) => {
                const premium = PREMIUM.test(v.name);
                return (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {premium ? "⭐ " : ""}
                    {v.name} • {v.lang}
                    {v.localService ? "" : " • online"}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              ⭐ = voz mais natural (neural/premium). Tocando agora:{" "}
              <strong className="text-rose-dark">{vozAtual || "…"}</strong>
            </p>
            {!temPt && (
              <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-[11px] text-amber-700">
                Seu dispositivo não tem voz em português instalada. Vá em{" "}
                <strong>
                  Ajustes → Acessibilidade → Conteúdo falado → Vozes →
                  Português (Brasil)
                </strong>{" "}
                e baixe uma voz "Aprimorada" ou "Premium" (grátis).
              </p>
            )}
          </>
        )}
      </div>


      <SliderConfig
        id="tts-rate"
        label="Velocidade da fala"
        min={0.6}
        max={1.5}
        step={0.05}
        value={rate}
        onChange={setRate}
        display={`${rate.toFixed(2).replace(".", ",")}×`}
        left="Devagar"
        right="Rápido"
      />
      <SliderConfig
        id="tts-pitch"
        label="Tom da voz"
        min={0.6}
        max={1.6}
        step={0.05}
        value={pitch}
        onChange={setPitch}
        display={`${pitch.toFixed(2).replace(".", ",")}`}
        left="Grave"
        right="Agudo"
      />
      <SliderConfig
        id="tts-volume"
        label="Volume"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={setVolume}
        display={`${Math.round(volume * 100)}%`}
        left="Baixo"
        right="Alto"
      />

      <button
        onClick={testar}
        disabled={!suportado}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <Volume2 className="h-3.5 w-3.5" />
        Testar leitura
      </button>
    </div>
  );
}

function SliderConfig({
  id, label, min, max, step, value, onChange, display, left, right,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  display: string;
  left: string;
  right: string;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-rose-dark">
          {label}
        </label>
        <span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-semibold text-pink-700">
          {display}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-pink-500"
      />
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function SenhaConfig() {
  const { perfil } = usePerfilAtivo();
  if (!perfil?.is_admin) return null;

  return (
    <div className="mt-6 rounded-3xl border border-pink-100 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-pink-500" />
        <h2 className="font-serif text-2xl">Dados de Acesso</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        A plataforma agora utiliza e-mail e código (OTP) para segurança máxima. Não é necessário gerenciar senhas manuais.
      </p>
    </div>
  );
}

function ConviteAdmin() {
  const { perfil } = usePerfilAtivo();
  const [copiado, setCopiado] = useState(false);
  
  if (perfil?.nome !== "Nath") return null;

  const urlBase = typeof window !== "undefined" ? window.location.origin : "";
  const linkConvite = `${urlBase}/?convite=nath`;

  function copiar() {
    navigator.clipboard.writeText(linkConvite);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="mt-6 rounded-3xl border border-rose-100 bg-rose-50/30 p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-rose-500" />
        <h2 className="font-serif text-2xl text-rose-700">Painel da Nath</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Use o link abaixo para convidar suas amigas. Apenas quem tiver esse link poderá registrar um novo perfil.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <input
          readOnly
          value={linkConvite}
          className="flex-1 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs text-rose-800 outline-none"
        />
        <button
          onClick={copiar}
          className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-600 transition"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}



