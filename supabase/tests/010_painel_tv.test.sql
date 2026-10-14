-- M8 · Painel da TV: configuração, pareamento por código e leitura pela credencial da TV.
begin;
select plan(40);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;

delete from public.config_tv;

-- Obra B: um mini PC e uma posse, só para conferir que a obra A não vê nada dela.
insert into public.dispositivo_tv (id, obra_id, nome, token_hash)
values ('d0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000002',
        'Mini PC B', 'x');

-- Engenheira cria os mini PCs da obra A e gera os códigos -----------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t_ctx values ('agente', public.criar_dispositivo('a0000000-0000-4000-8000-000000000001', 'TV do almoxarifado'));
insert into t_ctx values ('outro_agente', public.criar_dispositivo('a0000000-0000-4000-8000-000000000001', 'TV revogada'));
insert into t_ctx values ('dispositivo', (select id::text from public.dispositivo_tv where nome = 'TV do almoxarifado' order by criado_em desc limit 1));
insert into t_ctx values ('revogado', (select id::text from public.dispositivo_tv where nome = 'TV revogada' order by criado_em desc limit 1));

insert into t_ctx values ('codigo_velho', public.gerar_codigo_tv((select valor::uuid from t_ctx where chave = 'dispositivo')));
insert into t_ctx values ('codigo', public.gerar_codigo_tv((select valor::uuid from t_ctx where chave = 'dispositivo')));
select ok((select valor from t_ctx where chave = 'codigo') ~ '^[0-9a-f]{32}$', 'código de pareamento: 32 hex');
insert into t_ctx values ('codigo_revogado', public.gerar_codigo_tv((select valor::uuid from t_ctx where chave = 'revogado')));
select public.revogar_dispositivo((select valor::uuid from t_ctx where chave = 'revogado'));
select throws_ok(
  $$select public.gerar_codigo_tv((select valor::uuid from t_ctx where chave = 'revogado'))$$,
  '42501', null, 'mini PC revogado não gera código'
);
select throws_ok(
  $$select public.gerar_codigo_tv('d0000000-0000-4000-8000-0000000000b1')$$,
  '42501', null, 'engenheira da obra A não gera código para mini PC da obra B (lá é consulta)'
);
select throws_ok($$select * from public.codigo_tv$$, '42501', null, 'códigos não são legíveis');

-- Configuração ----------------------------------------------------------------------------------
select lives_ok(
  $$select public.salvar_config_tv('a0000000-0000-4000-8000-000000000001', 10, 60, 2000, 3000, 16)$$,
  'engenheira salva a configuração'
);
select is(
  (select tempo_pagina_s from public.config_tv where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  10, 'configuração gravada e legível pela obra'
);
-- Só o que esta transação gravou (o banco local acumula os e2e).
select is(
  (select count(*)::int from public.alteracao where tabela = 'config_tv' and campo = 'tempo_pagina_s'
     and de = '8' and para = '10' and criado_em = now()),
  1, 'mudança fica no log (de 8 para 10)'
);
select is(
  (select count(*)::int from public.alteracao where tabela = 'config_tv' and campo = 'pausa_depois_ms'
     and criado_em = now()),
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
select throws_ok(
  $$select public.gerar_codigo_tv((select valor::uuid from t_ctx where chave = 'dispositivo'))$$,
  '42501', null, 'almoxarife não conecta TV'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(
  (select cartoes_por_pagina from public.config_tv where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  16, 'consulta da empreiteira lê a configuração da obra'
);
select throws_ok(
  $$select public.painel_tv('x')$$,
  '42501', null, 'usuário logado não usa o painel pela função (só a TV, anônima)'
);
reset role;

-- TV (anônima): troca o código pela credencial ----------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select public.trocar_codigo_tv((select valor from t_ctx where chave = 'codigo_velho'))$$,
  'AL008', null, 'código anterior perde a validade quando um novo é gerado'
);
select throws_ok(
  $$select public.trocar_codigo_tv((select valor from t_ctx where chave = 'codigo_revogado'))$$,
  'AL008', null, 'código de mini PC revogado não vale'
);
insert into t_ctx values ('tv', public.trocar_codigo_tv((select valor from t_ctx where chave = 'codigo')));
select ok((select valor from t_ctx where chave = 'tv') ~ '^[0-9a-f]{64}$', 'TV recebe a credencial dela (64 hex)');
select throws_ok(
  $$select public.trocar_codigo_tv((select valor from t_ctx where chave = 'codigo'))$$,
  'AL008', null, 'código vale uma vez só'
);
select throws_ok($$select public.trocar_codigo_tv(null)$$, 'AL008', null, 'código vazio: não autorizado');

-- Painel ---------------------------------------------------------------------------------------
select throws_ok($$select public.painel_tv('x')$$, 'AL008', null, 'credencial errada: AL008 (não 42501)');
select throws_ok(
  $$select public.painel_tv((select valor from t_ctx where chave = 'agente'))$$,
  'AL008', null, 'token do agente de impressão não abre o painel'
);
select throws_ok($$select * from public.config_tv$$, '42501', null, 'anônimo não lê a tabela');
select throws_ok(
  $$select public.agente_proximos((select valor from t_ctx where chave = 'tv'))$$,
  '42501', null, 'credencial da TV não lê a fila de impressão'
);

insert into t_ctx values ('painel', public.painel_tv((select valor from t_ctx where chave = 'tv'))::text);
select is(
  (select valor::jsonb ->> 'obra' from t_ctx where chave = 'painel'),
  'Obra Demonstração', 'nome da obra'
);
select is(
  (select valor::jsonb -> 'config' ->> 'cartoesPorPagina' from t_ctx where chave = 'painel'),
  '16', 'configuração da obra vai junto'
);
select ok(
  (select valor::jsonb ->> 'versao' ~ '^v[0-9]+$' from t_ctx where chave = 'painel'),
  'painel traz a versão'
);
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.painel_tv(
     (select valor from t_ctx where chave = 'tv'),
     (select valor::jsonb ->> 'versao' from t_ctx where chave = 'painel'))) k),
  array['agora', 'versao'],
  'nada mudou: volta só a versão (sem os dados)'
);
reset role;
select is(
  (select jsonb_array_length(valor::jsonb -> 'pessoas') from t_ctx where chave = 'painel'),
  (select count(distinct po.pessoa_id)::int from public.posse po
    where po.obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'uma pessoa por quem está com ferramenta'
);
select ok(
  not exists (
    select 1 from t_ctx, jsonb_array_elements(valor::jsonb -> 'pessoas') p
     where chave = 'painel'
       and not exists (select 1 from public.posse po where po.pessoa_id = (p ->> 'id')::uuid)),
  'quem não está com ferramenta não aparece'
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
  array['empresaId', 'funcao', 'id', 'itens', 'nome'],
  'cartão só com o necessário (sem apelido nem token do QR)'
);
select ok(
  (select valor not like '%' || (select qr_token from public.pessoa where nome = 'Raimundo Alves') || '%'
     from t_ctx where chave = 'painel'),
  'token do QR não sai no painel'
);
select ok(
  not exists (
    select 1 from t_ctx, jsonb_array_elements(valor::jsonb -> 'empresas') e
     where chave = 'painel'
       and (e ->> 'id')::uuid not in (
         select id from public.empresa where obra_id = 'a0000000-0000-4000-8000-000000000001')),
  'só empresas da obra do dispositivo'
);
select ok(
  not exists (
    select 1 from t_ctx, jsonb_array_elements(valor::jsonb -> 'pessoas') p
     where chave = 'painel'
       and (p ->> 'id')::uuid in (
         select id from public.pessoa where obra_id = 'a0000000-0000-4000-8000-000000000002')),
  'nenhuma pessoa da obra B'
);

-- Sinais: da TV em coluna própria, no máximo um por minuto; o do agente não muda --------------
select ok(
  (select ultimo_ping_tv is not null and ultimo_ping is null
     from public.dispositivo_tv where id = (select valor::uuid from t_ctx where chave = 'dispositivo')),
  'painel marca o sinal da TV, não o do agente'
);
update public.dispositivo_tv set ultimo_ping_tv = now() - interval '30 seconds'
 where id = (select valor::uuid from t_ctx where chave = 'dispositivo');
set local role anon;
select public.painel_tv((select valor from t_ctx where chave = 'tv'));
reset role;
select is(
  (select ultimo_ping_tv from public.dispositivo_tv where id = (select valor::uuid from t_ctx where chave = 'dispositivo')),
  now() - interval '30 seconds', 'sinal da TV gravado no máximo uma vez por minuto'
);

-- Um código novo substitui a TV anterior --------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t_ctx values ('codigo2', public.gerar_codigo_tv((select valor::uuid from t_ctx where chave = 'dispositivo')));
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into t_ctx values ('tv2', public.trocar_codigo_tv((select valor from t_ctx where chave = 'codigo2')));
select throws_ok(
  $$select public.painel_tv((select valor from t_ctx where chave = 'tv'))$$,
  'AL008', null, 'TV conectada de novo: a credencial anterior para de valer'
);
reset role;

select * from finish();
rollback;
