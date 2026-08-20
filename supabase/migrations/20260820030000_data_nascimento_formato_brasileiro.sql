-- A tela pede a data como DD/MM/AAAA (formato brasileiro), mas o gatilho
-- convertia direto para date. "26/03/2008" estourava, o gatilho abortava e o
-- Supabase devolvia "Database error creating new user": a aluna não conseguia
-- se cadastrar por causa de um campo opcional.
-- Pior: quem digitava dia <= 12 passava, mas com dia e mês trocados.

create or replace function public.tenta_data(txt text)
returns date
language plpgsql
immutable
as $function$
DECLARE
  limpo text := btrim(coalesce(txt, ''));
  d date;
BEGIN
  IF limpo = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    IF limpo ~ '^\d{2}[/-]\d{2}[/-]\d{4}$' THEN
      RETURN to_date(replace(limpo, '-', '/'), 'DD/MM/YYYY');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  BEGIN
    IF limpo ~ '^\d{4}-\d{2}-\d{2}$' THEN
      RETURN limpo::date;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  BEGIN
    d := limpo::date;
    RETURN d;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END $function$;

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
    COALESCE(NULLIF(btrim(new.raw_user_meta_data->>'nome'), ''), 'Estudante'),
    new.email,
    public.tenta_data(new.raw_user_meta_data->>'data_nascimento'),
    NULLIF(btrim(coalesce(new.raw_user_meta_data->>'periodo', '')), ''),
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Rede de segurança: um campo opcional nunca pode impedir a criação da conta.
  RAISE WARNING 'handle_new_user falhou para %: %', new.id, SQLERRM;
  RETURN new;
END $function$;

-- Conserta as datas já gravadas com dia e mês trocados.
update public.profiles p
set data_nascimento = public.tenta_data(u.raw_user_meta_data->>'data_nascimento')
from auth.users u
where u.id = p.id
  and p.data_nascimento is distinct from public.tenta_data(u.raw_user_meta_data->>'data_nascimento');
