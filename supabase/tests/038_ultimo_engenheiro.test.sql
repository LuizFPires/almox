-- Toda obra fica com pelo menos um engenheiro.
begin;
select plan(5);

-- Obra Demonstração: Helena é a única engenheira.
select throws_ok(
  $$delete from public.usuario_obra where usuario_id = 'b0000000-0000-4000-8000-000000000001'
     and obra_id = 'a0000000-0000-4000-8000-000000000001'$$,
  'P0001', 'ultimo_engenheiro', 'não tira o último engenheiro');
select throws_ok(
  $$update public.usuario_obra set perfil = 'almoxarife' where usuario_id = 'b0000000-0000-4000-8000-000000000001'
     and obra_id = 'a0000000-0000-4000-8000-000000000001'$$,
  'P0001', 'ultimo_engenheiro', 'não rebaixa o último engenheiro');

-- Com um segundo engenheiro, ele pode tirar a primeira.
update public.usuario_obra set perfil = 'engenheiro', empresa_id = null
 where usuario_id = 'b0000000-0000-4000-8000-000000000003' and obra_id = 'a0000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok(
  $$update public.usuario_obra set perfil = 'consulta' where usuario_id = 'b0000000-0000-4000-8000-000000000001'
     and obra_id = 'a0000000-0000-4000-8000-000000000001'$$,
  'com outro engenheiro na obra, rebaixar funciona');
reset role;

-- Agora Sérgio é o único: nem a cascata de outro vínculo nem outro perfil passa.
select throws_ok(
  $$update public.usuario_obra set perfil = 'almoxarife' where usuario_id = 'b0000000-0000-4000-8000-000000000003'
     and obra_id = 'a0000000-0000-4000-8000-000000000001'$$,
  'P0001', 'ultimo_engenheiro', 'o novo último engenheiro também fica');
select lives_ok(
  $$update public.usuario_obra set perfil = 'almoxarife' where usuario_id = 'b0000000-0000-4000-8000-000000000002'
     and obra_id = 'a0000000-0000-4000-8000-000000000001'$$,
  'mudar quem não é engenheiro segue normal');

select * from finish();
rollback;
