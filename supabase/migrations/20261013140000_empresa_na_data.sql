-- Plano de correção · bloco 2, ponto 7 (complemento): o histórico fica com a empresa da época.
-- Quem via um lançamento era decidido pela empresa ATUAL da pessoa: ao trocar de empresa, a
-- empreiteira antiga perdia o histórico do tempo em que a pessoa era dela, e a nova passava a
-- vê-lo. Os movimentos são imutáveis, então a empresa de cada data vem dos períodos da pessoa
-- em cada empresa, montados do registro de alterações (`alteracao`, gravado desde o cadastro):
-- sem gravar nada novo em `movimento` e sem supor a empresa de lançamentos antigos.

-- Períodos de cada pessoa em cada empresa, montados do registro de alterações (cadastro e
-- trocas) e mantidos por gatilho. Tabela com índice: a regra de leitura por linha fica barata.
create table privado.pessoa_empresa_periodo (
  pessoa_id uuid not null references public.pessoa (id) on delete cascade,
  empresa_id uuid not null,
  de timestamptz not null,
  ate timestamptz,
  primary key (pessoa_id, de)
);
create index pessoa_empresa_periodo_busca on privado.pessoa_empresa_periodo (pessoa_id, empresa_id, de);
alter table privado.pessoa_empresa_periodo enable row level security;
revoke all on privado.pessoa_empresa_periodo from public, anon, authenticated;

-- Histórico existente: cada registro de empresa abre um período, que vai até o seguinte. O
-- primeiro começa em -infinity (lançamento com hora do celular antes do cadastro). Sem registro,
-- um período só, com a empresa atual.
insert into privado.pessoa_empresa_periodo (pessoa_id, empresa_id, de, ate)
select registro_id, para::uuid,
       case when row_number() over w = 1 then '-infinity'::timestamptz else criado_em end,
       lead(criado_em) over w
  from public.alteracao
 where tabela = 'pessoa' and campo = 'empresa_id' and para is not null
   and registro_id in (select id from public.pessoa)
window w as (partition by registro_id order by criado_em, id)
on conflict do nothing;
insert into privado.pessoa_empresa_periodo (pessoa_id, empresa_id, de, ate)
select pe.id, pe.empresa_id, '-infinity', null
  from public.pessoa pe
 where not exists (select 1 from privado.pessoa_empresa_periodo pp where pp.pessoa_id = pe.id);

create function privado.registrar_periodo_empresa() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into privado.pessoa_empresa_periodo (pessoa_id, empresa_id, de, ate)
    values (new.id, new.empresa_id, '-infinity', null);
  elsif new.empresa_id is distinct from old.empresa_id then
    update privado.pessoa_empresa_periodo set ate = now()
     where pessoa_id = new.id and ate is null;
    insert into privado.pessoa_empresa_periodo (pessoa_id, empresa_id, de, ate)
    values (new.id, new.empresa_id, now(), null)
    on conflict (pessoa_id, de) do update set empresa_id = excluded.empresa_id, ate = null;
  end if;
  return null;
end;
$$;
revoke all on function privado.registrar_periodo_empresa() from public, anon, authenticated;
create trigger pessoa_periodo_empresa
  after insert or update of empresa_id on public.pessoa
  for each row execute function privado.registrar_periodo_empresa();

-- Empresa da pessoa num momento (o período que contém a data; sem período, a atual).
create function privado.empresa_na_data(p_pessoa uuid, p_quando timestamptz) returns uuid
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select pp.empresa_id from privado.pessoa_empresa_periodo pp
      where pp.pessoa_id = p_pessoa and pp.de <= p_quando and (pp.ate is null or p_quando < pp.ate)
      order by pp.de desc limit 1),
    (select pe.empresa_id from public.pessoa pe where pe.id = p_pessoa))
$$;

-- O lançamento é visível: acesso à obra e, para consulta restrita, a pessoa era da empresa dela
-- na data. Quem não é restrito não paga a busca do período.
create function privado.ve_lancamento(p_obra uuid, p_pessoa uuid, p_quando timestamptz) returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_restrita uuid;
begin
  if not privado.tem_acesso(p_obra) then
    return false;
  end if;
  v_restrita := privado.empresa_restrita(p_obra);
  if v_restrita is null then
    return true;
  end if;
  return exists (
    select 1 from privado.pessoa_empresa_periodo pp
     where pp.pessoa_id = p_pessoa and pp.empresa_id = v_restrita
       and pp.de <= p_quando and (pp.ate is null or p_quando < pp.ate));
end;
$$;

revoke all on function privado.empresa_na_data(uuid, timestamptz) from public, anon;
revoke all on function privado.ve_lancamento(uuid, uuid, timestamptz) from public, anon;
grant execute on function privado.empresa_na_data(uuid, timestamptz) to authenticated;
grant execute on function privado.ve_lancamento(uuid, uuid, timestamptz) to authenticated;

drop policy movimento_ler on public.movimento;
create policy movimento_ler on public.movimento for select to authenticated
  using (privado.ve_lancamento(obra_id, pessoa_id, criado_em));

drop policy movimento_item_ler on public.movimento_item;
create policy movimento_item_ler on public.movimento_item for select to authenticated
  using (exists (select 1 from public.movimento m
                  where m.id = movimento_item.movimento_id
                    and privado.ve_lancamento(m.obra_id, m.pessoa_id, m.criado_em)));

drop policy avaria_ler on public.avaria;
create policy avaria_ler on public.avaria for select to authenticated
  using (exists (select 1 from public.movimento m
                  where m.id = avaria.movimento_id
                    and privado.ve_lancamento(m.obra_id, m.pessoa_id, m.criado_em)));

drop policy ocorrencia_ler on public.ocorrencia;
create policy ocorrencia_ler on public.ocorrencia for select to authenticated
  using (privado.ve_lancamento(obra_id, pessoa_id, criado_em));

-- Histórico do engenheiro: coluna e filtro de empresa pela empresa da época.
create or replace function public.historico(p_obra uuid, p_de date, p_ate date, p_pessoa uuid DEFAULT NULL::uuid, p_empresa uuid DEFAULT NULL::uuid, p_tipo uuid DEFAULT NULL::uuid, p_via via_movimento DEFAULT NULL::via_movimento, p_categoria text DEFAULT NULL::text)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  v_de timestamptz := (p_de::timestamp at time zone 'America/Sao_Paulo');
  v_ate timestamptz := ((p_ate + 1)::timestamp at time zone 'America/Sao_Paulo');
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro vê o histórico.' using errcode = '42501';
  end if;
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > 366 then
    raise exception 'Escolha um período de até um ano.' using errcode = '22023';
  end if;
  if p_categoria is not null and p_categoria not in ('retirada', 'devolucao', 'estorno', 'ocorrencia') then
    raise exception 'Tipo de lançamento inválido.' using errcode = '22023';
  end if;

  return coalesce((
    select jsonb_agg(l order by l ->> 'quando' desc)
      from (
        select x.l from (
          select jsonb_build_object(
                   'id', m.id, 'tipo', m.tipo, 'quando', m.criado_em, 'recebidoEm', m.recebido_em,
                   'pessoa', pe.nome, 'empresa', e.nome, 'via', m.via, 'usuario', us.nome,
                   'obs', m.obs, 'estornoDe', m.estorno_de,
                   'itens', coalesce((
                     select jsonb_agg(jsonb_build_object('tipo', t.nome, 'codigo', u.codigo,
                              'avariada', mi.avariada) order by t.nome, length(u.codigo), u.codigo)
                       from public.movimento_item mi
                       join public.unidade u on u.id = mi.unidade_id
                       join public.tipo_ferramenta t on t.id = u.tipo_id
                      where mi.movimento_id = m.id), '[]'::jsonb)) as l,
                 m.criado_em
            from public.movimento m
            join public.pessoa pe on pe.id = m.pessoa_id
            join public.empresa e on e.id = privado.empresa_na_data(m.pessoa_id, m.criado_em)
            join public.usuario us on us.id = m.usuario_id
           where m.obra_id = p_obra and m.criado_em >= v_de and m.criado_em < v_ate
             and (p_pessoa is null or m.pessoa_id = p_pessoa)
             and (p_empresa is null or e.id = p_empresa)
             and (p_via is null or m.via = p_via)
             and (p_categoria is null or m.tipo::text = p_categoria)
             and (p_tipo is null or exists (
                   select 1 from public.movimento_item mi join public.unidade u on u.id = mi.unidade_id
                    where mi.movimento_id = m.id and u.tipo_id = p_tipo))
          union all
          select jsonb_build_object(
                   'id', o.id, 'tipo', 'ocorrencia', 'quando', o.criado_em, 'recebidoEm', null,
                   'pessoa', pe.nome, 'empresa', e.nome, 'via', null, 'usuario', us.nome,
                   'obs', null, 'estornoDe', null, 'itens', '[]'::jsonb),
                 o.criado_em
            from public.ocorrencia o
            join public.pessoa pe on pe.id = o.pessoa_id
            join public.empresa e on e.id = privado.empresa_na_data(o.pessoa_id, o.criado_em)
            join public.usuario us on us.id = o.usuario_id
           where o.obra_id = p_obra and o.criado_em >= v_de and o.criado_em < v_ate
             and p_tipo is null and p_via is null
             and (p_categoria is null or p_categoria = 'ocorrencia')
             and (p_pessoa is null or o.pessoa_id = p_pessoa)
             and (p_empresa is null or e.id = p_empresa)
        ) x
        order by x.criado_em desc
        limit 2000
      ) y(l)
  ), '[]'::jsonb);
end;
$$;
