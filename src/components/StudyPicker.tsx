import { useEffect, useState } from "react";
import { alertarBonito, confirmarBonito } from "@/components/ConfirmDialog";
import { promptBonito } from "@/components/PromptDialog";
import { Globe, Lock, Pencil, Trash2 } from "lucide-react";
import {
  listCompartilhados,
  listMeusEstudos,
  setCompartilhado,
  setCurrentStudyId,
  deleteStudy,
  renameStudy,
  type StudyListItem,
} from "@/lib/study-store";
import { usePerfilAtivo } from "@/lib/perfis-store";
import { EtiquetaModulo } from "@/components/Modulos";
import {
  listModulos,
  onModulosChange,
  setModuloDoEstudo,
  type Modulo,
} from "@/lib/modulos-store";

export function StudyPicker({
  currentId,
  onPick,
}: {
  currentId: string | null;
  onPick: (id: string) => void;
}) {
  const [tab, setTab] = useState<"meus" | "compartilhados">("meus");
  const [meus, setMeus] = useState<StudyListItem[]>([]);
  const [comp, setComp] = useState<StudyListItem[]>([]);
  const { perfil } = usePerfilAtivo();
  // Só a Naty envia PDF. Para as alunas não faz sentido a aba "Meus":
  // elas veem direto os materiais que ela compartilhou.
  const ehAdmin = !!perfil?.is_admin;
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [filtroModulo, setFiltroModulo] = useState<string | null>(null);

  useEffect(() => {
    const carregar = () => listModulos().then(setModulos);
    carregar();
    return onModulosChange(carregar);
  }, []);

  const porId = new Map(modulos.map((m) => [m.id, m]));

  const refresh = () => {
    listMeusEstudos().then(setMeus);
    listCompartilhados().then(setComp);
  };

  useEffect(() => {
    refresh();
    window.addEventListener("estudo:atualizado", refresh);
    return () => window.removeEventListener("estudo:atualizado", refresh);
  }, []);

  const base = !ehAdmin ? comp : tab === "meus" ? meus : comp;
  const list = filtroModulo
    ? base.filter((s) =>
        filtroModulo === "__sem__" ? !s.modulo_id : s.modulo_id === filtroModulo,
      )
    : base;

  // Só oferece o filtro quando existe módulo com material dentro.
  const modulosComConteudo = modulos.filter((m) =>
    base.some((s) => s.modulo_id === m.id),
  );
  const temSemModulo = base.some((s) => !s.modulo_id);

  return (
    <div className="mb-6 rounded-3xl border border-border bg-card/70 p-4 shadow-sm">
      {ehAdmin ? (
      <div className="mb-3 flex gap-1 rounded-full border border-border bg-background p-1 text-xs">
        <button
          onClick={() => setTab("meus")}
          className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
            tab === "meus"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-rose-dark"
          }`}
        >
          Meus
        </button>
        <button
          onClick={() => setTab("compartilhados")}
          className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
            tab === "compartilhados"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-rose-dark"
          }`}
        >
          Compartilhados
        </button>
      </div>
      ) : (
        <p className="mb-3 px-1 text-xs font-medium text-pink-500">
          Materiais que a Naty preparou para vocês 💗
        </p>
      )}

      {(modulosComConteudo.length > 0 || (temSemModulo && modulos.length > 0)) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroModulo(null)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
              filtroModulo === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-pink-200 bg-white text-pink-600 hover:bg-pink-50"
            }`}
          >
            Todos
          </button>
          {modulosComConteudo.map((m) => {
            const ativo = filtroModulo === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setFiltroModulo(ativo ? null : m.id)}
                className="rounded-full border px-2.5 py-1 text-[11px] font-bold transition"
                style={
                  ativo
                    ? { backgroundColor: m.cor, borderColor: m.cor, color: "#fff" }
                    : { borderColor: `${m.cor}66`, color: m.cor }
                }
              >
                {m.nome}
              </button>
            );
          })}
          {temSemModulo && modulosComConteudo.length > 0 && (
            <button
              onClick={() =>
                setFiltroModulo(filtroModulo === "__sem__" ? null : "__sem__")
              }
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                filtroModulo === "__sem__"
                  ? "border-slate-400 bg-slate-400 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Sem módulo
            </button>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {!ehAdmin
            ? "A Naty ainda não publicou nenhum material. Volte em breve! 🌷"
            : tab === "meus"
              ? "Você ainda não enviou nenhum PDF."
              : "As amigas ainda não compartilharam nada."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((s) => {
            const ativo = s.id === currentId;
            const dela = s.perfil_id === perfil?.id;
            return (
              <li
                key={s.id}
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
                  <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <EtiquetaModulo modulo={porId.get(s.modulo_id ?? "")} />
                    <span>
                      {(!ehAdmin || tab === "compartilhados") && s.dono_nome && `por ${s.dono_nome} • `}
                      {new Date(s.criado_em).toLocaleDateString("pt-BR")}
                    </span>
                  </p>
                </button>

                {dela && modulos.length > 0 && (
                  <select
                    value={s.modulo_id ?? ""}
                    onChange={(e) =>
                      setModuloDoEstudo(s.id, e.target.value || null)
                    }
                    title="Módulo deste material"
                    className="max-w-[110px] shrink-0 rounded-full border border-pink-200 bg-white px-2 py-1 text-[11px] text-pink-700 outline-none"
                  >
                    <option value="">Sem módulo</option>
                    {modulos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                )}

                {dela && (
                  <>
                    <button
                      onClick={async () => {
                        const novo = await promptBonito({
                          titulo: "Renomear Estudo 📄",
                          mensagem: "Qual será o novo nome desse material?",
                          valorPadrao: s.nome
                        });
                        if (novo && novo.trim() && novo.trim() !== s.nome) {
                          renameStudy(s.id, novo.trim());
                        }
                      }}
                      title="Editar nome"
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-rose-dark"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCompartilhado(s.id, !s.compartilhado)}
                      title={s.compartilhado ? "Tornar privado" : "Compartilhar com amigas"}
                      className={`grid h-8 w-8 place-items-center rounded-full text-xs transition ${
                        s.compartilhado
                          ? "bg-pink-100 text-pink-700 hover:bg-pink-200"
                          : "text-muted-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {s.compartilhado ? (
                        <Globe className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirmarBonito({
                          titulo: "Apagar estudo?",
                          mensagem: `"${s.nome}" será removido junto com seus resumos e questões.`,
                          confirmar: "Apagar estudo",
                        })) deleteStudy(s.id);
                      }}
                      title="Apagar"
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
