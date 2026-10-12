-- M11 · Métricas do piloto (PRD §3).
-- A retirada com QR guarda a conferência usada (identificacao_id): o tempo "QR lido → retirada
-- registrada" sai exato (vale daqui para frente). metricas_piloto (só o engenheiro) devolve as
-- métricas por semana da obra.

-- Sem chave estrangeira: a retenção apaga conferências antigas e o movimento é imutável (não
-- pode ser atualizado para nulo). Conferência apagada = retirada sem medida de tempo.
alter table public.movimento add column identificacao_id uuid;
comment on column public.movimento.identificacao_id is
  'Conferência do capacete usada na retirada com QR (métrica de tempo do piloto).';

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
    criado_em, recebido_em, identificacao_id)
  values (p_obra, 'retirada', p_pessoa, (select auth.uid()), v_via, true, p_chave,
    v_quando, case when p_quando is not null then now() end, p_identificacao)
  returning id into v_movimento;

  insert into public.movimento_item (movimento_id, obra_id, unidade_id)
    select v_movimento, p_obra, unnest(v_todas);
  update public.unidade set status = 'em_uso' where id = any (v_todas);
  insert into public.posse (unidade_id, obra_id, pessoa_id, via, movimento_retirada_id, desde)
    select unnest(v_todas), p_obra, p_pessoa, v_via, v_movimento, v_quando;

  return v_movimento;
end;
$$;

/**
 * Métricas do piloto por semana (segunda a domingo, dia da obra), de p_de a p_ate:
 * - retiradas, retiradas sem QR e o % sem QR (meta < 10%);
 * - tempo do QR lido até a retirada registrada: mediana e média em segundos, e % até 15 s;
 * - peças de empreiteira que viraram pendência (descontos criados) e quantas tiveram aviso;
 * - movimentos com pessoa, almoxarife, hora e via (rastreabilidade, meta 100%).
 */
create function public.metricas_piloto(p_obra uuid, p_de date, p_ate date) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_de timestamptz := (p_de::timestamp at time zone 'America/Sao_Paulo');
  v_ate timestamptz := ((p_ate + 1)::timestamp at time zone 'America/Sao_Paulo');
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro vê as métricas.' using errcode = '42501';
  end if;
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > 366 then
    raise exception 'Escolha um período de até um ano.' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'semana', s.semana,
             'retiradas', coalesce(r.retiradas, 0),
             'semQr', coalesce(r.sem_qr, 0),
             'tempoMedianaS', r.mediana,
             'tempoMedioS', r.media,
             'tempoAte15s', r.ate15,
             'tempoMedidas', coalesce(r.medidas, 0),
             'pendencias', coalesce(d.pendencias, 0),
             'pendenciasComAviso', coalesce(d.com_aviso, 0),
             'movimentos', coalesce(m.total, 0),
             'movimentosCompletos', coalesce(m.completos, 0))
           order by s.semana)
      from (
        select distinct date_trunc('week', g)::date as semana
          from generate_series(p_de::timestamp, p_ate::timestamp, interval '1 day') g
      ) s
      left join (
        select date_trunc('week', mv.criado_em at time zone 'America/Sao_Paulo')::date as semana,
               count(*) as retiradas,
               count(*) filter (where mv.via = 'manual') as sem_qr,
               count(i.id) as medidas,
               round((percentile_cont(0.5) within group (
                 order by extract(epoch from coalesce(mv.recebido_em, mv.criado_em) - i.criado_em)))::numeric, 1)
                 as mediana,
               round(avg(extract(epoch from coalesce(mv.recebido_em, mv.criado_em) - i.criado_em))::numeric, 1)
                 as media,
               count(*) filter (where extract(epoch from coalesce(mv.recebido_em, mv.criado_em) - i.criado_em) <= 15)
                 as ate15
          from public.movimento mv
          left join public.identificacao i on i.id = mv.identificacao_id
         where mv.obra_id = p_obra and mv.tipo = 'retirada'
           and mv.criado_em >= v_de and mv.criado_em < v_ate
         group by 1
      ) r on r.semana = s.semana
      left join (
        select date_trunc('week', de.criado_em at time zone 'America/Sao_Paulo')::date as semana,
               count(*) as pendencias,
               count(*) filter (where de.primeiro_aviso_id is not null) as com_aviso
          from public.desconto de
         where de.obra_id = p_obra and de.criado_em >= v_de and de.criado_em < v_ate
         group by 1
      ) d on d.semana = s.semana
      left join (
        select date_trunc('week', mv.criado_em at time zone 'America/Sao_Paulo')::date as semana,
               count(*) as total,
               count(*) filter (where mv.pessoa_id is not null and mv.usuario_id is not null
                                  and mv.via is not null and mv.criado_em is not null) as completos
          from public.movimento mv
         where mv.obra_id = p_obra and mv.tipo in ('retirada', 'devolucao')
           and mv.criado_em >= v_de and mv.criado_em < v_ate
         group by 1
      ) m on m.semana = s.semana
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.metricas_piloto(uuid, date, date) from public, anon;
grant execute on function public.metricas_piloto(uuid, date, date) to authenticated;
