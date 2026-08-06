-- 1. Definir search_path para segurança e evitar mutabilidade
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. Revogar execução pública (anon) e autenticada
-- A função só deve ser executada via trigger (SECURITY DEFINER já cuida disso internamente)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Garantir que service_role ainda possa (embora triggers não precisem disso explicitamente, é boa prática)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
