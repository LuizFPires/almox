-- M13 · Materiais: contagem (ajustar ou só conferir). Usa o seed
-- (Obra Demonstração: engenheira b…01, almoxarife b…02, consulta b…03).
begin;
select plan(30);

-- Preparação como postgres. Obra 1, salvo a Areia de outra obra.
insert into public.material (id, obra_id, nome, unidade, saldo) values
  ('ad000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001', 'Cimento', 'sc', 118),
  ('ad000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000001', 'Pedrisco', 'm³', 12),
  ('ad000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000001', 'Cal', 'sc', 118),
  ('ad000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000001', 'Brita', 'm³', 50),
  ('ad000000-0000-4000-8000-000000000025', 'a0000000-0000-4000-8000-000000000001', 'Tijolo', 'un', 118),
  ('ad000000-0000-4000-8000-000000000026', 'a0000000-0000-4000-8000-000000000001', 'Ferro', 'barra', 10),
  ('ad000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-000000000001', 'Cola', 'lata', 3),
  ('ad000000-0000-4000-8000-000000000029', 'a0000000-0000-4000-8000-000000000002', 'Areia', 'm³', 5);
insert into public.material (id, obra_id, nome, unidade, saldo, aviso_tipo, aviso_valor) values
  ('ad000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-000000000001', 'Tubo', 'un', 30, 'quantidade', 20);
insert into public.material (id, obra_id, nome, unidade, ativo) values
  ('ad000000-0000-4000-8000-00000000002a', 'a0000000-0000-4000-8000-000000000001', 'Gesso', 'sc', false);

-- Consulta não conta ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":118,"contado":96}]')$$,
  '42501', null, 'consulta não registra contagem'
);
reset role;

-- Almoxarife -----------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

-- Ajustar: Cimento 118 → contou 96; Brita bateu (50).
select isnt(
  public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
    '[{"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":118,"contado":96},
      {"material":"ad000000-0000-4000-8000-000000000024","saldo_visto":50,"contado":50}]',
    'cd000000-0000-4000-8000-000000000001'),
  null, 'ajustar devolve o id da contagem'
);
select is(
  (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000021'),
  96.00::numeric(12,2), 'ajustar: saldo vira 96'
);
select results_eq(
  $$select e.tipo, e.quantidade from public.extrato_material e
     where e.material_id = 'ad000000-0000-4000-8000-000000000021'$$,
  $$values ('ajuste'::text, -22.00::numeric(12,2))$$,
  'ajustar: extrato tem um ajuste de -22'
);
select results_eq(
  $$select m.tipo, m.quantidade, (select saldo from public.material where id = m.material_id)
      from public.movimento_material m
     where m.material_id = 'ad000000-0000-4000-8000-000000000024'$$,
  $$values ('conferencia'::text, 0.00::numeric(12,2), 50.00::numeric(12,2))$$,
  'item que bateu: conferência com quantidade 0 e saldo igual'
);
select results_eq(
  $$select c.modo, c.usuario_id, (select count(*)::int from public.movimento_material m where m.contagem_id = c.id)
      from public.contagem_material c where c.chave_cliente = 'cd000000-0000-4000-8000-000000000001'$$,
  $$values ('ajustar'::text, 'b0000000-0000-4000-8000-000000000002'::uuid, 2)$$,
  'contagem gravada com modo, usuário e os dois itens'
);
select is(
  public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
    '[{"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":118,"contado":96},
      {"material":"ad000000-0000-4000-8000-000000000024","saldo_visto":50,"contado":50}]',
    'cd000000-0000-4000-8000-000000000001'),
  (select id from public.contagem_material where chave_cliente = 'cd000000-0000-4000-8000-000000000001'),
  'mesma chave devolve a mesma contagem'
);
select results_eq(
  $$select (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000021'),
           (select count(*)::int from public.movimento_material
             where material_id = 'ad000000-0000-4000-8000-000000000021')$$,
  $$values (96.00::numeric(12,2), 1)$$,
  'mesma chave não ajusta de novo'
);

-- Ajustar para cima: Pedrisco 12 → 15, sempre como ajuste (nunca entrada).
do $$ begin perform public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
  '[{"material":"ad000000-0000-4000-8000-000000000022","saldo_visto":12,"contado":15}]'); end $$;
select results_eq(
  $$select m.tipo, m.quantidade, (select saldo from public.material where id = m.material_id),
           (select estoque_cheio from public.material where id = m.material_id)
      from public.movimento_material m
     where m.material_id = 'ad000000-0000-4000-8000-000000000022'$$,
  $$values ('ajuste'::text, 3.00::numeric(12,2), 15.00::numeric(12,2), 0.00::numeric(12,2))$$,
  'ajustar para cima: ajuste de +3, saldo 15, estoque cheio não muda'
);

-- Conferir: Cal 118 → contou 96, saldo não mexe.
do $$ begin perform public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'conferir',
  '[{"material":"ad000000-0000-4000-8000-000000000023","saldo_visto":118,"contado":96}]'); end $$;
select is(
  (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000023'),
  118.00::numeric(12,2), 'conferir: saldo continua 118'
);
select results_eq(
  $$select m.tipo, m.quantidade, c.modo from public.movimento_material m
      join public.contagem_material c on c.id = m.contagem_id
     where m.material_id = 'ad000000-0000-4000-8000-000000000023'$$,
  $$values ('conferencia'::text, -22.00::numeric(12,2), 'conferir'::text)$$,
  'conferir: conferência de -22'
);

-- Saída no meio: viu 118, saiu 10 (saldo 108) antes do envio, contou 96 → ajuste -22, saldo 86.
do $$ begin perform public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
  'ad000000-0000-4000-8000-000000000025', 10); end $$;
select is(
  (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000025'),
  108.00::numeric(12,2), 'saída no meio: saldo 108 antes da contagem'
);
do $$ begin perform public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
  '[{"material":"ad000000-0000-4000-8000-000000000025","saldo_visto":118,"contado":96}]'); end $$;
select results_eq(
  $$select m.quantidade, (select saldo from public.material where id = m.material_id)
      from public.movimento_material m
     where m.material_id = 'ad000000-0000-4000-8000-000000000025' and m.tipo = 'ajuste'$$,
  $$values (-22.00::numeric(12,2), 86.00::numeric(12,2))$$,
  'saída no meio: ajuste de -22 e saldo 86'
);

-- Ajuste que deixaria o saldo negativo: a contagem inteira volta.
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-000000000028","saldo_visto":3,"contado":2},
        {"material":"ad000000-0000-4000-8000-000000000026","saldo_visto":118,"contado":0}]',
      'cd000000-0000-4000-8000-000000000002')$$,
  'AL101', 'Saldo insuficiente: só tem 10 barra de Ferro.', 'ajuste abaixo de zero falha com AL101'
);
select results_eq(
  $$select (select count(*)::int from public.contagem_material
             where chave_cliente = 'cd000000-0000-4000-8000-000000000002'),
           (select count(*)::int from public.movimento_material
             where material_id in ('ad000000-0000-4000-8000-000000000028', 'ad000000-0000-4000-8000-000000000026')),
           (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000028'),
           (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000026')$$,
  $$values (0, 0, 3.00::numeric(12,2), 10.00::numeric(12,2))$$,
  'AL101: nenhum item da contagem gravado'
);

-- Contado 0 é válido.
do $$ begin perform public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
  '[{"material":"ad000000-0000-4000-8000-000000000028","saldo_visto":3,"contado":0}]'); end $$;
select is(
  (select saldo from public.material where id = 'ad000000-0000-4000-8000-000000000028'),
  0.00::numeric(12,2), 'contado 0 zera o saldo'
);

-- Ajuste que cruza o limite (Tubo 30 → 15, limite 20) dispara o aviso.
do $$ begin perform public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
  '[{"material":"ad000000-0000-4000-8000-000000000027","saldo_visto":30,"contado":15}]'); end $$;
select results_eq(
  $$select saldo, aviso_disparado from public.material where id = 'ad000000-0000-4000-8000-000000000027'$$,
  $$values (15.00::numeric(12,2), true)$$,
  'ajuste que cruza o limite marca o aviso como disparado'
);

-- Entradas inválidas.
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-00000000002a","saldo_visto":0,"contado":1}]')$$,
  'AL103', null, 'material inativo não entra na contagem'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-000000000029","saldo_visto":5,"contado":5}]')$$,
  'P0002', null, 'material de outra obra não é encontrado'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":96,"contado":95.5}]')$$,
  '22023', null, 'saco não aceita contado com decimal'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":96,"contado":-1}]')$$,
  '22023', null, 'contado negativo falha'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":-1,"contado":96}]')$$,
  '22023', null, 'saldo visto negativo falha'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar', '[]')$$,
  '22023', null, 'contagem sem itens falha'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      (select jsonb_agg(jsonb_build_object('material', 'ad000000-0000-4000-8000-000000000021',
                                           'saldo_visto', 96, 'contado', 96))
         from generate_series(1, 501)))$$,
  '22023', null, 'mais de 500 itens falha'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'zerar',
      '[{"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":96,"contado":96}]')$$,
  '22023', null, 'modo desconhecido falha'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":96,"contado":90},
        {"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":96,"contado":90}]')$$,
  '22023', null, 'material repetido na contagem falha'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"nao-e-uuid","saldo_visto":96,"contado":96}]')$$,
  '22023', null, 'material que não é uuid falha'
);
select throws_ok(
  $$select public.registrar_contagem_material('a0000000-0000-4000-8000-000000000001', 'ajustar',
      '[{"material":"ad000000-0000-4000-8000-000000000021","saldo_visto":96,"contado":96}]',
      null, now() - interval '25 hours')$$,
  'AL107', null, 'hora do aparelho de 25 h atrás falha'
);
reset role;

-- Envios (só postgres lê a fila) ----------------------------------------------------------------
select is(
  (select count(*)::int from public.envio e
     join public.movimento_material m on m.id = e.referencia
    where e.tipo = 'limite_material' and e.canal = 'push' and m.tipo = 'ajuste'
      and m.material_id = 'ad000000-0000-4000-8000-000000000027'),
  (select count(*)::int from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'ajuste que cruza o limite gera um envio para cada usuário da obra (referência = o ajuste)'
);
select ok(
  (select count(*) from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001') > 0,
  'a obra tem usuários para receber o envio'
);

select * from finish();
rollback;
