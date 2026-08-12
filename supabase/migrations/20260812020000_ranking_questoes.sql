-- Separa a prova de verdade das rodadas de treino: sem isso, treinar 1 questão
-- errada e acertar viraria um 10 e estouraria o ranking.
alter table public.historico
  add column if not exists tipo text not null default 'quiz';

-- Ranking das questões. O histórico é privado (cada aluna só lê o dela), então
-- a agregação sai por função SECURITY DEFINER: devolve só nome, foto e números,
-- nunca as respostas de ninguém. Fechada para quem ainda não foi aceita.
create or replace function public.ranking_questoes(p_estudo_id uuid default null)
returns table (
  perfil_id uuid,
  nome text,
  foto_url text,
  provas integer,
  melhor numeric,
  media numeric
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    h.perfil_id,
    pp.nome,
    pp.foto_url,
    count(*)::int as provas,
    max(h.nota) as melhor,
    round(avg(h.nota), 2) as media
  from public.historico h
  join public.perfis_publicos pp on pp.id = h.perfil_id
  where auth_utils.is_liberado()
    and h.tipo = 'quiz'
    and (p_estudo_id is null or h.estudo_id = p_estudo_id)
  group by h.perfil_id, pp.nome, pp.foto_url
  order by max(h.nota) desc, count(*) desc, pp.nome asc
$$;

revoke all on function public.ranking_questoes(uuid) from public, anon;
grant execute on function public.ranking_questoes(uuid) to authenticated;
