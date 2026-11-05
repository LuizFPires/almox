-- M13 · Materiais: tabelas, RLS, imutabilidade e extrato. Usa o seed (Obra Demonstração).
begin;
select plan(16);

select has_table('public', 'material', 'tabela material existe');
select has_table('public', 'contagem_material', 'tabela contagem_material existe');
select has_table('public', 'movimento_material', 'tabela movimento_material existe');
select has_table('public', 'movimento_material_versao', 'tabela movimento_material_versao existe');
select has_table('public', 'pedido_cadastro_material', 'tabela pedido_cadastro_material existe');
select has_view('public', 'extrato_material', 'view extrato_material existe');

-- Dados como postgres (escrita real só por RPC, nas próximas tarefas).
insert into public.material (id, obra_id, nome, unidade, saldo, estoque_cheio)
values ('ad000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Cimento CP-II', 'sc', 40, 40),
       ('ad000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Areia média', 'm³', 5, 5);
insert into public.movimento_material (id, obra_id, material_id, tipo, quantidade, usuario_id)
values ('ae000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
        'ad000000-0000-4000-8000-000000000001', 'entrada', 40, 'b0000000-0000-4000-8000-000000000002'),
       ('ae000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
        'ad000000-0000-4000-8000-000000000001', 'saida', -5, 'b0000000-0000-4000-8000-000000000002');
insert into public.movimento_material_versao (movimento_id, quantidade, motivo, usuario_id)
values ('ae000000-0000-4000-8000-000000000002', -3, 'Contei errado', 'b0000000-0000-4000-8000-000000000001');

select throws_ok(
  $$update public.movimento_material set quantidade = 41 where id = 'ae000000-0000-4000-8000-000000000001'$$,
  'P0001', null, 'movimento de material é imutável'
);
select throws_ok(
  $$insert into public.material (obra_id, nome, unidade, saldo)
    values ('a0000000-0000-4000-8000-000000000001', 'Brita', 'm³', -1)$$,
  '23514', null, 'saldo negativo falha no check'
);
select throws_ok(
  $$insert into public.material (obra_id, nome, unidade)
    values ('a0000000-0000-4000-8000-000000000001', 'cimento cp-ii', 'sc')$$,
  '23505', null, 'nome repetido na obra (sem diferença de maiúsculas) falha'
);
select throws_ok(
  $$insert into public.movimento_material (obra_id, material_id, tipo, quantidade, usuario_id)
    values ('a0000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', 'saida', 5,
            'b0000000-0000-4000-8000-000000000002')$$,
  '23514', null, 'saída com quantidade positiva falha no check de sinal'
);

-- Almoxarife: lê a própria obra, não escreve, não vê a obra 2 --------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.material (obra_id, nome, unidade)
    values ('a0000000-0000-4000-8000-000000000001', 'Brita', 'm³')$$,
  '42501', null, 'almoxarife não insere material direto'
);
select is(
  (select count(*)::int from public.material where obra_id = 'a0000000-0000-4000-8000-000000000002'),
  0, 'sem vínculo com a obra 2 não lê materiais dela'
);
select results_eq(
  $$select tipo, quantidade_original, quantidade, apagado, editado_por_nome, usuario_nome
      from public.extrato_material where material_id = 'ad000000-0000-4000-8000-000000000001'
     order by tipo$$,
  $$values ('entrada'::text, 40.00::numeric(12,2), 40.00::numeric(12,2), false, null::text, 'Sebastião Nunes'::text),
           ('saida'::text, -5.00::numeric(12,2), -3.00::numeric(12,2), false, 'Helena Duarte'::text, 'Sebastião Nunes'::text)$$,
  'extrato mostra a quantidade vigente e os nomes'
);
select is(
  (select count(*)::int from public.movimento_material_versao),
  1, 'almoxarife lê as versões dos movimentos da obra'
);
reset role;

-- Consulta restrita (dono de empreiteira) lê os materiais da obra 1 -------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.material where id = 'ad000000-0000-4000-8000-000000000001'),
  1, 'consulta restrita lê os materiais da obra 1'
);
reset role;

-- Apagado: versão com quantidade 0 ---------------------------------------------------------
insert into public.movimento_material_versao (movimento_id, quantidade, motivo, usuario_id)
values ('ae000000-0000-4000-8000-000000000002', 0, 'Lançado por engano', 'b0000000-0000-4000-8000-000000000001');
select is(
  (select apagado from public.extrato_material where id = 'ae000000-0000-4000-8000-000000000002'),
  true, 'versão com quantidade 0 marca o lançamento como apagado'
);

select * from finish();
rollback;
