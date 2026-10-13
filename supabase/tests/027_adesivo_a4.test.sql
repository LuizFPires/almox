-- Adesivos em A4: só o engenheiro lê os tokens de várias pessoas e marca como impressos.
begin;
select plan(8);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into t_ctx select 'joaquim', id::text from public.pessoa where nome = 'Joaquim Silva';
insert into t_ctx select 'obra_b', id::text from public.pessoa
 where obra_id = 'a0000000-0000-4000-8000-000000000002' limit 1;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.dados_adesivos('a0000000-0000-4000-8000-000000000001', array[(select valor::uuid from t_ctx where chave = 'joaquim')])$$,
  '42501', null, 'almoxarife não lê os tokens dos adesivos'
);
select throws_ok(
  $$select public.marcar_adesivos_impressos('a0000000-0000-4000-8000-000000000001', array[(select valor::uuid from t_ctx where chave = 'joaquim')])$$,
  '42501', null, 'almoxarife não marca adesivo impresso'
);

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.dados_adesivos('a0000000-0000-4000-8000-000000000001',
    array[(select valor::uuid from t_ctx where chave = 'joaquim'), (select valor::uuid from t_ctx where chave = 'obra_b')])),
  1, 'engenheiro: só as pessoas da própria obra'
);
select ok(
  (select token from public.dados_adesivos('a0000000-0000-4000-8000-000000000001',
    array[(select valor::uuid from t_ctx where chave = 'joaquim')])) ~ '^[0-9a-f]{36}$',
  'o QR leva só o token (36 hex)'
);
select throws_ok(
  $$select * from public.dados_adesivos('a0000000-0000-4000-8000-000000000001', array_fill(gen_random_uuid(), array[201]))$$,
  '22023', null, 'mais de 200 de uma vez: recusado'
);
select throws_ok(
  $$select * from public.dados_adesivos('a0000000-0000-4000-8000-000000000002', array[(select valor::uuid from t_ctx where chave = 'obra_b')])$$,
  '42501', null, 'engenheiro não lê adesivos de obra onde é só consulta'
);
select is(
  public.marcar_adesivos_impressos('a0000000-0000-4000-8000-000000000001',
    array[(select valor::uuid from t_ctx where chave = 'joaquim'), (select valor::uuid from t_ctx where chave = 'obra_b')]),
  1, 'marca só quem é da obra'
);
select ok(
  (select adesivo_impresso_em is not null from public.pessoa where id = (select valor::uuid from t_ctx where chave = 'joaquim')),
  'adesivo impresso em A4 fica marcado'
);

select * from finish();
rollback;
