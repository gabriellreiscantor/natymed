import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  NotebookPen,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";

import {
  carregarAtividade,
  carregarDetalheAluna,
  carregarUsuarios,
  carregarVisaoGeral,
  SemAcesso,
  tempoRelativo,
  type Atividade,
  type DetalheAluna,
  type UsuarioAdmin,
  type VisaoGeral,
} from "@/lib/admin-store";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel — Estudo Rosa" }] }),
  component: AdminPage,
});

type Aba = "geral" | "pessoas" | "atividade";

function AdminPage() {
  const [aba, setAba] = useState<Aba>("geral");
  const [visao, setVisao] = useState<VisaoGeral | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [atividade, setAtividade] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [negado, setNegado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [v, u, a] = await Promise.all([
          carregarVisaoGeral(),
          carregarUsuarios(),
          carregarAtividade(80),
        ]);
        if (!vivo) return;
        setVisao(v);
        setUsuarios(u);
        setAtividade(a);
      } catch (e) {
        if (!vivo) return;
        if (e instanceof SemAcesso) setNegado(true);
        else setErro(e instanceof Error ? e.message : "Erro inesperado.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  if (carregando) {
    return (
      <main className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
      </main>
    );
  }

  if (negado) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-pink-50 text-pink-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-3xl text-pink-700">Área restrita</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Esta página é só do dono do site.
        </p>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-sm text-rose-500">{erro}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink-400">
          Painel do dono
        </p>
        <h1 className="mt-1 font-serif text-3xl text-pink-700 sm:text-4xl">
          Modo Deus
        </h1>
      </header>

      <div className="mb-8 flex gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 text-sm">
        {(
          [
            { id: "geral", label: "Visão geral", icon: Activity },
            { id: "pessoas", label: `Pessoas (${usuarios.length})`, icon: Users },
            { id: "atividade", label: "Atividade", icon: FileText },
          ] as const
        ).map((o) => {
          const Icon = o.icon;
          const ativo = aba === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setAba(o.id)}
              className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 font-medium transition ${
                ativo
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-rose-dark"
              }`}
            >
              <Icon className="h-4 w-4" />
              {o.label}
            </button>
          );
        })}
      </div>

      {aba === "geral" && visao && <AbaGeral v={visao} usuarios={usuarios} />}
      {aba === "pessoas" && <AbaPessoas usuarios={usuarios} />}
      {aba === "atividade" && <AbaAtividade itens={atividade} />}
    </main>
  );
}

// ============ Visão geral ============

function AbaGeral({ v, usuarios }: { v: VisaoGeral; usuarios: UsuarioAdmin[] }) {
  const inativas = usuarios.filter(
    (u) =>
      !u.is_admin &&
      u.is_accepted &&
      (!u.ultima_atividade ||
        Date.now() - new Date(u.ultima_atividade).getTime() >
          7 * 86_400_000),
  );

  return (
    <div className="space-y-8">
      <Secao titulo="Pessoas" icone={<Users className="h-4 w-4" />}>
        <Numero rotulo="Alunas" valor={v.alunas_total} detalhe="cadastradas" />
        <Numero rotulo="Aprovadas" valor={v.alunas_aceitas} detalhe="com acesso" />
        <Numero
          rotulo="Na fila"
          valor={v.alunas_pendentes}
          detalhe="esperando"
          alerta={v.alunas_pendentes > 0}
        />
        <Numero rotulo="Recusadas" valor={v.alunas_recusadas} detalhe="sem acesso" />
        <Numero rotulo="Ativas" valor={v.ativas_7d} detalhe="últimos 7 dias" />
        <Numero rotulo="Novas" valor={v.novas_7d} detalhe="últimos 7 dias" />
      </Secao>

      <Secao titulo="Conteúdo" icone={<BookOpen className="h-4 w-4" />}>
        <Numero rotulo="Materiais" valor={v.estudos} detalhe="PDFs publicados" />
        <Numero rotulo="Resumos" valor={v.resumos} detalhe="extraídos" />
        <Numero rotulo="Questões" valor={v.questoes} detalhe="disponíveis" />
        <Numero rotulo="Resumos lidos" valor={v.resumos_lidos} detalhe="marcados" />
      </Secao>

      <Secao titulo="Estudo" icone={<FileText className="h-4 w-4" />}>
        <Numero rotulo="Quizzes" valor={v.quizzes_feitos} detalhe="provas feitas" />
        <Numero
          rotulo="Nota média"
          valor={v.nota_media ?? "—"}
          detalhe="de todas"
          alerta={v.nota_media !== null && v.nota_media < 5}
        />
        <Numero rotulo="Rodadas" valor={v.sessoes_flashcard} detalhe="flashcards" />
      </Secao>

      <Secao titulo="Criação delas" icone={<Layers className="h-4 w-4" />}>
        <Numero rotulo="Baralhos" valor={v.baralhos} detalhe="criados" />
        <Numero rotulo="Cartões" valor={v.cards} detalhe="no total" />
        <Numero rotulo="Com imagem" valor={v.cards_com_imagem} detalhe="cartões" />
      </Secao>

      <Secao titulo="Faculdade" icone={<GraduationCap className="h-4 w-4" />}>
        <Numero rotulo="Matérias" valor={v.materias} detalhe="cadastradas" />
        <Numero rotulo="Avaliações" valor={v.avaliacoes} detalhe="lançadas" />
      </Secao>

      {inativas.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="font-serif text-lg text-amber-800">
            {inativas.length} aprovada{inativas.length === 1 ? "" : "s"} sem
            atividade há mais de 7 dias
          </h3>
          <p className="mt-1 text-xs text-amber-700/80">
            {inativas.map((u) => u.nome).join(", ")}
          </p>
        </section>
      )}
    </div>
  );
}

function Secao({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-pink-500">
        {icone}
        <h2 className="font-serif text-xl text-pink-800">{titulo}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {children}
      </div>
    </section>
  );
}

function Numero({
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  rotulo: string;
  valor: number | string;
  detalhe: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 shadow-sm ${
        alerta ? "border-amber-200 bg-amber-50/60" : "border-pink-100 bg-white/70"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
        {rotulo}
      </p>
      <p
        className={`mt-1 font-serif text-3xl ${
          alerta ? "text-amber-700" : "text-pink-700"
        }`}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{detalhe}</p>
    </div>
  );
}

// ============ Pessoas ============

function AbaPessoas({ usuarios }: { usuarios: UsuarioAdmin[] }) {
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(t) ||
        u.email.toLowerCase().includes(t) ||
        (u.periodo ?? "").toLowerCase().includes(t),
    );
  }, [usuarios, busca]);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-300" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou período"
          className="w-full rounded-full border border-pink-100 bg-white/70 py-2.5 pl-11 pr-4 text-sm text-pink-800 outline-none placeholder:text-pink-300 focus:border-pink-300"
        />
      </div>

      <ul className="space-y-2">
        {lista.map((u) => (
          <li key={u.id}>
            <button
              onClick={() => setAberta(aberta === u.id ? null : u.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-pink-100 bg-white p-3 text-left shadow-sm transition-all hover:border-pink-300"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-pink-100 text-xs font-bold text-pink-700">
                {u.foto_url ? (
                  <img src={u.foto_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  u.nome.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-pink-800">
                  {u.nome}
                  <Etiqueta u={u} />
                </p>
                <p className="truncate text-xs text-pink-400">{u.email}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-medium text-muted-foreground">
                  {tempoRelativo(u.ultima_atividade)}
                </p>
                <p className="text-[10px] text-pink-400">
                  {u.quizzes} quiz · {u.sessoes} rodadas
                </p>
              </div>
            </button>

            {aberta === u.id && <Detalhe u={u} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Etiqueta({ u }: { u: UsuarioAdmin }) {
  if (u.is_admin)
    return (
      <span className="ml-2 rounded-full bg-pink-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
        admin
      </span>
    );
  if (u.recusado_em)
    return (
      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase text-rose-600">
        recusada
      </span>
    );
  if (!u.is_accepted)
    return (
      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">
        na fila
      </span>
    );
  return null;
}

function Detalhe({ u }: { u: UsuarioAdmin }) {
  const [conteudo, setConteudo] = useState<DetalheAluna | null>(null);
  const [carregandoConteudo, setCarregandoConteudo] = useState(true);

  useEffect(() => {
    let vivo = true;
    carregarDetalheAluna(u.id)
      .then((d) => vivo && setConteudo(d))
      .catch(() => {})
      .finally(() => vivo && setCarregandoConteudo(false));
    return () => {
      vivo = false;
    };
  }, [u.id]);

  const linhas: Array<[string, string]> = [
    ["Período", u.periodo || "—"],
    [
      "Nascimento",
      u.data_nascimento
        ? new Date(`${u.data_nascimento}T00:00:00`).toLocaleDateString("pt-BR")
        : "—",
    ],
    ["Cadastro", new Date(u.criado_at).toLocaleDateString("pt-BR")],
    ["Último acesso", tempoRelativo(u.ultimo_acesso)],
    ["Quizzes", String(u.quizzes)],
    ["Nota média", u.nota_media !== null ? String(u.nota_media) : "—"],
    ["Melhor nota", u.melhor_nota !== null ? String(u.melhor_nota) : "—"],
    ["Rodadas de card", String(u.sessoes)],
    [
      "Melhor flashcard",
      u.melhor_flashcard !== null ? String(u.melhor_flashcard) : "—",
    ],
    ["Baralhos", String(u.baralhos)],
    ["Cartões criados", String(u.cards)],
    ["Matérias", String(u.materias)],
    ["Resumos lidos", String(u.resumos_lidos)],
  ];

  return (
    <div className="mt-1 space-y-4 rounded-2xl bg-pink-50/50 p-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {linhas.map(([k, val]) => (
          <div key={k}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
              {k}
            </p>
            <p className="text-sm font-medium text-pink-800">{val}</p>
          </div>
        ))}
      </div>

      {carregandoConteudo ? (
        <p className="text-xs text-muted-foreground">Carregando conteúdo…</p>
      ) : conteudo ? (
        <ConteudoDaAluna d={conteudo} />
      ) : null}
    </div>
  );
}

function ConteudoDaAluna({ d }: { d: DetalheAluna }) {
  const nada =
    d.materias.length === 0 && d.baralhos.length === 0 && d.provas.length === 0;
  if (nada) {
    return (
      <p className="text-xs text-muted-foreground">
        Ela ainda não criou nada por aqui.
      </p>
    );
  }

  return (
    <div className="space-y-4 border-t border-pink-100 pt-4">
      {d.materias.length > 0 && (
        <Grupo titulo={`Matérias (${d.materias.length})`}>
          <ul className="space-y-2">
            {d.materias.map((m, i) => (
              <li key={i} className="rounded-xl bg-white p-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-bold text-pink-800">{m.nome}</span>
                  {m.periodo && (
                    <span className="text-[10px] text-pink-400">{m.periodo}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {m.nota_final !== null ? `nota ${m.nota_final}` : "sem nota"}
                    {" · "}
                    {m.faltas} falta{m.faltas === 1 ? "" : "s"}
                    {m.avaliacoes > 0 && ` · ${m.avaliacoes} avaliações`}
                  </span>
                </div>
                {m.anotacoes && (
                  <p className="mt-2 flex gap-1.5 whitespace-pre-wrap rounded-lg bg-pink-50/70 p-2 text-xs leading-relaxed text-pink-700">
                    <NotebookPen className="mt-0.5 h-3 w-3 shrink-0 text-pink-400" />
                    <span>{m.anotacoes}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Grupo>
      )}

      {d.baralhos.length > 0 && (
        <Grupo titulo={`Baralhos (${d.baralhos.length})`}>
          <ul className="space-y-2">
            {d.baralhos.map((b, i) => (
              <li key={i} className="rounded-xl bg-white p-3">
                <p className="text-sm font-bold text-pink-800">
                  {b.titulo}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    · {b.cards.length} cartão{b.cards.length === 1 ? "" : "es"}
                  </span>
                </p>
                {b.cards.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {b.cards.map((c, j) => (
                      <li key={j} className="rounded-lg bg-pink-50/70 p-2 text-xs">
                        <p className="font-medium text-pink-800">
                          {c.tem_imagem && "🖼 "}
                          {c.pergunta}
                        </p>
                        <p className="mt-0.5 text-pink-500">{c.resposta}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Grupo>
      )}

      {d.provas.length > 0 && (
        <Grupo titulo={`Últimas provas (${d.provas.length})`}>
          <ul className="space-y-1.5">
            {d.provas.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-pink-800">
                  {p.nome}
                  {p.tipo !== "quiz" && (
                    <span className="ml-1 text-[10px] text-pink-400">(treino)</span>
                  )}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {p.acertos}/{p.total}
                </span>
                <span
                  className={`w-8 shrink-0 text-right font-bold ${
                    p.nota >= 7
                      ? "text-emerald-600"
                      : p.nota >= 5
                        ? "text-amber-600"
                        : "text-rose-500"
                  }`}
                >
                  {p.nota.toFixed(1)}
                </span>
                <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
                  {tempoRelativo(p.data)}
                </span>
              </li>
            ))}
          </ul>
        </Grupo>
      )}
    </div>
  );
}

function Grupo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-pink-400">
        {titulo}
      </p>
      {children}
    </div>
  );
}

// ============ Atividade ============

const CORES: Record<string, string> = {
  quiz: "bg-pink-100 text-pink-700",
  flashcard: "bg-violet-100 text-violet-700",
  baralho: "bg-emerald-100 text-emerald-700",
  estudo: "bg-amber-100 text-amber-700",
  materia: "bg-sky-100 text-sky-700",
  cadastro: "bg-rose-100 text-rose-700",
};

const ROTULOS: Record<string, string> = {
  quiz: "Quiz",
  flashcard: "Cards",
  baralho: "Baralho",
  estudo: "Material",
  materia: "Matéria",
  cadastro: "Entrou",
};

function AbaAtividade({ itens }: { itens: Atividade[] }) {
  if (itens.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nada por aqui ainda.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {itens.map((a, i) => (
        <li
          key={`${a.quando}-${i}`}
          className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-white p-3 shadow-sm"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-pink-100 text-[10px] font-bold text-pink-700">
            {a.foto_url ? (
              <img src={a.foto_url} alt="" className="h-full w-full object-cover" />
            ) : (
              a.quem.slice(0, 2).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-pink-800">
              <strong className="font-bold">{a.quem}</strong> · {a.descricao}
            </p>
            {a.detalhe && (
              <p className="truncate text-xs text-pink-400">{a.detalhe}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
              CORES[a.tipo] ?? "bg-secondary text-muted-foreground"
            }`}
          >
            {ROTULOS[a.tipo] ?? a.tipo}
          </span>
          <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground">
            {tempoRelativo(a.quando)}
          </span>
        </li>
      ))}
    </ul>
  );
}
