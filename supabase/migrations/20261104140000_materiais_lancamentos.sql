-- M13 · Materiais: entrada, saída, desfazer e disparo do aviso de limite.
-- Regras: o saldo é mudado só aqui (privado.aplicar_movimento_material), com o material travado;
-- o criado_em é sempre a chegada no servidor (ordem do extrato); a hora do celular, se vier e
-- estiver na janela de 24 h, fica em registrado_no_aparelho_em.

/**
 * Quantidade válida para a unidade: > 0, até 999999, no máximo 2 casas; unidades contadas
 * (sc, un, barra, rolo, lata) só inteiras.
 */
create function privado.quantidade_material_valida(p_unidade text, p_quantidade numeric) returns boolean
language sql immutable
set search_path = ''
as $$
  select p_quantidade is not null
     and p_quantidade > 0
     and p_quantidade <= 999999
     and p_quantidade = round(p_quantidade, 2)
     and (p_unidade not in ('sc', 'un', 'barra', 'rolo', 'lata') or p_quantidade = trunc(p_quantidade))
$$;

/** Quantidade para mensagens: sem zeros à direita e com vírgula (ex.: 17, 2,5). */
create function privado.texto_quantidade(p_quantidade numeric) returns text
language sql immutable
set search_path = ''
as $$
  select replace(trim_scale(p_quantidade)::text, '.', ',')
$$;

/**
 * Hora do aparelho validada: null se não veio; fora de now()-24h … now()+5min → AL107.
 */
create function privado.hora_aparelho_material(p_quando timestamptz) returns timestamptz
language plpgsql stable
set search_path = ''
as $$
begin
  if p_quando is not null
     and (p_quando > now() + interval '5 minutes' or p_quando < now() - interval '24 hours') then
    raise exception 'Lançamento feito sem internet há mais de 24 h (ou com o relógio do celular errado). Lance de novo.'
      using errcode = 'AL107';
  end if;
  return p_quando;
end;
$$;

/**
 * Avalia o aviso de limite depois de o saldo mudar.
 * - Cruzou para baixo (antes > limite, agora <= limite) e não estava disparado: marca disparado
 *   e enfileira um push para cada usuário da obra (referência = o lançamento).
 *   p_saldo_antes null = avaliar sem exigir o cruzamento (ex.: aviso salvo com o saldo já baixo).
 * - Saldo > limite e estava disparado: rearma.
 * Material sem aviso: nada a fazer (só desarma se estava disparado).
 */
create function privado.avaliar_aviso_material(p_material uuid, p_saldo_antes numeric, p_referencia uuid)
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

  v_limite := case v_material.aviso_tipo
    when 'quantidade' then v_material.aviso_valor
    else round(v_material.estoque_cheio * v_material.aviso_valor / 100, 2)
  end;

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

/**
 * Aplica p_delta ao saldo do material (que quem chama já travou com `for update`) e avalia o
 * aviso. Saldo negativo → AL101.
 */
create function privado.aplicar_movimento_material(p_material uuid, p_delta numeric, p_referencia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_material public.material;
  v_antes numeric;
begin
  select * into v_material from public.material where id = p_material;
  if v_material.id is null then
    raise exception 'Material não encontrado.' using errcode = 'P0002';
  end if;
  v_antes := v_material.saldo;

  if v_antes + p_delta < 0 then
    raise exception 'Saldo insuficiente: só tem % % de %.',
      privado.texto_quantidade(v_antes), v_material.unidade, v_material.nome
      using errcode = 'AL101';
  end if;

  update public.material set saldo = v_antes + p_delta where id = p_material;
  perform privado.avaliar_aviso_material(p_material, v_antes, p_referencia);
end;
$$;

/**
 * Entrada de material. Devolve o id do lançamento. O estoque cheio passa a ser o saldo depois
 * da entrada.
 */
create function public.registrar_entrada_material(
  p_obra uuid,
  p_material uuid,
  p_quantidade numeric,
  p_chave uuid default null,
  p_quando timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_material public.material;
  v_movimento uuid;
  v_aparelho timestamptz;
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;

  -- Mesmo pedido de novo (a resposta se perdeu): devolve o que já foi gravado.
  if p_chave is not null then
    select id into v_movimento from public.movimento_material
     where obra_id = p_obra and chave_cliente = p_chave and material_id = p_material
       and usuario_id = (select auth.uid()) and tipo = 'entrada';
    if v_movimento is not null then
      return v_movimento;
    end if;
  end if;

  v_aparelho := privado.hora_aparelho_material(p_quando);

  select * into v_material from public.material
   where id = p_material and obra_id = p_obra
   for update;
  if v_material.id is null then
    raise exception 'Material não encontrado nesta obra.' using errcode = 'P0002';
  end if;
  if not v_material.ativo then
    raise exception '% está inativo.', v_material.nome using errcode = 'AL103';
  end if;
  if not privado.quantidade_material_valida(v_material.unidade, p_quantidade) then
    raise exception 'Quantidade inválida para %.', v_material.unidade using errcode = '22023';
  end if;

  insert into public.movimento_material (obra_id, material_id, tipo, quantidade, usuario_id,
    registrado_no_aparelho_em, chave_cliente)
  values (p_obra, p_material, 'entrada', p_quantidade, (select auth.uid()), v_aparelho, p_chave)
  returning id into v_movimento;

  -- Estoque cheio antes de avaliar o aviso (o limite por percentual depende dele).
  update public.material set estoque_cheio = v_material.saldo + p_quantidade where id = p_material;
  perform privado.aplicar_movimento_material(p_material, p_quantidade, v_movimento);

  return v_movimento;
end;
$$;

/**
 * Saída de material. Devolve { id, aviso }: aviso = esta saída disparou o aviso de limite.
 */
create function public.registrar_saida_material(
  p_obra uuid,
  p_material uuid,
  p_quantidade numeric,
  p_chave uuid default null,
  p_quando timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_material public.material;
  v_movimento uuid;
  v_aparelho timestamptz;
  v_disparado boolean;
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;

  -- Mesmo pedido de novo: devolve o mesmo lançamento; o aviso vale se ele disparou envios.
  if p_chave is not null then
    select id into v_movimento from public.movimento_material
     where obra_id = p_obra and chave_cliente = p_chave and material_id = p_material
       and usuario_id = (select auth.uid()) and tipo = 'saida';
    if v_movimento is not null then
      return jsonb_build_object('id', v_movimento, 'aviso', exists (
        select 1 from public.envio where tipo = 'limite_material' and referencia = v_movimento));
    end if;
  end if;

  v_aparelho := privado.hora_aparelho_material(p_quando);

  select * into v_material from public.material
   where id = p_material and obra_id = p_obra
   for update;
  if v_material.id is null then
    raise exception 'Material não encontrado nesta obra.' using errcode = 'P0002';
  end if;
  if not v_material.ativo then
    raise exception '% está inativo.', v_material.nome using errcode = 'AL103';
  end if;
  if not privado.quantidade_material_valida(v_material.unidade, p_quantidade) then
    raise exception 'Quantidade inválida para %.', v_material.unidade using errcode = '22023';
  end if;

  insert into public.movimento_material (obra_id, material_id, tipo, quantidade, usuario_id,
    registrado_no_aparelho_em, chave_cliente)
  values (p_obra, p_material, 'saida', -p_quantidade, (select auth.uid()), v_aparelho, p_chave)
  returning id into v_movimento;

  perform privado.aplicar_movimento_material(p_material, -p_quantidade, v_movimento);

  select aviso_disparado into v_disparado from public.material where id = p_material;
  return jsonb_build_object('id', v_movimento,
    'aviso', v_disparado and not v_material.aviso_disparado);
end;
$$;

/**
 * Desfaz a própria saída até 60 s depois de lançada, se ela ainda não tiver versão. Senão AL102.
 * Grava uma versão com quantidade 0 (desfeito) e devolve a quantidade ao saldo.
 */
create function public.desfazer_saida_material(p_obra uuid, p_movimento uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movimento public.movimento_material;
  v_material public.material;
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;

  select * into v_movimento from public.movimento_material
   where id = p_movimento and obra_id = p_obra;
  if v_movimento.id is null then
    raise exception 'Lançamento não encontrado nesta obra.' using errcode = 'P0002';
  end if;

  -- Trava o material antes de olhar as versões: dois "desfazer" ao mesmo tempo viram um só.
  select * into v_material from public.material
   where id = v_movimento.material_id and obra_id = p_obra
   for update;

  if v_movimento.usuario_id is distinct from (select auth.uid())
     or v_movimento.tipo <> 'saida'
     or now() > v_movimento.criado_em + interval '60 seconds'
     or exists (select 1 from public.movimento_material_versao where movimento_id = p_movimento) then
    raise exception 'Não dá mais para desfazer esta saída.' using errcode = 'AL102';
  end if;
  if not v_material.ativo then
    raise exception '% está inativo.', v_material.nome using errcode = 'AL103';
  end if;

  insert into public.movimento_material_versao (movimento_id, quantidade, desfeito, usuario_id)
  values (p_movimento, 0, true, (select auth.uid()));
  perform privado.aplicar_movimento_material(v_material.id, -v_movimento.quantidade, p_movimento);
end;
$$;

-- Internas: nenhum grant ao cliente.
revoke all on function privado.quantidade_material_valida(text, numeric),
  privado.texto_quantidade(numeric),
  privado.hora_aparelho_material(timestamptz),
  privado.avaliar_aviso_material(uuid, numeric, uuid),
  privado.aplicar_movimento_material(uuid, numeric, uuid)
  from public, anon, authenticated;

revoke all on function public.registrar_entrada_material(uuid, uuid, numeric, uuid, timestamptz),
  public.registrar_saida_material(uuid, uuid, numeric, uuid, timestamptz),
  public.desfazer_saida_material(uuid, uuid)
  from public, anon;
grant execute on function public.registrar_entrada_material(uuid, uuid, numeric, uuid, timestamptz),
  public.registrar_saida_material(uuid, uuid, numeric, uuid, timestamptz),
  public.desfazer_saida_material(uuid, uuid)
  to authenticated;
