-- Extrato por período: saldo depois de cada lançamento e resumo por material. Usa o seed
-- (Obra Demonstração a…01; engenheira b…01; Cimento f…01 com entradas de 80 em 01/11 e 38 em 03/11).
begin;
select plan(9);

-- Conferência com divergência não mexe no saldo (inserida como postgres, sem contagem).
insert into public.movimento_material (obra_id, material_id, tipo, quantidade, usuario_id, criado_em)
values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
        'conferencia', 5, 'b0000000-0000-4000-8000-000000000001', '2026-11-03 18:00-03');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.material m
    where m.obra_id = 'a0000000-0000-4000-8000-000000000001'
      and m.saldo <> (select e.saldo_depois
                        from public.extrato_material_periodo(m.obra_id, '2026-10-01', '2026-12-31', m.id) e
                       limit 1)),
  0, 'o lançamento mais novo de cada material termina no saldo atual');

select is(
  (select e.saldo_depois from public.extrato_material_periodo(
     'a0000000-0000-4000-8000-000000000001', '2026-11-03', '2026-11-03',
     'f0000000-0000-4000-8000-000000000001') e where e.tipo = 'conferencia'),
  118::numeric, 'conferência com divergência não altera o saldo depois');

select is(
  (select count(*)::int from public.extrato_material_periodo(
     'a0000000-0000-4000-8000-000000000001', '2026-11-01', '2026-11-01')),
  2, 'só os lançamentos do dia 01/11 (fuso da obra)');

select results_eq(
  $$ select saldo_inicio, entradas, saidas, saldo_fim, lancamentos
       from public.resumo_material_periodo('a0000000-0000-4000-8000-000000000001', '2026-11-01', '2026-11-01')
      where material_id = 'f0000000-0000-4000-8000-000000000001' $$,
  $$ values (0::numeric, 80::numeric, 0::numeric, 80::numeric, 1) $$,
  'resumo de 01/11: começa em 0, entram 80, termina em 80');

select results_eq(
  $$ select saldo_inicio, entradas, saldo_fim, lancamentos
       from public.resumo_material_periodo('a0000000-0000-4000-8000-000000000001', '2026-11-03', '2026-11-03')
      where material_id = 'f0000000-0000-4000-8000-000000000001' $$,
  $$ values (80::numeric, 38::numeric, 118::numeric, 2) $$,
  'resumo de 03/11: começa em 80, entram 38, termina em 118 (conferência conta como lançamento)');

select is(
  (select count(*)::int from public.resumo_material_periodo('a0000000-0000-4000-8000-000000000001', '2026-10-01', '2026-12-31') r
     join public.material m on m.id = r.material_id
    where r.saldo_fim <> m.saldo or r.saldo_inicio + r.entradas - r.saidas + r.ajustes <> r.saldo_fim),
  0, 'resumo fecha a conta: início + entradas − saídas + ajustes = fim = saldo atual');

select is(
  (select count(*)::int from public.extrato_material_periodo(
     'a0000000-0000-4000-8000-000000000001', '2026-10-01', '2026-10-31')),
  0, 'período sem lançamentos vem vazio');

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.extrato_material_periodo('a0000000-0000-4000-8000-000000000001', '2026-11-01', '2026-11-05') $$,
  '42501', null, 'anônimo não lê o extrato');
select throws_ok(
  $$ select * from public.resumo_material_periodo('a0000000-0000-4000-8000-000000000001', '2026-11-01', '2026-11-05') $$,
  '42501', null, 'anônimo não lê o resumo');

select * from finish();
rollback;
