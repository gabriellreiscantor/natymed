-- 1) O cadastro já pedia "Período (Med)", mas o valor se perdia: não havia
--    coluna para guardar. Agora o campo é salvo junto com o resto do perfil.
alter table public.profiles add column if not exists periodo text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  INSERT INTO public.profiles (id, nome, email, data_nascimento, periodo, is_admin, is_accepted)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', 'Estudante'),
    new.email,
    NULLIF(new.raw_user_meta_data->>'data_nascimento', '')::date,
    NULLIF(new.raw_user_meta_data->>'periodo', ''),
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$function$;

-- 2) A aba "Todas" do histórico não devolvia nada além do próprio histórico,
--    porque só existia policy para a dona. Agora a admin enxerga o de todas
--    e a aba passa a fazer sentido como acompanhamento da turma.
drop policy if exists "Admin le todos os historicos" on public.historico;
create policy "Admin le todos os historicos"
  on public.historico for select to authenticated
  using (auth_utils.is_admin());
