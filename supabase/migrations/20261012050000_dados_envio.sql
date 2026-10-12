-- M9 · Dados de cada envio para o processador do app (chave secreta), sem abrir as tabelas.

/**
 * Tudo o que o processador precisa para montar e mandar um envio: textos do aviso, do
 * cancelamento, do resumo ou da ocorrência, e as inscrições de notificação do destinatário.
 */
create function public.dados_envio(p_envio uuid) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v public.envio;
  v_base jsonb;
  v_empresa uuid;
begin
  select * into v from public.envio where id = p_envio;
  if v.id is null then
    return null;
  end if;

  v_base := jsonb_build_object(
    'tipo', v.tipo, 'canal', v.canal, 'destino', v.destino, 'referencia', v.referencia,
    'obra', (select nome from public.obra where id = v.obra_id));

  if v.canal = 'push' then
    v_base := v_base || jsonb_build_object('inscricoes', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', i.endpoint, 'p256dh', i.p256dh, 'auth', i.auth))
        from public.inscricao_push i where i.usuario_id::text = v.destino), '[]'::jsonb));
  end if;

  if v.tipo = 'aviso' then
    select a.empresa_id into v_empresa from public.aviso a where a.id = v.referencia;
    return v_base || (
      select jsonb_build_object(
        'aviso', a.id, 'empresa', e.nome, 'dono', e.dono_nome,
        'encarregado', (select p.nome from public.pessoa p where p.id = e.encarregado_pessoa_id),
        'data', f.encerrado_em, 'itens', a.itens, 'total', a.total)
        from public.aviso a
        join public.empresa e on e.id = a.empresa_id
        join public.fechamento_dia f on f.id = a.fechamento_id
       where a.id = v.referencia);
  elsif v.tipo = 'desconto_cancelado' then
    v_empresa := (v.dados ->> 'empresa')::uuid;
    return v_base || (
      select jsonb_build_object(
        'empresa', e.nome, 'dono', e.dono_nome,
        'encarregado', (select p.nome from public.pessoa p where p.id = e.encarregado_pessoa_id),
        'quando', coalesce((select max(d.cancelado_em) from public.desconto d
                             where d.empresa_id = v_empresa and d.status = 'cancelado'
                               and (d.id = v.referencia or d.unidade_id in (
                                 select mi.unidade_id from public.movimento_item mi where mi.movimento_id = v.referencia))),
                           v.criado_em),
        'devolvidas', coalesce((
          select jsonb_agg(jsonb_build_object('pessoa', p.nome, 'tipo', d.tipo_nome, 'codigo', d.codigo,
                   'valor', d.valor) order by p.nome, d.codigo)
            from public.desconto d join public.pessoa p on p.id = d.pessoa_id
           where d.empresa_id = v_empresa and d.status = 'cancelado'
             and (d.id = v.referencia or d.unidade_id in (
               select mi.unidade_id from public.movimento_item mi where mi.movimento_id = v.referencia))),
          '[]'::jsonb),
        'emAberto', coalesce((select sum(d.valor) from public.desconto d
                               where d.empresa_id = v_empresa and d.status = 'aberto'), 0))
        from public.empresa e where e.id = v_empresa);
  elsif v.tipo = 'resumo_proprios' then
    return v_base || jsonb_build_object('pessoas', coalesce((v.dados ->> 'pessoas')::integer, 0));
  else -- ocorrência
    return v_base || (
      select jsonb_build_object('pessoa', p.nome, 'quando', o.criado_em)
        from public.ocorrencia o join public.pessoa p on p.id = o.pessoa_id
       where o.id = v.referencia);
  end if;
end;
$$;

/** Inscrição que o serviço de notificação recusou de vez (404/410): sai da lista. */
create function public.remover_inscricao_push(p_endpoint text) returns void
language sql
security definer
set search_path = ''
as $$ delete from public.inscricao_push where endpoint = p_endpoint $$;

revoke all on function public.dados_envio(uuid), public.remover_inscricao_push(text)
  from public, anon, authenticated;
grant execute on function public.dados_envio(uuid), public.remover_inscricao_push(text) to service_role;
