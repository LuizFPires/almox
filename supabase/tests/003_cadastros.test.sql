-- M2 · Log de alterações e unidades sequenciais (usa o seed: Obra Demonstração).
begin;
select plan(14);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- Unidades -------------------------------------------------------------------------------

select results_eq(
  $$select * from public.adicionar_unidades((select id from public.tipo_ferramenta where prefixo = 'MT'), 2)$$,
  $$values ('MT-04'::text), ('MT-05'::text)$$,
  'engenheira adiciona unidades com código sequencial'
);
select is(
  (select count(*)::int from public.unidade u join public.tipo_ferramenta t on t.id = u.tipo_id
    where t.prefixo = 'MT' and u.status = 'livre'),
  3, 'unidades novas nascem livres (MT-03, MT-04, MT-05)'
);
select throws_ok(
  $$select public.adicionar_unidades((select id from public.tipo_ferramenta where prefixo = 'MT'), 0)$$,
  '22023', null, 'quantidade zero é recusada'
);
select throws_ok(
  $$insert into public.unidade (obra_id, tipo_id, codigo)
    select obra_id, id, 'MT-99' from public.tipo_ferramenta where prefixo = 'MT'$$,
  '42501', null, 'unidade não é inserida direto pelo cliente'
);

-- Log de alterações -----------------------------------------------------------------------

update public.tipo_ferramenta set valor_reposicao = 300000 where prefixo = 'MT';
select results_eq(
  $$select de, para from public.alteracao where campo = 'valor_reposicao' and tabela = 'tipo_ferramenta'
      and registro_id = (select id from public.tipo_ferramenta where prefixo = 'MT') and de is not null$$,
  $$values ('289000'::text, '300000'::text)$$,
  'troca de valor registra de/para'
);
select is(
  (select usuario_id from public.alteracao where campo = 'valor_reposicao' and para = '300000'),
  'b0000000-0000-4000-8000-000000000001'::uuid, 'log guarda quem alterou'
);
select throws_ok(
  $$update public.tipo_ferramenta set prefixo = 'MX' where prefixo = 'MT'$$,
  '42501', null, 'prefixo não muda depois de criado'
);

update public.pessoa set empresa_id = 'e0000000-0000-4000-8000-000000000003' where nome = 'Adriano Costa';
select is(
  (select count(*)::int from public.alteracao where tabela = 'pessoa' and campo = 'empresa_id'
     and para = 'e0000000-0000-4000-8000-000000000003' and de is not null),
  1, 'troca de empresa da pessoa é registrada'
);

update public.empresa set dono_email = 'novo@lumen.exemplo' where nome = 'Elétrica Lumen';
select is(
  (select para from public.alteracao where tabela = 'empresa' and campo = 'dono_email' and para like 'novo@%'),
  'novo@lumen.exemplo', 'troca de e-mail do dono é registrada'
);
select throws_ok(
  $$update public.empresa set obra_id = 'a0000000-0000-4000-8000-000000000002' where nome = 'Elétrica Lumen'$$,
  '42501', null, 'empresa não troca de obra'
);

update public.usuario_obra set perfil = 'almoxarife'
 where usuario_id = 'b0000000-0000-4000-8000-000000000003' and obra_id = 'a0000000-0000-4000-8000-000000000001';
select is(
  (select de || '→' || para from public.alteracao where tabela = 'usuario_obra' and campo = 'perfil'
     and registro_id = 'b0000000-0000-4000-8000-000000000003' and de is not null),
  'consulta→almoxarife', 'mudança de acesso é registrada'
);

-- Almoxarife ---------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.alteracao), 0, 'almoxarife não lê o log');
select throws_ok(
  $$select public.adicionar_unidades((select id from public.tipo_ferramenta where prefixo = 'PA'), 1)$$,
  '42501', null, 'almoxarife não adiciona unidades'
);
select throws_ok(
  $$insert into public.alteracao (obra_id, tabela, registro_id, campo) values
    ('a0000000-0000-4000-8000-000000000001', 'x', gen_random_uuid(), 'y')$$,
  '42501', null, 'ninguém grava no log direto'
);

select * from finish();
rollback;
