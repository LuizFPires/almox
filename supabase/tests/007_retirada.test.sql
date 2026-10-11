-- M5 · Retirada (RN-05, RN-07, RN-08, RN-11, RN-18). Usa o seed (Obra Demonstração).
begin;
select plan(31);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into t_ctx
  select 'joaquim', qr_token from public.pessoa where nome = 'Joaquim Silva'
  union all select 'joaquim_id', id::text from public.pessoa where nome = 'Joaquim Silva'
  union all select 'helio_id', id::text from public.pessoa where nome = 'Hélio Moreira'
  union all select 'pa', id::text from public.tipo_ferramenta
    where nome = 'Pá' and obra_id = 'a0000000-0000-4000-8000-000000000001'
  union all select 'furadeira', id::text from public.tipo_ferramenta
    where nome = 'Furadeira' and obra_id = 'a0000000-0000-4000-8000-000000000001'
  union all select 'movimentos', (select count(*)::text from public.movimento);
-- Pás suficientes mesmo num banco local já usado (tudo volta no rollback).
insert into public.unidade (obra_id, tipo_id, codigo)
select 'a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'pa'), 'PA-9' || lpad(n::text, 2, '0')
  from generate_series(1, 10) n;
-- As duas pás livres de menor código (RN-08).
insert into t_ctx select 'pas_esperadas', string_agg(codigo, ',' order by length(codigo), codigo) from (
  select codigo from public.unidade
   where tipo_id = (select valor::uuid from t_ctx where chave = 'pa') and status = 'livre'
   order by length(codigo), codigo limit 2) x;

-- Tipo com códigos 99 e 100: 100 vem depois de 99, não antes.
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trena teste', 'regua', 'TT', 5000);
insert into public.unidade (obra_id, tipo_id, codigo) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'TT-100'),
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'TT-99');
update public.pessoa set ativa = false where nome = 'Ivan Pereira';
insert into public.empresa (id, obra_id, nome, tipo)
values ('e0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000002', 'Construtora B', 'propria');
insert into public.pessoa (id, obra_id, empresa_id, nome, nome_capacete, funcao)
values ('c0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000002',
        'e0000000-0000-4000-8000-0000000000b1', 'Beto Lima', 'BETO', 'Pedreiro');
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000002', 'Pá B', 'pa', 'PB', 5000);
insert into public.unidade (obra_id, tipo_id, codigo)
values ('a0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-0000000000b1', 'PB-01');
insert into public.identificacao (id, obra_id, pessoa_id, usuario_id, expira_em)
select 'd0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-000000000001', id,
       'b0000000-0000-4000-8000-000000000001', now() + interval '10 minutes'
  from public.pessoa where nome = 'Joaquim Silva';
insert into t_ctx select 'ivan_id', id::text from public.pessoa where nome = 'Ivan Pereira';

-- Almoxarife ------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), false)$$,
  '22023', null, 'sem "Conferi pessoalmente" não retira (RN-11)'
);

insert into t_ctx select 'ident', identificacao::text from public.conferir_pessoa(
  'a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim'));
insert into t_ctx select 'mov', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
  jsonb_build_array(
    jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 2),
    jsonb_build_object('tipo', (select valor from t_ctx where chave = 'furadeira'), 'quantidade', 1)),
  true)::text;
reset role;

-- Critério de aceite: 2 pás + 1 furadeira com QR.
select results_eq(
  $$select tipo::text, via::text, usuario_id, conferido from public.movimento
     where id = (select valor::uuid from t_ctx where chave = 'mov')$$,
  $$values ('retirada'::text, 'qr'::text, 'b0000000-0000-4000-8000-000000000002'::uuid, true)$$,
  'movimento de retirada com QR, almoxarife e conferência'
);
select is((select count(*)::int from public.movimento_item where movimento_id = (select valor::uuid from t_ctx where chave = 'mov')),
  3, '3 itens no movimento');
select is(
  (select count(*)::int from public.posse
    where movimento_retirada_id = (select valor::uuid from t_ctx where chave = 'mov') and via = 'qr'
      and pessoa_id = (select valor::uuid from t_ctx where chave = 'joaquim_id')),
  3, '3 posses com via = qr no nome do Joaquim');
select is(
  (select count(*)::int from public.unidade u join public.movimento_item i on i.unidade_id = u.id
    where i.movimento_id = (select valor::uuid from t_ctx where chave = 'mov') and u.status = 'em_uso'),
  3, '3 unidades em uso');
select is(
  (select string_agg(u.codigo, ',' order by length(u.codigo), u.codigo) from public.unidade u
     join public.movimento_item i on i.unidade_id = u.id
    where i.movimento_id = (select valor::uuid from t_ctx where chave = 'mov') and u.tipo_id = (select valor::uuid from t_ctx where chave = 'pa')),
  (select valor from t_ctx where chave = 'pas_esperadas'), 'pás livres em ordem de código (RN-08)');
select is(
  (select desde from public.posse where movimento_retirada_id = (select valor::uuid from t_ctx where chave = 'mov') limit 1),
  now(), 'posse com a hora da retirada');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

-- Sem conferência = manual (RN-05).
insert into t_ctx select 'mov_manual', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true)::text;
select is(
  (select via::text from public.movimento where id = (select valor::uuid from t_ctx where chave = 'mov_manual')),
  'manual', 'sem conferência do capacete a retirada é manual');
select is(
  (select via::text from public.posse where movimento_retirada_id = (select valor::uuid from t_ctx where chave = 'mov_manual')),
  'manual', 'posse manual guarda a origem (RN-06)');

select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true)$$,
  'AL001', null, 'conferência do Joaquim não vale para o Hélio'
);
reset role;
update public.identificacao set expira_em = now() - interval '1 second'
 where id = (select valor::uuid from t_ctx where chave = 'ident');
set local role authenticated;
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true)$$,
  'AL001', 'A conferência do capacete não vale mais. Leia o capacete de novo.', 'conferência vencida pede nova leitura (não vira manual)'
);

-- Limite = livres (RN-07); a corrida perdida não grava nada.
select throws_like(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null,
      jsonb_build_array(
        jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1),
        jsonb_build_object('tipo', (select valor from t_ctx where chave = 'furadeira'), 'quantidade', 99)), true)$$,
  'Furadeira acabou de sair%', 'mais que as livres: "acabou de sair"'
);
reset role;
select is((select count(*)::int from public.movimento),
  (select valor::int + 2 from t_ctx where chave = 'movimentos'), 'retirada recusada não deixa movimento pela metade');
set local role authenticated;

select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 0)), true)$$,
  '22023', null, 'quantidade zero é recusada'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null, '[]', true)$$,
  '22023', null, 'sem ferramenta não retira'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', gen_random_uuid(), 'quantidade', 1)), true)$$,
  'P0002', null, 'ferramenta de fora da obra é recusada'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'ivan_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true)$$,
  'P0002', null, 'pessoa inativa não retira'
);

-- Tipo repetido soma; código 100 depois do 99.
insert into t_ctx select 'mov_tt', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  jsonb_build_array(jsonb_build_object('tipo', 'f0000000-0000-4000-8000-000000000001', 'quantidade', 1)), true)::text;
reset role;
select is(
  (select u.codigo from public.unidade u join public.movimento_item i on i.unidade_id = u.id
    where i.movimento_id = (select valor::uuid from t_ctx where chave = 'mov_tt')),
  'TT-99', 'TT-99 sai antes de TT-100 (ordem numérica do código)');
set local role authenticated;
insert into t_ctx select 'mov_dup', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  jsonb_build_array(
    jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1),
    jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true)::text;
reset role;
select is((select count(*)::int from public.movimento_item where movimento_id = (select valor::uuid from t_ctx where chave = 'mov_dup')),
  2, 'mesmo tipo duas vezes na lista soma as quantidades');


-- Revisão do M5 -----------------------------------------------------------------------------------
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null,
      '[{"tipo":"f0000000-0000-4000-8000-0000000000b1","quantidade":1}]', true)$$,
  'P0002', null, 'ferramenta real de outra obra é recusada'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-0000000000b1', null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true)$$,
  'P0002', null, 'pessoa de outra obra é recusada'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), 'd0000000-0000-4000-8000-0000000000e1',
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true)$$,
  'AL001', null, 'conferência feita pela engenheira não vale para o almoxarife'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null, null, true)$$,
  '22023', null, 'lista nula é recusada'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null, '[1, 2]', true)$$,
  '22023', null, 'item que não é objeto é recusado'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1.5)), true)$$,
  '22023', null, 'quantidade fracionada é recusada'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null,
      jsonb_build_array(
        jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 3),
        jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', -2)), true)$$,
  '22023', null, 'quantidade negativa no meio da lista é recusada'
);

-- Idempotência: o mesmo pedido duas vezes grava uma vez só.
insert into t_ctx select 'mov_chave1', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true,
  'e0000000-0000-4000-8000-00000000c0de')::text;
insert into t_ctx select 'mov_chave2', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true,
  'e0000000-0000-4000-8000-00000000c0de')::text;
reset role;
select is((select valor from t_ctx where chave = 'mov_chave2'), (select valor from t_ctx where chave = 'mov_chave1'),
  'repetir o pedido devolve o mesmo movimento');
select is((select count(*)::int from public.movimento_item where movimento_id = (select valor::uuid from t_ctx where chave = 'mov_chave1')),
  1, 'repetir o pedido não leva outra unidade');
set local role authenticated;

-- Consulta não retira; nada de update/delete em movimento (RN-18).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null,
      jsonb_build_array(jsonb_build_object('tipo', (select valor from t_ctx where chave = 'pa'), 'quantidade', 1)), true)$$,
  '42501', null, 'consulta não retira'
);
reset role;
select throws_ok(
  $$update public.movimento set via = 'qr' where id = (select valor::uuid from t_ctx where chave = 'mov_manual')$$,
  null, null, 'movimento de retirada é imutável, até para o administrador'
);
select is((select count(*)::int from public.unidade where status = 'em_uso')
           - (select count(*)::int from public.posse), 0, 'unidade em uso ⇔ posse (gatilho adiado)');

select * from finish();
rollback;
