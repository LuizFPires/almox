-- Plano de correção · bloco 2, ponto 8: avisos guardam o id da pessoa.
-- Os itens do aviso só tinham o nome: o e-mail juntava homônimos numa linha só e a
-- anonimização (LGPD) trocava o nome de homônimos de outras empresas e não achava avisos de
-- quem foi renomeado. Agora cada item tem `pessoaId`; os avisos antigos são completados pelo
-- código da peça (aviso_desconto → desconto).

-- Avisos antigos: o id vem do desconto da mesma peça no mesmo aviso.
update public.aviso a
   set itens = (
     select jsonb_agg(
              case when i ? 'pessoaId' then i
                   else i || coalesce((
                     select jsonb_build_object('pessoaId', d.pessoa_id)
                       from public.aviso_desconto ad join public.desconto d on d.id = ad.desconto_id
                      where ad.aviso_id = a.id and d.codigo = i ->> 'codigo'
                      limit 1), '{}'::jsonb)
              end order by n)
       from jsonb_array_elements(a.itens) with ordinality as x(i, n))
 where jsonb_array_length(a.itens) > 0;

create or replace function privado.encerrar_dia(p_obra uuid, p_usuario uuid, p_automatico boolean, p_data date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data date := coalesce(p_data, privado.hoje_na_obra());
  v_fechamento uuid;
  v_empresa record;
  v_aviso uuid;
  v_itens jsonb;
  v_total integer;
  v_proprios integer;
begin
  -- Espera as devoluções em curso terminarem e segura as novas até o fim do encerramento.
  perform privado.trava_fechamento(p_obra, true);

  insert into public.fechamento_dia (obra_id, data, encerrado_por, automatico)
  values (p_obra, v_data, case when p_automatico then null else p_usuario end, p_automatico)
  on conflict (obra_id, data) do nothing
  returning id into v_fechamento;
  if v_fechamento is null then
    return (select id from public.fechamento_dia where obra_id = p_obra and data = v_data);
  end if;

  perform privado.cancelar_descontos_sem_posse(p_obra);

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

  for v_empresa in
    select distinct d.empresa_id
      from public.desconto d
      join public.empresa e on e.id = d.empresa_id and e.tipo = 'empreiteira'
      join public.posse po on po.unidade_id = d.unidade_id
                          and po.movimento_retirada_id = d.movimento_retirada_id
     where d.obra_id = p_obra and d.status = 'aberto'
  loop
    select coalesce(jsonb_agg(jsonb_build_object(
             'pessoa', pe.nome, 'pessoaId', pe.id, 'tipo', d.tipo_nome, 'codigo', d.codigo, 'valor', d.valor,
             'desde', po.desde) order by pe.nome, d.codigo), '[]'::jsonb),
           coalesce(sum(d.valor), 0)
      into v_itens, v_total
      from public.desconto d
      join public.posse po on po.unidade_id = d.unidade_id
                          and po.movimento_retirada_id = d.movimento_retirada_id
      join public.pessoa pe on pe.id = d.pessoa_id
     where d.obra_id = p_obra and d.empresa_id = v_empresa.empresa_id and d.status = 'aberto';

    insert into public.aviso (obra_id, fechamento_id, empresa_id, total, itens)
    values (p_obra, v_fechamento, v_empresa.empresa_id, v_total, v_itens)
    returning id into v_aviso;

    insert into public.aviso_desconto (aviso_id, desconto_id, obra_id)
    select v_aviso, d.id, p_obra
      from public.desconto d
      join public.posse po on po.unidade_id = d.unidade_id
                          and po.movimento_retirada_id = d.movimento_retirada_id
     where d.obra_id = p_obra and d.empresa_id = v_empresa.empresa_id and d.status = 'aberto';

    update public.desconto set primeiro_aviso_id = v_aviso
     where id in (select desconto_id from public.aviso_desconto where aviso_id = v_aviso)
       and primeiro_aviso_id is null;

    perform privado.enfileirar_para_empresa(p_obra, v_empresa.empresa_id, 'aviso', v_aviso);
  end loop;

  select count(distinct po.pessoa_id) into v_proprios
    from public.posse po
    join public.pessoa pe on pe.id = po.pessoa_id
    join public.empresa e on e.id = pe.empresa_id
   where po.obra_id = p_obra and e.tipo = 'propria';
  if v_proprios > 0 then
    insert into public.envio (obra_id, tipo, canal, destino, referencia, dados)
    select p_obra, 'resumo_proprios', 'push', uo.usuario_id::text, v_fechamento,
           jsonb_build_object('pessoas', v_proprios)
      from public.usuario_obra uo
     where uo.obra_id = p_obra and uo.perfil = 'engenheiro'
    on conflict do nothing;
  end if;

  return v_fechamento;
end;
$$;

create or replace function privado.complementar_dia(p_obra uuid, p_data date)
returns integer
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
  perform privado.trava_fechamento(p_obra, true);

  select * into v_fechamento from public.fechamento_dia
   where obra_id = p_obra and data = p_data and not automatico and complementado_em is null
   for update;
  if v_fechamento.id is null then
    return 0;
  end if;
  update public.fechamento_dia set complementado_em = now() where id = v_fechamento.id;

  perform privado.cancelar_descontos_sem_posse(p_obra);

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
             'pessoa', pe.nome, 'pessoaId', pe.id, 'tipo', d.tipo_nome, 'codigo', d.codigo, 'valor', d.valor,
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
              and (uo.empresa_id is null or uo.empresa_id = v_alvo))), '[]'::jsonb));
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
  else
    return v_base || (
      select jsonb_build_object('pessoa', p.nome, 'quando', o.criado_em)
        from public.ocorrencia o join public.pessoa p on p.id = o.pessoa_id
       where o.id = v.referencia);
  end if;
end;
$$;

-- Anonimização pelo id; aviso antigo sem id (sem desconto ligado) só pelo nome, e só se a
-- pessoa era da empresa do aviso na data dele (empresa_na_data vem na migration seguinte).
create or replace function privado.anonimizar_pessoa(p_pessoa uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.pessoa;
begin
  select * into v from public.pessoa where id = p_pessoa for update;
  if v.id is null or v.anonimizada_em is not null then
    return;
  end if;
  update public.aviso a
     set itens = (select jsonb_agg(case when i ->> 'pessoaId' = v.id::text
                                          or (not i ? 'pessoaId' and i ->> 'pessoa' = v.nome
                                              and a.empresa_id = privado.empresa_na_data(v.id, a.enviado_em))
                                        then i || jsonb_build_object('pessoa', 'Pessoa anonimizada')
                                        else i end order by n)
                    from jsonb_array_elements(a.itens) with ordinality as x(i, n))
   where a.obra_id = v.obra_id
     and (a.itens @> jsonb_build_array(jsonb_build_object('pessoaId', v.id::text))
          or (a.empresa_id = privado.empresa_na_data(v.id, a.enviado_em)
              and a.itens @> jsonb_build_array(jsonb_build_object('pessoa', v.nome))));
  delete from public.trabalho_impressao where pessoa_id = v.id;
  update public.pessoa
     set nome = 'Pessoa anonimizada', nome_capacete = 'ANONIMIZADA', funcao = '-', ativa = false,
         qr_token = encode(extensions.gen_random_bytes(18), 'hex'), anonimizada_em = now()
   where id = v.id;
end;
$$;
