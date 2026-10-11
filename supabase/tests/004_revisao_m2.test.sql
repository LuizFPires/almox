-- M2 · Correções da revisão (usa o seed: Obra Demonstração).
begin;
select plan(9);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- 1. Passa de 99 para 100 sem cortar o código (SER tem 3 unidades no seed).
select lives_ok(
  $$select public.adicionar_unidades((select id from public.tipo_ferramenta where prefixo = 'SER'), 97)$$,
  'adiciona até a 100ª unidade'
);
select ok(
  exists (select 1 from public.unidade where codigo = 'SER-100'),
  'a 100ª unidade se chama SER-100 (não SER-10)'
);

-- 2. Vínculo de acesso: só perfil e empresa mudam.
select throws_ok(
  $$update public.usuario_obra set usuario_id = 'b0000000-0000-4000-8000-000000000002'
     where usuario_id = 'b0000000-0000-4000-8000-000000000003'$$,
  '42501', null, 'engenheira não troca a pessoa de um acesso'
);
select throws_ok(
  $$update public.usuario_obra set criado_em = '2020-01-01'
     where usuario_id = 'b0000000-0000-4000-8000-000000000003'$$,
  '42501', null, 'engenheira não muda a data de um acesso'
);

-- 8. Log guarda o nome de quem alterou.
update public.tipo_ferramenta set valor_reposicao = 7000 where prefixo = 'PA';
select is(
  (select usuario_nome from public.alteracao where campo = 'valor_reposicao' and para = '7000'),
  'Helena Duarte', 'log guarda o nome de quem alterou'
);

-- 5. Empresa com consulta restrita não vira própria (Fôrmas Ribeiro tem o login "formas").
select throws_ok(
  $$update public.empresa set tipo = 'propria' where id = 'e0000000-0000-4000-8000-000000000003'$$,
  '23514', null, 'empreiteira com consulta restrita não vira própria'
);

-- 3. Com a senha provisória pendente, o banco não libera nada.
select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"trocar_senha":true}}',
  true
);
select is((select count(*)::int from public.pessoa), 0, 'senha pendente: não lê pessoas');
select throws_ok(
  $$select public.adicionar_unidades((select id from public.tipo_ferramenta where prefixo = 'PA'), 1)$$,
  '42501', null, 'senha pendente: não adiciona unidades (nem sendo engenheira)'
);
select throws_ok(
  $$select * from public.listar_acessos('a0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'senha pendente: não lista acessos'
);

select * from finish();
rollback;
