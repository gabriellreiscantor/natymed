-- Recusar não apaga a conta: marca a data da recusa. Assim a aluna sai da fila
-- da Naty, vê uma mensagem clara em vez de esperar para sempre, e a Naty pode
-- voltar atrás depois sem que ninguém precise se cadastrar de novo.
alter table public.profiles
  add column if not exists recusado_em timestamptz;

-- A trava que impede uma aluna de se autoaprovar precisa cobrir o campo novo
-- também, senão daria para limpar a própria recusa por fora do site.
create or replace function auth_utils.protege_campos_privilegio()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF auth_utils.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_accepted IS DISTINCT FROM OLD.is_accepted
     OR NEW.recusado_em IS DISTINCT FROM OLD.recusado_em THEN
    RAISE EXCEPTION 'Only an admin can change is_admin, is_accepted or recusado_em.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $function$;
