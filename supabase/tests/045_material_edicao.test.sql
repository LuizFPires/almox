-- M13 · Materiais: edição e exclusão de lançamentos pelo engenheiro. Usa o seed
-- (Obra Demonstração: engenheira b…01 Helena Duarte, almoxarife b…02, consulta b…03;
-- a engenheira é só consulta na obra 2).
begin;
select plan(40);

-- Preparação como postgres: Cimento (sc) com aviso por quantidade 20; Brita (m³) sem aviso;
-- Cal inativa com um lançamento; Areia da obra 2 com um lançamento.
insert into public.material (id, obra_id, nome, unidade, aviso_tipo, aviso_valor) values
  ('ad000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000001', 'Cimento', 'sc', 'quantidade', 20);
-- Brita: entrada 500 (há 2 h) e saída 382 (há 1 h) → saldo 118, estoque cheio 500. As horas são
-- explícitas porque dentro do teste tudo tem o mesmo now() e a "última entrada" depende da ordem.
insert into public.material (id, obra_id, nome, unidade, saldo, estoque_cheio) values
  ('ad000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000001', 'Brita', 'm³', 118, 500);
insert into public.movimento_material (obra_id, material_id, tipo, quantidade, usuario_id, criado_em, chave_cliente) values
  ('a0000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000032', 'entrada', 500,
   'b0000000-0000-4000-8000-000000000002', now() - interval '2 hours', 'ce000000-0000-4000-8000-000000000011'),
  ('a0000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000032', 'saida', -382,
   'b0000000-0000-4000-8000-000000000002', now() - interval '1 hour', 'ce000000-0000-4000-8000-000000000012');
insert into public.material (id, obra_id, nome, unidade, saldo, ativo) values
  ('ad000000-0000-4000-8000-000000000033', 'a0000000-0000-4000-8000-000000000001', 'Cal', 'sc', 10, false);
insert into public.material (id, obra_id, nome, unidade, saldo) values
  ('ad000000-0000-4000-8000-000000000034', 'a0000000-0000-4000-8000-000000000002', 'Areia', 'm³', 5);
insert into public.movimento_material (id, obra_id, material_id, tipo, quantidade, usuario_id) values
  ('ae000000-0000-4000-8000-000000000033', 'a0000000-0000-4000-8000-000000000001',
   'ad000000-0000-4000-8000-000000000033', 'entrada', 10, 'b0000000-0000-4000-8000-000000000002'),
  ('ae000000-0000-4000-8000-000000000034', 'a0000000-0000-4000-8000-000000000002',
   'ad000000-0000-4000-8000-000000000034', 'entrada', 5, 'b0000000-0000-4000-8000-000000000002');

-- Almoxarife lança ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  -- Cimento: entrada 118, saída 100 → saldo 18 (aviso disparado).
  perform public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
    'ad000000-0000-4000-8000-000000000031', 118, 'ce000000-0000-4000-8000-000000000001');
  perform public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
    'ad000000-0000-4000-8000-000000000031', 100, 'ce000000-0000-4000-8000-000000000002');
  -- Conferência do Cimento (só conferir).
  perform public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'conferir',
    '[{"material":"ad000000-0000-4000-8000-000000000031","saldo_visto":18,"contado":17}]');
end $$;
select results_eq(
  $$select saldo, aviso_disparado from public.material where id = 'ad000000-0000-4000-8000-000000000031'$$,
  $$values (18.00::numeric(12,2), true)$$,
  'preparação: Cimento com saldo 18 e aviso disparado'
);

-- Almoxarife não edita.
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002'), -90)$$,
  '42501', null, 'almoxarife não edita lançamento'
);
reset role;

-- Consulta não edita.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002'), -90)$$,
  '42501', null, 'consulta não edita lançamento'
);
reset role;

-- Engenheira ---------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- Saída −100 → −90: saldo +10 (28 > 20) e o aviso rearma.
select lives_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002'),
      -90, '  contei errado  ')$$,
  'engenheira muda a saída de -100 para -90'
);
select results_eq(
  $$select saldo, aviso_disparado from public.material where id = 'ad000000-0000-4000-8000-000000000031'$$,
  $$values (28.00::numeric(12,2), false)$$,
  'saldo +10 (28) e o aviso rearma'
);
select results_eq(
  $$select e.quantidade, e.quantidade_original, e.apagado, e.desfeito, e.editado_por_nome, e.editado_em is not null
      from public.extrato_material e
     where e.id = (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002')$$,
  $$values (-90.00::numeric(12,2), -100.00::numeric(12,2), false, false, 'Helena Duarte'::text, true)$$,
  'extrato: quantidade -90, original -100, editado pela engenheira'
);
select results_eq(
  $$select v.quantidade, v.motivo, v.desfeito, v.usuario_id from public.movimento_material_versao v
     where v.movimento_id = (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002')$$,
  $$values (-90.00::numeric(12,2), 'contei errado'::text, false, 'b0000000-0000-4000-8000-000000000001'::uuid)$$,
  'versão gravada com motivo sem espaços, desfeito = false e a engenheira'
);
select is(
  (select estoque_cheio from public.material where id = 'ad000000-0000-4000-8000-000000000031'),
  118.00::numeric(12,2), 'editar uma saída não mexe no estoque cheio'
);

-- Volta para −100: cruza o limite de novo e dispara um novo aviso.
select lives_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002'),
      -100, '   ')$$,
  'engenheira volta a saída para -100'
);
select results_eq(
  $$select saldo, aviso_disparado from public.material where id = 'ad000000-0000-4000-8000-000000000031'$$,
  $$values (18.00::numeric(12,2), true)$$,
  'saldo 18 e o aviso dispara de novo'
);
select is(
  (select v.motivo from public.movimento_material_versao v
     where v.movimento_id = (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002')
     order by v.criado_em desc limit 1),
  null, 'motivo só com espaços vira null'
);

-- Entradas inválidas.
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000001'), -5)$$,
  '22023', null, 'entrada não pode ficar negativa'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002'), 5)$$,
  '22023', null, 'saída não pode ficar positiva'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002'), -90.5)$$,
  '22023', null, 'saco não aceita decimal'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000001'), 1000000)$$,
  '22023', null, 'acima de 999999 falha'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002'), null)$$,
  '22023', null, 'quantidade nula falha'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002'),
      -90, repeat('x', 201))$$,
  '22023', null, 'motivo com mais de 200 letras falha'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material
        where material_id = 'ad000000-0000-4000-8000-000000000031' and tipo = 'conferencia'), 0)$$,
  'AL106', null, 'conferência não é editável'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      'ae000000-0000-4000-8000-000000000033', 5)$$,
  'AL103', null, 'lançamento de material inativo não é editável'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      'ae000000-0000-4000-8000-000000000034', 4)$$,
  'P0002', null, 'lançamento de outra obra não é encontrado'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000002',
      'ae000000-0000-4000-8000-000000000034', 4)$$,
  '42501', null, 'engenheira que é só consulta na outra obra não edita'
);
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      'ae000000-0000-4000-8000-0000000000ff', 4)$$,
  'P0002', null, 'lançamento inexistente não é encontrado'
);

-- Brita: apagar a entrada de 500 com saldo 118 → AL101.
select throws_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000011'), 0)$$,
  'AL101', 'Saldo insuficiente: só tem 118 m³ de Brita.', 'apagar a entrada de 500 com saldo 118 falha'
);
select results_eq(
  $$select saldo, estoque_cheio,
           (select count(*)::int from public.movimento_material_versao v
              join public.movimento_material m on m.id = v.movimento_id
             where m.material_id = 'ad000000-0000-4000-8000-000000000032')
      from public.material where id = 'ad000000-0000-4000-8000-000000000032'$$,
  $$values (118.00::numeric(12,2), 500.00::numeric(12,2), 0)$$,
  'AL101: nada gravado'
);

-- Apagar a saída de 382: apagado e saldo recomposto (500).
select lives_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000012'),
      0, 'lançado em dobro')$$,
  'engenheira apaga a saída'
);
select results_eq(
  $$select e.apagado, e.quantidade, (select saldo from public.material where id = e.material_id)
      from public.extrato_material e
     where e.id = (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000012')$$,
  $$values (true, 0.00::numeric(12,2), 500.00::numeric(12,2))$$,
  'saída apagada e saldo volta a 500'
);

-- Uma saída apagada pode voltar a valer (−100) → saldo 400.
select lives_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000012'), -100)$$,
  'engenheira volta a saída apagada para -100'
);
select results_eq(
  $$select e.apagado, e.quantidade, (select saldo from public.material where id = e.material_id)
      from public.extrato_material e
     where e.id = (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000012')$$,
  $$values (false, -100.00::numeric(12,2), 400.00::numeric(12,2))$$,
  'saída volta a valer e o saldo vai a 400'
);

-- Editar a última entrada (500 → 450) muda o estoque cheio junto.
select lives_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000011'), 450)$$,
  'engenheira muda a última entrada de 500 para 450'
);
select results_eq(
  $$select saldo, estoque_cheio from public.material where id = 'ad000000-0000-4000-8000-000000000032'$$,
  $$values (350.00::numeric(12,2), 450.00::numeric(12,2))$$,
  'última entrada: saldo 350 e estoque cheio 450'
);
reset role;

-- Nova entrada de 50 (há 30 min, como postgres pela hora explícita): saldo 400, estoque cheio 400.
insert into public.movimento_material (obra_id, material_id, tipo, quantidade, usuario_id, criado_em, chave_cliente) values
  ('a0000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000032', 'entrada', 50,
   'b0000000-0000-4000-8000-000000000002', now() - interval '30 minutes', 'ce000000-0000-4000-8000-000000000013');
update public.material set saldo = saldo + 50, estoque_cheio = saldo + 50
 where id = 'ad000000-0000-4000-8000-000000000032';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- Editar uma entrada antiga (450 → 440) não mexe no estoque cheio.
select lives_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000011'), 440)$$,
  'engenheira muda uma entrada antiga'
);
select results_eq(
  $$select saldo, estoque_cheio from public.material where id = 'ad000000-0000-4000-8000-000000000032'$$,
  $$values (390.00::numeric(12,2), 400.00::numeric(12,2))$$,
  'entrada antiga: saldo 390 e estoque cheio continua 400'
);

-- Apagar a última entrada (50): estoque cheio −50.
select lives_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000013'), 0)$$,
  'engenheira apaga a última entrada'
);
select results_eq(
  $$select saldo, estoque_cheio from public.material where id = 'ad000000-0000-4000-8000-000000000032'$$,
  $$values (340.00::numeric(12,2), 350.00::numeric(12,2))$$,
  'última entrada apagada: saldo 340 e estoque cheio 350'
);

-- Com a última apagada, a entrada antiga volta a ser a última não apagada (440 → 445).
select lives_ok(
  $$select public.editar_movimento_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000011'), 445)$$,
  'engenheira muda a entrada que voltou a ser a última'
);
select results_eq(
  $$select saldo, estoque_cheio from public.material where id = 'ad000000-0000-4000-8000-000000000032'$$,
  $$values (345.00::numeric(12,2), 355.00::numeric(12,2))$$,
  'entrada que voltou a ser a última: saldo 345 e estoque cheio 355'
);
reset role;

-- Envios e imutabilidade (como postgres) ------------------------------------------------------
select is(
  (select count(*)::int from public.envio e
    where e.tipo = 'limite_material'
      and e.dados ->> 'material' = 'ad000000-0000-4000-8000-000000000031'),
  2 * (select count(*)::int from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'o aviso disparado de novo pela edição gera novos envios (não engolidos pelo anterior)'
);
select is(
  (select count(*)::int from public.envio e
    where e.tipo = 'limite_material'
      and e.dados ->> 'material' = 'ad000000-0000-4000-8000-000000000031'
      and e.referencia = (select id from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000002')),
  (select count(*)::int from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'os envios da edição usam outra referência'
);
select is(
  (select quantidade from public.movimento_material where chave_cliente = 'ce000000-0000-4000-8000-000000000012'),
  -382.00::numeric(12,2), 'o lançamento original não muda'
);

-- Grants.
select ok(
  not has_function_privilege('anon', 'public.editar_movimento_material(uuid, uuid, numeric, text)', 'execute')
  and has_function_privilege('authenticated', 'public.editar_movimento_material(uuid, uuid, numeric, text)', 'execute'),
  'só authenticated executa editar_movimento_material'
);

select * from finish();
rollback;
