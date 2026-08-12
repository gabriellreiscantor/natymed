import { parseStudyText } from "../src/lib/pdf-parser";

let falhas = 0;
function checa(nome: string, cond: boolean, detalhe = "") {
  console.log(`${cond ? "  ok  " : "FALHA "} ${nome}${detalhe ? " -> " + detalhe : ""}`);
  if (!cond) falhas++;
}

// ---------- 1. Caso normal, exatamente como o README manda ----------
const normal = `
### RESUMO: Betabloqueadores
Reduzem a frequencia cardiaca e a contratilidade.
Usados na hipertensao e na angina.

### QUESTAO
Qual farmaco reduz a frequencia cardiaca?
A) Propranolol
B) Salbutamol
C) Furosemida
D) Amoxicilina
GABARITO: A
EXPLICACAO: Propranolol e um betabloqueador nao seletivo.
`;
{
  const r = parseStudyText(normal);
  checa("caso normal: 1 resumo", r.resumos.length === 1, `achou ${r.resumos.length}`);
  checa("caso normal: 1 questao", r.questoes.length === 1, `achou ${r.questoes.length}`);
  checa("caso normal: 4 alternativas", r.questoes[0]?.alternativas.length === 4, `achou ${r.questoes[0]?.alternativas.length}`);
  checa("caso normal: gabarito A", r.questoes[0]?.gabarito === "A");
  checa("caso normal: alternativa A limpa", r.questoes[0]?.alternativas[0]?.texto === "Propranolol", JSON.stringify(r.questoes[0]?.alternativas[0]?.texto));
  checa("caso normal: resumo tem corpo", (r.resumos[0]?.texto ?? "").includes("contratilidade"));
}

// ---------- 2. Acentuacao: QUESTÃO / EXPLICAÇÃO ----------
{
  const r = parseStudyText(`
### QUESTÃO
Qual e a maior arteria?
A) Aorta
B) Femoral
GABARITO: A
EXPLICAÇÃO: A aorta e a maior.
`);
  checa("acentos: QUESTÃO reconhecida", r.questoes.length === 1);
  checa("acentos: EXPLICAÇÃO capturada", (r.questoes[0]?.explicacao ?? "").includes("aorta"), JSON.stringify(r.questoes[0]?.explicacao));
}

// ---------- 3. Gabaritos agrupados no FIM do PDF (fonte branca) ----------
const gabaritoNoFim = `
### QUESTAO
Qual osso e o maior?
A) Femur
B) Umero

### QUESTAO
Qual e o menor?
A) Estribo
B) Radio

GABARITO: A
GABARITO: A
`;
{
  const r = parseStudyText(gabaritoNoFim);
  checa("gabarito no fim: as 2 questoes sobrevivem", r.questoes.length === 2, `achou ${r.questoes.length}`);
}

// ---------- 4. Alternativas com ponto e traco ----------
{
  const r = parseStudyText(`
### QUESTAO
Teste de formato.
A. Primeira
B. Segunda
C - Terceira
GABARITO: B
EXPLICACAO: ok
`);
  checa("formatos A. / C -", r.questoes[0]?.alternativas.length === 3, `achou ${r.questoes[0]?.alternativas.length}`);
}

// ---------- 5. EXPLICACAO antes do GABARITO ----------
{
  const r = parseStudyText(`
### QUESTAO
Ordem invertida.
A) Certa
B) Errada
EXPLICACAO: A alternativa A esta correta.
GABARITO: A
`);
  const ultima = r.questoes[0]?.alternativas.at(-1)?.texto ?? "";
  checa("ordem invertida: alternativa B nao engoliu a explicacao",
        !ultima.toUpperCase().includes("EXPLICA"), JSON.stringify(ultima));
}

// ---------- 6. Questao sem gabarito ----------
{
  const r = parseStudyText(`
### QUESTAO
Faltou o gabarito.
A) Um
B) Dois
`);
  checa("sem gabarito: questao descartada", r.questoes.length === 0, `achou ${r.questoes.length}`);
}

// ---------- 7. Enunciado com varias linhas ----------
{
  const r = parseStudyText(`
### QUESTAO
Paciente de 60 anos chega ao PS.
Refere dor toracica ha 2 horas.
Qual a conduta?
A) ECG
B) Alta
GABARITO: A
EXPLICACAO: ECG imediato.
`);
  checa("enunciado multilinha preservado",
        (r.questoes[0]?.enunciado ?? "").includes("dor toracica"), JSON.stringify(r.questoes[0]?.enunciado));
}

// ---------- 8. Texto sem nenhum marcador (PDF comum) ----------
{
  const r = parseStudyText("Isto e um resumo de anatomia sem marcadores nenhum.");
  checa("PDF sem marcadores: nao quebra", r.resumos.length === 0 && r.questoes.length === 0);
}

// ---------- 9. Espacos extras e marcador colado ----------
{
  const r = parseStudyText(`###RESUMO:Titulo colado
Corpo do resumo.
###   QUESTAO
Pergunta?
A) Sim
B) Nao
GABARITO:B
EXPLICACAO:porque sim`);
  checa("marcadores colados/espacados", r.resumos.length === 1 && r.questoes.length === 1,
        `resumos=${r.resumos.length} questoes=${r.questoes.length}`);
  checa("gabarito sem espaco (GABARITO:B)", r.questoes[0]?.gabarito === "B");
}

console.log(falhas === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${falhas} FALHA(S)`);

// ---------- 10. Gabarito numerado no fim (fonte branca, formato mais comum) ----------
{
  const r = parseStudyText(`
### QUESTAO
Primeira pergunta?
A) Um
B) Dois

### QUESTAO
Segunda pergunta?
A) Tres
B) Quatro

### QUESTAO
Terceira pergunta?
A) Cinco
B) Seis

1. B
2. A
3. B
`);
  checa("gabarito numerado: 3 questoes", r.questoes.length === 3, `achou ${r.questoes.length}`);
  checa("gabarito numerado: ordem correta",
        r.questoes.map(q => q.gabarito).join("") === "BAB",
        r.questoes.map(q => q.gabarito).join(""));
}

// ---------- 11. Alternativa que comeca com letra maiuscula solta ----------
{
  const r = parseStudyText(`
### QUESTAO
A dor e do tipo A ou B?
A) Tipo A
B) Tipo B
GABARITO: A
`);
  checa("enunciado com 'A ou B' nao vira alternativa",
        r.questoes[0]?.alternativas.length === 2, `achou ${r.questoes[0]?.alternativas.length}`);
}

// ---------- 12. 5 alternativas (A-E) ----------
{
  const r = parseStudyText(`
### QUESTAO
Cinco opcoes.
A) Um
B) Dois
C) Tres
D) Quatro
E) Cinco
GABARITO: E
EXPLICACAO: a ultima.
`);
  checa("suporta 5 alternativas", r.questoes[0]?.alternativas.length === 5, `achou ${r.questoes[0]?.alternativas.length}`);
  checa("gabarito E lido", r.questoes[0]?.gabarito === "E");
}
