-- M9 · Fechamento do dia e avisos às empreiteiras (RN-12 a RN-16).
--
-- Desenho:
-- - Cada peça de empreiteira que não voltou vira um `desconto`, criado uma vez só (no primeiro
--   encerramento em que está fora), com o valor vigente nesse momento (RN-16).
-- - O encerramento do dia (manual ou às 23:59) não dá baixa em nada (RN-12): gera um `aviso`
--   por empreiteira com os descontos ainda em aberto. Peça que continua fora gera lembrete no
--   aviso do dia seguinte, com o mesmo valor (não acumula: a medição conta descontos).
-- - Devolveu antes da medição: o desconto é cancelado peça a peça (RN-14), o aviso fica com o
--   total novo e vai um e-mail de atualização. Estorno da devolução reabre o desconto.
-- - Funcionário próprio não gera desconto (RN-15): resumo para o engenheiro.
-- - O engenheiro fecha a medição da empresa: descontos em aberto viram confirmados.
-- - E-mails e notificações saem por uma fila (`envio`), processada pelo app com nova tentativa.

create type public.status_desconto as enum ('aberto', 'cancelado', 'confirmado');
create type public.tipo_envio as enum (
  'aviso',              -- aviso do dia para a empreiteira (e-mail + notificação)
  'desconto_cancelado', -- peças devolvidas antes da medição (e-mail + notificação)
  'resumo_proprios',    -- pendências de funcionários próprios (notificação ao engenheiro)
  'ocorrencia'          -- "Não é ele" (notificação ao encarregado)
);
create type public.canal_envio as enum ('email', 'push');
create type public.status_envio as enum ('pendente', 'enviado', 'erro');

create table public.medicao (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  empresa_id uuid not null,
  fechada_em timestamptz not null default now(),
  fechada_por uuid not null references public.usuario (id),
  total integer not null check (total >= 0),
  proxima date,
  unique (id, obra_id),
  foreign key (empresa_id, obra_id) references public.empresa (id, obra_id)
);

create table public.desconto (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  empresa_id uuid not null,
  pessoa_id uuid not null,
  unidade_id uuid not null,
  movimento_retirada_id uuid not null,
  tipo_nome text not null,
  codigo text not null,
  valor integer not null check (valor > 0), -- centavos, valor vigente no 1º encerramento
  status public.status_desconto not null default 'aberto',
  criado_em timestamptz not null default now(),
  cancelado_em timestamptz,
  medicao_id uuid,
  unique (movimento_retirada_id, unidade_id),
  unique (id, obra_id),
  foreign key (empresa_id, obra_id) references public.empresa (id, obra_id),
  foreign key (pessoa_id, obra_id) references public.pessoa (id, obra_id),
  foreign key (unidade_id, obra_id) references public.unidade (id, obra_id),
  foreign key (medicao_id, obra_id) references public.medicao (id, obra_id)
);
create index desconto_aberto on public.desconto (obra_id, empresa_id) where status = 'aberto';

alter table public.aviso add unique (id, obra_id);

create table public.aviso_desconto (
  aviso_id uuid not null,
  desconto_id uuid not null,
  obra_id uuid not null,
  primary key (aviso_id, desconto_id),
  foreign key (aviso_id, obra_id) references public.aviso (id, obra_id),
  foreign key (desconto_id, obra_id) references public.desconto (id, obra_id)
);
create index aviso_desconto_desconto on public.aviso_desconto (desconto_id);

-- Fila de envios. Fechada ao cliente: só o processador do app (chave secreta) lê e marca.
create table public.envio (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  tipo public.tipo_envio not null,
  canal public.canal_envio not null,
  -- e-mail: endereço; push: id do usuário (as inscrições dele recebem)
  destino text not null,
  referencia uuid not null, -- aviso, ocorrência, fechamento ou movimento (devolução)
  dados jsonb not null default '{}'::jsonb,
  status public.status_envio not null default 'pendente',
  tentativas integer not null default 0,
  erro text,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  unique (tipo, canal, destino, referencia)
);
create index envio_pendente on public.envio (criado_em) where status <> 'enviado';

-- Inscrições de notificação (Web Push) de cada login, por aparelho.
create table public.inscricao_push (
  endpoint text primary key check (endpoint ~ '^https://'),
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
create index inscricao_push_usuario on public.inscricao_push (usuario_id);

-- RLS e privilégios ---------------------------------------------------------------------------
alter table public.medicao enable row level security;
alter table public.desconto enable row level security;
alter table public.aviso_desconto enable row level security;
alter table public.envio enable row level security;
alter table public.inscricao_push enable row level security;

revoke all on public.medicao, public.desconto, public.aviso_desconto, public.envio,
  public.inscricao_push from public, anon, authenticated;

-- Desconto e medição: engenheiro e a própria empreiteira (como o aviso).
create policy desconto_ler on public.desconto for select to authenticated
  using (
    privado.eh_engenheiro(obra_id)
    or (privado.empresa_restrita(obra_id) is not null and empresa_id = privado.empresa_restrita(obra_id))
  );
create policy medicao_ler on public.medicao for select to authenticated
  using (
    privado.eh_engenheiro(obra_id)
    or (privado.empresa_restrita(obra_id) is not null and empresa_id = privado.empresa_restrita(obra_id))
  );
create policy aviso_desconto_ler on public.aviso_desconto for select to authenticated
  using (exists (select 1 from public.aviso a where a.id = aviso_id));
grant select on public.medicao, public.desconto, public.aviso_desconto to authenticated;

-- Inscrição: cada um vê e mexe só nas próprias.
create policy inscricao_push_propria on public.inscricao_push for all to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
grant select, insert, update, delete on public.inscricao_push to authenticated;

-- Encerrar o dia ------------------------------------------------------------------------------

/** Dia da obra (fuso de São Paulo). */
create function privado.hoje_na_obra() returns date
language sql stable
set search_path = ''
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

/**
 * Encerra o dia da obra: relatório e avisos, sem baixa (RN-12). Uma vez por data. Devolve o
 * fechamento (o já existente, se alguém encerrou antes).
 */
create function privado.encerrar_dia(p_obra uuid, p_usuario uuid, p_automatico boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fechamento uuid;
  v_empresa record;
  v_aviso uuid;
  v_itens jsonb;
  v_total integer;
  v_proprios integer;
begin
  insert into public.fechamento_dia (obra_id, data, encerrado_por, automatico)
  values (p_obra, privado.hoje_na_obra(), case when p_automatico then null else p_usuario end, p_automatico)
  on conflict (obra_id, data) do nothing
  returning id into v_fechamento;
  if v_fechamento is null then
    return (select id from public.fechamento_dia where obra_id = p_obra and data = privado.hoje_na_obra());
  end if;

  -- Descontos novos: peças de empreiteira fora agora e ainda sem desconto (valor vigente).
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

  -- Um aviso por empreiteira com descontos em aberto de peças ainda fora (lembrete incluso).
  for v_empresa in
    select distinct d.empresa_id
      from public.desconto d
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

    perform privado.enfileirar_para_empresa(p_obra, v_empresa.empresa_id, 'aviso', v_aviso);
  end loop;

  -- Funcionários próprios: só resumo ao engenheiro (RN-15).
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

/**
 * Envios para a empreiteira: e-mail ao dono e ao encarregado (cadastro da empresa) e notificação
 * para os logins de consulta da empresa.
 */
create function privado.enfileirar_para_empresa(
  p_obra uuid, p_empresa uuid, p_tipo public.tipo_envio, p_referencia uuid, p_dados jsonb default '{}'
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.envio (obra_id, tipo, canal, destino, referencia, dados)
  select p_obra, p_tipo, 'email'::public.canal_envio, lower(x.email), p_referencia, p_dados
    from public.empresa e,
         lateral (values (e.dono_email), (e.encarregado_email)) as x (email)
   where e.id = p_empresa and x.email is not null
  union
  select p_obra, p_tipo, 'push'::public.canal_envio, uo.usuario_id::text, p_referencia, p_dados
    from public.usuario_obra uo
   where uo.obra_id = p_obra and uo.perfil = 'consulta' and uo.empresa_id = p_empresa
  on conflict do nothing;
$$;

/** "Encerrar o dia" pela tela de fechamento: quem lança (almoxarife ou engenheiro). */
create function public.encerrar_dia(p_obra uuid) returns uuid
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

/** Encerramento automático (23:59): obras ainda não encerradas hoje. */
create function privado.encerrar_automatico() returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_obra uuid;
  v_n integer := 0;
begin
  for v_obra in
    select o.id from public.obra o
     where not exists (select 1 from public.fechamento_dia f
                        where f.obra_id = o.id and f.data = privado.hoje_na_obra())
  loop
    perform privado.encerrar_dia(v_obra, null, true);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Cancelamento peça a peça (RN-14) ------------------------------------------------------------

/**
 * A posse acabou (devolução ou estorno da retirada): o desconto em aberto daquela peça é
 * cancelado; aviso sem nenhum desconto em aberto vira `cancelado`; a empreiteira recebe a
 * atualização (um envio por empresa e por movimento que encerrou a posse).
 */
create function privado.posse_encerrada() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_desconto public.desconto;
  v_movimento uuid;
begin
  update public.desconto
     set status = 'cancelado', cancelado_em = now()
   where unidade_id = old.unidade_id and movimento_retirada_id = old.movimento_retirada_id
     and status = 'aberto'
  returning * into v_desconto;
  if v_desconto.id is null then
    return old;
  end if;

  update public.aviso a
     set status = 'cancelado', atualizado_em = now()
   where a.status = 'enviado'
     and exists (select 1 from public.aviso_desconto ad where ad.aviso_id = a.id and ad.desconto_id = v_desconto.id)
     and not exists (
       select 1 from public.aviso_desconto ad join public.desconto d on d.id = ad.desconto_id
        where ad.aviso_id = a.id and d.status = 'aberto');

  -- O movimento que encerrou a posse agrupa as peças devolvidas juntas num envio só.
  v_movimento := (select mi.movimento_id from public.movimento_item mi
                    join public.movimento m on m.id = mi.movimento_id
                   where mi.unidade_id = old.unidade_id and m.tipo in ('devolucao', 'estorno')
                   order by m.ordem desc limit 1);
  perform privado.enfileirar_para_empresa(old.obra_id, v_desconto.empresa_id, 'desconto_cancelado',
    coalesce(v_movimento, v_desconto.id), jsonb_build_object('empresa', v_desconto.empresa_id));
  return old;
end;
$$;

create trigger desconto_cancelar after delete on public.posse
  for each row execute function privado.posse_encerrada();

/** Estorno da devolução devolve a posse: o desconto (ainda não confirmado) volta a valer. */
create function privado.posse_reaberta() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.desconto
     set status = 'aberto', cancelado_em = null
   where unidade_id = new.unidade_id and movimento_retirada_id = new.movimento_retirada_id
     and status = 'cancelado';
  return new;
end;
$$;

create trigger desconto_reabrir after insert on public.posse
  for each row execute function privado.posse_reaberta();

-- "Não é ele" avisa o encarregado na hora (notificação) ----------------------------------------
create function privado.ocorrencia_avisar() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.enfileirar_para_empresa_push(new.obra_id,
    (select empresa_id from public.pessoa where id = new.pessoa_id), 'ocorrencia', new.id);
  return new;
end;
$$;

create function privado.enfileirar_para_empresa_push(
  p_obra uuid, p_empresa uuid, p_tipo public.tipo_envio, p_referencia uuid
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.envio (obra_id, tipo, canal, destino, referencia)
  select p_obra, p_tipo, 'push', uo.usuario_id::text, p_referencia
    from public.usuario_obra uo
   where uo.obra_id = p_obra and uo.perfil = 'consulta' and uo.empresa_id = p_empresa
  on conflict do nothing;
$$;

create trigger ocorrencia_avisar after insert on public.ocorrencia
  for each row execute function privado.ocorrencia_avisar();

-- Medição -------------------------------------------------------------------------------------

/**
 * O engenheiro fecha a medição da empresa: descontos em aberto viram confirmados, os avisos
 * ainda `enviado` viram `confirmado` e a próxima data fica no cadastro.
 */
create function public.fechar_medicao(p_obra uuid, p_empresa uuid, p_proxima date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_medicao uuid;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro fecha a medição.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.empresa where id = p_empresa and obra_id = p_obra and tipo = 'empreiteira') then
    raise exception 'Empreiteira não encontrada nesta obra.' using errcode = 'P0002';
  end if;
  if p_proxima is not null and p_proxima <= privado.hoje_na_obra() then
    raise exception 'A próxima medição tem que ser depois de hoje.' using errcode = '22023';
  end if;

  insert into public.medicao (obra_id, empresa_id, fechada_por, total, proxima)
  values (p_obra, p_empresa, (select auth.uid()),
    coalesce((select sum(valor) from public.desconto
               where obra_id = p_obra and empresa_id = p_empresa and status = 'aberto'), 0),
    p_proxima)
  returning id into v_medicao;

  update public.desconto set status = 'confirmado', medicao_id = v_medicao
   where obra_id = p_obra and empresa_id = p_empresa and status = 'aberto';
  update public.aviso set status = 'confirmado', atualizado_em = now()
   where obra_id = p_obra and empresa_id = p_empresa and status = 'enviado';
  update public.empresa set proxima_medicao = p_proxima where id = p_empresa;
  return v_medicao;
end;
$$;

-- Permissões das funções ----------------------------------------------------------------------
revoke all on function public.encerrar_dia(uuid), public.fechar_medicao(uuid, uuid, date)
  from public, anon, authenticated;
grant execute on function public.encerrar_dia(uuid), public.fechar_medicao(uuid, uuid, date)
  to authenticated;
-- Helpers que escrevem (ou só servem ao agendamento) ficam fechados até para quem tem login.
revoke execute on function privado.encerrar_dia(uuid, uuid, boolean), privado.encerrar_automatico(),
  privado.enfileirar_para_empresa(uuid, uuid, public.tipo_envio, uuid, jsonb),
  privado.enfileirar_para_empresa_push(uuid, uuid, public.tipo_envio, uuid),
  privado.posse_encerrada(), privado.posse_reaberta(), privado.ocorrencia_avisar()
  from public, anon, authenticated;
grant execute on function privado.hoje_na_obra() to authenticated;
