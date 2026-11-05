-- M13 · Ajustes da revisão final.
-- 1. `envios_com_problema`: o contador "sem destino" do /avisos culpa dono/encarregado da
--    empreiteira sem aparelho ativado. Os envios de material (um push por login da obra) não
--    entram nessa conta: só os tipos de ferramentas (aviso, desconto, resumo, ocorrência…).
-- 2. `registrar_contagem_material`: `saldo_visto` de material em unidade inteira (sc, un, barra,
--    rolo, lata) também tem que ser inteiro, como a quantidade contada.

create or replace function public.envios_com_problema(p_obra uuid) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  if not privado.eh_engenheiro(p_obra) then
    return null;
  end if;
  return jsonb_build_object(
    'erro', (select count(*) from public.envio where obra_id = p_obra and status = 'erro' and tentativas >= 5),
    'semDestino', (select count(*) from public.envio where obra_id = p_obra and status::text = 'sem_destino'
                     and tipo::text not in ('limite_material', 'pedido_cadastro_material', 'material_cadastrado')
                     and criado_em > now() - interval '7 days'));
end;
$$;
revoke all on function public.envios_com_problema(uuid) from public, anon, authenticated;
grant execute on function public.envios_com_problema(uuid) to authenticated;

create or replace function public.registrar_contagem_material(
  p_obra uuid,
  p_modo text,
  p_itens jsonb,
  p_chave uuid default null,
  p_quando timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contagem uuid;
  v_aparelho timestamptz;
  v_item record;
  v_movimento uuid;
  v_dif numeric;
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;

  -- Mesmo pedido de novo (a resposta se perdeu): devolve a contagem já gravada.
  if p_chave is not null then
    select id into v_contagem from public.contagem_material
     where obra_id = p_obra and chave_cliente = p_chave and usuario_id = (select auth.uid());
    if v_contagem is not null then
      return v_contagem;
    end if;
  end if;

  v_aparelho := privado.hora_aparelho_material(p_quando);

  if p_modo is null or p_modo not in ('ajustar', 'conferir') then
    raise exception 'Modo de contagem inválido.' using errcode = '22023';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) not between 1 and 500 then
    raise exception 'A contagem precisa ter de 1 a 500 itens.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) e
     where jsonb_typeof(e) <> 'object'
        or jsonb_typeof(e -> 'material') is distinct from 'string'
        or not (e ->> 'material') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(e -> 'saldo_visto') is distinct from 'number'
        or jsonb_typeof(e -> 'contado') is distinct from 'number'
  ) then
    raise exception 'Item de contagem inválido.' using errcode = '22023';
  end if;
  if (select count(distinct (e ->> 'material')::uuid) from jsonb_array_elements(p_itens) e)
     <> jsonb_array_length(p_itens) then
    raise exception 'Material repetido na contagem.' using errcode = '22023';
  end if;

  -- Trava todos os materiais da contagem sempre na mesma ordem (por id): duas contagens ao mesmo
  -- tempo esperam uma pela outra em vez de travar em ciclo.
  perform 1 from public.material
   where obra_id = p_obra
     and id in (select (e ->> 'material')::uuid from jsonb_array_elements(p_itens) e)
   order by id
   for update;

  -- Valida tudo antes de gravar qualquer coisa.
  for v_item in
    select (e ->> 'material')::uuid as material_id,
           (e ->> 'saldo_visto')::numeric as saldo_visto,
           (e ->> 'contado')::numeric as contado,
           m.id, m.nome, m.unidade, m.ativo
      from jsonb_array_elements(p_itens) e
      left join public.material m on m.id = (e ->> 'material')::uuid and m.obra_id = p_obra
     order by 1
  loop
    if v_item.id is null then
      raise exception 'Material não encontrado nesta obra.' using errcode = 'P0002';
    end if;
    if not v_item.ativo then
      raise exception '% está inativo.', v_item.nome using errcode = 'AL103';
    end if;
    if not (v_item.contado = 0 or privado.quantidade_material_valida(v_item.unidade, v_item.contado)) then
      raise exception 'Quantidade contada inválida para %.', v_item.nome using errcode = '22023';
    end if;
    if not (v_item.saldo_visto >= 0 and v_item.saldo_visto <= 999999
            and v_item.saldo_visto = round(v_item.saldo_visto, 2)
            and (v_item.unidade not in ('sc', 'un', 'barra', 'rolo', 'lata')
                 or v_item.saldo_visto = trunc(v_item.saldo_visto))) then
      raise exception 'Saldo visto inválido para %.', v_item.nome using errcode = '22023';
    end if;
  end loop;

  insert into public.contagem_material (obra_id, modo, usuario_id, chave_cliente)
  values (p_obra, p_modo, (select auth.uid()), p_chave)
  returning id into v_contagem;

  for v_item in
    select (e ->> 'material')::uuid as material_id,
           (e ->> 'saldo_visto')::numeric as saldo_visto,
           (e ->> 'contado')::numeric as contado
      from jsonb_array_elements(p_itens) e
     order by 1
  loop
    v_dif := v_item.contado - v_item.saldo_visto;

    if p_modo = 'ajustar' and v_dif <> 0 then
      insert into public.movimento_material (obra_id, material_id, tipo, quantidade, contagem_id,
        usuario_id, registrado_no_aparelho_em)
      values (p_obra, v_item.material_id, 'ajuste', v_dif, v_contagem, (select auth.uid()), v_aparelho)
      returning id into v_movimento;
      perform privado.aplicar_movimento_material(v_item.material_id, v_dif, v_movimento);
    else
      insert into public.movimento_material (obra_id, material_id, tipo, quantidade, contagem_id,
        usuario_id, registrado_no_aparelho_em)
      values (p_obra, v_item.material_id, 'conferencia', v_dif, v_contagem, (select auth.uid()), v_aparelho);
    end if;
  end loop;

  return v_contagem;
end;
$$;

revoke all on function public.registrar_contagem_material(uuid, text, jsonb, uuid, timestamptz)
  from public, anon;
grant execute on function public.registrar_contagem_material(uuid, text, jsonb, uuid, timestamptz)
  to authenticated;
