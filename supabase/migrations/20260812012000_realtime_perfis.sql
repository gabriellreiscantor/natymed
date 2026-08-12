-- Tempo real na lista de alunas: a fila da Naty e a sala de espera passam a
-- reagir na hora, em vez de depender do intervalo de verificação.
-- REPLICA IDENTITY FULL é necessária para o evento de UPDATE trazer os dados
-- de quem mudou, e não só a chave primária.
alter table public.profiles replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
