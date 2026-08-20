import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  GraduationCap,
  NotebookPen,
  Plus,
  Target,
  Trash2,
  UserX,
} from "lucide-react";

import { confirmarBonito } from "@/components/ConfirmDialog";
import {
  calcularFaltas,
  calcularMeta,
  createAvaliacao,
  createMateria,
  deleteAvaliacao,
  deleteMateria,
  listAvaliacoes,
  listMaterias,
  mediaGeral,
  onFaculdadeChange,
  proximasProvas,
  situacaoDaMateria,
  updateAvaliacao,
  updateMateria,
  type Avaliacao,
  type Materia,
} from "@/lib/faculdade-store";

export const Route = createFileRoute("/faculdade")({
  head: () => ({
    meta: [{ title: "Faculdade — Estudo Rosa" }],
  }),
  component: FaculdadePage,
});

function FaculdadePage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = async () => {
    const [ms, as] = await Promise.all([listMaterias(), listAvaliacoes()]);
    setMaterias(ms);
    setAvaliacoes(as);
    setCarregando(false);
  };

  useEffect(() => {
    recarregar();
    return onFaculdadeChange(recarregar);
  }, []);

  const aberta = materias.find((m) => m.id === abertaId) ?? null;

  if (aberta) {
    return (
      <DetalheMateria
        materia={aberta}
        avaliacoes={avaliacoes.filter((a) => a.materia_id === aberta.id)}
        onVoltar={() => setAbertaId(null)}
      />
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-pink-700 sm:text-4xl">
          Minha Faculdade
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suas notas, faltas, provas e anotações da facul, tudo num lugar só 🩺
        </p>
      </header>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <Resumo materias={materias} avaliacoes={avaliacoes} />
          <ProximasProvas materias={materias} avaliacoes={avaliacoes} />
          <ListaMaterias
            materias={materias}
            avaliacoes={avaliacoes}
            onAbrir={setAbertaId}
          />
        </>
      )}
    </main>
  );
}

// ============ Resumo do semestre ============

function Resumo({
  materias,
  avaliacoes,
}: {
  materias: Materia[];
  avaliacoes: Avaliacao[];
}) {
  const media = mediaGeral(materias);
  const aprovadas = materias.filter((m) => situacaoDaMateria(m) === "aprovada").length;
  const emRisco = materias.filter((m) => {
    const f = calcularFaltas(m);
    return f && f.risco !== "tranquilo";
  }).length;
  const provasFuturas = proximasProvas(avaliacoes, materias).length;

  if (materias.length === 0) return null;

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <CardResumo
        titulo="Média geral"
        valor={media === null ? "—" : media.toFixed(1)}
        detalhe="das matérias fechadas"
      />
      <CardResumo
        titulo="Aprovada em"
        valor={`${aprovadas}/${materias.length}`}
        detalhe="matérias"
      />
      <CardResumo
        titulo="Faltas em risco"
        valor={String(emRisco)}
        detalhe={emRisco === 0 ? "tudo tranquilo" : "matérias no limite"}
        alerta={emRisco > 0}
      />
      <CardResumo
        titulo="Provas marcadas"
        valor={String(provasFuturas)}
        detalhe="ainda por vir"
      />
    </div>
  );
}

function CardResumo({
  titulo,
  valor,
  detalhe,
  alerta,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 shadow-sm ${
        alerta
          ? "border-rose-200 bg-rose-50/60"
          : "border-pink-100 bg-white/70"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
        {titulo}
      </p>
      <p
        className={`mt-1 font-serif text-3xl ${
          alerta ? "text-rose-600" : "text-pink-700"
        }`}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{detalhe}</p>
    </div>
  );
}

// ============ Calendário de provas ============

function ProximasProvas({
  materias,
  avaliacoes,
}: {
  materias: Materia[];
  avaliacoes: Avaliacao[];
}) {
  const provas = useMemo(
    () => proximasProvas(avaliacoes, materias).slice(0, 6),
    [avaliacoes, materias],
  );

  if (provas.length === 0) return null;

  return (
    <section className="mb-8 rounded-3xl border border-pink-100 bg-white/70 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-pink-500" />
        <h2 className="font-serif text-xl text-pink-800">Próximas provas</h2>
      </div>
      <ul className="space-y-2">
        {provas.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-pink-50/50 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-pink-800">{p.nome}</p>
              <p className="truncate text-xs text-pink-400">
                {p.materia?.nome ?? "Matéria removida"}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                p.diasRestantes <= 3
                  ? "bg-rose-100 text-rose-600"
                  : p.diasRestantes <= 7
                    ? "bg-amber-100 text-amber-700"
                    : "bg-white text-pink-500"
              }`}
            >
              {p.diasRestantes === 0
                ? "é hoje!"
                : p.diasRestantes === 1
                  ? "amanhã"
                  : `em ${p.diasRestantes} dias`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ============ Lista de matérias ============

function ListaMaterias({
  materias,
  avaliacoes,
  onAbrir,
}: {
  materias: Materia[];
  avaliacoes: Avaliacao[];
  onAbrir: (id: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    await createMateria(nome.trim(), periodo.trim() || null);
    setNome("");
    setPeriodo("");
    setSalvando(false);
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-pink-500" />
        <h2 className="font-serif text-xl text-pink-800">Matérias</h2>
      </div>

      <form
        onSubmit={adicionar}
        className="mb-5 flex flex-col gap-2 rounded-3xl border border-pink-100 bg-white/70 p-4 shadow-sm sm:flex-row"
      >
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da matéria (ex: Anatomia I)"
          className="flex-1 rounded-full border border-pink-100 bg-pink-50/30 px-5 py-2.5 text-sm text-pink-800 outline-none placeholder:text-pink-300 focus:border-pink-300"
        />
        <input
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          placeholder="Período"
          className="rounded-full border border-pink-100 bg-pink-50/30 px-5 py-2.5 text-sm text-pink-800 outline-none placeholder:text-pink-300 focus:border-pink-300 sm:w-36"
        />
        <button
          type="submit"
          disabled={salvando || !nome.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-100 transition-all hover:bg-pink-600 active:scale-95 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </form>

      {materias.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-pink-200 p-10 text-center">
          <p className="text-sm text-pink-400">
            Nenhuma matéria ainda. Adicione a primeira aí em cima e comece a
            acompanhar suas notas! 💗
          </p>
        </div>
      ) : (
        <>
        {materias.filter((m) => !m.total_aulas).length > 0 && (
          <div className="mb-4 rounded-2xl border border-pink-200 bg-pink-50/50 px-4 py-3">
            <p className="text-sm font-medium text-pink-700">
              {materias.filter((m) => !m.total_aulas).length === materias.length
                ? "Suas matérias ainda estão vazias 🌸"
                : `${materias.filter((m) => !m.total_aulas).length} matéria(s) sem carga horária`}
            </p>
            <p className="mt-1 text-xs text-pink-600/80">
              Abra cada uma e preencha o total de aulas e as provas do semestre.
              Aí eu te mostro quantas faltas ainda pode tomar e quanto precisa
              tirar pra passar. 💗
            </p>
          </div>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {materias.map((m) => (
            <CardMateria
              key={m.id}
              materia={m}
              avaliacoes={avaliacoes.filter((a) => a.materia_id === m.id)}
              onAbrir={() => onAbrir(m.id)}
            />
          ))}
        </ul>
        </>
      )}
    </section>
  );
}

function CardMateria({
  materia,
  avaliacoes,
  onAbrir,
}: {
  materia: Materia;
  avaliacoes: Avaliacao[];
  onAbrir: () => void;
}) {
  const situacao = situacaoDaMateria(materia);
  const faltas = calcularFaltas(materia);

  return (
    <li>
      <button
        onClick={onAbrir}
        className="w-full rounded-3xl border border-pink-100 bg-white p-5 text-left shadow-sm transition-all hover:border-pink-300 hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-serif text-xl text-pink-800">
              {materia.nome}
            </p>
            {materia.periodo && (
              <p className="text-xs text-pink-400">{materia.periodo}</p>
            )}
          </div>
          <TagSituacao situacao={situacao} nota={materia.nota_final} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-pink-50 px-2.5 py-1 font-medium text-pink-600">
            {avaliacoes.length} avaliação{avaliacoes.length === 1 ? "" : "ões"}
          </span>
          {faltas && (
            <span
              className={`rounded-full px-2.5 py-1 font-medium ${
                faltas.risco === "perigo"
                  ? "bg-rose-100 text-rose-600"
                  : faltas.risco === "atencao"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {faltas.usadas}/{faltas.limite} faltas
            </span>
          )}
          {materia.anotacoes && (
            <span className="rounded-full bg-pink-50 px-2.5 py-1 font-medium text-pink-600">
              tem anotação
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

function TagSituacao({
  situacao,
  nota,
}: {
  situacao: ReturnType<typeof situacaoDaMateria>;
  nota: number | null;
}) {
  if (situacao === "andamento") {
    return (
      <span className="shrink-0 rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-400">
        em curso
      </span>
    );
  }
  const aprovada = situacao === "aprovada";
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
        aprovada
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-600"
      }`}
    >
      {nota?.toFixed(1)} · {aprovada ? "passou" : "reprovou"}
    </span>
  );
}

// ============ Detalhe da matéria ============

function DetalheMateria({
  materia,
  avaliacoes,
  onVoltar,
}: {
  materia: Materia;
  avaliacoes: Avaliacao[];
  onVoltar: () => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <button
        onClick={onVoltar}
        className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-pink-600 shadow-sm transition-all hover:bg-pink-50 active:scale-95"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Todas as matérias
      </button>

      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-pink-700">{materia.nome}</h1>
          {materia.periodo && (
            <p className="mt-1 text-sm text-pink-400">{materia.periodo}</p>
          )}
        </div>
        <button
          onClick={async () => {
            if (
              await confirmarBonito({
                titulo: "Apagar matéria?",
                mensagem: `"${materia.nome}" será removida junto com as avaliações, faltas e anotações.`,
                confirmar: "Apagar matéria",
              })
            ) {
              await deleteMateria(materia.id);
              onVoltar();
            }
          }}
          title="Apagar matéria"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-pink-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <BlocoNotaFinal materia={materia} />
      <BlocoMeta materia={materia} avaliacoes={avaliacoes} />
      <BlocoAvaliacoes materia={materia} avaliacoes={avaliacoes} />
      <BlocoFaltas materia={materia} />
      <BlocoAnotacoes materia={materia} />
    </main>
  );
}

function Bloco({
  icone,
  titulo,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-3xl border border-pink-100 bg-white/70 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icone}
        <h2 className="font-serif text-xl text-pink-800">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function BlocoNotaFinal({ materia }: { materia: Materia }) {
  const [nota, setNota] = useState(
    materia.nota_final === null ? "" : String(materia.nota_final),
  );
  const [minima, setMinima] = useState(String(materia.media_para_passar));

  useEffect(() => {
    setNota(materia.nota_final === null ? "" : String(materia.nota_final));
    setMinima(String(materia.media_para_passar));
  }, [materia.id, materia.nota_final, materia.media_para_passar]);

  function salvar() {
    const n = nota.trim() === "" ? null : Number(nota.replace(",", "."));
    const min = Number(minima.replace(",", ".")) || 7;
    if (n !== null && (Number.isNaN(n) || n < 0 || n > 10)) return;
    updateMateria(materia.id, { nota_final: n, media_para_passar: min });
  }

  return (
    <Bloco
      icone={<GraduationCap className="h-4 w-4 text-pink-500" />}
      titulo="Nota final"
    >
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
            Minha nota
          </span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onBlur={salvar}
            inputMode="decimal"
            placeholder="—"
            className="w-24 rounded-2xl border border-pink-100 bg-pink-50/30 px-4 py-2.5 text-center font-serif text-2xl text-pink-700 outline-none focus:border-pink-300"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
            Precisa para passar
          </span>
          <input
            value={minima}
            onChange={(e) => setMinima(e.target.value)}
            onBlur={salvar}
            inputMode="decimal"
            className="w-24 rounded-2xl border border-pink-100 bg-pink-50/30 px-4 py-2.5 text-center font-serif text-2xl text-pink-700 outline-none focus:border-pink-300"
          />
        </label>
        <div className="pb-1">
          <TagSituacao
            situacao={situacaoDaMateria(materia)}
            nota={materia.nota_final}
          />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Digite a nota que a faculdade lançou. Salva sozinho quando você sai do
        campo.
      </p>
    </Bloco>
  );
}

function BlocoMeta({
  materia,
  avaliacoes,
}: {
  materia: Materia;
  avaliacoes: Avaliacao[];
}) {
  const [meta, setMeta] = useState(
    materia.meta === null ? String(materia.media_para_passar) : String(materia.meta),
  );

  useEffect(() => {
    setMeta(
      materia.meta === null ? String(materia.media_para_passar) : String(materia.meta),
    );
  }, [materia.id, materia.meta, materia.media_para_passar]);

  const conta = calcularMeta(materia, avaliacoes);

  return (
    <Bloco icone={<Target className="h-4 w-4 text-pink-500" />} titulo="Minha meta">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
            Quero fechar com
          </span>
          <input
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            onBlur={() => {
              const v = Number(meta.replace(",", "."));
              if (!Number.isNaN(v)) updateMateria(materia.id, { meta: v });
            }}
            inputMode="decimal"
            className="w-24 rounded-2xl border border-pink-100 bg-pink-50/30 px-4 py-2.5 text-center font-serif text-2xl text-pink-700 outline-none focus:border-pink-300"
          />
        </label>
      </div>

      <div className="mt-4">
        {!conta ? (
          <p className="text-sm text-muted-foreground">
            Cadastre suas avaliações abaixo para eu calcular quanto falta. 🌸
          </p>
        ) : conta.pendentes === 0 ? (
          <p
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              conta.jaGarantiu
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {conta.jaGarantiu
              ? `Todas as avaliações lançadas e sua média ficou ${conta.mediaAtual?.toFixed(2)}. Meta batida! 🎉`
              : `Todas lançadas e a média ficou ${conta.mediaAtual?.toFixed(2)}, abaixo da meta de ${conta.alvo}.`}
          </p>
        ) : conta.jaGarantiu ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            Você já garantiu a meta de {conta.alvo}, mesmo zerando o que falta.
            Relaxa e brilha! ✨
          </p>
        ) : conta.impossivel ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
            Para fechar com {conta.alvo} você precisaria de mais de 10 nas que
            faltam. Ajuste a meta para algo alcançável. 💗
          </p>
        ) : (
          <p className="rounded-2xl bg-pink-50 px-4 py-3 text-sm font-medium text-pink-700">
            Você precisa tirar{" "}
            <strong className="font-serif text-lg">
              {conta.precisaTirar?.toFixed(2)}
            </strong>{" "}
            em cada uma das {conta.pendentes} avaliações que faltam para fechar
            com {conta.alvo}.
            {conta.mediaAtual !== null && (
              <> Sua média até aqui é {conta.mediaAtual.toFixed(2)}.</>
            )}
          </p>
        )}
      </div>
    </Bloco>
  );
}

function BlocoAvaliacoes({
  materia,
  avaliacoes,
}: {
  materia: Materia;
  avaliacoes: Avaliacao[];
}) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [nota, setNota] = useState("");

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    const n = nota.trim() === "" ? null : Number(nota.replace(",", "."));
    await createAvaliacao(
      materia.id,
      nome.trim(),
      data || null,
      n !== null && !Number.isNaN(n) ? n : null,
    );
    setNome("");
    setData("");
    setNota("");
  }

  return (
    <Bloco
      icone={<CalendarDays className="h-4 w-4 text-pink-500" />}
      titulo="Provas e trabalhos"
    >
      <form onSubmit={adicionar} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: P1, Seminário..."
          className="flex-1 rounded-full border border-pink-100 bg-pink-50/30 px-4 py-2.5 text-sm text-pink-800 outline-none placeholder:text-pink-300 focus:border-pink-300"
        />
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="rounded-full border border-pink-100 bg-pink-50/30 px-4 py-2.5 text-sm text-pink-800 outline-none focus:border-pink-300"
        />
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          inputMode="decimal"
          placeholder="Nota"
          className="w-full rounded-full border border-pink-100 bg-pink-50/30 px-4 py-2.5 text-center text-sm text-pink-800 outline-none placeholder:text-pink-300 focus:border-pink-300 sm:w-24"
        />
        <button
          type="submit"
          disabled={!nome.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center self-end rounded-full bg-pink-500 text-white shadow-lg shadow-pink-100 transition-all hover:bg-pink-600 active:scale-90 disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      {avaliacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre as provas do semestre. Sem nota ainda? Deixe em branco que ela
          entra no calendário. 🌷
        </p>
      ) : (
        <ul className="space-y-2">
          {avaliacoes.map((a) => (
            <LinhaAvaliacao key={a.id} avaliacao={a} />
          ))}
        </ul>
      )}
    </Bloco>
  );
}

function LinhaAvaliacao({ avaliacao }: { avaliacao: Avaliacao }) {
  const [nota, setNota] = useState(
    avaliacao.nota === null ? "" : String(avaliacao.nota),
  );

  useEffect(() => {
    setNota(avaliacao.nota === null ? "" : String(avaliacao.nota));
  }, [avaliacao.id, avaliacao.nota]);

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-pink-50/50 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-pink-800">{avaliacao.nome}</p>
        {avaliacao.data && (
          <p className="text-xs text-pink-400">
            {new Date(`${avaliacao.data}T00:00:00`).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={() => {
          const n = nota.trim() === "" ? null : Number(nota.replace(",", "."));
          if (n !== null && Number.isNaN(n)) return;
          if (n !== avaliacao.nota) updateAvaliacao(avaliacao.id, { nota: n });
        }}
        inputMode="decimal"
        placeholder="—"
        className="w-16 shrink-0 rounded-xl border border-pink-100 bg-white px-2 py-1.5 text-center text-sm font-bold text-pink-700 outline-none focus:border-pink-300"
      />
      <button
        onClick={async () => {
          if (
            await confirmarBonito({
              titulo: "Apagar avaliação?",
              mensagem: `"${avaliacao.nome}" será removida.`,
              confirmar: "Apagar",
            })
          ) {
            deleteAvaliacao(avaliacao.id);
          }
        }}
        title="Apagar"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-pink-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function BlocoFaltas({ materia }: { materia: Materia }) {
  const [aulas, setAulas] = useState(String(materia.total_aulas));
  const [pct, setPct] = useState(String(materia.limite_faltas_pct));

  useEffect(() => {
    setAulas(String(materia.total_aulas));
    setPct(String(materia.limite_faltas_pct));
  }, [materia.id, materia.total_aulas, materia.limite_faltas_pct]);

  const situacao = calcularFaltas(materia);

  function alterarFaltas(delta: number) {
    const novo = Math.max(0, materia.faltas + delta);
    updateMateria(materia.id, { faltas: novo });
  }

  return (
    <Bloco icone={<UserX className="h-4 w-4 text-pink-500" />} titulo="Faltas">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
            Total de aulas
          </span>
          <input
            value={aulas}
            onChange={(e) => setAulas(e.target.value)}
            onBlur={() =>
              updateMateria(materia.id, { total_aulas: Number(aulas) || 0 })
            }
            inputMode="numeric"
            className="w-24 rounded-2xl border border-pink-100 bg-pink-50/30 px-4 py-2.5 text-center text-lg font-bold text-pink-700 outline-none focus:border-pink-300"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
            Limite (%)
          </span>
          <input
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            onBlur={() =>
              updateMateria(materia.id, {
                limite_faltas_pct: Number(pct) || 25,
              })
            }
            inputMode="decimal"
            className="w-24 rounded-2xl border border-pink-100 bg-pink-50/30 px-4 py-2.5 text-center text-lg font-bold text-pink-700 outline-none focus:border-pink-300"
          />
        </label>
        <div className="flex items-center gap-2 pb-1">
          <button
            onClick={() => alterarFaltas(-1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-pink-200 bg-white text-lg font-bold text-pink-500 transition-all hover:bg-pink-50 active:scale-90"
          >
            −
          </button>
          <span className="w-14 text-center font-serif text-3xl text-pink-700">
            {materia.faltas}
          </span>
          <button
            onClick={() => alterarFaltas(1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-pink-500 text-lg font-bold text-white shadow-md transition-all hover:bg-pink-600 active:scale-90"
          >
            +
          </button>
        </div>
      </div>

      {situacao ? (
        <div className="mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-pink-100">
            <div
              className={`h-full rounded-full transition-all ${
                situacao.risco === "perigo"
                  ? "bg-rose-500"
                  : situacao.risco === "atencao"
                    ? "bg-amber-400"
                    : "bg-emerald-400"
              }`}
              style={{ width: `${situacao.percentual}%` }}
            />
          </div>
          <p
            className={`mt-2 text-sm font-medium ${
              situacao.risco === "perigo"
                ? "text-rose-600"
                : situacao.risco === "atencao"
                  ? "text-amber-700"
                  : "text-emerald-700"
            }`}
          >
            {situacao.risco === "perigo"
              ? `Você bateu o limite de ${situacao.limite} faltas. Cuidado para não reprovar por falta!`
              : `Pode faltar mais ${situacao.restantes} ${situacao.restantes === 1 ? "aula" : "aulas"} (limite de ${situacao.limite}).`}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 p-4">
          <p className="text-sm font-medium text-pink-700">
            Preencha o total de aulas para destravar o controle de faltas.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            É a carga horária da matéria no semestre. Com isso eu calculo
            quantas faltas você ainda pode tomar sem reprovar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[30, 40, 60, 80].map((n) => (
              <button
                key={n}
                onClick={() => updateMateria(materia.id, { total_aulas: n })}
                className="rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs font-bold text-pink-600 transition-all hover:bg-pink-50 active:scale-95"
              >
                {n} aulas
              </button>
            ))}
          </div>
        </div>
      )}
    </Bloco>
  );
}

function BlocoAnotacoes({ materia }: { materia: Materia }) {
  const [texto, setTexto] = useState(materia.anotacoes ?? "");
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    setTexto(materia.anotacoes ?? "");
  }, [materia.id, materia.anotacoes]);

  return (
    <Bloco
      icone={<NotebookPen className="h-4 w-4 text-pink-500" />}
      titulo="Anotações"
    >
      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setSalvo(false);
        }}
        onBlur={() => {
          if (texto !== (materia.anotacoes ?? "")) {
            updateMateria(materia.id, { anotacoes: texto });
            setSalvo(true);
          }
        }}
        rows={6}
        placeholder="Conteúdo que cai na prova, o que o professor cobrou, links, lembretes..."
        className="w-full rounded-2xl border border-pink-100 bg-pink-50/30 px-4 py-3 text-sm leading-relaxed text-pink-800 outline-none placeholder:text-pink-300 focus:border-pink-300"
      />
      <p className="mt-2 text-[11px] text-muted-foreground">
        {salvo ? "Anotação salva 💗" : "Salva sozinho quando você sai do campo."}
      </p>
    </Bloco>
  );
}
