-- Segurança · onda 1: colunas da obra, nome do login, logins visíveis à consulta restrita,
-- inscrições de notificação e limites de tamanho.
begin;
select plan(15);

-- DB-01 · obra: engenheiro só muda nome e endereço; a mudança vai para o histórico.
select ok(has_column_privilege('authenticated', 'public.obra', 'nome', 'UPDATE'), 'nome da obra editável');
select ok(has_column_privilege('authenticated', 'public.obra', 'endereco', 'UPDATE'), 'endereço editável');
select ok(not has_column_privilege('authenticated', 'public.obra', 'ativa', 'UPDATE'), 'ativa: só o administrador');
select ok(not has_column_privilege('authenticated', 'public.obra', 'encerrada_em', 'UPDATE'), 'encerrada_em: só o administrador');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$update public.obra set ativa = false where id = 'a0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'engenheiro não desativa a obra pela API'
);
select throws_ok(
  $$update public.obra set encerrada_em = '2019-01-01' where id = 'a0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'engenheiro não encerra a obra pela API'
);
update public.obra set endereco = 'Rua Nova, 10' where id = 'a0000000-0000-4000-8000-000000000001';
select is(
  (select para from public.alteracao where tabela = 'obra' and campo = 'endereco'
    and registro_id = 'a0000000-0000-4000-8000-000000000001'),
  'Rua Nova, 10', 'mudança de endereço registrada no histórico'
);

-- DB-03 · o próprio usuário não troca o nome do login.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$update public.usuario set nome = 'Helena Duarte' where id = 'b0000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'almoxarife não se renomeia'
);

-- DB-04 · consulta restrita vê quem lança e a si; não vê a consulta de outra empresa.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select ok(
  (select count(*) = 3 from public.usuario where id in (
    'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000004')),
  'consulta restrita vê o engenheiro, o almoxarife e a si mesma'
);
select ok(
  not exists (select 1 from public.usuario where id = 'b0000000-0000-4000-8000-000000000003'),
  'consulta restrita não vê a consulta de outra empresa'
);
-- Consulta sem restrição continua vendo a consulta restrita.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select ok(
  exists (select 1 from public.usuario where id = 'b0000000-0000-4000-8000-000000000004'),
  'consulta sem restrição vê todos da obra'
);

-- DB-05 · inscrições: tamanhos e no máximo 10 por login.
select throws_ok(
  $$insert into public.inscricao_push (endpoint, usuario_id, p256dh, auth)
    values ('https://fcm.googleapis.com/x', 'b0000000-0000-4000-8000-000000000003', repeat('a', 5000), 'abcdefghij')$$,
  '23514', null, 'chave de tamanho absurdo: recusada'
);
insert into public.inscricao_push (endpoint, usuario_id, p256dh, auth, criado_em)
select 'https://fcm.googleapis.com/' || i, 'b0000000-0000-4000-8000-000000000003',
       repeat('k', 87), repeat('s', 22), now() - make_interval(mins => 20 - i)
  from generate_series(1, 12) i;
select is(
  (select count(*)::int from public.inscricao_push where usuario_id = 'b0000000-0000-4000-8000-000000000003'),
  10, 'no máximo 10 aparelhos por login'
);
select ok(
  not exists (select 1 from public.inscricao_push where endpoint = 'https://fcm.googleapis.com/1'),
  'a inscrição mais antiga sai'
);

-- DB-09 · limite de tamanho no nome.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.empresa (obra_id, nome, tipo)
    values ('a0000000-0000-4000-8000-000000000001', repeat('x', 500), 'empreiteira')$$,
  '23514', null, 'nome de empresa gigante: recusado'
);

select * from finish();
rollback;
