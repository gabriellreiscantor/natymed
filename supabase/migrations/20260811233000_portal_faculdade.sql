-- Portal da faculdade: matérias, notas, faltas, provas e anotações.
-- Tudo privado por aluna: cada uma só enxerga o que é dela.

create table if not exists public.materias (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  periodo text,
  cor text not null default '#ec4899',
  -- Ela digita a nota final na mão; o resto é apoio para chegar lá.
  nota_final numeric,
  media_para_passar numeric not null default 7,
  meta numeric,
  total_aulas integer not null default 0,
  faltas integer not null default 0,
  limite_faltas_pct numeric not null default 25,
  anotacoes text,
  criado_em timestamptz not null default timezone('utc', now())
);

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias(id) on delete cascade,
  perfil_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  -- Sem nota + com data no futuro = prova que ainda vai acontecer (calendário).
  data date,
  nota numeric,
  criado_em timestamptz not null default timezone('utc', now())
);

create index if not exists materias_perfil_idx on public.materias (perfil_id, criado_em desc);
create index if not exists avaliacoes_materia_idx on public.avaliacoes (materia_id, data);
create index if not exists avaliacoes_perfil_idx on public.avaliacoes (perfil_id, data);

alter table public.materias enable row level security;
alter table public.avaliacoes enable row level security;

drop policy if exists "Dona gerencia materias" on public.materias;
create policy "Dona gerencia materias"
  on public.materias for all to authenticated
  using (auth.uid() = perfil_id)
  with check (auth.uid() = perfil_id and auth_utils.is_liberado());

drop policy if exists "Dona gerencia avaliacoes" on public.avaliacoes;
create policy "Dona gerencia avaliacoes"
  on public.avaliacoes for all to authenticated
  using (auth.uid() = perfil_id)
  with check (auth.uid() = perfil_id and auth_utils.is_liberado());
