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

-- A pasta do material é uma coluna por seção. Mais simples que uma tabela de
-- ligação e faz o mesmo: um material tem no máximo uma pasta em cada tela.
-- ON DELETE SET NULL: apagar a pasta nunca apaga o material.
alter table public.estudos drop column if exists modulo_id;

alter table public.estudos
  add column if not exists modulo_resumos_id uuid
    references public.modulos(id) on delete set null;

alter table public.estudos
  add column if not exists modulo_questoes_id uuid
    references public.modulos(id) on delete set null;

create index if not exists estudos_modulo_resumos_idx
  on public.estudos (modulo_resumos_id);
create index if not exists estudos_modulo_questoes_idx
  on public.estudos (modulo_questoes_id);

-- Tabela de ligação de uma tentativa anterior: não é mais usada.
drop table if exists public.estudo_pastas;
