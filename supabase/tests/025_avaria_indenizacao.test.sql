-- Indenização da avaria: só o engenheiro da obra ajusta, com limite e registro de quem mudou.
begin;
select plan(9);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000001', 'Serra indeniz', 'serra_circular', 'SIZ', 89000);
insert into public.unidade (obra_id, tipo_id, codigo)
values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000b1', 'SIZ-01');
insert into t_ctx select 'pessoa', id::text from public.pessoa where nome = 'Joaquim Silva';
insert into storage.objects (bucket_id, name, owner, owner_id) values
  ('avarias', 'a0000000-0000-4000-8000-000000000001/e9000000-0000-4000-8000-000000000001.jpg', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.registrar_retirada('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'pessoa'),
  null, '[{"tipo":"f0000000-0000-4000-8000-0000000000b1","quantidade":1}]', true);
select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'pessoa'), null,
  jsonb_build_array(jsonb_build_object('tipo', 'f0000000-0000-4000-8000-0000000000b1', 'quantidade', 1,
    'avarias', jsonb_build_array(jsonb_build_object('motivo', 'quebrada',
      'foto', 'a0000000-0000-4000-8000-000000000001/e9000000-0000-4000-8000-000000000001.jpg')))));
reset role;
insert into t_ctx select 'avaria', id::text from public.avaria
 where foto_path like '%e9000000-0000-4000-8000-000000000001.jpg';

set local role authenticated;
select is(
  (select valor_indenizacao from public.avaria where id = (select valor::uuid from t_ctx where chave = 'avaria')),
  null, 'avaria nova: sem valor ajustado (vale a reposição)'
);
select throws_ok(
  $$select public.definir_indenizacao((select valor::uuid from t_ctx where chave = 'avaria'), 15000)$$,
  '42501', null, 'almoxarife não ajusta a indenização'
);
select throws_ok(
  $$update public.avaria set valor_indenizacao = 1 where id = (select valor::uuid from t_ctx where chave = 'avaria')$$,
  '42501', null, 'ninguém grava direto na tabela'
);

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.definir_indenizacao((select valor::uuid from t_ctx where chave = 'avaria'), 15000)$$,
  '42501', null, 'consulta não ajusta a indenização'
);

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.definir_indenizacao((select valor::uuid from t_ctx where chave = 'avaria'), -1)$$,
  '22023', null, 'valor negativo: recusado'
);
select lives_ok(
  $$select public.definir_indenizacao((select valor::uuid from t_ctx where chave = 'avaria'), 15000)$$,
  'engenheiro ajusta para o custo do conserto'
);
select is(
  (select valor_indenizacao from public.avaria where id = (select valor::uuid from t_ctx where chave = 'avaria')),
  15000, 'valor ajustado gravado em centavos'
);
select is(
  (select usuario_id from public.alteracao
    where registro_id = (select valor::uuid from t_ctx where chave = 'avaria') and campo = 'valor_indenizacao'),
  'b0000000-0000-4000-8000-000000000001'::uuid, 'quem ajustou fica registrado'
);
select public.definir_indenizacao((select valor::uuid from t_ctx where chave = 'avaria'), null);
select is(
  (select valor_indenizacao from public.avaria where id = (select valor::uuid from t_ctx where chave = 'avaria')),
  null, 'vazio volta para o valor de reposição'
);

select * from finish();
rollback;
