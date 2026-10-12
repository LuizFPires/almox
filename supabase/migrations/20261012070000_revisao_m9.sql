-- Revisão do M9 (decisões de 12/10/2026 na tabela do PLAN).
-- 1. Estorno da devolução reabre o desconto, volta o aviso para "a descontar" e manda e-mail de
--    correção (tipo de envio `desconto_reaberto`).
-- 2. O cancelamento lista exatamente os descontos que aquele movimento cancelou (a mesma peça
--    pode ter sido cobrada e devolvida em ciclos anteriores), com o motivo (devolução ou
--    lançamento corrigido pelo engenheiro).
-- 3. Estorno de retirada depois da medição: recusado (AL009).
-- 4. Troca de empresa da pessoa, ou de tipo da empresa, com desconto em aberto: recusada (AL010).
-- 5. Cada desconto lembra o primeiro aviso que o cobrou (o lembrete não soma de novo na tela).
-- 6. Encerramento automático: dia certo mesmo se o job atrasar; uma obra com erro não desfaz as
--    outras. Só empreiteira entra no aviso (RN-15).
-- 7. Fila: nova tentativa com espera crescente; notificação para quem não ativou fica
--    `sem_destino` (não "enviado").
-- 8. Medição atômica (empresa travada; nada em aberto: AL011).
-- 9. Almoxarife vê só o encerramento de hoje.

alter type public.tipo_envio add value if not exists 'desconto_reaberto';
alter type public.status_envio add value if not exists 'sem_destino';

alter table public.desconto add column primeiro_aviso_id uuid references public.aviso (id);
update public.desconto d
   set primeiro_aviso_id = (
     select ad.aviso_id from public.aviso_desconto ad join public.aviso a on a.id = ad.aviso_id
      where ad.desconto_id = d.id order by a.enviado_em limit 1);

alter table public.envio add column proxima_tentativa_em timestamptz not null default now();

-- Encerrar o dia (com data explícita) -----------------------------------------------------------
drop function privado.encerrar_dia(uuid, uuid, boolean);

create function privado.encerrar_dia(
  p_obra uuid, p_usuario uuid, p_automatico boolean, p_data date default null
) returns uuid
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
  insert into public.fechamento_dia (obra_id, data, encerrado_por, automatico)
  values (p_obra, v_data, case when p_automatico then null else p_usuario end, p_automatico)
  on conflict (obra_id, data) do nothing
  returning id into v_fechamento;
  if v_fechamento is null then
    return (select id from public.fechamento_dia where obra_id = p_obra and data = v_data);
  end if;

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

create or replace function public.encerrar_dia(p_obra uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Só quem lança na obra encerra o dia.' using errcode = '42501';
  end if;
  return privado.encerrar_dia(p_obra, (select auth.uid()), false);
end;
$$;

/**
 * Automático (agendado às 23:59 de São Paulo). O dia é o de 30 minutos atrás: se o job atrasar
 * e rodar 00:0x, ainda encerra o dia certo. Cada obra à parte: uma falha não desfaz as outras.
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
  for v_obra in
    select o.id from public.obra o
     where not exists (select 1 from public.fechamento_dia f where f.obra_id = o.id and f.data = v_data)
  loop
    begin
      perform privado.encerrar_dia(v_obra, null, true, v_data);
      v_n := v_n + 1;
    exception when others then
      raise warning 'encerramento automático falhou na obra %: %', v_obra, sqlerrm;
    end;
  end loop;
  return v_n;
end;
$$;

-- Envios de desconto com a lista exata e o motivo ------------------------------------------------

/**
 * Um envio por empresa e movimento; cada desconto afetado entra na lista (`dados.descontos`).
 * Se o envio ainda não saiu, só acrescenta; se já saiu, volta para a fila com a lista nova.
 */
create function privado.enfileirar_desconto(
  p_obra uuid, p_empresa uuid, p_tipo public.tipo_envio, p_referencia uuid, p_desconto uuid,
  p_motivo text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.envio (obra_id, tipo, canal, destino, referencia, dados)
  select p_obra, p_tipo, x.canal, x.destino, p_referencia,
         jsonb_build_object('empresa', p_empresa, 'motivo', p_motivo, 'descontos', jsonb_build_array(p_desconto))
    from (
      select 'email'::public.canal_envio as canal, lower(y.email) as destino
        from public.empresa e, lateral (values (e.dono_email), (e.encarregado_email)) as y (email)
       where e.id = p_empresa and y.email is not null
      union
      select 'push'::public.canal_envio, uo.usuario_id::text
        from public.usuario_obra uo
       where uo.obra_id = p_obra and uo.perfil = 'consulta' and uo.empresa_id = p_empresa
    ) x
  on conflict (tipo, canal, destino, referencia) do update
     set dados = jsonb_set(public.envio.dados, '{descontos}',
                   coalesce(public.envio.dados -> 'descontos', '[]'::jsonb) || to_jsonb(p_desconto)),
         status = 'pendente', tentativas = 0, proxima_tentativa_em = now(), pego_em = null
   where not (coalesce(public.envio.dados -> 'descontos', '[]'::jsonb) @> to_jsonb(p_desconto));
end;
$$;

/** Último movimento da peça (o que está acontecendo agora: devolução ou estorno). */
create function privado.ultimo_movimento_da_unidade(p_unidade uuid) returns public.movimento
language sql stable
security definer
set search_path = ''
as $$
  select m.* from public.movimento_item mi join public.movimento m on m.id = mi.movimento_id
   where mi.unidade_id = p_unidade order by m.ordem desc limit 1
$$;

create or replace function privado.posse_encerrada() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_desconto public.desconto;
  v_mov public.movimento := privado.ultimo_movimento_da_unidade(old.unidade_id);
begin
  -- Estorno de retirada já descontada na medição: recusado (decisão da revisão do M9).
  if v_mov.tipo = 'estorno' and exists (
    select 1 from public.desconto d
     where d.unidade_id = old.unidade_id and d.movimento_retirada_id = old.movimento_retirada_id
       and d.status = 'confirmado') then
    raise exception 'Esta retirada já foi descontada na medição da empreiteira e não pode ser estornada.'
      using errcode = 'AL009';
  end if;

  update public.desconto
     set status = 'cancelado', cancelado_em = now()
   where unidade_id = old.unidade_id and movimento_retirada_id = old.movimento_retirada_id
     and status = 'aberto'
  returning * into v_desconto;
  if v_desconto.id is null then
    return old;
  end if;

  -- Trava os avisos da peça: duas devoluções juntas não deixam aviso "a descontar" com zero.
  perform 1 from public.aviso a
   where a.id in (select ad.aviso_id from public.aviso_desconto ad where ad.desconto_id = v_desconto.id)
   order by a.id for update;
  update public.aviso a
     set status = 'cancelado', atualizado_em = now()
   where a.status = 'enviado'
     and exists (select 1 from public.aviso_desconto ad where ad.aviso_id = a.id and ad.desconto_id = v_desconto.id)
     and not exists (
       select 1 from public.aviso_desconto ad join public.desconto d on d.id = ad.desconto_id
        where ad.aviso_id = a.id and d.status = 'aberto');

  perform privado.enfileirar_desconto(old.obra_id, v_desconto.empresa_id, 'desconto_cancelado',
    coalesce(v_mov.id, v_desconto.id), v_desconto.id,
    case when v_mov.tipo = 'estorno' then 'corrigido' else 'devolucao' end);
  return old;
end;
$$;

create or replace function privado.posse_reaberta() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_desconto public.desconto;
  v_mov public.movimento := privado.ultimo_movimento_da_unidade(new.unidade_id);
begin
  update public.desconto
     set status = 'aberto', cancelado_em = null
   where unidade_id = new.unidade_id and movimento_retirada_id = new.movimento_retirada_id
     and status = 'cancelado'
  returning * into v_desconto;
  if v_desconto.id is null then
    return new;
  end if;
  -- O aviso volta a valer e a empreiteira é avisada da correção.
  update public.aviso a set status = 'enviado', atualizado_em = now()
   where a.status = 'cancelado'
     and exists (select 1 from public.aviso_desconto ad where ad.aviso_id = a.id and ad.desconto_id = v_desconto.id);
  perform privado.enfileirar_desconto(new.obra_id, v_desconto.empresa_id, 'desconto_reaberto',
    coalesce(v_mov.id, v_desconto.id), v_desconto.id, 'corrigido');
  return new;
end;
$$;

-- Troca de empresa com desconto em aberto: recusada -----------------------------------------------
create function privado.recusar_troca(p_total integer) returns void
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(p_total, 0) > 0 then
    raise exception 'Há R$ % em aberto para a medição. Feche a medição ou espere a devolução antes de trocar.',
      to_char(p_total / 100.0, 'FM999G999G990D00')
      using errcode = 'AL010';
  end if;
end;
$$;

create function privado.impedir_troca_pessoa() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.empresa_id is distinct from old.empresa_id then
    perform privado.recusar_troca(
      (select sum(valor)::integer from public.desconto where pessoa_id = old.id and status = 'aberto'));
  end if;
  return new;
end;
$$;

create function privado.impedir_troca_empresa() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipo is distinct from old.tipo then
    perform privado.recusar_troca(
      (select sum(valor)::integer from public.desconto where empresa_id = old.id and status = 'aberto'));
  end if;
  return new;
end;
$$;

create trigger impedir_troca_empresa_pessoa before update of empresa_id on public.pessoa
  for each row execute function privado.impedir_troca_pessoa();
create trigger impedir_troca_tipo_empresa before update of tipo on public.empresa
  for each row execute function privado.impedir_troca_empresa();

-- Medição atômica ---------------------------------------------------------------------------------
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

-- Fila: espera entre tentativas e "sem destino" ---------------------------------------------------
create or replace function public.pegar_envios(p_limite integer default 50)
returns setof public.envio
language sql
security definer
set search_path = ''
as $$
  update public.envio e
     set pego_em = now(), tentativas = e.tentativas + 1
   where e.id in (
     select id from public.envio
      where status in ('pendente', 'erro') and tentativas < 5 and proxima_tentativa_em <= now()
        and (pego_em is null or pego_em < now() - interval '5 minutes')
      order by criado_em
      limit least(greatest(p_limite, 1), 200)
      for update skip locked)
  returning e.*;
$$;

drop function public.concluir_envio(uuid, boolean, text);
/**
 * Fecha o envio: enviado; sem destino (notificação para quem não ativou); ou erro, com nova
 * tentativa em 1, 4, 16 e 64 minutos.
 */
create function public.concluir_envio(
  p_envio uuid, p_ok boolean, p_erro text default null, p_sem_destino boolean default false
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.envio
     set status = case
                    when p_ok and p_sem_destino then 'sem_destino'::public.status_envio
                    when p_ok then 'enviado'::public.status_envio
                    else 'erro'::public.status_envio end,
         enviado_em = case when p_ok then now() else null end,
         erro = case when p_ok then null else left(coalesce(p_erro, 'falha no envio'), 300) end,
         proxima_tentativa_em = case when p_ok then proxima_tentativa_em
                                     else now() + make_interval(mins => power(4, greatest(tentativas - 1, 0))::integer) end,
         pego_em = null
   where id = p_envio;
end;
$$;

-- Dados do envio: descontos exatos e motivo -------------------------------------------------------
create or replace function public.dados_envio(p_envio uuid) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v public.envio;
  v_base jsonb;
  v_empresa uuid;
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
    v_base := v_base || jsonb_build_object('inscricoes', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', i.endpoint, 'p256dh', i.p256dh, 'auth', i.auth))
        from public.inscricao_push i where i.usuario_id::text = v.destino), '[]'::jsonb));
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

-- Resumo do fechamento: almoxarife só o de hoje ---------------------------------------------------
create or replace function public.resumo_fechamento(p_fechamento uuid) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v public.fechamento_dia;
begin
  select * into v from public.fechamento_dia where id = p_fechamento;
  if v.id is null or not privado.pode_lancar(v.obra_id)
     or (not privado.eh_engenheiro(v.obra_id) and v.data <> privado.hoje_na_obra()) then
    return null;
  end if;
  return jsonb_build_object(
    'id', v.id,
    'data', v.data,
    'hoje', v.data = privado.hoje_na_obra(),
    'encerradoEm', v.encerrado_em,
    'automatico', v.automatico,
    'obra', (select nome from public.obra where id = v.obra_id),
    'avisos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'empresa', e.nome, 'dono', e.dono_nome, 'donoEmail', e.dono_email,
               'encarregado', (select p.nome from public.pessoa p where p.id = e.encarregado_pessoa_id),
               'encarregadoEmail', e.encarregado_email, 'total', a.total, 'status', a.status,
               'itens', a.itens)
             order by e.nome)
        from public.aviso a join public.empresa e on e.id = a.empresa_id
       where a.fechamento_id = v.id), '[]'::jsonb),
    'proprios', coalesce((
      select jsonb_agg(jsonb_build_object('nome', x.nome, 'valor', x.valor) order by x.nome)
        from (select pe.nome, sum(t.valor_reposicao)::integer as valor
                from public.posse po
                join public.pessoa pe on pe.id = po.pessoa_id
                join public.empresa e on e.id = pe.empresa_id
                join public.unidade u on u.id = po.unidade_id
                join public.tipo_ferramenta t on t.id = u.tipo_id
               where po.obra_id = v.obra_id and e.tipo = 'propria'
               group by pe.id, pe.nome) x), '[]'::jsonb),
    'pessoasPendentes', (select count(distinct po.pessoa_id) from public.posse po where po.obra_id = v.obra_id)
  );
end;
$$;

-- Permissões ---------------------------------------------------------------------------------------
revoke all on function public.concluir_envio(uuid, boolean, text, boolean) from public, anon, authenticated;
grant execute on function public.concluir_envio(uuid, boolean, text, boolean) to service_role;
revoke execute on function privado.encerrar_dia(uuid, uuid, boolean, date),
  privado.enfileirar_desconto(uuid, uuid, public.tipo_envio, uuid, uuid, text),
  privado.ultimo_movimento_da_unidade(uuid), privado.impedir_troca_pessoa(),
  privado.impedir_troca_empresa(), privado.recusar_troca(integer)
  from public, anon, authenticated;

-- Envios com problema, para o engenheiro ver (falharam 5 vezes ou ninguém ativou notificação).
create function public.envios_com_problema(p_obra uuid) returns jsonb
language sql stable
security definer
set search_path = ''
as $$
  select case when privado.eh_engenheiro(p_obra) then jsonb_build_object(
    'erro', (select count(*) from public.envio where obra_id = p_obra and status = 'erro' and tentativas >= 5),
    'semDestino', (select count(*) from public.envio where obra_id = p_obra and status = 'sem_destino'
                     and criado_em > now() - interval '7 days'))
  end
$$;
revoke all on function public.envios_com_problema(uuid) from public, anon, authenticated;
grant execute on function public.envios_com_problema(uuid) to authenticated;
