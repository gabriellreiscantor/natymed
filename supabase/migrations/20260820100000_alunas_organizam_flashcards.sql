-- Quem cria o baralho precisa poder organizá-lo. Pastas de flashcard passam a
-- ser criadas por qualquer aluna aprovada; as de Resumos e Questões continuam
-- só da Naty, porque só ela publica material.
-- Cada uma mexe apenas nas pastas que criou (a Naty mexe em todas).

alter table public.modulos
  alter column criado_por set default auth.uid();

drop policy if exists "Admin gerencia modulos" on public.modulos;

drop policy if exists "Admin gerencia pastas de material" on public.modulos;
create policy "Admin gerencia pastas de material"
  on public.modulos for all to authenticated
  using (secao in ('resumos', 'questoes') and auth_utils.is_admin())
  with check (secao in ('resumos', 'questoes') and auth_utils.is_admin());

drop policy if exists "Liberadas criam pastas de flashcards" on public.modulos;
create policy "Liberadas criam pastas de flashcards"
  on public.modulos for insert to authenticated
  with check (
    secao = 'flashcards'
    and auth_utils.is_liberado()
    and criado_por = auth.uid()
  );

drop policy if exists "Dona edita pasta de flashcards" on public.modulos;
create policy "Dona edita pasta de flashcards"
  on public.modulos for update to authenticated
  using (secao = 'flashcards' and (criado_por = auth.uid() or auth_utils.is_admin()))
  with check (secao = 'flashcards' and auth_utils.is_liberado());

drop policy if exists "Dona apaga pasta de flashcards" on public.modulos;
create policy "Dona apaga pasta de flashcards"
  on public.modulos for delete to authenticated
  using (secao = 'flashcards' and (criado_por = auth.uid() or auth_utils.is_admin()));
