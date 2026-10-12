-- M9 (comparação com o protótipo): complemento automático às 23:59.
-- Se o dia foi encerrado à mão (ex.: 17h), às 23:59 o sistema avisa só as peças de empreiteira
-- que saíram depois do encerramento e não voltaram, uma vez, sem repetir as do aviso da tarde.

alter table public.fechamento_dia add column complementado_em timestamptz;
grant select (complementado_em) on public.fechamento_dia to authenticated;

/** Complemento do dia encerrado à mão: só peças novas (sem desconto ainda). */
create function privado.complementar_dia(p_obra uuid, p_data date) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fechamento public.fechamento_dia;
  v_empresa record;
  v_aviso uuid;
  v_itens jsonb;
  v_total integer;
  v_n integer := 0;
begin
  select * into v_fechamento from public.fechamento_dia
   where obra_id = p_obra and data = p_data and not automatico and complementado_em is null
   for update;
  if v_fechamento.id is null then
    return 0;
  end if;
  update public.fechamento_dia set complementado_em = now() where id = v_fechamento.id;

  -- Peças de empreiteira fora agora e ainda sem desconto: saíram depois do encerramento.
  insert into public.desconto (obra_id, empresa_id, pessoa_id, unidade_id, movimento_retirada_id,
    tipo_nome, codigo, valor)
  select p_obra, pe.empresa_id, po.pessoa_id, po.unidade_id, po.movimento_retirada_id,
         t.nome, u.codigo, t.valor_reposicao
    from public.posse po
    join public.pessoa pe on pe.id = po.pessoa_id
    join public.empresa e on e.id = pe.empresa_id
    join public.unidade u on u.id = po.unidade_id
    join public.tipo_ferramenta t on t.id = u.tipo_id
   where po.obra_id = p_obra and e.tipo = 'empreiteira'
  on conflict (movimento_retirada_id, unidade_id) do nothing;

  -- Um aviso por empreiteira só com os descontos que nenhum aviso cobrou ainda.
  for v_empresa in
    select distinct d.empresa_id
      from public.desconto d
      join public.empresa e on e.id = d.empresa_id and e.tipo = 'empreiteira'
     where d.obra_id = p_obra and d.status = 'aberto' and d.primeiro_aviso_id is null
  loop
    select coalesce(jsonb_agg(jsonb_build_object(
             'pessoa', pe.nome, 'tipo', d.tipo_nome, 'codigo', d.codigo, 'valor', d.valor,
             'desde', po.desde) order by pe.nome, d.codigo), '[]'::jsonb),
           coalesce(sum(d.valor), 0)
      into v_itens, v_total
      from public.desconto d
      join public.posse po on po.unidade_id = d.unidade_id
                          and po.movimento_retirada_id = d.movimento_retirada_id
      join public.pessoa pe on pe.id = d.pessoa_id
     where d.obra_id = p_obra and d.empresa_id = v_empresa.empresa_id
       and d.status = 'aberto' and d.primeiro_aviso_id is null;
    if v_total = 0 then
      continue;
    end if;

    insert into public.aviso (obra_id, fechamento_id, empresa_id, total, itens)
    values (p_obra, v_fechamento.id, v_empresa.empresa_id, v_total, v_itens)
    returning id into v_aviso;
    insert into public.aviso_desconto (aviso_id, desconto_id, obra_id)
    select v_aviso, d.id, p_obra from public.desconto d
     where d.obra_id = p_obra and d.empresa_id = v_empresa.empresa_id
       and d.status = 'aberto' and d.primeiro_aviso_id is null;
    update public.desconto set primeiro_aviso_id = v_aviso
     where id in (select desconto_id from public.aviso_desconto where aviso_id = v_aviso);

    perform privado.enfileirar_para_empresa(p_obra, v_empresa.empresa_id, 'aviso', v_aviso);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

/**
 * Automático (23:59 de São Paulo): encerra as obras não encerradas e complementa as encerradas
 * à mão. O dia é o de 30 minutos atrás (job atrasado ainda acerta o dia). Cada obra à parte.
 */
create or replace function privado.encerrar_automatico() returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data date := ((now() at time zone 'America/Sao_Paulo') - interval '30 minutes')::date;
  v_obra uuid;
  v_n integer := 0;
begin
  for v_obra in select o.id from public.obra o loop
    begin
      if exists (select 1 from public.fechamento_dia f where f.obra_id = v_obra and f.data = v_data) then
        perform privado.complementar_dia(v_obra, v_data);
      else
        perform privado.encerrar_dia(v_obra, null, true, v_data);
        v_n := v_n + 1;
      end if;
    exception when others then
      raise warning 'encerramento automático falhou na obra %: %', v_obra, sqlerrm;
    end;
  end loop;
  return v_n;
end;
$$;

revoke execute on function privado.complementar_dia(uuid, date) from public, anon, authenticated;
