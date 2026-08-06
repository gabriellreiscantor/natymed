-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Criar tabela de perfis (public.profiles)
-- Removendo perfis antigos se necessário para evitar conflito com a lógica de auth.users
DROP TABLE IF EXISTS public.perfis CASCADE; 

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome text NOT NULL,
    email text UNIQUE NOT NULL,
    data_nascimento date,
    foto_url text,
    is_admin boolean DEFAULT false,
    is_accepted boolean DEFAULT false,
    criado_at timestamptz DEFAULT now()
);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO anon;

-- 4. RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuário pode ler seu próprio perfil
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

-- Política: Admin pode ler todos os perfis
CREATE POLICY "Admins can read all profiles" ON public.profiles
    FOR SELECT TO authenticated USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

-- Política: Admin pode atualizar todos os perfis (para aceitar meds)
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE TO authenticated USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

-- Política: Inserção inicial (permitir durante signup)
CREATE POLICY "Allow profile creation during signup" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 5. Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, is_admin, is_accepted)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nome', 'Estudante'), 
    new.email,
    CASE WHEN new.email = 'natyalvesoliveira@icloud.com' THEN true ELSE false END,
    CASE WHEN new.email = 'natyalvesoliveira@icloud.com' THEN true ELSE false END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
