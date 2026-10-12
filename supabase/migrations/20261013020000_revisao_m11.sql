-- M11 (revisão).
-- 1. Tempo "QR lido → retirada registrada" a partir da leitura do QR: o celular manda quantos
--    segundos se passaram entre ler o QR e tocar em "Sim, é o …" (cronômetro do próprio
--    celular, sem depender do relógio dele; até 10 min) e a conferência guarda lido_em.
-- 2. metricas_piloto devolve também o total do período (mediana e média de verdade, no SQL).
-- 3. Importação: empresa pelo nome exato (como a planilha validou), dados com forma errada
--    recusados e limites menores (1000 pessoas, 150 ferramentas: cabe no tempo da requisição).

alter table public.identificacao add column lido_em timestamptz;

drop function public.conferir_pessoa(uuid, text);
create function public.conferir_pessoa(
  p_obra uuid, p_token text, p_segundos_leitura numeric default null
) returns table (identificacao uuid, pessoa_id uuid)
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
  if v.id is null or not v.ativa then
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
revoke all on function public.conferir_pessoa(uuid, text, numeric) from public, anon;
grant execute on function public.conferir_pessoa(uuid, text, numeric) to authenticated;

create or replace function public.metricas_piloto(p_obra uuid, p_de date, p_ate date) returns jsonb
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
  return jsonb_build_object('semanas', coalesce((
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
                 order by extract(epoch from coalesce(mv.recebido_em, mv.criado_em) - coalesce(i.lido_em, i.criado_em))))::numeric, 1)
                 as mediana,
               round(avg(extract(epoch from coalesce(mv.recebido_em, mv.criado_em) - coalesce(i.lido_em, i.criado_em)))::numeric, 1)
                 as media,
               count(*) filter (where extract(epoch from coalesce(mv.recebido_em, mv.criado_em) - coalesce(i.lido_em, i.criado_em)) <= 15)
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
  ), '[]'::jsonb),
  'total', (
    select jsonb_build_object(
             'tempoMedidas', count(*),
             'tempoMedianaS', round((percentile_cont(0.5) within group (order by x.s))::numeric, 1),
             'tempoMedioS', round(avg(x.s)::numeric, 1),
             'tempoAte15s', count(*) filter (where x.s <= 15))
      from (
        select extract(epoch from coalesce(mv.recebido_em, mv.criado_em) - coalesce(i.lido_em, i.criado_em)) as s
          from public.movimento mv
          join public.identificacao i on i.id = mv.identificacao_id
         where mv.obra_id = p_obra and mv.tipo = 'retirada'
           and mv.criado_em >= v_de and mv.criado_em < v_ate
      ) x));
end;
$$;

create or replace function public.importar_cadastro(p_obra uuid, p_dados jsonb) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_empresa uuid;
  v_tipo uuid;
  v_pessoas uuid[] := '{}';
  v_pessoa uuid;
  v_empresas integer := 0;
  v_ferramentas integer := 0;
  v_unidades integer := 0;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro importa o cadastro.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_dados) is distinct from 'object' then
    raise exception 'Planilha inválida.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_dados -> 'pessoas', '[]')) <> 'array'
     or jsonb_typeof(coalesce(p_dados -> 'empresas', '[]')) <> 'array'
     or jsonb_typeof(coalesce(p_dados -> 'ferramentas', '[]')) <> 'array' then
    raise exception 'Planilha inválida.' using errcode = '22023';
  end if;
  if coalesce(jsonb_array_length(p_dados -> 'pessoas'), 0) > 1000
     or coalesce(jsonb_array_length(p_dados -> 'empresas'), 0) > 200
     or coalesce(jsonb_array_length(p_dados -> 'ferramentas'), 0) > 150 then
    raise exception 'Planilha grande demais: importe em partes.' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_dados -> 'empresas', '[]')) loop
    insert into public.empresa (obra_id, nome, tipo, cor, dono_nome, dono_email, encarregado_email)
    values (p_obra, v_item ->> 'nome', (v_item ->> 'tipo')::public.tipo_empresa,
            coalesce(v_item ->> 'cor', '#6B7280'), v_item ->> 'donoNome', v_item ->> 'donoEmail',
            v_item ->> 'encarregadoEmail');
    v_empresas := v_empresas + 1;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_dados -> 'pessoas', '[]')) loop
    select e.id into v_empresa from public.empresa e
     where e.obra_id = p_obra and e.nome = v_item ->> 'empresa';
    if v_empresa is null then
      raise exception 'Empresa "%" não encontrada.', v_item ->> 'empresa' using errcode = 'P0002';
    end if;
    insert into public.pessoa (obra_id, empresa_id, nome, nome_capacete, funcao)
    values (p_obra, v_empresa, v_item ->> 'nome', v_item ->> 'nomeCapacete', v_item ->> 'funcao')
    returning id into v_pessoa;
    v_pessoas := v_pessoas || v_pessoa;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_dados -> 'ferramentas', '[]')) loop
    insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao, alto_valor)
    values (p_obra, v_item ->> 'nome', v_item ->> 'icone', v_item ->> 'prefixo',
            (v_item ->> 'valor')::integer, coalesce((v_item ->> 'altoValor')::boolean, false))
    returning id into v_tipo;
    perform public.adicionar_unidades(v_tipo, (v_item ->> 'quantidade')::integer);
    v_ferramentas := v_ferramentas + 1;
    v_unidades := v_unidades + (v_item ->> 'quantidade')::integer;
  end loop;

  return jsonb_build_object('empresas', v_empresas, 'pessoas', to_jsonb(v_pessoas),
    'ferramentas', v_ferramentas, 'unidades', v_unidades);
end;
$$;
