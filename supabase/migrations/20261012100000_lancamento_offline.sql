-- M10 · Lançamento sem internet.
--
-- O celular guarda retiradas e devoluções numa fila e manda quando a rede volta:
-- - vale a hora do lançamento no celular (até 24 h para trás; nada no futuro), e o movimento
--   guarda também a hora em que chegou (`recebido_em`, só nos lançados sem internet);
-- - QR lido sem internet: o celular manda o token lido no capacete e o servidor confere de novo;
-- - a chave do celular (`p_chave`) faz o reenvio não duplicar.
-- Para ler o QR sem internet, o celular guarda as pessoas ativas da obra com uma impressão
-- irreversível (SHA-256) do token, nunca o token (`dados_offline`).

alter table public.movimento add column recebido_em timestamptz;
comment on column public.movimento.recebido_em is
  'Só nos lançados sem internet: quando chegaram ao servidor (criado_em é a hora do celular).';
grant select (recebido_em) on public.movimento to authenticated;

drop function public.registrar_retirada(uuid, uuid, uuid, jsonb, boolean, uuid);
drop function public.registrar_devolucao(uuid, uuid, uuid, jsonb, uuid);

create function public.registrar_retirada(
  p_obra uuid,
  p_pessoa uuid,
  p_identificacao uuid,
  p_itens jsonb,
  p_confirmado boolean,
  p_chave uuid default null,
  p_token text default null,
  p_quando timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via public.via_movimento := 'manual';
  v_quando timestamptz := now();
  v_movimento uuid;
  v_item record;
  v_tipo public.tipo_ferramenta;
  v_unidades uuid[];
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;

  -- Mesmo pedido de novo (a resposta se perdeu): devolve o que já foi gravado.
  if p_chave is not null then
    select id into v_movimento from public.movimento
     where obra_id = p_obra and chave_cliente = p_chave
       and pessoa_id = p_pessoa and usuario_id = (select auth.uid()) and tipo = 'retirada';
    if v_movimento is not null then
      return v_movimento;
    end if;
  end if;

  if not coalesce(p_confirmado, false) then
    raise exception 'Confirme que conferiu pessoalmente quem está pegando.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.pessoa where id = p_pessoa and obra_id = p_obra and ativa) then
    raise exception 'Pessoa não encontrada nesta obra.' using errcode = 'P0002';
  end if;

  -- Lançado sem internet: vale a hora do celular, até 24 h para trás (decisão do M10).
  if p_quando is not null then
    if p_quando > now() + interval '5 minutes' or p_quando < now() - interval '24 hours' then
      raise exception 'Lançamento feito sem internet há mais de 24 h (ou com o relógio do celular errado). Lance de novo.'
        using errcode = 'AL012';
    end if;
    v_quando := least(p_quando, now());
  end if;

  if p_identificacao is not null then
    if not exists (
      select 1 from public.identificacao
       where id = p_identificacao and obra_id = p_obra and pessoa_id = p_pessoa
         and usuario_id = (select auth.uid()) and expira_em > v_quando
    ) then
      raise exception 'A conferência do capacete não vale mais. Leia o capacete de novo.' using errcode = 'AL001';
    end if;
    v_via := 'qr';
  end if;

  -- QR lido sem internet: o servidor confere o capacete agora (RN-02/RN-03).
  if p_token is not null then
    if p_identificacao is not null then
      raise exception 'Use a conferência ou o QR lido, não os dois.' using errcode = '22023';
    end if;
    if (privado.pessoa_por_token(p_obra, p_token)).id is distinct from p_pessoa then
      raise exception 'O QR lido no celular não é o capacete desta pessoa.' using errcode = 'AL013';
    end if;
    v_via := 'qr';
  end if;

  -- Cada item: objeto com tipo (uuid) e quantidade inteira de 1 a 999.
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Escolha pelo menos uma ferramenta.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) e
     where jsonb_typeof(e) <> 'object'
        or coalesce(e ->> 'quantidade', '') !~ '^[1-9][0-9]{0,2}$'
        or coalesce(e ->> 'tipo', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'Lista de ferramentas inválida.' using errcode = '22023';
  end if;

  insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via, conferido, chave_cliente,
    criado_em, recebido_em)
  values (p_obra, 'retirada', p_pessoa, (select auth.uid()), v_via, true, p_chave,
    v_quando, case when p_quando is not null then now() end)
  returning id into v_movimento;

  for v_item in
    select (e ->> 'tipo')::uuid as tipo, sum((e ->> 'quantidade')::integer) as quantidade
      from jsonb_array_elements(p_itens) e
     group by 1
  loop
    select * into v_tipo from public.tipo_ferramenta where id = v_item.tipo and obra_id = p_obra;
    if v_tipo.id is null then
      raise exception 'Ferramenta não encontrada nesta obra.' using errcode = 'P0002';
    end if;

    -- skip locked: não espera outro celular (sem risco de deadlock). Se ele desistir,
    -- uma unidade travada por ele pode faltar aqui: "acabou de sair" e tenta de novo.
    select array_agg(id) into v_unidades from (
      select u.id from public.unidade u
       where u.tipo_id = v_tipo.id and u.obra_id = p_obra and u.status = 'livre'
       order by length(u.codigo), u.codigo
       limit v_item.quantidade
       for update skip locked
    ) livres;
    if coalesce(array_length(v_unidades, 1), 0) < v_item.quantidade then
      raise exception '% acabou de sair: só % livre(s) agora.', v_tipo.nome,
        coalesce(array_length(v_unidades, 1), 0) using errcode = 'AL002';
    end if;

    insert into public.movimento_item (movimento_id, obra_id, unidade_id)
      select v_movimento, p_obra, unnest(v_unidades);
    update public.unidade set status = 'em_uso' where id = any (v_unidades);
    insert into public.posse (unidade_id, obra_id, pessoa_id, via, movimento_retirada_id, desde)
      select unnest(v_unidades), p_obra, p_pessoa, v_via, v_movimento, v_quando;
  end loop;

  return v_movimento;
end;
$$;

create function public.registrar_devolucao(
  p_obra uuid,
  p_pessoa uuid,
  p_identificacao uuid,
  p_itens jsonb,
  p_chave uuid default null,
  p_token text default null,
  p_quando timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via public.via_movimento := 'manual';
  v_quando timestamptz := now();
  v_movimento uuid;
  v_item record;
  v_tipo public.tipo_ferramenta;
  v_unidades uuid[];
  v_avarias jsonb;
  v_n_avarias integer;
  v_com_ela integer;
  v_i integer;
  v_av jsonb;
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;

  if p_chave is not null then
    select id into v_movimento from public.movimento
     where obra_id = p_obra and chave_cliente = p_chave
       and pessoa_id = p_pessoa and usuario_id = (select auth.uid()) and tipo = 'devolucao';
    if v_movimento is not null then
      return v_movimento;
    end if;
  end if;

  if not exists (select 1 from public.pessoa where id = p_pessoa and obra_id = p_obra) then
    raise exception 'Pessoa não encontrada nesta obra.' using errcode = 'P0002';
  end if;

  -- Lançado sem internet: vale a hora do celular, até 24 h para trás (decisão do M10).
  if p_quando is not null then
    if p_quando > now() + interval '5 minutes' or p_quando < now() - interval '24 hours' then
      raise exception 'Lançamento feito sem internet há mais de 24 h (ou com o relógio do celular errado). Lance de novo.'
        using errcode = 'AL012';
    end if;
    v_quando := least(p_quando, now());
  end if;

  if p_identificacao is not null then
    if not exists (
      select 1 from public.identificacao
       where id = p_identificacao and obra_id = p_obra and pessoa_id = p_pessoa
         and usuario_id = (select auth.uid()) and expira_em > v_quando
    ) then
      raise exception 'A conferência do capacete não vale mais. Leia o capacete de novo.' using errcode = 'AL001';
    end if;
    v_via := 'qr';
  end if;

  -- QR lido sem internet: o servidor confere o capacete agora (RN-02/RN-03).
  if p_token is not null then
    if p_identificacao is not null then
      raise exception 'Use a conferência ou o QR lido, não os dois.' using errcode = '22023';
    end if;
    if (privado.pessoa_por_token(p_obra, p_token)).id is distinct from p_pessoa then
      raise exception 'O QR lido no celular não é o capacete desta pessoa.' using errcode = 'AL013';
    end if;
    v_via := 'qr';
  end if;

  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe o que voltou.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) e
     where jsonb_typeof(e) <> 'object'
        or coalesce(e ->> 'quantidade', '') !~ '^[1-9][0-9]{0,2}$'
        or coalesce(e ->> 'tipo', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(coalesce(e -> 'avarias', '[]')) <> 'array'
        or jsonb_array_length(coalesce(e -> 'avarias', '[]')) >
           case when coalesce(e ->> 'quantidade', '') ~ '^[1-9][0-9]{0,2}$' then (e ->> 'quantidade')::integer else 0 end
  ) or (select count(*) from jsonb_array_elements(p_itens) e) <>
       (select count(distinct e ->> 'tipo') from jsonb_array_elements(p_itens) e) then
    raise exception 'Lista de devolução inválida.' using errcode = '22023';
  end if;

  -- Cada avaria: motivo da lista e foto enviada por este usuário, desta obra, ainda não usada.
  if exists (
    select 1 from jsonb_array_elements(p_itens) e, jsonb_array_elements(coalesce(e -> 'avarias', '[]')) a
     where jsonb_typeof(a) <> 'object'
        or coalesce(a ->> 'motivo', '') not in ('quebrada', 'cabo_rompido', 'nao_liga', 'desgaste', 'peca_faltando')
        or coalesce(a ->> 'foto', '') !~ ('^' || p_obra::text || '/[0-9a-f-]{36}\.jpg$')
        or not exists (
          select 1 from storage.objects o
           where o.bucket_id = 'avarias' and o.name = a ->> 'foto' and o.owner_id = (select auth.uid())::text
        )
        or exists (select 1 from public.avaria v where v.foto_path = a ->> 'foto')
  ) or (
    -- a mesma foto duas vezes no mesmo pedido
    select count(*) <> count(distinct a ->> 'foto')
      from jsonb_array_elements(p_itens) e, jsonb_array_elements(coalesce(e -> 'avarias', '[]')) a
  ) then
    raise exception 'Cada avaria precisa de foto e motivo (RN-09).' using errcode = 'AL005';
  end if;

  insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via, chave_cliente,
    criado_em, recebido_em)
  values (p_obra, 'devolucao', p_pessoa, (select auth.uid()), v_via, p_chave,
    v_quando, case when p_quando is not null then now() end)
  returning id into v_movimento;

  for v_item in
    select (e ->> 'tipo')::uuid as tipo, (e ->> 'quantidade')::integer as quantidade,
           coalesce(e -> 'avarias', '[]') as avarias
      from jsonb_array_elements(p_itens) e
  loop
    select * into v_tipo from public.tipo_ferramenta where id = v_item.tipo and obra_id = p_obra;
    if v_tipo.id is null then
      raise exception 'Ferramenta não encontrada nesta obra.' using errcode = 'P0002';
    end if;

    -- As mais antigas com a pessoa; sem QR, só as que saíram sem QR.
    select array_agg(unidade_id) into v_unidades from (
      select p.unidade_id from public.posse p join public.unidade u on u.id = p.unidade_id
       where p.pessoa_id = p_pessoa and p.obra_id = p_obra and u.tipo_id = v_tipo.id
         and (v_via = 'qr' or p.via = 'manual')
       order by p.desde, length(u.codigo), u.codigo
       limit v_item.quantidade
       for update of p
    ) x;
    if coalesce(array_length(v_unidades, 1), 0) < v_item.quantidade then
      select count(*) into v_com_ela from public.posse p join public.unidade u on u.id = p.unidade_id
       where p.pessoa_id = p_pessoa and p.obra_id = p_obra and u.tipo_id = v_tipo.id;
      if v_com_ela >= v_item.quantidade then
        raise exception '% saiu com o capacete: só volta com o capacete de quem pegou (RN-02).', v_tipo.nome
          using errcode = 'AL004';
      end if;
      -- Sem QR, o que pode voltar é só o que saiu sem QR.
      raise exception 'Não tem tantas % para devolver %: só %.', v_tipo.nome,
        case when v_via = 'qr' then 'com ela' else 'sem QR' end,
        coalesce(array_length(v_unidades, 1), 0) using errcode = 'AL003';
    end if;

    v_avarias := v_item.avarias;
    v_n_avarias := jsonb_array_length(v_avarias);
    for v_i in 1 .. v_item.quantidade loop
      insert into public.movimento_item (movimento_id, obra_id, unidade_id, avariada, retirada_id)
      values (v_movimento, p_obra, v_unidades[v_i], v_i <= v_n_avarias,
        (select movimento_retirada_id from public.posse where unidade_id = v_unidades[v_i]));
      delete from public.posse where unidade_id = v_unidades[v_i];
      update public.unidade
         set status = (case when v_i <= v_n_avarias then 'manutencao' else 'livre' end)::public.status_unidade
       where id = v_unidades[v_i];
      if v_i <= v_n_avarias then
        v_av := v_avarias -> (v_i - 1);
        insert into public.avaria (obra_id, unidade_id, movimento_id, motivo, foto_path)
        values (p_obra, v_unidades[v_i], v_movimento, (v_av ->> 'motivo')::public.motivo_avaria, v_av ->> 'foto');
      end if;
    end loop;
  end loop;

  return v_movimento;
end;
$$;

revoke all on function public.registrar_retirada(uuid, uuid, uuid, jsonb, boolean, uuid, text, timestamptz),
  public.registrar_devolucao(uuid, uuid, uuid, jsonb, uuid, text, timestamptz)
  from public, anon;
grant execute on function public.registrar_retirada(uuid, uuid, uuid, jsonb, boolean, uuid, text, timestamptz),
  public.registrar_devolucao(uuid, uuid, uuid, jsonb, uuid, text, timestamptz)
  to authenticated;

/**
 * O que o celular guarda para lançar sem internet (almoxarife e engenheiro): pessoas ativas
 * com o SHA-256 do token (nunca o token), ferramentas com quantas estão livres e o que cada
 * pessoa tem agora (por tipo e via).
 */
create function public.dados_offline(p_obra uuid) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'obra', p_obra,
    'geradoEm', now(),
    'pessoas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'nome', p.nome, 'nomeCapacete', p.nome_capacete, 'funcao', p.funcao,
               'empresa', e.nome, 'empresaCor', e.cor,
               'hash', encode(sha256(convert_to(p.qr_token, 'UTF8')), 'hex'))
             order by p.nome)
        from public.pessoa p join public.empresa e on e.id = p.empresa_id
       where p.obra_id = p_obra and p.ativa), '[]'::jsonb),
    'tipos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'nome', t.nome, 'icone', t.icone, 'altoValor', t.alto_valor,
               'livres', (select count(*) from public.unidade u
                           where u.tipo_id = t.id and u.status = 'livre'))
             order by t.nome)
        from public.tipo_ferramenta t where t.obra_id = p_obra), '[]'::jsonb),
    'posses', coalesce((
      select jsonb_agg(jsonb_build_object('pessoa', x.pessoa_id, 'tipo', x.tipo_id, 'via', x.via,
               'quantidade', x.n))
        from (select po.pessoa_id, u.tipo_id, po.via, count(*)::integer as n
                from public.posse po join public.unidade u on u.id = po.unidade_id
               where po.obra_id = p_obra
               group by 1, 2, 3) x), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.dados_offline(uuid) from public, anon;
grant execute on function public.dados_offline(uuid) to authenticated;
