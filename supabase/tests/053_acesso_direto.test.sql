-- Acesso direto do M1: engenheiro cria vínculo na própria obra; administrador liga engenheiro.
-- Seed: Obra Demonstração a…01, engenheira b…01, almoxarife b…02.
begin;
select plan(5);

select policies_are('public', 'usuario_obra',
  array['usuario_obra_ler', 'usuario_obra_criar', 'usuario_obra_editar', 'usuario_obra_remover'],
  'usuario_obra tem as quatro policies do M1');
select ok(has_function_privilege('authenticated', 'public.admin_ligar_engenheiro(uuid,uuid)', 'execute'),
  'administrador (authenticated) executa admin_ligar_engenheiro');
select ok(not has_function_privilege('anon', 'public.admin_ligar_engenheiro(uuid,uuid)', 'execute'),
  'anônimo não executa admin_ligar_engenheiro');

-- Login novo, ainda sem obra.
insert into auth.users (id, email, email_confirmed_at, aud, role)
values ('c0000000-0000-4000-8000-000000000053', 'acesso053@almox.exemplo', now(), 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.usuario_obra (usuario_id, obra_id, perfil)
     values ('c0000000-0000-4000-8000-000000000053', 'a0000000-0000-4000-8000-000000000001', 'almoxarife') $$,
  'engenheiro dá acesso na própria obra');

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.usuario_obra (usuario_id, obra_id, perfil)
     values ('c0000000-0000-4000-8000-000000000053', 'a0000000-0000-4000-8000-000000000002', 'almoxarife') $$,
  '42501', null, 'almoxarife não dá acesso');

select * from finish();
rollback;
