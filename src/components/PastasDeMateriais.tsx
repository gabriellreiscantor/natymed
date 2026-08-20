import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Folder,
  FolderOpen,
  FolderPlus,
  Globe,
  Lock,
  Palette,
  Pencil,
  Trash2,
} from "lucide-react";

import { alertarBonito, confirmarBonito } from "@/components/ConfirmDialog";
import { promptBonito } from "@/components/PromptDialog";
import { usePerfilAtivo } from "@/lib/perfis-store";
import {
  CORES_MODULO,
  CORES_MODULO_NOMEADAS,
  createModulo,
  deleteModulo,
  listModulos,
  onModulosChange,
  updateModulo,
  type Modulo,
  type Secao,
} from "@/lib/modulos-store";
import {
  deleteStudy,
  listCompartilhados,
  listMeusEstudos,
  moverEstudo,
  renameStudy,
  setCompartilhado,
  setCurrentStudyId,
  type StudyListItem,
} from "@/lib/study-store";

/**
 * Navegação em pastas, igual Finder/Explorer: primeiro as pastas, depois os
 * materiais soltos. Clicar numa pasta entra nela; a volta é pelo cabeçalho.
 * Cada seção tem as próprias pastas — a mesma aula pode estar em "Módulo 1"
 * nos Resumos e em "Prova 2" nas Questões.
 */
export function PastasDeMateriais({
  secao,
  currentId,
  onPick,
}: {
  secao: Secao & ("resumos" | "questoes");
  currentId?: string;
  onPick: (id: string) => void;
}) {
  const { perfil } = usePerfilAtivo();
  const ehAdmin = !!perfil?.is_admin;
  // Nesta tela (materiais) só a Naty organiza — é ela quem publica os PDFs.
  const podeOrganizar = ehAdmin;

  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [meus, setMeus] = useState<StudyListItem[]>([]);
  const [comp, setComp] = useState<StudyListItem[]>([]);
  const [dentroDe, setDentroDe] = useState<string | null>(null);
  const [criandoPasta, setCriandoPasta] = useState(false);
  const [nomeNovaPasta, setNomeNovaPasta] = useState("");

  const campo = secao === "resumos" ? "modulo_resumos_id" : "modulo_questoes_id";

  const recarregar = () => {
    listModulos(secao).then(setModulos);
    listMeusEstudos().then(setMeus);
    listCompartilhados().then(setComp);
  };

  useEffect(() => {
    recarregar();
    const off1 = onModulosChange(recarregar);
    window.addEventListener("estudo:atualizado", recarregar);
    return () => {
      off1();
      window.removeEventListener("estudo:atualizado", recarregar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secao]);

  // A Naty vê o que é dela; as alunas veem o que ela compartilhou.
  const todos = ehAdmin
    ? [...meus, ...comp.filter((c) => !meus.some((m) => m.id === c.id))]
    : comp;

  const pastaDe = (s: StudyListItem) =>
    (s as unknown as Record<string, string | null>)[campo] ?? null;

  const soltos = todos.filter((s) => !pastaDe(s));
  const dentro = dentroDe ? todos.filter((s) => pastaDe(s) === dentroDe) : [];
  const pastaAberta = modulos.find((m) => m.id === dentroDe) ?? null;

  // Qual pasta está com o seletor de cor aberto.
  const [corAberta, setCorAberta] = useState<string | null>(null);

  async function criarPasta(e: React.FormEvent) {
    e.preventDefault();
    const n = nomeNovaPasta.trim();
    if (!n) return;
    try {
      const cor = CORES_MODULO[modulos.length % CORES_MODULO.length];
      await createModulo(n, cor, secao);
      setNomeNovaPasta("");
      setCriandoPasta(false);
    } catch (err) {
      alertarBonito(
        err instanceof Error ? err.message : "Não consegui criar a pasta. 🌷",
      );
    }
  }

  async function apagarPasta(m: Modulo) {
    const dentroDela = todos.filter((s) => pastaDe(s) === m.id).length;
    const ok = await confirmarBonito({
      titulo: `Apagar a pasta "${m.nome}"?`,
      mensagem:
        dentroDela > 0
          ? `Os ${dentroDela} materiais de dentro NÃO são apagados: eles voltam para "Sem pasta" e você reorganiza depois.`
          : "A pasta está vazia e será removida.",
      confirmar: "Apagar pasta",
    });
    if (!ok) return;
    await deleteModulo(m.id);
    if (dentroDe === m.id) setDentroDe(null);
  }

  // ---------- Dentro de uma pasta ----------
  if (pastaAberta) {
    return (
      <div className="mb-6 rounded-3xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setDentroDe(null)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-pink-600 hover:bg-pink-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Pastas
          </button>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
            style={{
              backgroundColor: `${pastaAberta.cor}22`,
              color: pastaAberta.cor,
            }}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {pastaAberta.nome}
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {dentro.length} material{dentro.length === 1 ? "" : "is"}
          </span>
        </div>

        {dentro.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Pasta vazia. {ehAdmin ? "Mova um material para cá 🌸" : "Volte em breve! 🌷"}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {dentro.map((s) => (
              <LinhaMaterial
                key={s.id}
                s={s}
                ativo={s.id === currentId}
                ehDela={s.perfil_id === perfil?.id}
                modulos={modulos}
                pastaAtual={pastaDe(s)}
                secao={secao}
                onPick={onPick}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ---------- Raiz: pastas + materiais soltos ----------
  return (
    <div className="mb-6 rounded-3xl border border-border bg-card p-3 shadow-sm">
      {ehAdmin && (
        <div className="mb-3 flex items-center gap-2">
          {criandoPasta ? (
            <form onSubmit={criarPasta} className="flex flex-1 gap-2">
              <input
                value={nomeNovaPasta}
                onChange={(e) => setNomeNovaPasta(e.target.value)}
                placeholder="Nome da pasta"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCriandoPasta(false);
                }}
                className="min-w-0 flex-1 rounded-full border border-pink-200 bg-pink-50/30 px-4 py-1.5 text-sm text-pink-800 outline-none focus:border-pink-400"
              />
              <button
                type="submit"
                disabled={!nomeNovaPasta.trim()}
                className="rounded-full bg-pink-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setCriandoPasta(false)}
                className="rounded-full px-3 py-1.5 text-xs text-muted-foreground"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCriandoPasta(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs font-bold text-pink-600 hover:bg-pink-50"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Nova pasta
            </button>
          )}
        </div>
      )}

      {modulos.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {modulos.map((m) => {
            const qtd = todos.filter((s) => pastaDe(s) === m.id).length;
            return (
              <li key={m.id} className="group relative">
                <button
                  onClick={() => setDentroDe(m.id)}
                  className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                >
                  <Folder
                    className="h-9 w-9"
                    style={{ color: m.cor, fill: `${m.cor}33` }}
                  />
                  <span className="w-full truncate text-center text-xs font-bold text-foreground">
                    {m.nome}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {qtd} item{qtd === 1 ? "" : "s"}
                  </span>
                </button>

                {podeOrganizar && (
                  // No celular não existe "passar o mouse": os botões ficam
                  // sempre visíveis em tela pequena e só se escondem no
                  // computador, onde o hover funciona.
                  <div className="absolute right-1 top-1 flex gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() =>
                        setCorAberta(corAberta === m.id ? null : m.id)
                      }
                      title="Mudar a cor"
                      aria-label="Mudar a cor da pasta"
                      className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-pink-500 shadow-sm"
                    >
                      <Palette className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        const novo = await promptBonito({
                          titulo: "Renomear pasta 📁",
                          mensagem: "Novo nome:",
                          valorPadrao: m.nome,
                        });
                        if (novo?.trim()) await updateModulo(m.id, { nome: novo.trim() });
                      }}
                      title="Renomear"
                      aria-label="Renomear pasta"
                      className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-pink-500 shadow-sm"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => apagarPasta(m)}
                      title="Apagar pasta"
                      aria-label="Apagar pasta"
                      className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-pink-300 shadow-sm hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {corAberta === m.id && (
                  <div className="absolute inset-x-1 bottom-1 z-20 rounded-2xl border border-pink-100 bg-white p-2 shadow-xl">
                    <div className="grid grid-cols-4 gap-1.5">
                      {CORES_MODULO_NOMEADAS.map((c) => (
                        <button
                          key={c.cor}
                          onClick={async () => {
                            await updateModulo(m.id, { cor: c.cor });
                            setCorAberta(null);
                          }}
                          title={c.nome}
                          aria-label={c.nome}
                          className={`h-6 w-full rounded-full transition-transform active:scale-90 ${
                            m.cor === c.cor ? "ring-2 ring-pink-400 ring-offset-1" : ""
                          }`}
                          style={{ backgroundColor: c.cor }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {soltos.length > 0 && (
        <>
          {modulos.length > 0 && (
            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Sem pasta
            </p>
          )}
          <ul className="space-y-1.5">
            {soltos.map((s) => (
              <LinhaMaterial
                key={s.id}
                s={s}
                ativo={s.id === currentId}
                ehDela={s.perfil_id === perfil?.id}
                modulos={modulos}
                pastaAtual={null}
                secao={secao}
                onPick={onPick}
              />
            ))}
          </ul>
        </>
      )}

      {modulos.length === 0 && soltos.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {ehAdmin
            ? "Nenhum material ainda. Envie um PDF no Início 🌸"
            : "A Naty ainda não publicou nada. Volte em breve! 🌷"}
        </p>
      )}
    </div>
  );
}

function LinhaMaterial({
  s,
  ativo,
  ehDela,
  modulos,
  pastaAtual,
  secao,
  onPick,
}: {
  s: StudyListItem;
  ativo: boolean;
  ehDela: boolean;
  modulos: Modulo[];
  pastaAtual: string | null;
  secao: "resumos" | "questoes";
  onPick: (id: string) => void;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${
        ativo
          ? "border-primary bg-secondary/40"
          : "border-border bg-background hover:border-primary/40"
      }`}
    >
      <button
        onClick={() => {
          setCurrentStudyId(s.id);
          onPick(s.id);
        }}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate font-medium">{s.nome}</p>
        <p className="text-[11px] text-muted-foreground">
          {!ehDela && s.dono_nome && `por ${s.dono_nome} • `}
          {new Date(s.criado_em).toLocaleDateString("pt-BR")}
        </p>
      </button>

      {ehDela && (
        <>
          {modulos.length > 0 && (
            <select
              value={pastaAtual ?? ""}
              onChange={(e) => moverEstudo(s.id, secao, e.target.value || null)}
              title="Mover para a pasta"
              className="max-w-[120px] shrink-0 rounded-full border border-pink-200 bg-white px-2 py-1 text-[11px] text-pink-700 outline-none"
            >
              <option value="">Sem pasta</option>
              {modulos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={async () => {
              const novo = await promptBonito({
                titulo: "Renomear Estudo 📄",
                mensagem: "Qual será o novo nome desse material?",
                valorPadrao: s.nome,
              });
              if (novo?.trim() && novo.trim() !== s.nome)
                await renameStudy(s.id, novo.trim());
            }}
            title="Renomear"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-pink-400 hover:bg-pink-50"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCompartilhado(s.id, !s.compartilhado)}
            title={s.compartilhado ? "Compartilhado" : "Só seu"}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              s.compartilhado
                ? "bg-pink-100 text-pink-600"
                : "text-pink-300 hover:bg-pink-50"
            }`}
          >
            {s.compartilhado ? (
              <Globe className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={async () => {
              if (
                await confirmarBonito({
                  titulo: "Apagar material?",
                  mensagem: `"${s.nome}" será apagado com seus resumos e questões.`,
                  confirmar: "Apagar",
                })
              ) {
                await deleteStudy(s.id);
              }
            }}
            title="Apagar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-pink-300 hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </li>
  );
}
