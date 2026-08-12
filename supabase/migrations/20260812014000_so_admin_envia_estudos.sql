-- Só a Naty publica material. A interface já escondia o upload das alunas,
-- mas o banco ainda aceitaria um insert feito por fora. Agora a regra é
-- garantida no próprio Postgres.
drop policy if exists "Dona cria estudos" on public.estudos;
create policy "Admin cria estudos"
  on public.estudos for insert to authenticated
  with check (auth.uid() = perfil_id and auth_utils.is_admin());
