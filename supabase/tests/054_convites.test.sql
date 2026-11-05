-- Convites: só o titular do e-mail confirmado aceita; validade; quem convidou precisa continuar
-- engenheiro; engenheiro lista e cancela. Seed: Obra Demonstração a…01, engenheira b…01,
-- almoxarife b…02.
begin;
select plan(16);

-- Como postgres: logins de teste (o gatilho cria public.usuario).
insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('c0000000-0000-4000-8000-000000000541', 'convidado054@almox.exemplo', now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-000000000542', 'semconfirmar054@almox.exemplo', null, 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-000000000543', 'eng2054@almox.exemplo', now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-000000000544', 'outro054@almox.exemplo', now(), 'authenticated', 'authenticated');
-- Segundo engenheiro, que depois perde o acesso.
insert into public.usuario_obra (usuario_id, obra_id, perfil)
values ('c0000000-0000-4000-8000-000000000543', 'a0000000-0000-4000-8000-000000000001', 'engenheiro');

set local role authenticated;

-- Convidar -----------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok($$ select public.convidar_obra('a0000000-0000-4000-8000-000000000001', ' Convidado054@almox.exemplo ', 'almoxarife') $$,
  'engenheira convida (e-mail normalizado)');
select lives_ok($$ select public.convidar_obra('a0000000-0000-4000-8000-000000000001', 'semconfirmar054@almox.exemplo', 'almoxarife') $$,
  'engenheira convida um login sem e-mail confirmado');
select is((select count(*)::int from public.convites_pendentes('a0000000-0000-4000-8000-000000000001')
            where email in ('convidado054@almox.exemplo', 'semconfirmar054@almox.exemplo')),
  2, 'engenheira vê os dois convites pendentes');
select ok((select bool_and(expira_em between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour')
             from public.convites_pendentes('a0000000-0000-4000-8000-000000000001')),
  'convite vale por 7 dias');

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok($$ select public.convidar_obra('a0000000-0000-4000-8000-000000000001', 'x054@almox.exemplo', 'almoxarife') $$,
  '42501', null, 'almoxarife não convida');
select throws_ok($$ select * from public.convites_pendentes('a0000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'almoxarife não lista convites');

-- E-mail não confirmado não vê nem aceita ------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000542","role":"authenticated"}', true);
select is((select count(*)::int from public.meus_convites()), 0, 'sem e-mail confirmado não vê o convite');
reset role;
select set_config('t.c1', (select id::text from public.convite_obra where email = 'semconfirmar054@almox.exemplo' order by criado_em desc limit 1), true);
set local role authenticated;
select throws_ok(
  $$ select public.responder_convite(current_setting('t.c1')::uuid, true) $$,
  'P0001', 'Convite indisponível', 'sem e-mail confirmado não aceita');

-- Outra pessoa não aceita convite alheio ------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000544","role":"authenticated"}', true);
reset role;
select set_config('t.c2', (select id::text from public.convite_obra where email = 'convidado054@almox.exemplo' order by criado_em desc limit 1), true);
set local role authenticated;
select throws_ok(
  $$ select public.responder_convite(current_setting('t.c2')::uuid, true) $$,
  'P0001', 'Convite indisponível', 'outro login não aceita o convite de outra pessoa');

-- Vencido -------------------------------------------------------------------------------------
reset role;
update public.convite_obra set expira_em = now() - interval '1 minute' where email = 'convidado054@almox.exemplo';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000541","role":"authenticated"}', true);
select is((select count(*)::int from public.meus_convites()), 0, 'convite vencido não aparece');
reset role;
select set_config('t.c3', (select id::text from public.convite_obra where email = 'convidado054@almox.exemplo' order by criado_em desc limit 1), true);
set local role authenticated;
select throws_ok(
  $$ select public.responder_convite(current_setting('t.c3')::uuid, true) $$,
  'P0001', 'Convite indisponível', 'convite vencido não pode ser aceito');

-- Convidar de novo depois do vencimento (o vencido não trava o índice) ------------------------
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000543","role":"authenticated"}', true);
select lives_ok($$ select public.convidar_obra('a0000000-0000-4000-8000-000000000001', 'convidado054@almox.exemplo', 'consulta') $$,
  'segundo engenheiro convida de novo o mesmo e-mail depois do vencimento');

-- Quem convidou perde o acesso: o convite deixa de valer --------------------------------------
reset role;
delete from public.usuario_obra
 where usuario_id = 'c0000000-0000-4000-8000-000000000543' and obra_id = 'a0000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000541","role":"authenticated"}', true);
reset role;
select set_config('t.c4', (select id::text from public.convite_obra where email = 'convidado054@almox.exemplo' and cancelado_em is null and respondido_em is null order by criado_em desc limit 1), true);
set local role authenticated;
select throws_ok(
  $$ select public.responder_convite(current_setting('t.c4')::uuid, true) $$,
  'P0001', 'Convite indisponível', 'convite de quem perdeu o acesso não pode ser aceito');

-- Cancelar e aceitar --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok($$ select public.convidar_obra('a0000000-0000-4000-8000-000000000001', 'outro054@almox.exemplo', 'almoxarife') $$,
  'engenheira convida outro login');
reset role;
select set_config('t.c5', (select id::text from public.convite_obra where email = 'outro054@almox.exemplo' order by criado_em desc limit 1), true);
set local role authenticated;
select public.cancelar_convite(current_setting('t.c5')::uuid);
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000544","role":"authenticated"}', true);
select is((select count(*)::int from public.meus_convites()), 0, 'convite cancelado some para o convidado');

-- Aceite de verdade: convite novo da engenheira para o convidado.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.convidar_obra('a0000000-0000-4000-8000-000000000001', 'convidado054@almox.exemplo', 'almoxarife');
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000541","role":"authenticated"}', true);
select public.responder_convite((select id from public.meus_convites() limit 1), true);
select is(
  (select perfil::text from public.usuario_obra
    where usuario_id = 'c0000000-0000-4000-8000-000000000541' and obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'almoxarife', 'aceite cria o vínculo com o perfil do convite');

select * from finish();
rollback;
