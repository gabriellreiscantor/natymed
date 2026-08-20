-- Painel do dono. Esconder o link na tela não protege nada: quem estiver
-- logada consegue chamar a API por fora. Então a trava é aqui, e o e-mail
-- vem de auth.users, que a aluna não consegue alterar.
create or replace function auth_utils.is_superadmin()
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid() and lower(u.email) = 'ghabriellreis@gmail.com'
  );
$$;
revoke all on function auth_utils.is_superadmin() from public, anon;
grant execute on function auth_utils.is_superadmin() to authenticated;

create or replace function public.admin_visao_geral()
returns json language plpgsql stable security definer set search_path to 'public'
as $function$
BEGIN
  IF NOT auth_utils.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso restrito.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN json_build_object(
    'alunas_total',      (select count(*) from profiles where not is_admin),
    'alunas_aceitas',    (select count(*) from profiles where not is_admin and is_accepted),
    'alunas_pendentes',  (select count(*) from profiles where not is_admin and not is_accepted and recusado_em is null),
    'alunas_recusadas',  (select count(*) from profiles where not is_admin and recusado_em is not null),
    'admins',            (select count(*) from profiles where is_admin),
    'estudos',           (select count(*) from estudos),
    'resumos',           (select coalesce(sum(json_array_length(resumos::json)), 0) from estudos),
    'questoes',          (select coalesce(sum(json_array_length(questoes::json)), 0) from estudos),
    'quizzes_feitos',    (select count(*) from historico where tipo = 'quiz'),
    'nota_media',        (select round(avg(nota)::numeric, 2) from historico where tipo = 'quiz'),
    'baralhos',          (select count(*) from flashcard_baralhos),
    'cards',             (select count(*) from flashcards),
    'cards_com_imagem',  (select count(*) from flashcards where imagem_url is not null),
    'sessoes_flashcard', (select count(*) from flashcard_sessoes),
    'materias',          (select count(*) from materias),
    'avaliacoes',        (select count(*) from avaliacoes),
    'resumos_lidos',     (select count(*) from resumo_marcas where lido),
    'ativas_7d',         (select count(distinct perfil_id) from (
                            select perfil_id, data from historico
                            union all select perfil_id, data from flashcard_sessoes
                          ) t where data > now() - interval '7 days'),
    'novas_7d',          (select count(*) from profiles where criado_at > now() - interval '7 days')
  );
END $function$;
revoke all on function public.admin_visao_geral() from public, anon;
grant execute on function public.admin_visao_geral() to authenticated;

create or replace function public.admin_usuarios()
returns table (
  id uuid, nome text, email text, periodo text, foto_url text,
  is_admin boolean, is_accepted boolean, recusado_em timestamptz,
  criado_at timestamptz, ultimo_acesso timestamptz, data_nascimento date,
  quizzes integer, nota_media numeric, melhor_nota numeric,
  sessoes integer, melhor_flashcard numeric,
  baralhos integer, cards integer, materias integer, resumos_lidos integer,
  ultima_atividade timestamptz
)
language plpgsql stable security definer set search_path to 'public'
as $function$
BEGIN
  IF NOT auth_utils.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso restrito.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  select
    p.id, p.nome, p.email, p.periodo, p.foto_url,
    p.is_admin, p.is_accepted, p.recusado_em,
    p.criado_at, u.last_sign_in_at, p.data_nascimento,
    (select count(*)::int from historico h where h.perfil_id = p.id and h.tipo = 'quiz'),
    (select round(avg(h.nota)::numeric, 2) from historico h where h.perfil_id = p.id and h.tipo = 'quiz'),
    (select max(h.nota)::numeric from historico h where h.perfil_id = p.id and h.tipo = 'quiz'),
    (select count(*)::int from flashcard_sessoes s where s.perfil_id = p.id),
    (select max(s.pontuacao)::numeric from flashcard_sessoes s where s.perfil_id = p.id),
    (select count(*)::int from flashcard_baralhos b where b.perfil_id = p.id),
    (select count(*)::int from flashcards f where f.perfil_id = p.id),
    (select count(*)::int from materias m where m.perfil_id = p.id),
    (select count(*)::int from resumo_marcas r where r.perfil_id = p.id and r.lido),
    greatest(
      coalesce((select max(h.data) from historico h where h.perfil_id = p.id), 'epoch'::timestamptz),
      coalesce((select max(s.data) from flashcard_sessoes s where s.perfil_id = p.id), 'epoch'::timestamptz),
      coalesce(u.last_sign_in_at, 'epoch'::timestamptz)
    )
  from profiles p
  left join auth.users u on u.id = p.id
  order by p.criado_at;
END $function$;
revoke all on function public.admin_usuarios() from public, anon;
grant execute on function public.admin_usuarios() to authenticated;

create or replace function public.admin_atividade(p_limite integer default 60)
returns table (
  quando timestamptz, tipo text, quem text, foto_url text, descricao text, detalhe text
)
language plpgsql stable security definer set search_path to 'public'
as $function$
BEGIN
  IF NOT auth_utils.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso restrito.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  select * from (
    select h.data, 'quiz'::text, p.nome, p.foto_url, h.nome,
           ('nota ' || round(h.nota::numeric, 1) || ' · ' || h.acertos || '/' || h.total)::text
    from historico h join profiles p on p.id = h.perfil_id
    union all
    select s.data, 'flashcard'::text, p.nome, p.foto_url, 'Rodada de flashcards'::text,
           ('nota ' || round(s.pontuacao::numeric, 1) || ' · ' || s.acertos || '/' || s.total)::text
    from flashcard_sessoes s join profiles p on p.id = s.perfil_id
    union all
    select b.criado_em, 'baralho'::text, p.nome, p.foto_url, 'Criou o baralho'::text, b.titulo
    from flashcard_baralhos b join profiles p on p.id = b.perfil_id
    union all
    select e.criado_em, 'estudo'::text, p.nome, p.foto_url, 'Publicou material'::text, e.nome
    from estudos e join profiles p on p.id = e.perfil_id
    union all
    select m.criado_em, 'materia'::text, p.nome, p.foto_url, 'Adicionou matéria'::text, m.nome
    from materias m join profiles p on p.id = m.perfil_id
    union all
    select p.criado_at, 'cadastro'::text, p.nome, p.foto_url, 'Se cadastrou'::text, p.email
    from profiles p
  ) t(quando, tipo, quem, foto_url, descricao, detalhe)
  order by quando desc
  limit greatest(1, least(p_limite, 300));
END $function$;
revoke all on function public.admin_atividade(integer) from public, anon;
grant execute on function public.admin_atividade(integer) to authenticated;
