Vou resolver a parte principal do site: upload e leitura de PDF.

O que encontrei:
- O problema não é o iPad/mobile em si, é a biblioteca atual `pdfjs-dist` v6 entrando no fluxo de renderização do app e tentando usar APIs que não existem no servidor/navegadores mais antigos, como `DOMMatrix`, `Promise.try` e `Uint8Array.toHex`.
- Isso pode deixar o botão preso em “Lendo o seu PDF...” sem salvar nem navegar, especialmente em Safari/iPad.

Plano de correção:
1. Trocar o carregamento do PDF.js para ser 100% client-side, carregado só quando a pessoa escolhe um arquivo.
2. Usar a versão `legacy` do PDF.js + worker legacy, mais compatível com Safari/iPad/mobile.
3. Remover qualquer import de PDF.js que rode durante SSR/carregamento inicial da página.
4. Garantir que o estado de loading sempre termina, mesmo se o PDF falhar.
5. Melhorar as mensagens de erro para ficar claro se:
   - o arquivo não é PDF;
   - o navegador não conseguiu ler o PDF;
   - o PDF não tem texto extraível;
   - o formato não gerou resumos/questões.
6. Validar no preview com um PDF real ou sintético: selecionar arquivo, mostrar progresso, salvar no banco e ir para Resumos/Questões.

Resultado esperado:
- No web, mobile e iPad, ao enviar PDF, deve aparecer progresso real e terminar com sucesso ou mostrar erro claro.
- Não deve mais ficar preso indefinidamente em “Lendo o seu PDF...”.
- A página inicial não deve quebrar por causa do PDF.js antes mesmo do upload.