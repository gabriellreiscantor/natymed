-- Cada tela tem as próprias pastas, independentes: as pastas de Resumos não
-- se misturam com as de Questões nem com as de Flashcards.
alter table public.modulos
  add column if not exists secao text not null default 'resumos';

alter table public.modulos drop constraint if exists modulos_secao_check;
alter table public.modulos
  add constraint modulos_secao_check
  check (secao in ('resumos', 'questoes', 'flashcards'));

drop index if exists modulos_ordem_idx;
create index if not exists modulos_secao_ordem_idx
  on public.modulos (secao, ordem, criado_em);

-- A pasta de um resumo ou de uma questão passa a viver no próprio item, dentro
-- do jsonb. Assim ela acompanha o item mesmo se a ordem mudar — diferente de
-- guardar por posição, que quebraria ao editar a lista.
alter table public.estudos drop column if exists modulo_id;
