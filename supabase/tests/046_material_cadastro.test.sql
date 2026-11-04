-- M13 · Materiais: cadastro de material, aviso de limite e pedido de cadastro. Usa o seed
-- (Obra Demonstração: engenheira b…01, almoxarife b…02, consulta b…03, consulta b…04).
begin;
select plan(46);

-- Engenheira -----------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select isnt(
  public.salvar_material('a0000000-0000-4000-8000-000000000001', null, '  Cimento   CP-II 50 kg ', 'sc'),
  null, 'engenheira cria o Cimento'
);
select results_eq(
  $$select nome, unidade, ativo from public.material where obra_id = 'a0000000-0000-4000-8000-000000000001'$$,
  $$values ('Cimento CP-II 50 kg'::text, 'sc'::text, true)$$,
  'nome gravado sem espaços sobrando'
);
select throws_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001', null, 'cimento cp-ii 50 KG', 'sc')$$,
  'AL104', null, 'nome repetido (maiúsculas) → AL104'
);
select throws_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001', null, 'cimento  cp-ii 50 kg', 'sc')$$,
  'AL104', null, 'nome repetido (espaços internos) → AL104'
);
select throws_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001', null, 'Areia', 'saco')$$,
  '22023', null, 'unidade fora da lista → 22023'
);
select throws_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001', null, 'A', 'sc')$$,
  '22023', null, 'nome curto → 22023'
);
select throws_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000002', null, 'Areia', 'm³')$$,
  '42501', null, 'engenheira não cria em obra onde é só consulta'
);
reset role;

-- Almoxarife não cria nem mexe em aviso --------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001', null, 'Areia', 'm³')$$,
  '42501', null, 'almoxarife cria → 42501'
);
select throws_ok(
  $$select public.salvar_aviso_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Cimento CP-II 50 kg'), 'quantidade', 20)$$,
  '42501', null, 'almoxarife salva aviso → 42501'
);
-- Entrada de 18 para dar saldo ao Cimento (sem aviso ainda).
select isnt(
  public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
    (select id from public.material where nome = 'Cimento CP-II 50 kg'), 18),
  null, 'almoxarife lança entrada de 18'
);
reset role;

-- Aviso -----------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$select public.salvar_aviso_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Cimento CP-II 50 kg'), 'quantidade', 20)$$,
  'aviso de 20 com saldo 18'
);
select results_eq(
  $$select aviso_tipo, aviso_valor, aviso_disparado from public.material where nome = 'Cimento CP-II 50 kg'$$,
  $$values ('quantidade'::text, 20.00::numeric(12,2), true)$$,
  'aviso salvo e já disparado'
);
reset role;
select is(
  (select count(*) from public.envio where tipo = 'limite_material'
      and dados ->> 'material' = (select id::text from public.material where nome = 'Cimento CP-II 50 kg')),
  (select count(*) from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  '1 envio por usuário da obra'
);
select is(
  (select count(distinct destino) from public.envio where tipo = 'limite_material'),
  (select count(*) from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'um destino por usuário'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.salvar_aviso_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Cimento CP-II 50 kg'), 'quantidade', 20)$$,
  'salvar de novo com 20'
);
reset role;
select is(
  (select count(*) from public.envio where tipo = 'limite_material'),
  (select count(*) from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'salvar de novo não gera envio novo'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.salvar_aviso_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Cimento CP-II 50 kg'), 'quantidade', 10)$$,
  'aviso de 10 (saldo 18)'
);
select is(
  (select aviso_disparado from public.material where nome = 'Cimento CP-II 50 kg'),
  false, 'saldo acima do limite → aviso desarmado'
);
select throws_ok(
  $$select public.salvar_aviso_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Cimento CP-II 50 kg'), 'percentual', 150)$$,
  '22023', null, 'percentual de 150 → 22023'
);
select throws_ok(
  $$select public.salvar_aviso_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Cimento CP-II 50 kg'), 'litros', 5)$$,
  '22023', null, 'tipo de aviso inválido → 22023'
);
select throws_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Cimento CP-II 50 kg'), 'Cimento CP-II 50 kg', 'kg')$$,
  '22023', null, 'trocar a unidade com lançamentos → 22023'
);
select throws_ok(
  $$select public.inativar_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Cimento CP-II 50 kg'))$$,
  'AL105', null, 'inativar com saldo 18 → AL105'
);
-- Renomeia (o log deve registrar o nome).
select lives_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Cimento CP-II 50 kg'), 'Cimento CP-II', 'sc')$$,
  'engenheira renomeia o Cimento'
);
-- Material sem saldo: inativa.
select lives_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001', null, 'Brita 1', 'm³')$$,
  'engenheira cria a Brita'
);
select lives_ok(
  $$select public.inativar_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Brita 1'))$$,
  'inativar com saldo 0'
);
select is(
  (select ativo from public.material where nome = 'Brita 1'), false, 'Brita inativa'
);
reset role;

-- Pedido de cadastro ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select isnt(
  public.pedir_cadastro_material('a0000000-0000-4000-8000-000000000001', ' Cal hidratada '),
  null, 'almoxarife pede "Cal hidratada"'
);
select throws_ok(
  $$select public.pedir_cadastro_material('a0000000-0000-4000-8000-000000000001', 'C')$$,
  '22023', null, 'pedido com nome curto → 22023'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.pedir_cadastro_material('a0000000-0000-4000-8000-000000000001', 'Areia')$$,
  '42501', null, 'consulta não pede cadastro'
);
reset role;

select results_eq(
  $$select destino, dados ->> 'nome', dados ->> 'quem' from public.envio where tipo = 'pedido_cadastro_material'$$,
  $$values ('b0000000-0000-4000-8000-000000000001'::text, 'Cal hidratada'::text,
            'b0000000-0000-4000-8000-000000000002'::text)$$,
  'pedido: envio só para a engenheira'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001', null, 'Cal hidratada', 'sc',
      (select id from public.pedido_cadastro_material where nome = 'Cal hidratada'))$$,
  'engenheira cadastra a partir do pedido'
);
select throws_ok(
  $$select public.dispensar_pedido_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.pedido_cadastro_material where nome = 'Cal hidratada'))$$,
  '22023', null, 'pedido já resolvido não é dispensado'
);
select results_eq(
  $$select p.status, p.material_id = m.id, p.resolvido_em is not null
      from public.pedido_cadastro_material p, public.material m
     where p.nome = 'Cal hidratada' and m.nome = 'Cal hidratada'$$,
  $$values ('cadastrado'::text, true, true)$$,
  'pedido cadastrado e ligado ao material'
);
reset role;

select results_eq(
  $$select destino, dados ->> 'nome', referencia = (select id from public.pedido_cadastro_material where nome = 'Cal hidratada')
      from public.envio where tipo = 'material_cadastrado'$$,
  $$values ('b0000000-0000-4000-8000-000000000002'::text, 'Cal hidratada'::text, true)$$,
  'material_cadastrado para o almoxarife'
);

-- Aviso antes da primeira entrada não dispara ------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001', null, 'Areia média', 'm³')$$,
  'engenheira cria a Areia'
);
select lives_ok(
  $$select public.salvar_aviso_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Areia média'), 'quantidade', 20)$$,
  'aviso de 20 na Areia sem entrada'
);
select is(
  (select aviso_disparado from public.material where nome = 'Areia média'),
  false, 'sem entrada: aviso fica armado'
);
reset role;
select is(
  (select count(*) from public.envio where tipo = 'limite_material'
      and dados ->> 'material' = (select id::text from public.material where nome = 'Areia média')),
  0::bigint, 'sem entrada: nenhum envio'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$select public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Areia média'), 30)$$,
  'entrada de 30 na Areia'
);
select is(
  (public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
    (select id from public.material where nome = 'Areia média'), 15)) ->> 'aviso',
  'true', 'saída de 15 (saldo 15 <= 20) dispara'
);
reset role;
select is(
  (select count(*) from public.envio where tipo = 'limite_material'
      and dados ->> 'material' = (select id::text from public.material where nome = 'Areia média')),
  (select count(*) from public.usuario_obra where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'Areia: 1 envio por usuário da obra'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.salvar_aviso_material('a0000000-0000-4000-8000-000000000001',
      (select id from public.material where nome = 'Areia média'), null, null)$$,
  'remove o aviso da Areia'
);
select results_eq(
  $$select aviso_tipo, aviso_valor, aviso_disparado from public.material where nome = 'Areia média'$$,
  $$values (null::text, null::numeric(12,2), false)$$,
  'remover o aviso desarma'
);
select throws_ok(
  $$select public.salvar_material('a0000000-0000-4000-8000-000000000001',
      'ad000000-0000-4000-8000-0000000000ff', 'Areia média', 'm³')$$,
  'P0002', null, 'p_id inexistente com nome repetido → P0002'
);
reset role;

-- Log de alterações: nome e aviso.
select ok(
  exists (select 1 from public.alteracao where tabela = 'material' and campo = 'nome'
    and de = 'Cimento CP-II 50 kg' and para = 'Cimento CP-II'
    and usuario_id = 'b0000000-0000-4000-8000-000000000001'),
  'log registra a troca de nome'
);
select ok(
  exists (select 1 from public.alteracao where tabela = 'material' and campo = 'aviso_valor'
    and de = '20.00' and para = '10.00'),
  'log registra a troca do aviso'
);

select * from finish();
rollback;
