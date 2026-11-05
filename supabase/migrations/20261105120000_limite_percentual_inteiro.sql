-- Aviso de limite por %: o limite é sempre um número inteiro, arredondado para cima.
-- Ex.: 25% de 55 sc = 13,75 → avisa ao chegar em 14 sc; 13,01 → 14.
-- Uma só conta para o disparo (avaliar_aviso_material) e para o texto do push (dados_envio).

create function privado.limite_aviso_material(p_tipo text, p_valor numeric, p_estoque_cheio numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_tipo
    when 'quantidade' then p_valor
    when 'percentual' then ceil(p_estoque_cheio * p_valor / 100)
  end;
$$;

revoke all on function privado.limite_aviso_material(text, numeric, numeric)
  from public, anon, authenticated;

-- Corpo igual ao de 20261104140000, com o limite vindo da função acima.
create or replace function privado.avaliar_aviso_material(p_material uuid, p_saldo_antes numeric, p_referencia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_material public.material;
  v_limite numeric;
begin
  select * into v_material from public.material where id = p_material;
  if v_material.id is null then
    raise exception 'Material não encontrado.' using errcode = 'P0002';
  end if;

  if v_material.aviso_tipo is null then
    if v_material.aviso_disparado then
      update public.material set aviso_disparado = false where id = p_material;
    end if;
    return;
  end if;

  v_limite := privado.limite_aviso_material(
    v_material.aviso_tipo, v_material.aviso_valor, v_material.estoque_cheio);

  if v_material.saldo <= v_limite then
    if not v_material.aviso_disparado and (p_saldo_antes is null or p_saldo_antes > v_limite) then
      update public.material set aviso_disparado = true where id = p_material;
      insert into public.envio (obra_id, tipo, canal, destino, referencia, dados)
      select v_material.obra_id, 'limite_material', 'push', uo.usuario_id::text, p_referencia,
             jsonb_build_object('material', v_material.id)
        from public.usuario_obra uo
       where uo.obra_id = v_material.obra_id
      on conflict do nothing;
    end if;
  elsif v_material.aviso_disparado then
    update public.material set aviso_disparado = false where id = p_material;
  end if;
end;
$$;

-- Corpo igual ao de 20261104180000, com o limite vindo da função acima. Grants preservados.
create or replace function public.dados_envio(p_envio uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  v public.envio;
  v_base jsonb;
  v_empresa uuid;
  v_alvo uuid;
  v_ids uuid[];
begin
  select * into v from public.envio where id = p_envio;
  if v.id is null then
    return null;
  end if;

  v_base := jsonb_build_object(
    'tipo', v.tipo, 'canal', v.canal, 'destino', v.destino, 'referencia', v.referencia,
    'obra', (select nome from public.obra where id = v.obra_id));

  if v.canal = 'push' then
    -- Empresa do assunto (aviso ou desconto); consulta restrita só recebe da própria.
    v_alvo := case
      when v.tipo = 'aviso' then (select empresa_id from public.aviso where id = v.referencia)
      when v.tipo in ('desconto_cancelado', 'desconto_reaberto') then (v.dados ->> 'empresa')::uuid
    end;
    v_base := v_base || jsonb_build_object('inscricoes', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', i.endpoint, 'p256dh', i.p256dh, 'auth', i.auth))
        from public.inscricao_push i
       where i.usuario_id::text = v.destino
         and exists (
           select 1 from public.usuario_obra uo
            where uo.usuario_id = i.usuario_id and uo.obra_id = v.obra_id
              and (uo.empresa_id is null or uo.empresa_id = v_alvo
                   -- avisos de material chegam a todos da obra, inclusive consulta de empreiteira
                   or v.tipo in ('limite_material', 'pedido_cadastro_material', 'material_cadastrado')))), '[]'::jsonb));
  end if;

  if v.tipo = 'aviso' then
    return v_base || (
      select jsonb_build_object(
        'aviso', a.id, 'empresa', e.nome, 'dono', e.dono_nome,
        'encarregado', (select p.nome from public.pessoa p where p.id = e.encarregado_pessoa_id),
        'data', f.encerrado_em, 'itens', a.itens, 'total', a.total)
        from public.aviso a
        join public.empresa e on e.id = a.empresa_id
        join public.fechamento_dia f on f.id = a.fechamento_id
       where a.id = v.referencia);
  elsif v.tipo in ('desconto_cancelado', 'desconto_reaberto') then
    v_empresa := (v.dados ->> 'empresa')::uuid;
    v_ids := array(select jsonb_array_elements_text(coalesce(v.dados -> 'descontos', '[]'::jsonb))::uuid);
    return v_base || (
      select jsonb_build_object(
        'empresa', e.nome, 'dono', e.dono_nome,
        'encarregado', (select p.nome from public.pessoa p where p.id = e.encarregado_pessoa_id),
        'motivo', coalesce(v.dados ->> 'motivo', 'devolucao'),
        'quando', v.criado_em,
        'devolvidas', coalesce((
          select jsonb_agg(jsonb_build_object('pessoa', p.nome, 'pessoaId', p.id, 'tipo', d.tipo_nome, 'codigo', d.codigo,
                   'valor', d.valor) order by p.nome, d.codigo)
            from public.desconto d join public.pessoa p on p.id = d.pessoa_id
           where d.id = any (v_ids)), '[]'::jsonb),
        'emAberto', coalesce((select sum(d.valor) from public.desconto d
                               where d.empresa_id = v_empresa and d.status = 'aberto'), 0))
        from public.empresa e where e.id = v_empresa);
  elsif v.tipo = 'resumo_proprios' then
    return v_base || jsonb_build_object('pessoas', coalesce((v.dados ->> 'pessoas')::integer, 0));
  elsif v.tipo = 'limite_material' then
    return v_base || coalesce((
      select jsonb_build_object(
        'material', m.nome, 'materialId', m.id, 'saldo', m.saldo, 'unidade', m.unidade,
        'limite', coalesce(privado.limite_aviso_material(m.aviso_tipo, m.aviso_valor, m.estoque_cheio), 0))
        from public.material m where m.id = (v.dados ->> 'material')::uuid), '{}'::jsonb);
  elsif v.tipo = 'pedido_cadastro_material' then
    return v_base || jsonb_build_object(
      'nome', v.dados ->> 'nome',
      'quem', coalesce((select u.nome from public.usuario u where u.id = (v.dados ->> 'quem')::uuid), ''));
  elsif v.tipo = 'material_cadastrado' then
    return v_base || jsonb_build_object(
      'nome', v.dados ->> 'nome', 'materialId', v.dados ->> 'material');
  else
    return v_base || (
      select jsonb_build_object('pessoa', p.nome, 'quando', o.criado_em)
        from public.ocorrencia o join public.pessoa p on p.id = o.pessoa_id
       where o.id = v.referencia);
  end if;
end;
$$;
