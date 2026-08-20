-- Pastas para organizar o conteúdo. Um material já traz resumos E questões
-- juntos, então basta marcar o módulo no estudo para as duas telas se
-- organizarem sozinhas. Os baralhos de flashcard também entram no mesmo módulo.
create table if not exists public.modulos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#EC7FA9',
  ordem integer not null default 0,
  criado_por uuid references public.profiles(id) on delete set null,
  criado_em timestamptz not null default timezone('utc', now())
);

create index if not exists modulos_ordem_idx on public.modulos (ordem, criado_em);

alter table public.modulos enable row level security;

-- Todas as aprovadas enxergam os módulos (é a organização do grupo),
-- mas só a Naty cria e edita.
drop policy if exists "Liberadas leem modulos" on public.modulos;
create policy "Liberadas leem modulos"
  on public.modulos for select to authenticated
  using (auth_utils.is_liberado());

drop policy if exists "Admin gerencia modulos" on public.modulos;
create policy "Admin gerencia modulos"
  on public.modulos for all to authenticated
  using (auth_utils.is_admin())
  with check (auth_utils.is_admin());

-- Apagar um módulo não pode levar o material junto: vira "sem módulo".
alter table public.estudos
  add column if not exists modulo_id uuid references public.modulos(id) on delete set null;

alter table public.flashcard_baralhos
  add column if not exists modulo_id uuid references public.modulos(id) on delete set null;

create index if not exists estudos_modulo_idx on public.estudos (modulo_id);
create index if not exists baralhos_modulo_idx on public.flashcard_baralhos (modulo_id);
