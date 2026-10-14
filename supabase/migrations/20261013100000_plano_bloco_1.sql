-- Plano de correção (análise externa de 13/10/2026, docs/PLANO-DE-CORRECAO-18-PONTOS.md) · bloco 1.

-- Ponto 3 · Encerramento × devolução ao mesmo tempo -------------------------------------------
-- Sem trava, uma devolução que terminava durante o encerramento deixava um desconto "aberto" de
-- ferramenta já devolvida (cada transação não via a outra), e a medição cobrava a empreiteira.
-- Trava consultiva por obra: o encerramento pega exclusiva; toda saída de posse pega
-- compartilhada antes de apagar. O encerramento nunca espera por linha de posse (sem deadlock).

create function privado.trava_fechamento(p_obra uuid, p_exclusiva boolean) returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_exclusiva then
    perform pg_advisory_xact_lock(hashtext('almox:fechamento'), hashtext(p_obra::text));
  else
    perform pg_advisory_xact_lock_shared(hashtext('almox:fechamento'), hashtext(p_obra::text));
  end if;
end;
$$;

create function privado.posse_trava_fechamento() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.trava_fechamento(old.obra_id, false);
  return old;
end;
$$;
create trigger posse_trava_fechamento
  before delete on public.posse
  for each row execute function privado.posse_trava_fechamento();

-- Rede de segurança: desconto "aberto" sem a posse que o gerou não é cobrado. Cancela como a
-- devolução faria (aviso sem nada em aberto vira cancelado e a empreiteira é avisada).
create function privado.cancelar_descontos_sem_posse(p_obra uuid, p_empresa uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_desconto public.desconto;
  v_n integer := 0;
begin
  for v_desconto in
    update public.desconto d
       set status = 'cancelado', cancelado_em = now()
     where d.obra_id = p_obra and d.status = 'aberto'
       and (p_empresa is null or d.empresa_id = p_empresa)
       and not exists (
         select 1 from public.posse po
          where po.unidade_id = d.unidade_id and po.movimento_retirada_id = d.movimento_retirada_id)
    returning d.*
  loop
    update public.aviso a
       set status = 'cancelado', atualizado_em = now()
     where a.status = 'enviado'
       and exists (select 1 from public.aviso_desconto ad where ad.aviso_id = a.id and ad.desconto_id = v_desconto.id)
       and not exists (
         select 1 from public.aviso_desconto ad join public.desconto d on d.id = ad.desconto_id
          where ad.aviso_id = a.id and d.status = 'aberto');
    perform privado.enfileirar_desconto(p_obra, v_desconto.empresa_id, 'desconto_cancelado',
      v_desconto.id, v_desconto.id, 'devolucao');
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

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
             'pessoa', pe.nome, 'tipo', d.tipo_nome, 'codigo', d.codigo, 'valor', d.valor,
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

create or replace function public.fechar_medicao(p_obra uuid, p_empresa uuid, p_proxima date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_medicao uuid;
  v_total integer;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro fecha a medição.' using errcode = '42501';
  end if;
  -- Trava a empresa: dois cliques ou dois engenheiros não abrem duas medições.
  perform 1 from public.empresa
   where id = p_empresa and obra_id = p_obra and tipo = 'empreiteira' for update;
  if not found then
    raise exception 'Empreiteira não encontrada nesta obra.' using errcode = 'P0002';
  end if;
  if p_proxima is not null and p_proxima <= privado.hoje_na_obra() then
    raise exception 'A próxima medição tem que ser depois de hoje.' using errcode = '22023';
  end if;
  -- Nunca cobra ferramenta que já voltou (ponto 3).
  perform privado.cancelar_descontos_sem_posse(p_obra, p_empresa);
  if not exists (select 1 from public.desconto
                  where obra_id = p_obra and empresa_id = p_empresa and status = 'aberto') then
    raise exception 'Não há nada em aberto para esta medição.' using errcode = 'AL011';
  end if;

  insert into public.medicao (obra_id, empresa_id, fechada_por, total, proxima)
  values (p_obra, p_empresa, (select auth.uid()), 0, p_proxima)
  returning id into v_medicao;
  with confirmados as (
    update public.desconto set status = 'confirmado', medicao_id = v_medicao
     where obra_id = p_obra and empresa_id = p_empresa and status = 'aberto'
    returning valor)
  select coalesce(sum(valor), 0) into v_total from confirmados;
  update public.medicao set total = v_total where id = v_medicao;

  update public.aviso set status = 'confirmado', atualizado_em = now()
   where obra_id = p_obra and empresa_id = p_empresa and status = 'enviado';
  update public.empresa set proxima_medicao = p_proxima where id = p_empresa;
  return v_medicao;
end;
$$;

-- Ponto 7 · Trocar de empresa com ferramenta na mão --------------------------------------------
-- O desconto nasce com a empresa atual da pessoa: trocar com posse aberta mandava a cobrança
-- para a empresa nova. Agora a pessoa devolve antes (o histórico por empresa fica para o bloco 2).
create or replace function privado.impedir_troca_pessoa() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pecas integer;
begin
  if new.empresa_id is distinct from old.empresa_id then
    perform privado.recusar_troca(
      (select sum(valor)::integer from public.desconto where pessoa_id = old.id and status = 'aberto'));
    select count(*) into v_pecas from public.posse where pessoa_id = old.id;
    if v_pecas > 0 then
      raise exception 'Está com % % do almoxarifado. Ela devolve antes de trocar de empresa.',
        v_pecas, case when v_pecas = 1 then 'ferramenta' else 'ferramentas' end
        using errcode = 'AL010';
    end if;
  end if;
  return new;
end;
$$;

-- Ponto 4 · Pessoa inativa ainda com ferramenta devolve pelo QR ---------------------------------
-- Inativar quem está com ferramenta travava a devolução no balcão. A identificação vale para
-- quem ainda tem posse; a retirada continua recusada para inativos (registrar_retirada).
create function privado.inativa_com_posse(p public.pessoa) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select not p.ativa and exists (select 1 from public.posse po where po.pessoa_id = p.id)
$$;

create or replace function public.ler_capacete(p_obra uuid, p_token text)
returns table(situacao text, pessoa_id uuid, nome_capacete text, nome text, funcao text, empresa text, empresa_cor text)
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  v public.pessoa := privado.pessoa_por_token(p_obra, p_token);
begin
  if not privado.tem_acesso(p_obra) then
    raise exception 'Sem acesso a esta obra.' using errcode = '42501';
  end if;
  if v.id is null then
    return query select 'nao_cadastrado'::text, null::uuid, null::text, null::text, null::text, null::text, null::text;
  elsif not v.ativa and not privado.inativa_com_posse(v) then
    return query select 'inativa'::text, null::uuid, null::text, null::text, null::text, null::text, null::text;
  elsif privado.empresa_restrita(p_obra) is not null and privado.empresa_restrita(p_obra) <> v.empresa_id then
    return query select 'outra_empresa'::text, null::uuid, null::text, null::text, null::text, null::text, null::text;
  else
    return query
      select 'ok'::text, v.id, v.nome_capacete, v.nome, v.funcao, e.nome, e.cor
        from public.empresa e where e.id = v.empresa_id;
  end if;
end;
$$;

create or replace function public.conferir_pessoa(p_obra uuid, p_token text, p_segundos_leitura numeric default null)
returns table(identificacao uuid, pessoa_id uuid)
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
  if v.id is null or (not v.ativa and not privado.inativa_com_posse(v)) then
    raise exception 'Capacete não cadastrado.' using errcode = 'P0002';
  end if;
  insert into public.identificacao (obra_id, pessoa_id, usuario_id, expira_em, lido_em)
  values (p_obra, v.id, (select auth.uid()), now() + interval '10 minutes',
    case when p_segundos_leitura is not null
         then now() - make_interval(secs => least(greatest(p_segundos_leitura, 0), 600)::double precision)
    end)
  returning id into v_id;
  return query select v_id, v.id;
end;
$$;

-- Sem internet: a pessoa inativa com ferramenta vem marcada (o celular só oferece devolução).
create or replace function public.dados_offline(p_obra uuid)
returns jsonb
language plpgsql
stable security definer
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
               'empresa', e.nome, 'empresaCor', e.cor, 'ativa', p.ativa,
               'hash', encode(sha256(convert_to(p.qr_token, 'UTF8')), 'hex'))
             order by p.nome)
        from public.pessoa p join public.empresa e on e.id = p.empresa_id
       where p.obra_id = p_obra
         and (p.ativa or exists (select 1 from public.posse po where po.pessoa_id = p.id))), '[]'::jsonb),
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

-- Ponto 9 · Notificação só para quem ainda tem acesso -------------------------------------------
-- O envio já na fila seguia para quem perdeu o vínculo com a obra (ou foi restrito a outra
-- empresa) depois de enfileirado. A inscrição só vale com vínculo vigente e compatível.
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
          select jsonb_agg(jsonb_build_object('pessoa', p.nome, 'tipo', d.tipo_nome, 'codigo', d.codigo,
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

-- Funções internas novas: nenhum cliente executa.
revoke all on function privado.trava_fechamento(uuid, boolean) from public, anon, authenticated;
revoke all on function privado.posse_trava_fechamento() from public, anon, authenticated;
revoke all on function privado.cancelar_descontos_sem_posse(uuid, uuid) from public, anon, authenticated;
revoke all on function privado.inativa_com_posse(public.pessoa) from public, anon, authenticated;
