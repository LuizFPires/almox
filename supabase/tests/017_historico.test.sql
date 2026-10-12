-- M10 · Histórico e auditoria: só o engenheiro, filtros no servidor.
begin;
select plan(9);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000d1', 'a0000000-0000-4000-8000-000000000001', 'Pá histórico', 'pa', 'PHI', 5000);
insert into public.unidade (obra_id, tipo_id, codigo)
values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000d1', 'PHI-01');
insert into t_ctx select 'joaquim_id', id::text from public.pessoa where nome = 'Joaquim Silva';
insert into t_ctx select 'joaquim', qr_token from public.pessoa where nome = 'Joaquim Silva';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx select 'mov', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000d1","quantidade":1}]', true)::text;
select public.registrar_ocorrencia('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim'));
select throws_ok($$select public.historico('a0000000-0000-4000-8000-000000000001', current_date, current_date)$$,
  '42501', null, 'almoxarife não vê o histórico');
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok($$select public.historico('a0000000-0000-4000-8000-000000000001', current_date, current_date)$$,
  '42501', null, 'consulta não vê o histórico');

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.historico('a0000000-0000-4000-8000-000000000001', current_date, current_date - 1)$$,
  '22023', null, 'período invertido é recusado');
select throws_ok($$select public.historico('a0000000-0000-4000-8000-000000000001', current_date - 400, current_date)$$,
  '22023', null, 'mais de um ano é recusado');

select is(
  (select count(*)::int from jsonb_array_elements(public.historico('a0000000-0000-4000-8000-000000000001',
     (now() at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date,
     p_tipo => 'f0000000-0000-4000-8000-0000000000d1')) l),
  1, 'por ferramenta: só a retirada dela (sem ocorrências)'
);
select is(
  (select l -> 'itens' -> 0 ->> 'codigo' from jsonb_array_elements(public.historico('a0000000-0000-4000-8000-000000000001',
     (now() at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date,
     p_tipo => 'f0000000-0000-4000-8000-0000000000d1')) l),
  'PHI-01', 'com o código da unidade'
);
select ok(
  (select count(*) from jsonb_array_elements(public.historico('a0000000-0000-4000-8000-000000000001',
     (now() at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date,
     p_pessoa => (select valor::uuid from t_ctx where chave = 'joaquim_id'), p_categoria => 'ocorrencia')) l) >= 1,
  'ocorrências da pessoa'
);
select is(
  (select count(*)::int from jsonb_array_elements(public.historico('a0000000-0000-4000-8000-000000000001',
     (now() at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date,
     p_tipo => 'f0000000-0000-4000-8000-0000000000d1', p_via => 'qr')) l),
  0, 'por via: a retirada foi manual'
);
reset role;
set local role anon;
select throws_ok($$select public.historico('a0000000-0000-4000-8000-000000000001', current_date, current_date)$$,
  '42501', null, 'anônimo não chama');
reset role;

select * from finish();
rollback;
