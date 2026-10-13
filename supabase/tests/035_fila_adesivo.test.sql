-- Plano · bloco 2, pontos 11 e 17: um adesivo pendente por pessoa; lote numa chamada.
begin;
select plan(8);

delete from public.trabalho_impressao;
insert into public.impressora (obra_id, nome, ip, porta, linguagem, ativa)
select 'a0000000-0000-4000-8000-000000000001', 'Etiquetadora teste', '192.168.0.50', 9100, 'ZPL', true
 where not exists (select 1 from public.impressora where obra_id = 'a0000000-0000-4000-8000-000000000001' and ativa);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated;
insert into t_ctx select 'p' || row_number() over (order by id), id::text
  from (select id from public.pessoa where obra_id = 'a0000000-0000-4000-8000-000000000001' and ativa order by id limit 3) x;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t_ctx values ('t1', public.enfileirar_impressao('a0000000-0000-4000-8000-000000000001', 'adesivo', 'x', '^XA^XZ', 1,
  (select valor::uuid from t_ctx where chave = 'p1'))::text);
select is(
  public.enfileirar_impressao('a0000000-0000-4000-8000-000000000001', 'adesivo', 'x', '^XA^XZ', 1,
    (select valor::uuid from t_ctx where chave = 'p1'))::text,
  (select valor from t_ctx where chave = 't1'), 'pedir de novo devolve o mesmo trabalho da fila'
);
select is(
  public.enfileirar_impressao('a0000000-0000-4000-8000-000000000001', 'adesivo', 'x', '^XA^PQ3^XZ', 3,
    (select valor::uuid from t_ctx where chave = 'p1'))::text,
  (select valor from t_ctx where chave = 't1'), 'reimprimir 3 cópias enquanto espera: mesmo trabalho...'
);
reset role;
select is(
  (select copias from public.trabalho_impressao where id = (select valor::uuid from t_ctx where chave = 't1')),
  3, '...com as 3 cópias do pedido novo'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  public.enfileirar_adesivos('a0000000-0000-4000-8000-000000000001', jsonb_build_array(
    jsonb_build_object('pessoa', (select valor from t_ctx where chave = 'p1'), 'payload', '^XA^XZ'),
    jsonb_build_object('pessoa', (select valor from t_ctx where chave = 'p2'), 'payload', '^XA^XZ'),
    jsonb_build_object('pessoa', (select valor from t_ctx where chave = 'p3'), 'payload', '^XA^XZ'))),
  2, 'lote: quem já está na fila fica de fora'
);
select is(
  public.enfileirar_adesivos('a0000000-0000-4000-8000-000000000001', jsonb_build_array(
    jsonb_build_object('pessoa', (select valor from t_ctx where chave = 'p2'), 'payload', '^XA^XZ'))),
  0, 'lote repetido não duplica'
);
select throws_ok(
  $$select public.enfileirar_adesivos('a0000000-0000-4000-8000-000000000001',
      '[{"pessoa":"00000000-0000-4000-8000-000000000000","payload":"rm -rf"}]')$$,
  '22023', null, 'conteúdo que não é etiqueta é recusado'
);
reset role;
select is(
  (select count(*)::int from public.trabalho_impressao where tipo = 'adesivo' and status = 'pendente'),
  3, 'um trabalho por pessoa'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.enfileirar_adesivos('a0000000-0000-4000-8000-000000000001', '[]')$$,
  '42501', null, 'almoxarife não imprime'
);

select * from finish();
rollback;
