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

  const refresh = () => {
    listMeusEstudos().then(setMeus);
    listCompartilhados().then(setComp);
  };

  useEffect(() => {
    refresh();
    window.addEventListener("estudo:atualizado", refresh);
    return () => window.removeEventListener("estudo:atualizado", refresh);
  }, []);

  const list = tab === "meus" ? meus : comp;

  return (
    <div className="mb-6 rounded-3xl border border-border bg-card/70 p-4 shadow-sm">
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

      {list.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {tab === "meus"
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
                  <p className="text-[11px] text-muted-foreground">
                    {tab === "compartilhados" && s.dono_nome && `por ${s.dono_nome} • `}
                    {new Date(s.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </button>

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
