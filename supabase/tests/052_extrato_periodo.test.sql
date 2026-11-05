-- Extrato por período: saldo depois de cada lançamento e resumo por material. Usa um material
-- próprio com datas fixas (o seed usa datas relativas a "agora"). Obra Demonstração a…01,
-- engenheira b…01.
begin;
select plan(9);

-- Como postgres: material e lançamentos com datas fixas (fuso da obra, −03).
--   10/01 08:00 entrada +80  → 80
--   11/01 23:30 entrada  +4  → 84   (já é 12/01 em UTC)
--   12/01 07:50 entrada +38  → 122
--   12/01 10:00 saída   −20  → 102
--   12/01 18:00 conferência com diferença de 5 → 102 (não mexe no saldo)
--   13/01 09:00 ajuste   −2  → 100
insert into public.material (id, obra_id, nome, unidade, saldo, estoque_cheio)
values ('e0000000-0000-4000-8000-000000000052', 'a0000000-0000-4000-8000-000000000001',
        'Material do teste 052', 'sc', 100, 122);
insert into public.movimento_material (obra_id, material_id, tipo, quantidade, usuario_id, criado_em)
select 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000052', t, q,
       'b0000000-0000-4000-8000-000000000001', w::timestamptz
  from (values ('entrada', 80, '2026-01-10 08:00-03'),
               ('entrada', 4, '2026-01-11 23:30-03'),
               ('entrada', 38, '2026-01-12 07:50-03'),
               ('saida', -20, '2026-01-12 10:00-03'),
               ('conferencia', 5, '2026-01-12 18:00-03'),
               ('ajuste', -2, '2026-01-13 09:00-03')) as v(t, q, w);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(
  (select e.saldo_depois from public.extrato_material_periodo(
     'a0000000-0000-4000-8000-000000000001', '2026-01-01', '2026-01-31',
     'e0000000-0000-4000-8000-000000000052') e limit 1),
  100::numeric, 'o lançamento mais novo termina no saldo do material');

select results_eq(
  $$ select tipo, saldo_depois from public.extrato_material_periodo(
       'a0000000-0000-4000-8000-000000000001', '2026-01-12', '2026-01-12',
       'e0000000-0000-4000-8000-000000000052') $$,
  $$ values ('conferencia', 102::numeric), ('saida', 102::numeric), ('entrada', 122::numeric) $$,
  'dia 12/01, mais recente primeiro; conferência com diferença não altera o saldo');

select results_eq(
  $$ select quantidade, saldo_depois from public.extrato_material_periodo(
       'a0000000-0000-4000-8000-000000000001', '2026-01-11', '2026-01-11',
       'e0000000-0000-4000-8000-000000000052') $$,
  $$ values (4::numeric, 84::numeric) $$,
  '23:30 do dia 11 conta no dia 11 (fuso da obra), não no 12');

select results_eq(
  $$ select saldo_inicio, entradas, saidas, ajustes, saldo_fim, lancamentos
       from public.resumo_material_periodo('a0000000-0000-4000-8000-000000000001', '2026-01-12', '2026-01-12')
      where material_id = 'e0000000-0000-4000-8000-000000000052' $$,
  $$ values (84::numeric, 38::numeric, 20::numeric, 0::numeric, 102::numeric, 3) $$,
  'resumo de 12/01: começa em 84, +38, −20, termina em 102 (conferência conta como lançamento)');

select results_eq(
  $$ select saldo_inicio, entradas, saidas, ajustes, saldo_fim, lancamentos
       from public.resumo_material_periodo('a0000000-0000-4000-8000-000000000001', '2026-01-01', '2026-01-31')
      where material_id = 'e0000000-0000-4000-8000-000000000052' $$,
  $$ values (0::numeric, 122::numeric, 20::numeric, -2::numeric, 100::numeric, 6) $$,
  'resumo de janeiro: 0 + 122 − 20 − 2 = 100');

select is(
  (select count(*)::int from public.extrato_material_periodo(
     'a0000000-0000-4000-8000-000000000001', '2025-12-01', '2025-12-31',
     'e0000000-0000-4000-8000-000000000052')),
  0, 'período sem lançamentos vem vazio');

select is(
  (select count(*)::int from public.resumo_material_periodo('a0000000-0000-4000-8000-000000000001', '2020-01-01', '2100-12-31') r
     join public.material m on m.id = r.material_id
    where r.saldo_fim <> m.saldo or r.saldo_inicio + r.entradas - r.saidas + r.ajustes <> r.saldo_fim),
  0, 'em toda a obra, o resumo fecha a conta e termina no saldo atual de cada material');

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.extrato_material_periodo('a0000000-0000-4000-8000-000000000001', '2026-01-01', '2026-01-31') $$,
  '42501', null, 'anônimo não lê o extrato');
select throws_ok(
  $$ select * from public.resumo_material_periodo('a0000000-0000-4000-8000-000000000001', '2026-01-01', '2026-01-31') $$,
  '42501', null, 'anônimo não lê o resumo');

select * from finish();
rollback;
