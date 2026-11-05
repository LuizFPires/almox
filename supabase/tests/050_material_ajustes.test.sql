-- M13 · Ajustes da revisão final: "sem destino" do /avisos ignora envios de material;
-- saldo_visto inteiro para unidades inteiras na contagem. Usa o seed
-- (Obra Demonstração: engenheira b…01, almoxarife b…02).
begin;
select plan(7);

-- "Sem destino" ------------------------------------------------------------------------------------
-- Como postgres: zera os envios da obra para a conta ficar previsível.
delete from public.envio where obra_id = 'a0000000-0000-4000-8000-000000000001';
insert into public.envio (obra_id, tipo, canal, destino, referencia, status) values
  ('a0000000-0000-4000-8000-000000000001', 'limite_material', 'push',
   'b0000000-0000-4000-8000-000000000004', 'ad000000-0000-4000-8000-000000000061', 'sem_destino'),
  ('a0000000-0000-4000-8000-000000000001', 'pedido_cadastro_material', 'push',
   'b0000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000062', 'sem_destino'),
  ('a0000000-0000-4000-8000-000000000001', 'material_cadastrado', 'push',
   'b0000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000063', 'sem_destino');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  (public.envios_com_problema('a0000000-0000-4000-8000-000000000001') ->> 'semDestino')::int,
  0, 'envios de material sem destino não contam no aviso do engenheiro');
reset role;

insert into public.envio (obra_id, tipo, canal, destino, referencia, status) values
  ('a0000000-0000-4000-8000-000000000001', 'aviso', 'push',
   'b0000000-0000-4000-8000-000000000004', 'ad000000-0000-4000-8000-000000000064', 'sem_destino');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  (public.envios_com_problema('a0000000-0000-4000-8000-000000000001') ->> 'semDestino')::int,
  1, 'aviso de ferramenta sem destino continua contando');
reset role;

-- saldo_visto inteiro ------------------------------------------------------------------------------
insert into public.material (id, obra_id, nome, unidade, saldo) values
  ('ad000000-0000-4000-8000-000000000071', 'a0000000-0000-4000-8000-000000000001', 'Cimento', 'sc', 10),
  ('ad000000-0000-4000-8000-000000000072', 'a0000000-0000-4000-8000-000000000001', 'Tijolo', 'un', 10),
  ('ad000000-0000-4000-8000-000000000073', 'a0000000-0000-4000-8000-000000000001', 'Areia', 'm³', 10);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'conferir',
      '[{"material":"ad000000-0000-4000-8000-000000000071","saldo_visto":9.5,"contado":10}]')$$,
  '22023', null, 'saco: saldo visto fracionado é recusado');
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-000000000072","saldo_visto":10.25,"contado":10}]')$$,
  '22023', null, 'unidade: saldo visto fracionado é recusado');
select lives_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'conferir',
      '[{"material":"ad000000-0000-4000-8000-000000000071","saldo_visto":10,"contado":10}]')$$,
  'saco: saldo visto inteiro passa');
select lives_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'conferir',
      '[{"material":"ad000000-0000-4000-8000-000000000073","saldo_visto":9.75,"contado":10}]')$$,
  'm³: saldo visto fracionado continua valendo');
reset role;

select is(
  (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000072'),
  10.00::numeric(12,2), 'contagem recusada não mexe no saldo');

select * from finish();
rollback;
