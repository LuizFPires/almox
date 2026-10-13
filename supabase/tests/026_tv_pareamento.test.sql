-- TV sem mini PC: a TV pede um código, engenheiro ou almoxarife aprova, a TV recebe a
-- credencial do painel uma vez só; desconectar desliga a TV.
begin;
select plan(20);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon, service_role;
insert into t_ctx values ('segredo', repeat('ab', 32)), ('outro', repeat('cd', 32));

-- Um mini PC do engenheiro, para conferir que o almoxarife não mexe nele.
insert into public.dispositivo_tv (id, obra_id, nome, token_hash)
values ('d0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-000000000001', 'Mini PC', 'y-pareamento');
-- Pedido vencido (não pode ser aprovado).
insert into public.pareamento_tv (codigo, segredo_hash, expira_em)
values ('000001', 'hash-vencido', now() - interval '1 minute');

-- Pedir código: só pelo servidor do app ---------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select public.pedir_pareamento_tv((select valor from t_ctx where chave = 'segredo'), '1.2.3.4')$$,
  '42501', null, 'anônimo não pede código direto (só o servidor, que limita por IP)'
);
set local role service_role;
select throws_ok($$select public.pedir_pareamento_tv('curto', '1.2.3.4')$$, '22023', null, 'segredo fora do formato: recusado');
insert into t_ctx values ('codigo', public.pedir_pareamento_tv((select valor from t_ctx where chave = 'segredo'), '1.2.3.4'));
select public.pedir_pareamento_tv(repeat('e1', 32), '9.9.9.9');
select public.pedir_pareamento_tv(repeat('e2', 32), '9.9.9.9');
select public.pedir_pareamento_tv(repeat('e3', 32), '9.9.9.9');
select throws_ok(
  $$select public.pedir_pareamento_tv(repeat('e4', 32), '9.9.9.9')$$,
  'AL009', null, 'no máximo 3 pedidos vivos por IP'
);
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select ok((select valor from t_ctx where chave = 'codigo') ~ '^[0-9]{6}$', 'código de 6 dígitos');
select is(
  public.consultar_pareamento_tv((select valor from t_ctx where chave = 'segredo')) ->> 'estado',
  'esperando', 'antes da aprovação: esperando'
);
select is(
  public.consultar_pareamento_tv((select valor from t_ctx where chave = 'outro')) ->> 'estado',
  'vencido', 'outro segredo não acha o pedido'
);

-- Quem aprova -------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.aprovar_pareamento_tv('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'codigo'), 'TV')$$,
  '42501', null, 'consulta não conecta TV'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.aprovar_pareamento_tv('a0000000-0000-4000-8000-000000000002', (select valor from t_ctx where chave = 'codigo'), 'TV')$$,
  '42501', null, 'engenheiro não conecta TV em obra onde é só consulta'
);

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.aprovar_pareamento_tv('a0000000-0000-4000-8000-000000000001', '000001', 'TV')$$,
  'P0002', null, 'código vencido: não aprova'
);
insert into t_ctx values ('tv', public.aprovar_pareamento_tv('a0000000-0000-4000-8000-000000000001',
  (select valor from t_ctx where chave = 'codigo'), '  TV do almox  ')::text);
select is(
  (select nome || '|' || so_painel from public.dispositivo_tv where id = (select valor::uuid from t_ctx where chave = 'tv')),
  'TV do almox|true', 'almoxarife aprova: TV "só painel" criada com o nome'
);
select throws_ok(
  $$select public.aprovar_pareamento_tv('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'codigo'), 'TV')$$,
  'P0002', null, 'o mesmo código não aprova duas vezes'
);
select is(
  (select count(*)::int from public.dispositivo_tv where id = 'd0000000-0000-4000-8000-0000000000c1'),
  0, 'almoxarife não vê o mini PC do engenheiro'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.gerar_codigo_tv((select valor::uuid from t_ctx where chave = 'tv'))$$,
  '42501', null, 'o código antigo de mini PC não reconecta uma TV "só painel"'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

-- A TV recebe a credencial uma vez -----------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into t_ctx values ('resposta', public.consultar_pareamento_tv((select valor from t_ctx where chave = 'segredo'))::text);
select ok(
  (select valor::jsonb ->> 'token' from t_ctx where chave = 'resposta') ~ '^[0-9a-f]{64}$',
  'aprovado: a TV recebe a credencial (64 hex)'
);
select ok(
  public.painel_tv((select valor::jsonb ->> 'token' from t_ctx where chave = 'resposta')) ? 'pessoas',
  'a credencial abre o painel'
);
select is(
  public.consultar_pareamento_tv((select valor from t_ctx where chave = 'segredo')) ->> 'estado',
  'vencido', 'a credencial é entregue uma vez só'
);

-- Desconectar ------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.desconectar_tv('d0000000-0000-4000-8000-0000000000c1')$$,
  '42501', null, 'almoxarife não desconecta o mini PC'
);
select lives_ok(
  $$select public.desconectar_tv((select valor::uuid from t_ctx where chave = 'tv'))$$,
  'almoxarife desconecta a TV'
);
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select public.painel_tv((select valor::jsonb ->> 'token' from t_ctx where chave = 'resposta'))$$,
  'AL008', null, 'TV desconectada não abre mais o painel'
);
select throws_ok(
  $$select count(*) from public.pareamento_tv$$,
  '42501', null, 'pedidos de pareamento fechados ao cliente'
);

select * from finish();
rollback;
