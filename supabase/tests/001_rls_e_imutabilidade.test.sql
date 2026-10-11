-- Testes de banco do M1 (pgTAP). Rodar: npx supabase test db
-- Critérios de aceite do PLAN (M1) + isolamento por obra e por empresa.
begin;
select plan(30);

-- Fixture ---------------------------------------------------------------------------

insert into public.obra (id, nome) values
  ('00000000-0000-0000-0000-0000000000a1', 'Obra Teste 1'),
  ('00000000-0000-0000-0000-0000000000a2', 'Obra Teste 2');

insert into public.empresa (id, obra_id, nome, tipo) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'Construtora T', 'propria'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a1', 'Empreiteira A', 'empreiteira'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000a1', 'Empreiteira B', 'empreiteira'),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000a2', 'Empreiteira Outra Obra', 'empreiteira');

insert into public.pessoa (id, obra_id, empresa_id, nome, nome_capacete, funcao) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'Joaquim Silva', 'JOAQUIM', 'Pedreiro'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e2', 'Paulo Ribeiro', 'PAULO', 'Carpinteiro'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e3', 'Carlos Mendes', 'CARLOS', 'Eletricista'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e4', 'Outro Obra', 'OUTRO', 'Servente');

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'eng@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'almox@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'consulta@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000d', 'empa@teste.local', 'authenticated', 'authenticated');

insert into public.usuario_obra (usuario_id, obra_id, perfil, empresa_id) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'engenheiro', null),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 'almoxarife', null),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1', 'consulta', null),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000a1', 'consulta', '00000000-0000-0000-0000-0000000000e2');

insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'Pá', 'pa', 'PA', 6500);
insert into public.unidade (id, obra_id, tipo_id, codigo) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'PA-01');
insert into public.movimento (id, obra_id, tipo, pessoa_id, usuario_id, via, conferido) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'retirada',
   '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000b', 'qr', true);
insert into public.movimento_item (movimento_id, obra_id, unidade_id) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1');

-- Estrutura -------------------------------------------------------------------------

select ok(
  (select bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'),
  'todas as tabelas de public têm RLS ativa'
);
select is(
  (select matricula from public.pessoa where id = '00000000-0000-0000-0000-0000000000b2'),
  'P-0002', 'matrícula automática sequencial por obra'
);
select is(
  (select matricula from public.pessoa where id = '00000000-0000-0000-0000-0000000000b4'),
  'P-0001', 'matrícula recomeça em outra obra'
);
select ok(
  (select qr_token ~ '^[0-9a-f]{36}$' and qr_token !~* 'paulo'
     from public.pessoa where id = '00000000-0000-0000-0000-0000000000b2'),
  'qr_token é opaco e não contém o nome (RN-17)'
);
select is(
  (select count(*)::int from public.usuario where email like '%@teste.local'),
  4, 'login criado no Auth gera registro em usuario'
);

-- Movimentos imutáveis (como administrador) ------------------------------------------

select throws_ok(
  $$update public.movimento set obs = 'x' where id = '00000000-0000-0000-0000-0000000000f1'$$,
  'P0001', null, 'UPDATE em movimento falha até para o administrador'
);
select throws_ok(
  $$delete from public.movimento where id = '00000000-0000-0000-0000-0000000000f1'$$,
  'P0001', null, 'DELETE em movimento falha'
);
select throws_ok(
  $$update public.movimento_item set avariada = true where movimento_id = '00000000-0000-0000-0000-0000000000f1'$$,
  'P0001', null, 'UPDATE em movimento_item falha'
);
select throws_ok(
  $$delete from public.movimento_item where movimento_id = '00000000-0000-0000-0000-0000000000f1'$$,
  'P0001', null, 'DELETE em movimento_item falha'
);

-- Anônimo ---------------------------------------------------------------------------

set local role anon;
select throws_ok($$select * from public.pessoa$$, '42501', null, 'anônimo não lê pessoas');
reset role;

-- Almoxarife ------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao)
    values ('00000000-0000-0000-0000-0000000000a1', 'Martelete', 'martelete', 'MT', 289000)$$,
  '42501', null, 'almoxarife não insere em tipo_ferramenta'
);
-- UPDATE barrado pela RLS não dá erro: simplesmente não encontra a linha.
select is_empty(
  $$update public.tipo_ferramenta set valor_reposicao = 1
     where id = '00000000-0000-0000-0000-0000000000c1' returning id$$,
  'almoxarife não altera valor de reposição (0 linhas afetadas)'
);
select is(
  (select valor_reposicao from public.tipo_ferramenta where id = '00000000-0000-0000-0000-0000000000c1'),
  6500, 'valor de reposição continua o mesmo'
);
select throws_ok(
  $$insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via)
    values ('00000000-0000-0000-0000-0000000000a1', 'retirada', '00000000-0000-0000-0000-0000000000b1',
            '00000000-0000-0000-0000-00000000000b', 'qr')$$,
  '42501', null, 'almoxarife não insere movimento direto (só por RPC)'
);
select is((select count(*)::int from public.pessoa), 3, 'almoxarife vê as 3 pessoas da obra 1 e nenhuma da obra 2');
select throws_ok(
  $$select qr_token from public.pessoa$$, '42501', null, 'qr_token não é legível pelo cliente'
);
select throws_ok(
  $$select public.registrar_retirada('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', null, '[]', true)$$,
  '22023', null, 'almoxarife passa na permissão da RPC (sem itens: erro de validação)'
);
select throws_ok(
  $$select public.registrar_retirada('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b4', null, '[]', true)$$,
  '42501', null, 'almoxarife não lança em obra que não é dele'
);

-- Consulta (obra inteira) -------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via)
    values ('00000000-0000-0000-0000-0000000000a1', 'retirada', '00000000-0000-0000-0000-0000000000b1',
            '00000000-0000-0000-0000-00000000000c', 'manual')$$,
  '42501', null, 'consulta não insere em movimento'
);
select throws_ok(
  $$select public.registrar_retirada('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', null, '[]', true)$$,
  '42501', null, 'consulta não lança retirada pela RPC'
);
select is((select count(*)::int from public.pessoa), 3, 'consulta da obra vê todas as pessoas da obra');

-- Consulta de empreiteira (Empreiteira A) --------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);

select results_eq(
  $$select nome from public.pessoa order by nome$$,
  $$values ('Paulo Ribeiro'::text)$$,
  'consulta de empreiteira só lê pessoas da própria empresa'
);
select results_eq(
  $$select nome from public.empresa$$,
  $$values ('Empreiteira A'::text)$$,
  'consulta de empreiteira só vê a própria empresa'
);
select is((select count(*)::int from public.movimento), 1, 'consulta de empreiteira vê os movimentos da própria gente');
select is(
  (select count(*)::int from public.pessoa where empresa_id = '00000000-0000-0000-0000-0000000000e3'),
  0, 'consulta de empreiteira não lê pessoas de outra empreiteira'
);

-- Engenheiro --------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao)
    values ('00000000-0000-0000-0000-0000000000a1', 'Martelete', 'martelete', 'MT', 289000)$$,
  'engenheiro cadastra tipo de ferramenta'
);
select throws_ok(
  $$insert into public.pessoa (obra_id, empresa_id, nome, nome_capacete, funcao)
    values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e4', 'Intruso', 'INTRUSO', 'Servente')$$,
  '42501', null, 'engenheiro não cadastra pessoa em obra que não é dele'
);
select throws_ok(
  $$update public.movimento set obs = 'x' where id = '00000000-0000-0000-0000-0000000000f1'$$,
  '42501', null, 'engenheiro também não edita movimento'
);
select throws_ok(
  $$insert into public.usuario_obra (usuario_id, obra_id, perfil)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'engenheiro')$$,
  '42501', null, 'engenheiro não se dá acesso a outra obra'
);
select is((select count(*)::int from public.obra), 1, 'engenheiro só vê a própria obra');

select * from finish();
rollback;
