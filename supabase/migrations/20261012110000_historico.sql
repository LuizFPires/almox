-- M10 · Histórico e auditoria (engenheiro): movimentos e ocorrências da obra com filtros por
-- período, pessoa, empresa, ferramenta, via e tipo de lançamento. A mesma consulta alimenta a
-- tela e a planilha (.xlsx), sempre no servidor.

/**
 * Lançamentos de [p_de, p_ate) (datas do dia da obra, São Paulo), do mais novo para o mais
 * antigo, até 2000. p_categoria: 'retirada' | 'devolucao' | 'estorno' | 'ocorrencia' | null.
 * Filtro por ferramenta ou via deixa as ocorrências de fora (não têm ferramenta nem via).
 */
create function public.historico(
  p_obra uuid,
  p_de date,
  p_ate date,
  p_pessoa uuid default null,
  p_empresa uuid default null,
  p_tipo uuid default null,
  p_via public.via_movimento default null,
  p_categoria text default null
) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_de timestamptz := (p_de::timestamp at time zone 'America/Sao_Paulo');
  v_ate timestamptz := ((p_ate + 1)::timestamp at time zone 'America/Sao_Paulo');
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro vê o histórico.' using errcode = '42501';
  end if;
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > 366 then
    raise exception 'Escolha um período de até um ano.' using errcode = '22023';
  end if;
  if p_categoria is not null and p_categoria not in ('retirada', 'devolucao', 'estorno', 'ocorrencia') then
    raise exception 'Tipo de lançamento inválido.' using errcode = '22023';
  end if;

  return coalesce((
    select jsonb_agg(l order by l ->> 'quando' desc)
      from (
        select x.l from (
          select jsonb_build_object(
                   'id', m.id, 'tipo', m.tipo, 'quando', m.criado_em, 'recebidoEm', m.recebido_em,
                   'pessoa', pe.nome, 'empresa', e.nome, 'via', m.via, 'usuario', us.nome,
                   'obs', m.obs, 'estornoDe', m.estorno_de,
                   'itens', coalesce((
                     select jsonb_agg(jsonb_build_object('tipo', t.nome, 'codigo', u.codigo,
                              'avariada', mi.avariada) order by t.nome, length(u.codigo), u.codigo)
                       from public.movimento_item mi
                       join public.unidade u on u.id = mi.unidade_id
                       join public.tipo_ferramenta t on t.id = u.tipo_id
                      where mi.movimento_id = m.id), '[]'::jsonb)) as l,
                 m.criado_em
            from public.movimento m
            join public.pessoa pe on pe.id = m.pessoa_id
            join public.empresa e on e.id = pe.empresa_id
            join public.usuario us on us.id = m.usuario_id
           where m.obra_id = p_obra and m.criado_em >= v_de and m.criado_em < v_ate
             and (p_pessoa is null or m.pessoa_id = p_pessoa)
             and (p_empresa is null or pe.empresa_id = p_empresa)
             and (p_via is null or m.via = p_via)
             and (p_categoria is null or m.tipo::text = p_categoria)
             and (p_tipo is null or exists (
                   select 1 from public.movimento_item mi join public.unidade u on u.id = mi.unidade_id
                    where mi.movimento_id = m.id and u.tipo_id = p_tipo))
          union all
          select jsonb_build_object(
                   'id', o.id, 'tipo', 'ocorrencia', 'quando', o.criado_em, 'recebidoEm', null,
                   'pessoa', pe.nome, 'empresa', e.nome, 'via', null, 'usuario', us.nome,
                   'obs', null, 'estornoDe', null, 'itens', '[]'::jsonb),
                 o.criado_em
            from public.ocorrencia o
            join public.pessoa pe on pe.id = o.pessoa_id
            join public.empresa e on e.id = pe.empresa_id
            join public.usuario us on us.id = o.usuario_id
           where o.obra_id = p_obra and o.criado_em >= v_de and o.criado_em < v_ate
             and p_tipo is null and p_via is null
             and (p_categoria is null or p_categoria = 'ocorrencia')
             and (p_pessoa is null or o.pessoa_id = p_pessoa)
             and (p_empresa is null or pe.empresa_id = p_empresa)
        ) x
        order by x.criado_em desc
        limit 2000
      ) y(l)
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.historico(uuid, date, date, uuid, uuid, uuid, public.via_movimento, text)
  from public, anon;
grant execute on function public.historico(uuid, date, date, uuid, uuid, uuid, public.via_movimento, text)
  to authenticated;
