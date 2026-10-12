-- M10 · Lançamento sem internet: hora do celular com limite, QR conferido ao chegar, reenvio
-- sem duplicar e dados para o celular sem o token.
begin;
select plan(19);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into t_ctx (chave, valor) values ('tipo', 'f0000000-0000-4000-8000-0000000000c1');
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-000000000001', 'Pá offline', 'pa', 'POF', 5000);
insert into public.unidade (obra_id, tipo_id, codigo)
select 'a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000c1', 'POF-0' || n
  from generate_series(1, 3) n;
insert into t_ctx
  select 'joaquim', qr_token from public.pessoa where nome = 'Joaquim Silva'
  union all select 'joaquim_id', id::text from public.pessoa where nome = 'Joaquim Silva'
  union all select 'helio', qr_token from public.pessoa where nome = 'Hélio Moreira';

-- Consulta não baixa os dados ------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok($$select public.dados_offline('a0000000-0000-4000-8000-000000000001')$$, '42501', null,
  'consulta não baixa pessoas para o celular');
reset role;
set local role anon;
select throws_ok($$select public.dados_offline('a0000000-0000-4000-8000-000000000001')$$, '42501', null,
  'anônimo não chama');
reset role;

-- Almoxarife -----------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx select 'dados', public.dados_offline('a0000000-0000-4000-8000-000000000001')::text;

select is(
  (select p ->> 'hash' from jsonb_array_elements((select valor::jsonb -> 'pessoas' from t_ctx where chave = 'dados')) p
    where p ->> 'nome' = 'Joaquim Silva'),
  encode(sha256(convert_to((select valor from t_ctx where chave = 'joaquim'), 'UTF8')), 'hex'),
  'pessoa vai com o SHA-256 do token'
);
select ok(
  position((select valor from t_ctx where chave = 'joaquim') in (select valor from t_ctx where chave = 'dados')) = 0,
  'o token em si nunca vai para o celular'
);
select is(
  (select (t ->> 'livres')::int from jsonb_array_elements((select valor::jsonb -> 'tipos' from t_ctx where chave = 'dados')) t
    where t ->> 'nome' = 'Pá offline'),
  3, 'ferramentas com quantas estão livres'
);

select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'tipo'), 'quantidade', 1)), true,
      gen_random_uuid(), (select valor from t_ctx where chave = 'joaquim'), now() - interval '25 hours')$$,
  'AL012', null, 'mais de 24 h sem internet: recusado'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'tipo'), 'quantidade', 1)), true,
      gen_random_uuid(), (select valor from t_ctx where chave = 'joaquim'), now() + interval '1 hour')$$,
  'AL012', null, 'hora no futuro: recusado'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'tipo'), 'quantidade', 1)), true,
      gen_random_uuid(), (select valor from t_ctx where chave = 'helio'), now() - interval '1 hour')$$,
  'AL013', null, 'QR de outra pessoa: recusado (RN-02)'
);

insert into t_ctx (chave, valor) values ('chave', gen_random_uuid()::text), ('quando', (now() - interval '2 hours')::text);
insert into t_ctx select 'mov', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
  jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'tipo'), 'quantidade', 2)), true,
  (select valor::uuid from t_ctx where chave = 'chave'), (select valor from t_ctx where chave = 'joaquim'),
  (select valor::timestamptz from t_ctx where chave = 'quando'))::text;

select is(
  (select criado_em from public.movimento where id = (select valor::uuid from t_ctx where chave = 'mov')),
  (select valor::timestamptz from t_ctx where chave = 'quando'), 'vale a hora do celular'
);
select isnt(
  (select recebido_em from public.movimento where id = (select valor::uuid from t_ctx where chave = 'mov')),
  null, 'e guarda a hora em que chegou'
);
select is(
  (select via::text from public.movimento where id = (select valor::uuid from t_ctx where chave = 'mov')),
  'qr', 'QR lido sem internet conta como QR'
);
select is(
  (select count(*)::int from public.posse
    where movimento_retirada_id = (select valor::uuid from t_ctx where chave = 'mov')
      and desde = (select valor::timestamptz from t_ctx where chave = 'quando')),
  2, 'a posse começa na hora do celular ("desde")'
);
select is(
  public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
    (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
    jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'tipo'), 'quantidade', 2)), true,
    (select valor::uuid from t_ctx where chave = 'chave'), (select valor from t_ctx where chave = 'joaquim'),
    (select valor::timestamptz from t_ctx where chave = 'quando')),
  (select valor::uuid from t_ctx where chave = 'mov'), 'reenvio com a mesma chave não duplica'
);

-- Conflito: só 1 livre, a fila pediu 2.
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'tipo'), 'quantidade', 2)), true,
      gen_random_uuid(), (select valor from t_ctx where chave = 'joaquim'), now() - interval '1 hour')$$,
  'AL002', null, 'não tem livres suficientes ao chegar: erro claro, nada gravado'
);

-- Online, sem hora: recebido_em fica vazio.
insert into t_ctx select 'online', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
  jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'tipo'), 'quantidade', 1)), true)::text;
select is(
  (select recebido_em from public.movimento where id = (select valor::uuid from t_ctx where chave = 'online')),
  null, 'lançado com internet: sem hora de chegada à parte'
);

-- Devolução sem internet, com QR.
insert into t_ctx select 'dev', public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
  jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'tipo'), 'quantidade', 2)),
  gen_random_uuid(), (select valor from t_ctx where chave = 'joaquim'), now() - interval '30 minutes')::text;
select is(
  (select via::text from public.movimento where id = (select valor::uuid from t_ctx where chave = 'dev')),
  'qr', 'devolução sem internet com QR'
);
select is(
  (select count(*)::int from public.posse where pessoa_id = (select valor::uuid from t_ctx where chave = 'joaquim_id')
     and unidade_id in (select id from public.unidade where tipo_id = (select valor::uuid from t_ctx where chave = 'tipo'))),
  1, 'as mais antigas voltaram; fica a retirada com internet'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'tipo'), 'quantidade', 1)),
      gen_random_uuid(), (select valor from t_ctx where chave = 'helio'), now())$$,
  'AL013', null, 'devolução com QR de outra pessoa: recusada'
);
reset role;

select is(
  (select count(*)::int from information_schema.role_routine_grants
    where routine_name = 'dados_offline' and grantee = 'anon'), 0, 'sem grant para anon'
);

select * from finish();
rollback;
