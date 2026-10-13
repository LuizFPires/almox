-- Indenização da avaria (decisão de 13/10/2026, responde o PRD §12.3): vale para qualquer
-- pessoa; o valor sugerido é o de reposição da ferramenta e o engenheiro pode ajustar (ex.:
-- custo do conserto). Vazio = valor de reposição. Quem mudou e quando fica em `alteracao`.

alter table public.avaria
  add column valor_indenizacao integer
    check (valor_indenizacao is null or valor_indenizacao between 0 and 100000000);
grant select (valor_indenizacao) on public.avaria to authenticated;

create trigger avaria_log
  after update on public.avaria
  for each row execute function privado.registrar_alteracoes('id', 'valor_indenizacao');

-- Só o engenheiro da obra ajusta; o cliente não tem UPDATE em avaria.
create function public.definir_indenizacao(p_avaria uuid, p_valor integer default null) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_obra uuid;
begin
  select obra_id into v_obra from public.avaria where id = p_avaria;
  if v_obra is null or not privado.eh_engenheiro(v_obra) then
    raise exception 'Só o engenheiro da obra ajusta a indenização.' using errcode = '42501';
  end if;
  if p_valor is not null and (p_valor < 0 or p_valor > 100000000) then
    raise exception 'Valor fora do limite.' using errcode = '22023';
  end if;
  update public.avaria set valor_indenizacao = p_valor where id = p_avaria;
end;
$$;
revoke all on function public.definir_indenizacao(uuid, integer) from public, anon;
grant execute on function public.definir_indenizacao(uuid, integer) to authenticated;
