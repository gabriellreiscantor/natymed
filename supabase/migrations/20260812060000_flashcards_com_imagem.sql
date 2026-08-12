-- Flashcard com imagem na frente: a foto aparece em cima e a pergunta escrita
-- pela aluna fica logo abaixo dela. A imagem é opcional — cartão só de texto
-- continua funcionando igual.
alter table public.flashcards
  add column if not exists imagem_url text;
