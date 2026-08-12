import { createFileRoute, Link } from "@tanstack/react-router";
import { confirmarBonito } from "@/components/ConfirmDialog";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Check, ChevronDown, Trash2, X } from "lucide-react";

import {
  clearHistory,
  fetchDonos,
  loadEstudoQuestoes,
  loadHistory,
  type HistoryEntry,
} from "@/lib/study-store";
import { usePerfilAtivo } from "@/lib/perfis-store";


export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [{ title: "Histórico — Estudo Rosa" }],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const [historia, setHistoria] = useState<HistoryEntry[]>([]);
  const [scope, setScope] = useState<"meu" | "todos">("meu");
  const [donos, setDonos] = useState<Map<string, { nome: string; foto_url: string | null }>>(
    new Map(),
  );
  const { perfil } = usePerfilAtivo();
  // Só a Naty enxerga o histórico da turma — o banco também exige isso.
  const podeVerTodas = !!perfil?.is_admin;
  const vendoTodas = podeVerTodas && scope === "todos";

  useEffect(() => {
    const refresh = () => {
      loadHistory(podeVerTodas ? scope : "meu").then(async (h) => {
        setHistoria(h);
        if (podeVerTodas && scope === "todos") {
          setDonos(await fetchDonos(h.map((e) => e.perfil_id ?? "")));
        }
      });
    };
    refresh();
    window.addEventListener("estudo:atualizado", refresh);
    return () => window.removeEventListener("estudo:atualizado", refresh);
  }, [scope, podeVerTodas]);

  const scopeToggle = podeVerTodas ? (
    <div className="mb-6 flex gap-1 rounded-full border border-border bg-card p-1 text-xs">
      <button
        onClick={() => setScope("meu")}
        className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
          scope === "meu"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground"
        }`}
      >
        Meu histórico
      </button>
      <button
        onClick={() => setScope("todos")}
        className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
          scope === "todos"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground"
        }`}
      >
        Todas as amigas
      </button>
    </div>
  ) : null;

  if (historia.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        {scopeToggle}
        <div className="rounded-3xl border border-dashed border-border p-8 text-center">
          <h1 className="text-2xl">Ainda sem histórico</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Termine um quiz e sua nota aparece aqui.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Enviar PDF
          </Link>
        </div>
      </div>
    );
  }


  const media =
    historia.reduce((acc, h) => acc + h.nota, 0) / historia.length;

  const chartData = [...historia]
    .sort((a, b) => (a.data < b.data ? -1 : 1))
    .map((h, i) => ({
      idx: i + 1,
      nota: h.nota,
      data: new Date(h.data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
    }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {scopeToggle}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Histórico</h1>
          <p className="mt-2 text-muted-foreground">
            {vendoTodas
              ? "Como as meninas estão indo nos quizzes. 🌷"
              : "Sua evolução ao longo do tempo. Cada prova conta. 🌷"}
          </p>
        </div>
        {!vendoTodas && (
        <button
          onClick={async () => {
            if (await confirmarBonito({
              titulo: "Apagar histórico?",
              mensagem: "Todas as suas provas anteriores serão removidas. Essa ação não pode ser desfeita.",
              confirmar: "Apagar tudo",
            })) clearHistory();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-[color:var(--error)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Limpar
        </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={vendoTodas ? "Provas da turma" : "Provas feitas"} value={String(historia.length)} />
        <StatCard
          label="Nota média"
          value={media.toFixed(1).replace(".", ",")}
        />
        <StatCard
          label="Melhor nota"
          value={Math.max(...historia.map((h) => h.nota))
            .toFixed(1)
            .replace(".", ",")}
        />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl">{vendoTodas ? "Evolução da turma" : "Sua evolução"}</h2>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="data"
                stroke="var(--color-muted-foreground)"
                fontSize={12}
              />
              <YAxis
                domain={[0, 10]}
                stroke="var(--color-muted-foreground)"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                }}
                formatter={(v: number) => [
                  v.toFixed(1).replace(".", ","),
                  "Nota",
                ]}
              />
              <Line
                type="monotone"
                dataKey="nota"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ r: 5, fill: "var(--color-primary)" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {historia.map((h) => (
          <HistoryItem
            key={h.id}
            entry={h}
            dona={vendoTodas ? (donos.get(h.perfil_id ?? "")?.nome ?? null) : null}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryItem({ entry, dona }: { entry: HistoryEntry; dona?: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [questoes, setQuestoes] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const temRespostas =
    entry.respostas && Object.keys(entry.respostas).length > 0;

  async function toggle() {
    const proximo = !aberto;
    setAberto(proximo);
    if (proximo && !questoes && entry.estudo_id) {
      setLoading(true);
      const qs = await loadEstudoQuestoes(entry.estudo_id);
      setQuestoes(qs);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <button
        onClick={toggle}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{entry.nome}</p>
          {dona && (
            <p className="truncate text-xs font-bold text-pink-500">{dona}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(entry.data).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • {entry.acertos}/{entry.total} acertos
          </p>
        </div>
        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-serif text-2xl ${
            entry.nota >= 7
              ? "bg-[color:var(--success-bg)] text-[color:var(--success)]"
              : entry.nota >= 5
                ? "bg-secondary text-rose-dark"
                : "bg-[color:var(--error-bg)] text-[color:var(--error)]"
          }`}
        >
          {entry.nota.toFixed(1).replace(".", ",")}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            aberto ? "rotate-180" : ""
          }`}
        />
      </button>

      {aberto && (
        <div className="border-t border-border px-4 py-4">
          {!temRespostas && (
            <p className="text-sm text-muted-foreground">
              Este resultado é antigo e não guardou as respostas por questão.
            </p>
          )}
          {temRespostas && loading && (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          )}
          {temRespostas && !loading && !questoes && (
            <p className="text-sm text-muted-foreground">
              As questões deste estudo não estão mais disponíveis.
            </p>
          )}
          {temRespostas && questoes && (
            <ol className="space-y-3">
              {questoes.map((q: any, i: number) => {
                const escolhida = entry.respostas?.[String(i)] ?? null;
                const acertou = escolhida === q.gabarito;
                return (
                  <li
                    key={i}
                    className={`rounded-2xl border p-3 text-sm ${
                      acertou
                        ? "border-[color:var(--success)]/30 bg-[color:var(--success-bg)]/50"
                        : "border-[color:var(--error)]/30 bg-[color:var(--error-bg)]/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-card font-serif text-xs text-rose-dark">
                        {i + 1}
                      </span>
                      <p className="min-w-0 flex-1 leading-relaxed text-foreground/90">
                        {limparTexto(q.enunciado)}
                      </p>
                      {acertou ? (
                        <Check className="h-4 w-4 shrink-0 text-[color:var(--success)]" />
                      ) : (
                        <X className="h-4 w-4 shrink-0 text-[color:var(--error)]" />
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-8 text-xs">
                      <span className={acertou ? "text-[color:var(--success)]" : "text-[color:var(--error)]"}>
                        Sua resposta: <b>{escolhida ?? "—"}</b>
                      </span>
                      {!acertou && (
                        <span className="text-[color:var(--success)]">
                          Correta: <b>{q.gabarito}</b>
                        </span>
                      )}
                    </div>
                    {!acertou && q.explicacao && (
                      <div className="ml-8 mt-3 rounded-xl bg-card/70 p-3 text-xs leading-relaxed text-foreground/80">
                        <p className="mb-1 font-semibold text-rose-dark">
                          Por que a resposta é {q.gabarito}
                        </p>
                        <p>{limparTexto(q.explicacao)}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function limparTexto(texto: string) {
  if (!texto) return "";
  return texto
    .replace(/-\n/g, "")
    .replace(/([^\n])\n(?!\n)/g, "$1 ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}


function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-serif text-3xl text-rose-dark">{value}</p>
    </div>
  );
}
