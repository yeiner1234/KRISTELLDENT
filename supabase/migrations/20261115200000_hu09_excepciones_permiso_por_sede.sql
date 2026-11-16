-- =============================================================================
-- HU09 — Un admin_sede solo crea o borra excepciones de SUS sedes
-- =============================================================================
-- Antes, schedule_exceptions_write_admin / _delete_admin aceptaban la fila si
-- la sede era del admin O si la profesional compartía sede con él. Un turno
-- extra lleva profesional Y sede (20261115100000), así que un admin_sede de
-- Bagua podía crear un turno extra en Chachapoyas solo por compartir Bagua con
-- la profesional, y get_available_slots lo ofrecía al público.
--
-- Ahora, para admin_sede, cada dato presente debe ser suyo:
--   - branch_id, si viene: has_branch_access(branch_id);
--   - professional_id, si viene: shares_branch_with(professional_id).
-- La restricción de la tabla ya obliga a que venga al menos uno de los dos.
-- admin_global no cambia. Se puede correr dos veces sin error.
-- =============================================================================

drop policy if exists schedule_exceptions_write_admin on public.schedule_exceptions;
create policy schedule_exceptions_write_admin
  on public.schedule_exceptions for insert
  to authenticated
  with check (
    public.is_admin_global()
    or (
      public.current_user_role() = 'admin_sede'
      and (branch_id is null or public.has_branch_access(branch_id))
      and (professional_id is null or public.shares_branch_with(professional_id))
    )
  );

drop policy if exists schedule_exceptions_delete_admin on public.schedule_exceptions;
create policy schedule_exceptions_delete_admin
  on public.schedule_exceptions for delete
  to authenticated
  using (
    public.is_admin_global()
    or (
      public.current_user_role() = 'admin_sede'
      and (branch_id is null or public.has_branch_access(branch_id))
      and (professional_id is null or public.shares_branch_with(professional_id))
    )
  );
