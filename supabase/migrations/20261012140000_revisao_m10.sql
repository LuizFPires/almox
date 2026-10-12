-- M10 (revisão).
-- 1. Conferência do capacete (p_identificacao) vale agora, nunca na hora do celular; hora do
--    celular só com o QR lido sem internet (p_token) ou na lista.
-- 2. A hora do celular não fica antes do último lançamento das peças (retirada) nem antes da
--    retirada delas (devolução): as peças são escolhidas antes de gravar o movimento.
-- 3. "Não é ele" sem internet: chave do celular (reenvio não duplica nem avisa duas vezes) e
--    hora do celular (até 24 h).
-- 4. Retenção: trabalhos de impressão (nome e token no conteúdo) saem com a pessoa
--    anonimizada e, os concluídos, depois de 12 meses.
-- 5. Foto vencida só fica marcada como apagada se de fato saiu do Storage.

create or replace function public.registrar_retirada(
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
  v_todas uuid[] := '{}';
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
    -- A conferência é do lançamento com internet: vale agora, nunca na hora do celular
    -- (senão uma conferência vencida ou anulada por "Não é ele" voltaria a valer).
    if p_quando is not null then
      raise exception 'Hora do celular só vale para o QR lido sem internet.' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.identificacao
       where id = p_identificacao and obra_id = p_obra and pessoa_id = p_pessoa
         and usuario_id = (select auth.uid()) and expira_em > now()
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

    v_todas := v_todas || v_unidades;
  end loop;

  -- A hora do celular nunca fica antes do último lançamento das peças escolhidas (ex.: a
  -- peça voltou às 9h e a retirada sem internet foi às 8h: vale 9h).
  select greatest(v_quando, coalesce(max(m.criado_em), v_quando)) into v_quando
    from public.movimento_item mi join public.movimento m on m.id = mi.movimento_id
   where mi.unidade_id = any (v_todas);

  insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via, conferido, chave_cliente,
    criado_em, recebido_em)
  values (p_obra, 'retirada', p_pessoa, (select auth.uid()), v_via, true, p_chave,
    v_quando, case when p_quando is not null then now() end)
  returning id into v_movimento;

  insert into public.movimento_item (movimento_id, obra_id, unidade_id)
    select v_movimento, p_obra, unnest(v_todas);
  update public.unidade set status = 'em_uso' where id = any (v_todas);
  insert into public.posse (unidade_id, obra_id, pessoa_id, via, movimento_retirada_id, desde)
    select unnest(v_todas), p_obra, p_pessoa, v_via, v_movimento, v_quando;

  return v_movimento;
end;
$$;

create or replace function public.registrar_devolucao(
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
  v_todas uuid[] := '{}';
  v_avariadas boolean[] := '{}';
  v_motivos text[] := '{}';
  v_fotos text[] := '{}';
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
    -- A conferência é do lançamento com internet: vale agora, nunca na hora do celular
    -- (senão uma conferência vencida ou anulada por "Não é ele" voltaria a valer).
    if p_quando is not null then
      raise exception 'Hora do celular só vale para o QR lido sem internet.' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.identificacao
       where id = p_identificacao and obra_id = p_obra and pessoa_id = p_pessoa
         and usuario_id = (select auth.uid()) and expira_em > now()
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
      v_av := case when v_i <= v_n_avarias then v_avarias -> (v_i - 1) end;
      v_todas := v_todas || v_unidades[v_i];
      v_avariadas := v_avariadas || (v_i <= v_n_avarias);
      v_motivos := v_motivos || (v_av ->> 'motivo');
      v_fotos := v_fotos || (v_av ->> 'foto');
    end loop;
  end loop;

  -- A devolução nunca fica antes da retirada das peças que voltam.
  select greatest(v_quando, coalesce(max(p.desde), v_quando)) into v_quando
    from public.posse p where p.unidade_id = any (v_todas);

  insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via, chave_cliente,
    criado_em, recebido_em)
  values (p_obra, 'devolucao', p_pessoa, (select auth.uid()), v_via, p_chave,
    v_quando, case when p_quando is not null then now() end)
  returning id into v_movimento;

  for v_i in 1 .. coalesce(array_length(v_todas, 1), 0) loop
    insert into public.movimento_item (movimento_id, obra_id, unidade_id, avariada, retirada_id)
    values (v_movimento, p_obra, v_todas[v_i], v_avariadas[v_i],
      (select movimento_retirada_id from public.posse where unidade_id = v_todas[v_i]));
    delete from public.posse where unidade_id = v_todas[v_i];
    update public.unidade
       set status = (case when v_avariadas[v_i] then 'manutencao' else 'livre' end)::public.status_unidade
     where id = v_todas[v_i];
    if v_avariadas[v_i] then
      insert into public.avaria (obra_id, unidade_id, movimento_id, motivo, foto_path)
      values (p_obra, v_todas[v_i], v_movimento, v_motivos[v_i]::public.motivo_avaria, v_fotos[v_i]);
    end if;
  end loop;

  return v_movimento;
end;
$$;

alter table public.ocorrencia add column chave_cliente uuid;
create unique index ocorrencia_chave_cliente on public.ocorrencia (obra_id, chave_cliente)
  where chave_cliente is not null;

drop function public.registrar_ocorrencia(uuid, text);
create function public.registrar_ocorrencia(
  p_obra uuid, p_token text, p_chave uuid default null, p_quando timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.pessoa := privado.pessoa_por_token(p_obra, p_token);
  v_id uuid;
  v_quando timestamptz := now();
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  if v.id is null then
    raise exception 'Capacete não cadastrado.' using errcode = 'P0002';
  end if;
  if p_chave is not null then
    select id into v_id from public.ocorrencia
     where obra_id = p_obra and chave_cliente = p_chave and usuario_id = (select auth.uid());
    if v_id is not null then
      return v_id;
    end if;
  end if;
  if p_quando is not null then
    if p_quando > now() + interval '5 minutes' or p_quando < now() - interval '24 hours' then
      raise exception 'Lançamento feito sem internet há mais de 24 h (ou com o relógio do celular errado).'
        using errcode = 'AL012';
    end if;
    v_quando := least(p_quando, now());
  end if;
  update public.identificacao set expira_em = now()
   where pessoa_id = v.id and obra_id = p_obra and expira_em > now();
  insert into public.ocorrencia (obra_id, tipo, pessoa_id, usuario_id, criado_em, chave_cliente)
  values (p_obra, 'capacete_trocado', v.id, (select auth.uid()), v_quando, p_chave)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.registrar_ocorrencia(uuid, text, uuid, timestamptz) from public, anon;
grant execute on function public.registrar_ocorrencia(uuid, text, uuid, timestamptz) to authenticated;

-- Anonimizar também apaga os trabalhos de impressão da pessoa (nome e token no conteúdo).
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
     set itens = (select jsonb_agg(case when i ->> 'pessoa' = v.nome
                                        then i || jsonb_build_object('pessoa', 'Pessoa anonimizada')
                                        else i end)
                    from jsonb_array_elements(a.itens) i)
   where a.obra_id = v.obra_id and a.itens @> jsonb_build_array(jsonb_build_object('pessoa', v.nome));
  delete from public.trabalho_impressao where pessoa_id = v.id;
  update public.pessoa
     set nome = 'Pessoa anonimizada', nome_capacete = 'ANONIMIZADA', funcao = '-', ativa = false,
         qr_token = encode(extensions.gen_random_bytes(18), 'hex'), anonimizada_em = now()
   where id = v.id;
end;
$$;
revoke execute on function privado.anonimizar_pessoa(uuid) from public, anon, authenticated;

create or replace function privado.aplicar_retencao() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r privado.retencao := (select x from privado.retencao x);
  v_pessoa uuid;
  v_pessoas integer := 0;
  v_empresas integer := 0;
  v_envios integer := 0;
  v_conferencias integer := 0;
begin
  for v_pessoa in
    select p.id from public.pessoa p join public.obra o on o.id = p.obra_id
     where p.anonimizada_em is null
       and not exists (select 1 from public.posse po where po.pessoa_id = p.id)
       and (
         o.encerrada_em < current_date - make_interval(years => r.anos_apos_obra)
         or (not p.ativa
             and p.criado_em < now() - make_interval(years => r.anos_pessoa_inativa)
             and not exists (select 1 from public.movimento m where m.pessoa_id = p.id
                              and m.criado_em > now() - make_interval(years => r.anos_pessoa_inativa))
             and not exists (select 1 from public.ocorrencia oc where oc.pessoa_id = p.id
                              and oc.criado_em > now() - make_interval(years => r.anos_pessoa_inativa)))
       )
  loop
    perform privado.anonimizar_pessoa(v_pessoa);
    v_pessoas := v_pessoas + 1;
  end loop;

  -- Contatos das empresas de obras encerradas há mais de N anos (e o log das trocas).
  with alvo as (
    select e.id from public.empresa e join public.obra o on o.id = e.obra_id
     where o.encerrada_em < current_date - make_interval(years => r.anos_apos_obra)
       and (e.dono_nome is not null or e.dono_email is not null or e.encarregado_email is not null)
  ), feito as (
    update public.empresa e set dono_nome = null, dono_email = null, encarregado_email = null
      from alvo where e.id = alvo.id returning e.id
  )
  select count(*) into v_empresas from feito;
  delete from public.alteracao l
   using public.empresa e join public.obra o on o.id = e.obra_id
   where l.tabela = 'empresa' and l.registro_id = e.id
     and l.campo in ('dono_nome', 'dono_email', 'encarregado_email')
     and o.encerrada_em < current_date - make_interval(years => r.anos_apos_obra);

  -- Dados operacionais: fila de envios (endereços de e-mail) e conferências de capacete.
  delete from public.envio
   where criado_em < now() - make_interval(months => r.meses_operacionais);
  get diagnostics v_envios = row_count;
  delete from public.identificacao
   where criado_em < now() - make_interval(months => r.meses_operacionais);
  get diagnostics v_conferencias = row_count;
  delete from public.trabalho_impressao
   where criado_em < now() - make_interval(months => r.meses_operacionais) and status <> 'pendente';

  return jsonb_build_object('pessoas', v_pessoas, 'empresas', v_empresas, 'envios', v_envios,
    'conferencias', v_conferencias);
end;
$$;
revoke execute on function privado.aplicar_retencao() from public, anon, authenticated;

drop function public.marcar_fotos_apagadas(text[]);
/** Marca as fotos que já não estão no Storage (o processador apagou); devolve quantas. */
create function public.marcar_fotos_apagadas(p_caminhos text[]) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  update public.avaria a set foto_apagada_em = now()
   where a.foto_path = any (p_caminhos) and a.foto_apagada_em is null
     and not exists (select 1 from storage.objects o
                      where o.bucket_id = 'avarias' and o.name = a.foto_path);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.marcar_fotos_apagadas(text[]) from public, anon, authenticated;
grant execute on function public.marcar_fotos_apagadas(text[]) to service_role;
