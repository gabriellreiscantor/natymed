-- Os resumos vivem dentro de estudos.resumos (jsonb) e o mesmo estudo é
-- compartilhado com várias alunas. Por isso "lido" e "favorito" precisam de
-- tabela própria, marcada por aluna + estudo + posição do resumo.
create table if not exists public.resumo_marcas (
  perfil_id uuid not null references public.profiles(id) on delete cascade,
  estudo_id uuid not null references public.estudos(id) on delete cascade,
  indice integer not null,
  lido boolean not null default false,
  favorito boolean not null default false,
  atualizado_em timestamptz not null default timezone('utc', now()),
  primary key (perfil_id, estudo_id, indice)
);

create index if not exists resumo_marcas_estudo_idx
  on public.resumo_marcas (perfil_id, estudo_id);

alter table public.resumo_marcas enable row level security;

drop policy if exists "Dona gerencia marcas de resumo" on public.resumo_marcas;
create policy "Dona gerencia marcas de resumo"
  on public.resumo_marcas for all to authenticated
  using (auth.uid() = perfil_id)
  with check (auth.uid() = perfil_id and auth_utils.is_liberado());
