# Estudo Rosa

Prompt para o Lovable — App de Estudos com Correção Automática

Cole tudo isso no Lovable. É a descrição completa do app.

Quero criar um aplicativo web de estudos para uma estudante de medicina. A usuária faz upload de um PDF de estudo (que já contém resumos + questões + respostas), e o app transforma esse PDF em um ambiente de estudo interativo: mostra os resumos para revisar e vira as questões em um quiz com correção automática, nota de 0 a 10 e histórico de desempenho salvo.

Todo o texto e a interface devem estar em português do Brasil.

Identidade visual (muito importante)

O app é para uma mulher, então a estética deve ser delicada, feminina e elegante, em rosa e branco.

Paleta de cores:

Fundo: branco / off-white (ex: #FFF7FA)

Rosa primário: #EC7FA9

Rosa claro (destaques suaves): #F7C6D9

Rosa escuro (títulos): #C25E8A

Acerto (verde suave): texto #2E9E6B, fundo #E9F9F0

Erro (coral suave): texto #D65C5C, fundo #FDECEC

Texto secundário: cinza suave #8A7A82

Tipografia: títulos em serifada elegante (ex: Playfair Display), corpo em sans limpa (ex: Nunito ou Inter).

Estilo geral: cards com cantos bem arredondados, sombras suaves, bastante espaçamento e respiro, microanimações leves (fade/hover suave). Nada agressivo, tudo clean e aconchegante.

Responsivo: precisa ficar bonito e funcional no celular.

Navegação (abas no topo)

Início / Upload

Resumos

Questões (o quiz — parte principal)

Histórico

Funcionalidades detalhadas

1. Upload do PDF

Área de upload (arrastar e soltar ou clicar).

Ao enviar, o app extrai o texto do PDF no navegador usando pdfjs-dist (pdf.js).

O app separa automaticamente o conteúdo em: resumos, questões (com alternativas), gabarito e explicações.

Formato esperado do PDF (o app deve fazer o parsing baseado nesses marcadores)

O PDF segue esta estrutura em texto. O parser deve identificar os blocos por esses marcadores:

### RESUMO: <título do resumo>
<texto do resumo, pode ter vários parágrafos>

### QUESTAO
<enunciado da pergunta>
A) <alternativa A>
B) <alternativa B>
C) <alternativa C>
D) <alternativa D>
GABARITO: <letra correta, ex: B>
EXPLICACAO: <texto explicando a resposta>


Observações para o parsing:

Cada bloco ### RESUMO: vira um card de resumo.

Cada bloco ### QUESTAO vira uma questão do quiz, com suas alternativas, a letra correta (GABARITO:) e a EXPLICACAO:.

O gabarito e as explicações podem estar escritos com fonte de cor branca no fim do PDF (invisíveis a olho nu), mas o app deve ler o texto normalmente, independentemente da cor.

O app deve ser tolerante a espaços/quebras de linha extras.

2. Resumos

Aba que mostra os resumos extraídos em cards bonitos e fáceis de ler.

Serve para a usuária estudar antes de responder as questões.

3. Questões (quiz — parte principal)

Mostra as questões em cards (uma embaixo da outra), com o número e o enunciado.

Cada alternativa (A, B, C, D) é um botão clicável.

Ao clicar em uma alternativa:

Se for a correta → o botão fica verde com um ✓.

Se for errada → o botão escolhido fica vermelho, e a alternativa correta é destacada em verde.

Logo abaixo, aparece um box suave com a explicação/resposta (usando o texto de EXPLICACAO:).

Depois de responder, a questão trava (não deixa trocar a resposta).

Uma barra de progresso mostra quantas foram respondidas.

4. Nota final

Depois que a usuária responde todas as questões, o app calcula a nota de 0 a 10 proporcional aos acertos (ex: acertou 8 de 10 → nota 8,0; acertou 7 de 14 → nota 5,0).

Tela de resultado bonita: nota grande em destaque, número de acertos (ex: "8/10 acertos"), e uma mensagem de incentivo carinhosa que muda conforme a nota (ex: nota alta = "Arrasou! 💗", nota média = "Boa, continue firme!", nota baixa = "Revisa os resumos e tenta de novo, você consegue!").

Botão para refazer o quiz e botão para voltar ao início.

5. Histórico (banco de dados)

Usar Supabase para salvar o histórico.

A cada quiz finalizado, salvar automaticamente: nome do quiz (usar o nome do arquivo PDF ou a data), nota (0–10), acertos/total e data e hora.

A aba Histórico mostra uma lista de todas as provas já feitas, com a nota de cada uma, em ordem da mais recente para a mais antiga.

Incluir um gráfico de linha simples mostrando a evolução das notas ao longo do tempo, para ela ver se está melhorando.

Autenticação é opcional: pode começar sem login (histórico único). Se der pra fazer fácil, adicione um login simples para que o histórico fique salvo por usuária e acessível de qualquer dispositivo.

Stack técnica

React + Tailwind CSS (padrão do Lovable).

pdfjs-dist para leitura e extração de texto do PDF no navegador.

Supabase para o banco de dados do histórico (e login opcional).

Fluxo resumido do app

Upload do PDF → o app faz o parsing → aba Resumos (estudar) + aba Questões (responder com correção automática, verde/vermelho + explicação) → cálculo da nota de 0 a 10 → salva no Histórico (Supabase) → aba Histórico mostra a lista e o gráfico de evolução.

Capricho final

Interface toda em português do Brasil.

Feedback visual suave, acolhedor e encorajador.

Layout limpo, delicado, rosa e branco, com muito espaçamento e cards arredondados.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://estudo-rosa-facil.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/de374c8f-f3d5-48cf-93ae-6124c1df6e07).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
