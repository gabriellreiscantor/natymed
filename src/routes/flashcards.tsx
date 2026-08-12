import { createFileRoute, Link } from "@tanstack/react-router";
import { alertarBonito, confirmarBonito } from "@/components/ConfirmDialog";
import { promptBonito } from "@/components/PromptDialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Trophy,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  type Baralho,
  type Deck,
  type Flashcard,
  type Perfil,
  type RankingItem,
  type Sessao,
  addSessao,
  createBaralho,
  createCard,
  deleteBaralho,
  deleteCard,
  ensureFlashcardPerfil,
  getRanking,
  listBaralhos,
  listCardsByBaralho,
  listDecks,
  listPerfis,
  listSessoes,
  onFlashcardsChange,
  renameBaralho,
  updateCard,
} from "@/lib/flashcards-store";
import { usePerfilAtivo } from "@/lib/perfis-store";
import { uploadImagemFlashcard } from "@/lib/upload-avatar";

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — Estudo Rosa" },
      {
        name: "description",
        content:
          "Jogo de flashcards personalizados com pontuação, ranking e histórico.",
      },
    ],
  }),
  component: FlashcardsPage,
});

function iniciais(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// ============ Page ============
function FlashcardsPage() {
  const { perfil: perfilGlobal, carregado } = usePerfilAtivo();
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    let alive = true;
    if (!carregado) return;
    if (!perfilGlobal) {
      setPerfil(null);
      return;
    }
    ensureFlashcardPerfil({
      id: perfilGlobal.id,
      nome: perfilGlobal.nome,
      foto_url: perfilGlobal.foto_url,
    }).then((p) => {
      if (alive) setPerfil(p);
    });
    return () => {
      alive = false;
    };
  }, [perfilGlobal, carregado]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <header className="mb-6 sm:mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl">Flashcards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie cartõezinhos personalizados, arraste para responder e acompanhe o
          ranking das medgatas 💗
        </p>
      </header>

      <Tabs defaultValue="jogar" className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-1 rounded-full bg-secondary/50 p-1">
          <TabsTrigger value="jogar" className="flex-1 rounded-full text-xs sm:text-sm">
            Jogar
          </TabsTrigger>
          <TabsTrigger value="cartoes" className="flex-1 rounded-full text-xs sm:text-sm">
            Meus cartões
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex-1 rounded-full text-xs sm:text-sm">
            Ranking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jogar">
          <JogarTab perfil={perfil} />
        </TabsContent>

        <TabsContent value="cartoes">
          <CartoesTab perfil={perfil} />
        </TabsContent>

        <TabsContent value="ranking">
          <RankingTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}


// ============ Cartões Tab ============
function CartoesTab({ perfil }: { perfil: Perfil | null }) {
  const [baralhos, setBaralhos] = useState<Baralho[]>([]);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [aberto, setAberto] = useState<Baralho | null>(null);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!perfil) {
      setBaralhos([]);
      setContagens({});
      return;
    }
    const bs = await listBaralhos(perfil.id);
    setBaralhos(bs);
    const entries = await Promise.all(
      bs.map(async (b) => [b.id, (await listCardsByBaralho(b.id)).length] as const),
    );
    setContagens(Object.fromEntries(entries));
    // sincroniza baralho aberto (caso tenha sido renomeado)
    setAberto((atual) => (atual ? bs.find((b) => b.id === atual.id) ?? null : null));
  }, [perfil]);

  useEffect(() => {
    refresh();
    return onFlashcardsChange(refresh);
  }, [refresh]);

  if (!perfil) return <SemPerfil />;

  if (aberto) {
    return <BaralhoEditor perfil={perfil} baralho={aberto} onVoltar={() => setAberto(null)} />;
  }

  const criar = async () => {
    const t = novoTitulo.trim();
    if (!t) return;
    setBusy(true);
    try {
      const b = await createBaralho(perfil.id, t);
      setNovoTitulo("");
      if (b) setAberto(b);
    } finally {
      setBusy(false);
    }
  };

  const renomear = async (b: Baralho) => {
    const t = await promptBonito({
      titulo: "Renomear Baralho 🎀",
      mensagem: "Escolha um nome bem lindo para seu baralho:",
      valorPadrao: b.titulo
    });
    if (t && t.trim() && t.trim() !== b.titulo) await renameBaralho(b.id, t.trim());
  };

  const apagar = async (b: Baralho) => {
    if (await confirmarBonito({
      titulo: "Apagar baralho?",
      mensagem: `O baralho "${b.titulo}" e todos os seus cartões serão apagados.`,
      confirmar: "Apagar baralho",
    })) {
      await deleteBaralho(b.id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Novo baralho</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Título do baralho (ex: Anatomia — Coração)"
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") criar();
            }}
          />
          <Button onClick={criar} disabled={busy || !novoTitulo.trim()}>
            <Plus className="h-4 w-4" />
            Criar
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-serif text-lg">
          Meus baralhos · {baralhos.length}
        </h2>
        {baralhos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum baralho ainda. Crie o primeiro acima 💗
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {baralhos.map((b) => (
              <li
                key={b.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setAberto(b)}
                  className="block w-full text-left"
                >
                  <div className="font-serif text-lg text-rose-dark">{b.titulo}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {contagens[b.id] ?? 0} cartão{(contagens[b.id] ?? 0) === 1 ? "" : "es"}
                  </div>
                </button>
                <div className="mt-3 flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => renomear(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => apagar(b)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============ Editor de um baralho ============
function BaralhoEditor({
  perfil,
  baralho,
  onVoltar,
}: {
  perfil: Perfil;
  baralho: Baralho;
  onVoltar: () => void;
}) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editando, setEditando] = useState<Flashcard | null>(null);
  const [editP, setEditP] = useState("");
  const [editR, setEditR] = useState("");
  const [editImg, setEditImg] = useState<string | null>(null);
  const inputImagem = useRef<HTMLInputElement>(null);

  async function escolherImagem(
    file: File,
    aplicar: (url: string) => void,
  ) {
    setEnviandoImagem(true);
    try {
      aplicar(await uploadImagemFlashcard(file));
    } catch (e) {
      alertarBonito(
        e instanceof Error ? e.message : "Não consegui enviar essa imagem. 🌷",
      );
    } finally {
      setEnviandoImagem(false);
    }
  }

  const refresh = useCallback(async () => {
    setCards(await listCardsByBaralho(baralho.id));
  }, [baralho.id]);

  useEffect(() => {
    refresh();
    return onFlashcardsChange(refresh);
  }, [refresh]);

  const adicionar = async () => {
    const p = pergunta.trim();
    const r = resposta.trim();
    if (!p || !r) return;
    setBusy(true);
    try {
      await createCard(baralho.id, perfil.id, p, r, imagem);
      setPergunta("");
      setResposta("");
      setImagem(null);
      if (inputImagem.current) inputImagem.current.value = "";
    } finally {
      setBusy(false);
    }
  };

  const abrirEdicao = (c: Flashcard) => {
    setEditando(c);
    setEditP(c.pergunta);
    setEditR(c.resposta);
    setEditImg(c.imagem_url);
  };

  const salvarEdicao = async () => {
    if (!editando) return;
    const p = editP.trim();
    const r = editR.trim();
    if (!p || !r) return;
    await updateCard(editando.id, {
      pergunta: p,
      resposta: r,
      imagem_url: editImg,
    });
    setEditando(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onVoltar}
          className="flex items-center gap-1 text-sm font-medium text-rose-dark hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Baralhos
        </button>
        <div className="text-right">
          <div className="font-serif text-lg text-rose-dark">{baralho.titulo}</div>
          <div className="text-xs text-muted-foreground">
            {cards.length} cartão{cards.length === 1 ? "" : "es"}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Novo cartão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {imagem && (
            <div className="relative overflow-hidden rounded-2xl border border-primary/30">
              <img
                src={imagem}
                alt="Imagem da frente do cartão"
                className="max-h-56 w-full bg-secondary/30 object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setImagem(null);
                  if (inputImagem.current) inputImagem.current.value = "";
                }}
                title="Remover imagem"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-pink-600 shadow-md hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <input
            ref={inputImagem}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) escolherImagem(f, setImagem);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputImagem.current?.click()}
            disabled={enviandoImagem}
          >
            {enviandoImagem ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {enviandoImagem
              ? "Enviando..."
              : imagem
                ? "Trocar imagem"
                : "Adicionar imagem (opcional)"}
          </Button>

          <Textarea
            placeholder={
              imagem
                ? "Pergunta que aparece embaixo da imagem"
                : "Pergunta (frente do cartão)"
            }
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            rows={2}
          />
          <Textarea
            placeholder="Resposta (verso do cartão)"
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            rows={2}
          />
          <Button onClick={adicionar} disabled={busy || !pergunta.trim() || !resposta.trim()}>
            <Plus className="h-4 w-4" />
            Adicionar cartão
          </Button>
        </CardContent>
      </Card>

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum cartão ainda. Adicione o primeiro acima.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((c) => {
            const emEdicao = editando?.id === c.id;
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                {emEdicao ? (
                  <div className="space-y-2">
                    {editImg && (
                      <div className="relative overflow-hidden rounded-xl border border-primary/30">
                        <img
                          src={editImg}
                          alt=""
                          className="max-h-40 w-full bg-secondary/30 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setEditImg(null)}
                          title="Remover imagem"
                          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-pink-600 shadow-md hover:bg-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-rose-dark hover:underline">
                      <ImagePlus className="h-3.5 w-3.5" />
                      {editImg ? "Trocar imagem" : "Adicionar imagem"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) escolherImagem(f, setEditImg);
                        }}
                      />
                    </label>
                    <Textarea
                      value={editP}
                      onChange={(e) => setEditP(e.target.value)}
                      rows={2}
                    />
                    <Textarea
                      value={editR}
                      onChange={(e) => setEditR(e.target.value)}
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditando(null)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={salvarEdicao} disabled={enviandoImagem}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 text-xs uppercase tracking-wide text-rose-dark">
                      Pergunta
                    </div>
                    {c.imagem_url && (
                      <img
                        src={c.imagem_url}
                        alt=""
                        className="mb-2 max-h-40 w-full rounded-xl bg-secondary/30 object-contain"
                      />
                    )}
                    <p className="whitespace-pre-wrap text-sm">{c.pergunta}</p>
                    <div className="mt-3 mb-1 text-xs uppercase tracking-wide text-rose-dark">
                      Resposta
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {c.resposta}
                    </p>
                    <div className="mt-3 flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => abrirEdicao(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (await confirmarBonito({
                            titulo: "Apagar cartão?",
                            mensagem: "Este flashcard será removido do baralho.",
                            confirmar: "Apagar cartão",
                          })) deleteCard(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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

// ============ Jogar Tab ============
type Resultado = "acerto" | "erro" | "duvida";

function JogarTab({ perfil }: { perfil: Perfil | null }) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckAtivo, setDeckAtivo] = useState<Deck | null>(null);

  const refresh = useCallback(async () => {
    setDecks(await listDecks());
  }, []);

  useEffect(() => {
    refresh();
    return onFlashcardsChange(refresh);
  }, [refresh]);

  if (!perfil) return <SemPerfil />;

  if (deckAtivo) {
    return (
      <PlayDeck
        deck={deckAtivo}
        jogadorId={perfil.id}
        onSair={() => setDeckAtivo(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-xl">Escolha um baralho</h2>
        <span className="text-xs text-muted-foreground">
          {decks.length} baralho{decks.length === 1 ? "" : "s"}
        </span>
      </div>
      {decks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ainda não há baralhos. Vá em <strong>Meus cartões</strong> e crie o primeiro 💗
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {decks.map((d) => (
            <li key={d.baralho.id}>
              <button
                type="button"
                onClick={() => setDeckAtivo(d)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <Avatar className="h-14 w-14 ring-2 ring-primary/30">
                  {d.perfil.foto_url ? (
                    <AvatarImage src={d.perfil.foto_url} alt={d.perfil.nome} />
                  ) : null}
                  <AvatarFallback className="bg-primary/15 text-rose-dark">
                    {iniciais(d.perfil.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-base text-rose-dark">
                    {d.baralho.titulo}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    por {d.perfil.nome}
                    {d.perfil.id === perfil.id ? " (você)" : ""} · {d.total} cartão
                    {d.total === 1 ? "" : "es"}
                  </div>
                </div>
                <div className="text-xs font-medium text-rose-dark opacity-0 transition-opacity group-hover:opacity-100">
                  Jogar →
                </div>
              </button>
            </li>
          ))}
        </ul>

      )}
    </div>
  );
}

function PlayDeck({
  deck,
  jogadorId,
  onSair,
}: {
  deck: Deck;
  jogadorId: string;
  onSair: () => void;
}) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [ordem, setOrdem] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [terminado, setTerminado] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let alive = true;
    listCardsByBaralho(deck.baralho.id).then((cs) => {
      if (!alive) return;
      setCards(cs);
    });
    return () => {
      alive = false;
    };
  }, [deck.baralho.id]);

  const iniciar = useCallback(() => {
    const embaralhado = [...cards].sort(() => Math.random() - 0.5);
    setOrdem(embaralhado);
    setIdx(0);
    setResultados([]);
    setTerminado(false);
    setSalvo(false);
  }, [cards]);

  useEffect(() => {
    if (cards.length && ordem.length === 0 && !terminado) iniciar();
  }, [cards, ordem.length, terminado, iniciar]);

  const registrar = (r: Resultado) => {
    setResultados((prev) => [...prev, r]);
    if (idx + 1 >= ordem.length) {
      setTerminado(true);
    } else {
      setIdx((i) => i + 1);
    }
  };

  const acertos = resultados.filter((r) => r === "acerto").length;
  const erros = resultados.filter((r) => r === "erro").length;
  const duvidas = resultados.filter((r) => r === "duvida").length;
  const total = ordem.length;
  const pontuacao = total ? Math.round((acertos / total) * 100) / 10 : 0;

  useEffect(() => {
    if (terminado && !salvo && total > 0) {
      setSalvo(true);
      addSessao({
        perfil_id: jogadorId,
        acertos,
        erros,
        duvidas,
        total,
        pontuacao,
      });
    }
  }, [terminado, salvo, jogadorId, acertos, erros, duvidas, total, pontuacao]);

  const header = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onSair}
        className="text-sm font-medium text-rose-dark hover:underline"
      >
        ← Baralhos
      </button>
      <span className="text-sm text-muted-foreground">
        <strong className="text-rose-dark">{deck.baralho.titulo}</strong> · {deck.perfil.nome}
      </span>
    </div>
  );

  if (cards.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Este baralho ainda não tem cartões.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (terminado) {
    const mensagem =
      pontuacao >= 9
        ? "Perfeitíssimo! Você mandou muito 💖"
        : pontuacao >= 7
          ? "Boa! Já tá dominando esse conteúdo 💗"
          : pontuacao >= 5
            ? "Foi bem, com mais uma rodadinha você tira 10 🌸"
            : "Respira, amor. Revisa e tenta de novo, você consegue 🤍";
    return (
      <div className="space-y-4">
        {header}
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-center font-serif text-2xl">
              Pontuação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="font-serif text-5xl text-rose-dark sm:text-6xl">{pontuacao.toFixed(1)}</div>
            <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
              <StatMini label="Acertos" value={acertos} color="text-success" />
              <StatMini label="Erros" value={erros} color="text-error" />
              <StatMini label="Dúvidas" value={duvidas} color="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{mensagem}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={iniciar} className="flex-1">
                <RotateCcw className="h-4 w-4" />
                Jogar de novo
              </Button>
              <Button variant="outline" onClick={onSair} className="flex-1">
                Outro baralho
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const atual = ordem[idx];
  if (!atual) return null;

  return (
    <div className="space-y-4">
      {header}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Cartão <strong className="text-rose-dark">{idx + 1}</strong> de {total}
        </span>
        <span>
          <span className="text-success">✓ {acertos}</span>
          {"  "}
          <span className="text-error">✗ {erros}</span>
          {"  "}
          <span>? {duvidas}</span>
        </span>
      </div>

      <SwipeCard key={atual.id} card={atual} onResult={registrar} />

      <p className="text-center text-xs text-muted-foreground">
        Toque no cartão para virar · arraste ← errei · arraste → acertei · arraste ↑ tenho dúvida
      </p>

      <div className="flex items-start justify-center gap-4">
        <button
          type="button"
          onClick={() => registrar("erro")}
          aria-label="Errei"
          className="flex flex-col items-center gap-1"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-sm ring-1 ring-border transition-all hover:scale-110 hover:bg-red-50 active:scale-95">
            😠
          </span>
          <span className="text-xs font-medium text-error">Errei</span>
        </button>
        <button
          type="button"
          onClick={() => registrar("duvida")}
          aria-label="Tenho dúvida"
          className="flex flex-col items-center gap-1"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-sm ring-1 ring-border transition-all hover:scale-110 hover:bg-yellow-50 active:scale-95">
            🤔
          </span>
          <span className="text-xs font-medium text-yellow-600">Dúvida</span>
        </button>
        <button
          type="button"
          onClick={() => registrar("acerto")}
          aria-label="Acertei"
          className="flex flex-col items-center gap-1"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-sm ring-1 ring-border transition-all hover:scale-110 hover:bg-green-50 active:scale-95">
            😍
          </span>
          <span className="text-xs font-medium text-success">Acertei</span>
        </button>
      </div>
    </div>
  );
}

function StatMini({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-2">
      <div className={`font-serif text-xl ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// ============ Swipeable card ============
function SwipeCard({
  card,
  onResult,
}: {
  card: Flashcard;
  onResult: (r: Resultado) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [exiting, setExiting] = useState<Resultado | null>(null);
  const startRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const threshold = 90;

  const onPointerDown = (e: React.PointerEvent) => {
    if (exiting) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, moved: false };
    setDrag({ x: 0, y: 0 });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current || exiting) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) startRef.current.moved = true;
    setDrag({ x: dx, y: dy });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const s = startRef.current;
    startRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (!drag) return;
    const { x, y } = drag;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (!s.moved) {
      // tap → flip
      setDrag(null);
      setFlipped((f) => !f);
      return;
    }

    let r: Resultado | null = null;
    if (-y > threshold && absY > absX) r = "duvida";
    else if (x > threshold) r = "acerto";
    else if (-x > threshold) r = "erro";

    if (r) {
      setExiting(r);
      setTimeout(() => {
        onResult(r!);
      }, 250);
    } else {
      setDrag(null);
    }
  };

  const x = drag?.x ?? 0;
  const y = drag?.y ?? 0;
  const rot = x / 20;

  let transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
  if (exiting === "acerto")
    transform = "translate3d(120vw, 0, 0) rotate(30deg)";
  else if (exiting === "erro")
    transform = "translate3d(-120vw, 0, 0) rotate(-30deg)";
  else if (exiting === "duvida")
    transform = "translate3d(0, -120vh, 0) rotate(0deg)";

  // hint overlay opacity
  const hintAcerto = Math.min(1, Math.max(0, x / threshold));
  const hintErro = Math.min(1, Math.max(0, -x / threshold));
  const hintDuvida = Math.min(1, Math.max(0, -y / threshold));

  return (
    <div className="relative mx-auto h-[380px] w-full max-w-md select-none sm:h-[420px]">
      <div
        ref={surfaceRef}
        className="absolute inset-0 touch-none"
        style={{
          transform,
          transition: drag && !exiting ? "none" : "transform 250ms ease-out",
          perspective: "1200px",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="relative h-full w-full"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Frente */}
          <CardFace label="Pergunta" text={card.pergunta} imagem={card.imagem_url} />
          {/* Verso */}
          <CardFace label="Resposta" text={card.resposta} back />
        </div>

        {/* Hint overlays */}
        <div
          className="pointer-events-none absolute inset-0 flex items-end justify-end rounded-3xl bg-success/25 p-6 font-serif text-3xl text-success"
          style={{ opacity: hintAcerto }}
        >
          Acertei ✓
        </div>
        <div
          className="pointer-events-none absolute inset-0 flex items-start justify-start rounded-3xl bg-error/25 p-6 font-serif text-3xl text-error"
          style={{ opacity: hintErro }}
        >
          ✗ Errei
        </div>
        <div
          className="pointer-events-none absolute inset-0 flex items-start justify-end rounded-3xl bg-yellow-200/40 p-6 font-serif text-3xl text-yellow-600"
          style={{ opacity: hintDuvida }}
        >
          ? Dúvida
        </div>
      </div>
    </div>
  );
}

function CardFace({
  label,
  text,
  imagem,
  back = false,
}: {
  label: string;
  text: string;
  imagem?: string | null;
  back?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-auto rounded-3xl border border-primary/30 bg-card p-6 text-center shadow-lg"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : "rotateY(0deg)",
        background: back
          ? "linear-gradient(160deg, var(--rose-light) 0%, var(--card) 60%)"
          : "linear-gradient(160deg, var(--card) 0%, color-mix(in oklab, var(--rose-light) 55%, white) 100%)",
      }}
    >
      <div className="mb-3 text-xs uppercase tracking-[0.2em] text-rose-dark">
        {label}
      </div>
      {imagem && (
        // A imagem vai em cima e a pergunta escrita logo abaixo dela.
        // max-h em vh para o texto nunca ficar espremido em tela pequena.
        <img
          src={imagem}
          alt=""
          draggable={false}
          className="mb-3 max-h-[38vh] w-full rounded-2xl object-contain"
        />
      )}
      <p
        className={`max-h-full whitespace-pre-wrap font-medium leading-relaxed text-foreground ${
          imagem ? "text-base sm:text-lg" : "text-lg sm:text-xl"
        }`}
      >
        {text}
      </p>
      <div className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
        toque para virar
      </div>
    </div>
  );
}

// ============ Ranking Tab ============
type Periodo = "semana" | "mes" | "ano" | "geral";

const PERIODOS: { id: Periodo; label: string; emoji: string }[] = [
  { id: "semana", label: "Semana", emoji: "🌸" },
  { id: "mes", label: "Mês", emoji: "🌺" },
  { id: "ano", label: "Ano", emoji: "👑" },
  { id: "geral", label: "Geral", emoji: "💗" },
];

function inicioDoPeriodo(p: Periodo): number {
  const agora = new Date();
  if (p === "geral") return 0;
  if (p === "semana") {
    const d = new Date(agora);
    d.setDate(d.getDate() - 7);
    return d.getTime();
  }
  if (p === "mes") {
    const d = new Date(agora);
    d.setMonth(d.getMonth() - 1);
    return d.getTime();
  }
  const d = new Date(agora);
  d.setFullYear(d.getFullYear() - 1);
  return d.getTime();
}

function RankingTab() {
  const [items, setItems] = useState<RankingItem[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("semana");

  const refresh = useCallback(async () => {
    const [r, s, p] = await Promise.all([getRanking(), listSessoes(), listPerfis()]);
    setItems(r);
    setSessoes(s);
    setPerfis(p);
  }, []);

  useEffect(() => {
    refresh();
    return onFlashcardsChange(refresh);
  }, [refresh]);

  const perfilPorId = useMemo(
    () => new Map(perfis.map((p) => [p.id, p])),
    [perfis],
  );

  const rankingPeriodo = useMemo(() => {
    if (periodo === "geral") return items;
    const desde = inicioDoPeriodo(periodo);
    const filtradas = sessoes.filter((s) => new Date(s.data).getTime() >= desde);
    const porPerfil = new Map<
      string,
      { totalSessoes: number; totalAcertos: number; melhor: number }
    >();
    for (const s of filtradas) {
      const cur = porPerfil.get(s.perfil_id) ?? {
        totalSessoes: 0,
        totalAcertos: 0,
        melhor: 0,
      };
      cur.totalSessoes += 1;
      cur.totalAcertos += s.acertos;
      cur.melhor = Math.max(cur.melhor, s.pontuacao);
      porPerfil.set(s.perfil_id, cur);
    }
    return [...porPerfil.entries()]
      .map(([id, v]) => {
        const perfil =
          perfilPorId.get(id) ??
          ({ id, nome: "—", foto_url: null, criado_em: "" } as Perfil);
        return { perfil, ...v } as RankingItem;
      })
      .sort((a, b) => b.melhor - a.melhor || b.totalAcertos - a.totalAcertos);
  }, [periodo, items, sessoes, perfilPorId]);

  const periodoAtual = PERIODOS.find((p) => p.id === periodo)!;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-xl">
          <Trophy className="h-5 w-5 text-primary" /> Ranking
        </h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {PERIODOS.map((p) => {
            const ativo = p.id === periodo;
            return (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  ativo
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-pink-200 bg-white text-pink-700 hover:bg-pink-50"
                }`}
              >
                <span>{p.emoji}</span>
                {p.label}
              </button>
            );
          })}
        </div>

        {rankingPeriodo.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-pink-200 bg-white p-6 text-center text-sm text-muted-foreground">
            Nenhuma rodada {periodoAtual.label.toLowerCase() === "geral" ? "ainda" : `nesta ${periodoAtual.label.toLowerCase()}`}. Bora jogar? {periodoAtual.emoji}
          </p>
        ) : (
          <ol className="space-y-2">
            {rankingPeriodo.map((it, i) => (
              <li
                key={it.perfil.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <div className="w-6 text-center font-serif text-lg text-rose-dark">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>
                <Avatar className="h-11 w-11">
                  {it.perfil.foto_url ? (
                    <AvatarImage src={it.perfil.foto_url} alt={it.perfil.nome} />
                  ) : null}
                  <AvatarFallback className="bg-primary/15 text-rose-dark">
                    {iniciais(it.perfil.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{it.perfil.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.totalSessoes} rodada{it.totalSessoes === 1 ? "" : "s"} · {it.totalAcertos} acertos
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-2xl text-rose-dark">
                    {it.melhor.toFixed(1)}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    melhor
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>


      <section>
        <h2 className="mb-3 font-serif text-xl">Histórico</h2>
        {sessoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem rodadas ainda.</p>
        ) : (
          <ul className="space-y-2">
            {sessoes.slice(0, 30).map((s) => {
              const p = perfilPorId.get(s.perfil_id);
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm shadow-sm"
                >
                  <Avatar className="h-8 w-8">
                    {p?.foto_url ? <AvatarImage src={p.foto_url} alt={p.nome} /> : null}
                    <AvatarFallback className="bg-primary/15 text-rose-dark text-xs">
                      {iniciais(p?.nome ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p?.nome ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.data).toLocaleString("pt-BR")} · {s.acertos}/{s.total}
                    </div>
                  </div>
                  <div className="font-serif text-lg text-rose-dark">
                    {s.pontuacao.toFixed(1)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ============ Sem perfil ============
function SemPerfil() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <UserIcon className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">
          Nenhum perfil ativo. Escolha ou crie um perfil para começar.
        </p>
        <Link
          to="/perfil"
          className="text-sm font-medium text-rose-dark underline-offset-4 hover:underline"
        >
          Ir para meu perfil
        </Link>
      </CardContent>
    </Card>
  );
}
