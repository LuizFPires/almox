-- Devolve o acesso direto do M1, retirado por 20261102120000_convites (aplicada no almox-prod
-- antes de o fluxo de convites existir no app): sem isto o engenheiro não consegue "Dar acesso"
-- e o administrador não liga o engenheiro a uma obra. Idempotente: nos bancos sem a migration de
-- convites a policy e o grant já existem.
-- Os convites seguem em branch própria e decidem depois se substituem este caminho (PLAN › Decisões).

drop policy if exists usuario_obra_criar on public.usuario_obra;
create policy usuario_obra_criar on public.usuario_obra for insert to authenticated
  with check (privado.eh_engenheiro(obra_id));

revoke all on function public.admin_ligar_engenheiro(uuid, uuid) from public, anon;
grant execute on function public.admin_ligar_engenheiro(uuid, uuid) to authenticated;
