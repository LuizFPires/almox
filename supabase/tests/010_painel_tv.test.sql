-- M8 · Painel da TV: configuração e leitura pelo token do dispositivo (usa o seed).
begin;
select plan(24);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;

delete from public.config_tv;

-- Engenheira cria o dispositivo da obra A ----------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t_ctx values ('token', public.criar_dispositivo('a0000000-0000-4000-8000-000000000001', 'TV do almoxarifado'));
insert into t_ctx values ('outro', public.criar_dispositivo('a0000000-0000-4000-8000-000000000001', 'TV revogada'));
select public.revogar_dispositivo((select id from public.dispositivo_tv where nome = 'TV revogada' order by criado_em desc limit 1));

-- Configuração ----------------------------------------------------------------------------------
select lives_ok(
  $$select public.salvar_config_tv('a0000000-0000-4000-8000-000000000001', 10, 60, 2000, 3000, 16)$$,
  'engenheira salva a configuração'
);
select is(
  (select tempo_pagina_s from public.config_tv where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  10, 'configuração gravada e legível pela obra'
);
select is(
  (select count(*)::int from public.alteracao where tabela = 'config_tv' and campo = 'tempo_pagina_s'
     and de = '8' and para = '10'),
  1, 'mudança fica no log (de 8 para 10)'
);
select is(
  (select count(*)::int from public.alteracao where tabela = 'config_tv' and campo = 'pausa_depois_ms'),
  0, 'campo que não mudou não vai para o log'
);
select throws_ok(
  $$select public.salvar_config_tv('a0000000-0000-4000-8000-000000000001', 2, 45, 2500, 3000, 12)$$,
  '23514', null, 'tempo por página abaixo de 3 s: recusado'
);
select throws_ok(
  $$select public.salvar_config_tv('a0000000-0000-4000-8000-000000000001', 8, 151, 2500, 3000, 12)$$,
  '23514', null, 'velocidade acima de 150 px/s: recusada'
);
select throws_ok(
  $$select public.salvar_config_tv('a0000000-0000-4000-8000-000000000001', 8, 45, 2500, 3000, 10)$$,
  '23514', null, 'cartões por página só 8, 12 ou 16'
);
select throws_ok(
  $$select public.salvar_config_tv('a0000000-0000-4000-8000-000000000002', 8, 45, 2500, 3000, 12)$$,
  '42501', null, 'consulta (na obra B) não configura'
);
select throws_ok(
  $$insert into public.config_tv (obra_id) values ('a0000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'ninguém grava direto na tabela'
);

-- Almoxarife e consulta -------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.salvar_config_tv('a0000000-0000-4000-8000-000000000001', 8, 45, 2500, 3000, 12)$$,
  '42501', null, 'almoxarife não configura'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(
  (select cartoes_por_pagina from public.config_tv where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  16, 'consulta da empreiteira lê a configuração da obra'
);
select throws_ok(
  $$select public.painel_tv((select valor from t_ctx where chave = 'token'))$$,
  '42501', null, 'usuário logado não usa o painel pela função (só a TV, anônima)'
);
reset role;

-- TV (anônima, só com o token) ------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select public.painel_tv('x')$$, '42501', null, 'token errado: não autorizado');
select throws_ok(
  $$select public.painel_tv((select valor from t_ctx where chave = 'outro'))$$,
  '42501', null, 'token revogado: não autorizado'
);
select throws_ok($$select * from public.config_tv$$, '42501', null, 'anônimo não lê a tabela');

insert into t_ctx values ('painel', public.painel_tv((select valor from t_ctx where chave = 'token'))::text);
select is(
  (select valor::jsonb ->> 'obra' from t_ctx where chave = 'painel'),
  'Obra Demonstração', 'nome da obra'
);
select is(
  (select valor::jsonb -> 'config' ->> 'cartoesPorPagina' from t_ctx where chave = 'painel'),
  '16', 'configuração da obra vai junto'
);
reset role;
select is(
  (select jsonb_array_length(valor::jsonb -> 'pessoas') from t_ctx where chave = 'painel'),
  (select count(distinct po.pessoa_id)::int from public.posse po
    where po.obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'uma pessoa por quem está com ferramenta'
);
select is(
  (select sum(jsonb_array_length(p -> 'itens'))::int
     from t_ctx, jsonb_array_elements(valor::jsonb -> 'pessoas') p where chave = 'painel'),
  (select count(*)::int from public.posse where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'todas as peças fora aparecem'
);
select is(
  (select array_agg(k order by k) from t_ctx,
     jsonb_array_elements(valor::jsonb -> 'pessoas') p, jsonb_object_keys(p) k
    where chave = 'painel' and p ->> 'nome' = 'Raimundo Alves'),
  array['apelido', 'empresaId', 'funcao', 'id', 'itens', 'nome'],
  'cartão só com o necessário (sem token do QR)'
);
select ok(
  (select valor not like '%' || (select qr_token from public.pessoa where nome = 'Raimundo Alves') || '%'
     from t_ctx where chave = 'painel'),
  'token do QR não sai no painel'
);
select is(
  (select count(*)::int from t_ctx, jsonb_array_elements(valor::jsonb -> 'empresas') e
    where chave = 'painel' and e ->> 'nome' = 'Construtora' and (e ->> 'propria')::boolean),
  1, 'empresas da obra com cor e tipo'
);
select ok(
  (select ultimo_ping is not null from public.dispositivo_tv where nome = 'TV do almoxarifado'),
  'painel marca o último sinal do dispositivo'
);
select ok(
  not exists (select 1 from t_ctx, jsonb_array_elements(valor::jsonb -> 'pessoas') p
               where chave = 'painel'
                 and (p ->> 'empresaId')::uuid not in (
                   select id from public.empresa where obra_id = 'a0000000-0000-4000-8000-000000000001')),
  'só pessoas da obra do dispositivo'
);

select * from finish();
rollback;
