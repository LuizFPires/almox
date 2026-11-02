-- Criar conta pela tela pública: contas sem obra visíveis só ao engenheiro; limpeza das não confirmadas.
begin;
select plan(9);

-- Três logins criados pela tela pública: um confirmou o e-mail, dois não (um recente, um velho).
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at, raw_user_meta_data) values
  ('c0000000-0000-4000-8000-000000000001', 'confirmada@teste.local', 'authenticated', 'authenticated', now(), now(), '{"nome":"Rafael Souza"}'),
  ('c0000000-0000-4000-8000-000000000002', 'recente@teste.local', 'authenticated', 'authenticated', null, now(), '{"nome":"Recente"}'),
  ('c0000000-0000-4000-8000-000000000003', 'velha@teste.local', 'authenticated', 'authenticated', null, now() - interval '2 days', '{"nome":"Velha"}');

-- Engenheira da obra Demonstração vê só a conta confirmada e sem obra.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select results_eq(
  $$select usuario_id, nome, email from public.listar_contas_sem_obra('a0000000-0000-4000-8000-000000000001')$$,
  $$values ('c0000000-0000-4000-8000-000000000001'::uuid, 'Rafael Souza', 'confirmada@teste.local')$$,
  'engenheiro vê a conta confirmada sem obra; não vê as não confirmadas nem quem já tem obra');

-- Almoxarife e consulta não veem.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.listar_contas_sem_obra('a0000000-0000-4000-8000-000000000001')$$,
  '42501', 'Só o engenheiro da obra vê as contas.', 'almoxarife não vê as contas sem obra');
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.listar_contas_sem_obra('a0000000-0000-4000-8000-000000000001')$$,
  '42501', 'Só o engenheiro da obra vê as contas.', 'consulta não vê as contas sem obra');
reset role;

-- Anônimo nem executa.
select function_privs_are('public', 'listar_contas_sem_obra', array['uuid'], 'anon', array[]::text[],
  'anônimo não executa listar_contas_sem_obra');
select function_privs_are('privado', 'limpar_contas_nao_confirmadas', array[]::text[], 'authenticated', array[]::text[],
  'usuário não executa a limpeza');

-- Depois de vinculada a uma obra, a conta sai da lista.
insert into public.usuario_obra (usuario_id, obra_id, perfil) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'almoxarife');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is_empty(
  $$select * from public.listar_contas_sem_obra('a0000000-0000-4000-8000-000000000001')$$,
  'conta vinculada à obra sai de "aguardando obra"');
reset role;

-- Limpeza: só a não confirmada com mais de 24 h.
select is(privado.limpar_contas_nao_confirmadas(), 1, 'apaga só a conta velha sem e-mail confirmado');
select results_eq(
  $$select email::text from auth.users where id in ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003') order by email$$,
  $$values ('recente@teste.local')$$,
  'a recente fica; a velha foi apagada (e o public.usuario junto, pela cascata)');
select is_empty(
  $$select 1 from public.usuario where id = 'c0000000-0000-4000-8000-000000000003'$$,
  'public.usuario da conta apagada também some');

select * from finish();
rollback;
