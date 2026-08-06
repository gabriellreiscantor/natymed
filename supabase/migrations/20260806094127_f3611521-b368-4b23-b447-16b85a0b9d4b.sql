CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, data_nascimento, is_admin, is_accepted)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nome', 'Estudante'), 
    new.email,
    (new.raw_user_meta_data->>'data_nascimento')::date,
    CASE WHEN new.email = 'natyalvesoliveira@icloud.com' THEN true ELSE false END,
    CASE WHEN new.email = 'natyalvesoliveira@icloud.com' THEN true ELSE false END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;