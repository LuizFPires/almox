-- M13 · Materiais: entrada, saída, desfazer e disparo do aviso de limite. Usa o seed
-- (Obra Demonstração: engenheira b…01, almoxarife b…02, consulta b…03).
begin;
select plan(26);

-- Preparação como postgres: Cimento (sc) com aviso por quantidade 20 e saldo 0; Areia de outra
-- obra; Cal inativa.
insert into public.material (id, obra_id, nome, unidade, aviso_tipo, aviso_valor)
values ('ad000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'Cimento', 'sc', 'quantidade', 20);
insert into public.material (id, obra_id, nome, unidade)
values ('ad000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', 'Areia', 'm³');
insert into public.material (id, obra_id, nome, unidade, ativo)
values ('ad000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'Cal', 'sc', false);

-- Consulta não lança --------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
      'ad000000-0000-4000-8000-000000000011', 10)$$,
  '42501', null, 'consulta não lança entrada'
);
reset role;

-- Almoxarife -----------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select isnt(
  public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
    'ad000000-0000-4000-8000-000000000011', 118, 'cc000000-0000-4000-8000-000000000001'),
  null, 'almoxarife lança entrada de 118'
);
select results_eq(
  $$select saldo, estoque_cheio from public.material where id = 'ad000000-0000-4000-8000-000000000011'$$,
  $$values (118.00::numeric(12,2), 118.00::numeric(12,2))$$,
  'entrada: saldo 118 e estoque cheio 118'
);
select is(
  public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
    'ad000000-0000-4000-8000-000000000011', 118, 'cc000000-0000-4000-8000-000000000001'),
  (select id from public.movimento_material where chave_cliente = 'cc000000-0000-4000-8000-000000000001'),
  'mesma chave devolve o mesmo lançamento'
);
select is(
  (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000011'),
  118.00::numeric(12,2), 'mesma chave não soma de novo'
);
select throws_ok(
  $$select public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
      'ad000000-0000-4000-8000-000000000011', 1.5)$$,
  '22023', null, 'saco não aceita decimal'
);
select throws_ok(
  $$select public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
      'ad000000-0000-4000-8000-000000000011', 0)$$,
  '22023', null, 'quantidade zero falha'
);
select throws_ok(
  $$select public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
      'ad000000-0000-4000-8000-000000000012', 1)$$,
  'P0002', null, 'material de outra obra não é encontrado'
);
select throws_ok(
  $$select public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
      'ad000000-0000-4000-8000-000000000013', 1)$$,
  'AL103', null, 'material inativo não lança'
);

-- Saída de 100: cruza o limite (20) e dispara o aviso.
select is(
  (public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
    'ad000000-0000-4000-8000-000000000011', 100, 'cc000000-0000-4000-8000-000000000002')) ->> 'aviso',
  'true', 'saída de 100 dispara o aviso'
);
select results_eq(
  $$select saldo, aviso_disparado from public.material where id = 'ad000000-0000-4000-8000-000000000011'$$,
  $$values (18.00::numeric(12,2), true)$$,
  'saldo 18 e aviso disparado'
);
select is(
  (select quantidade from public.movimento_material where chave_cliente = 'cc000000-0000-4000-8000-000000000002'),
  -100.00::numeric(12,2), 'saída grava quantidade negativa'
);

-- Saída de 1: já disparado, não avisa de novo.
select is(
  (public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
    'ad000000-0000-4000-8000-000000000011', 1, 'cc000000-0000-4000-8000-000000000003')) ->> 'aviso',
  'false', 'saída de 1 não dispara de novo'
);
select throws_ok(
  $$select public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
      'ad000000-0000-4000-8000-000000000011', 50)$$,
  'AL101', 'Saldo insuficiente: só tem 17 sc de Cimento.', 'saída maior que o saldo falha'
);
select is(
  (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000011'),
  17.00::numeric(12,2), 'saldo continua 17'
);
reset role;

-- Envios (só postgres lê a fila) ----------------------------------------------------------------
select is(
  (select count(*)::int from public.envio e
     join public.movimento_material m on m.id = e.referencia
    where e.tipo = 'limite_material' and e.canal = 'push'
      and m.chave_cliente = 'cc000000-0000-4000-8000-000000000002'),
  (select count(*)::int from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'um push de limite para cada usuário da obra'
);
select is(
  (select count(*)::int from public.envio where tipo = 'limite_material'),
  (select count(*)::int from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'saída de 1 não criou envio novo'
);

-- Entrada de 10 rearma; desfazer -------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin perform public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
  'ad000000-0000-4000-8000-000000000011', 10); end $$;
select results_eq(
  $$select saldo, estoque_cheio, aviso_disparado from public.material where id = 'ad000000-0000-4000-8000-000000000011'$$,
  $$values (27.00::numeric(12,2), 27.00::numeric(12,2), false)$$,
  'entrada de 10: saldo 27 acima do limite rearma o aviso'
);

select lives_ok(
  $$select public.desfazer_saida_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'cc000000-0000-4000-8000-000000000003'))$$,
  'almoxarife desfaz a própria saída'
);
select results_eq(
  $$select (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000011'),
           e.quantidade, e.desfeito
      from public.extrato_material e
     where e.id = (select id from public.movimento_material where chave_cliente = 'cc000000-0000-4000-8000-000000000003')$$,
  $$values (28.00::numeric(12,2), 0.00::numeric(12,2), true)$$,
  'desfazer devolve 1 ao saldo e marca o lançamento como desfeito'
);
select throws_ok(
  $$select public.desfazer_saida_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'cc000000-0000-4000-8000-000000000003'))$$,
  'AL102', null, 'não desfaz duas vezes'
);
do $$ begin perform public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
  'ad000000-0000-4000-8000-000000000011', 2, 'cc000000-0000-4000-8000-000000000004'); end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.desfazer_saida_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'cc000000-0000-4000-8000-000000000004'))$$,
  'AL102', null, 'engenheiro não desfaz a saída do almoxarife'
);
reset role;

-- Saída de 2 minutos atrás: movimento é imutável, então é inserido direto (como postgres) com
-- criado_em antigo, e o saldo acompanha.
insert into public.movimento_material (id, obra_id, material_id, tipo, quantidade, usuario_id, criado_em)
values ('ae000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001',
        'ad000000-0000-4000-8000-000000000011', 'saida', -1, 'b0000000-0000-4000-8000-000000000002',
        now() - interval '2 minutes');
update public.material set saldo = saldo - 1 where id = 'ad000000-0000-4000-8000-000000000011';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.desfazer_saida_material('a0000000-0000-4000-8000-000000000001',
      'ae000000-0000-4000-8000-000000000011')$$,
  'AL102', null, 'saída de 2 minutos atrás não se desfaz'
);
select throws_ok(
  $$select public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
      'ad000000-0000-4000-8000-000000000011', 1, null, now() - interval '25 hours')$$,
  'AL107', null, 'hora do aparelho de 25 h atrás falha'
);
do $$ begin perform public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
  'ad000000-0000-4000-8000-000000000011', 5, 'cc000000-0000-4000-8000-000000000005', now() - interval '2 hours'); end $$;
select results_eq(
  $$select criado_em = now(), registrado_no_aparelho_em = now() - interval '2 hours'
      from public.movimento_material where chave_cliente = 'cc000000-0000-4000-8000-000000000005'$$,
  $$values (true, true)$$,
  'hora do aparelho vai para registrado_no_aparelho_em; criado_em é a chegada'
);
select is(
  (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000011'),
  (select sum(quantidade) from public.extrato_material
    where material_id = 'ad000000-0000-4000-8000-000000000011' and tipo <> 'conferencia'),
  'saldo = soma do extrato'
);
reset role;

select * from finish();
rollback;
