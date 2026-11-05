-- Fonte autoritativa de temporalidade para o conector somente-leitura do IOO.
-- Não expõe o schema privado nem permite chamadas de usuários do navegador.
create function public.ioo_periodos_empresa(p_obra uuid)
returns table(pessoa_id uuid, empresa_id uuid, de timestamptz, ate timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select pp.pessoa_id, pp.empresa_id, pp.de, pp.ate
  from privado.pessoa_empresa_periodo pp
  join public.pessoa p on p.id = pp.pessoa_id
  where p.obra_id = p_obra
$$;
revoke all on function public.ioo_periodos_empresa(uuid) from public, anon, authenticated;
grant execute on function public.ioo_periodos_empresa(uuid) to service_role;
comment on function public.ioo_periodos_empresa(uuid) is
  'Uso interno do backend ALMOX após validar asserção IOO e vínculo na obra; nunca expor períodos como resultado ao modelo.';
