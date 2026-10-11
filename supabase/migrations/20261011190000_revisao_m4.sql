-- M4 (revisão) · a conferência fica presa à leitura: o app carrega o id da identificação,
-- não um "via=qr" na URL. Abrir a mesma pessoa pela lista manual não conta como QR.

drop function public.confirmar_identificacao(uuid, text);
drop function public.identificacao_vigente(uuid, uuid);

/** "Sim, é o …": grava a identificação (10 minutos) e devolve o id dela e o da pessoa. */
create function public.conferir_pessoa(p_obra uuid, p_token text)
returns table (identificacao uuid, pessoa_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.pessoa := privado.pessoa_por_token(p_obra, p_token);
  v_id uuid;
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  if v.id is null or not v.ativa then
    raise exception 'Capacete não cadastrado.' using errcode = 'P0002';
  end if;
  insert into public.identificacao (obra_id, pessoa_id, usuario_id, expira_em)
  values (p_obra, v.id, (select auth.uid()), now() + interval '10 minutes')
  returning id into v_id;
  return query select v_id, v.id;
end;
$$;

/**
 * A identificação vale para este usuário, nesta obra, ainda dentro dos 10 minutos?
 * Devolve a pessoa e o fim da validade (nada = não vale). M5/M6 usam a mesma checagem.
 */
create function public.identificacao_valida(p_obra uuid, p_identificacao uuid)
returns table (pessoa_id uuid, expira_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.pessoa_id, i.expira_em from public.identificacao i
   where i.id = p_identificacao and i.obra_id = p_obra
     and i.usuario_id = (select auth.uid()) and i.expira_em > now()
     and privado.pode_lancar(p_obra)
$$;

revoke all on function public.conferir_pessoa(uuid, text), public.identificacao_valida(uuid, uuid)
  from public, anon;
grant execute on function public.conferir_pessoa(uuid, text), public.identificacao_valida(uuid, uuid)
  to authenticated;
