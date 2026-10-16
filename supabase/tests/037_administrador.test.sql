-- Administrador (multi-obra): só ele cria e encerra obra e liga engenheiro em qualquer obra.
begin;
select plan(14);

create temp table t (k text primary key, v uuid) on commit drop;
grant all on t to authenticated;

-- Almoxarife: não é administrador e não alcança as funções.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.administrador), 0, 'quem não é administrador não se vê na tabela');
select throws_ok($$select * from public.admin_listar_obras()$$, '42501', null, 'almoxarife não lista obras');
select throws_ok($$select public.admin_criar_obra('Obra pirata')$$, '42501', null, 'almoxarife não cria obra');
select throws_ok(
  $$select public.admin_ligar_engenheiro('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'almoxarife não se liga como engenheiro de outra obra');
select throws_ok($$insert into public.administrador values ('b0000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'ninguém se torna administrador pelo app');

-- Administradora (a engenheira do seed).
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.administrador), 1, 'a administradora se vê na tabela');
select ok((select count(*) from public.admin_listar_obras()) >= 2, 'lista todas as obras');

insert into t values ('obra', public.admin_criar_obra('  Obra Nova Teste ', 'Rua 1'));
select is((select nome from public.admin_listar_obras() where id = (select v from t where k = 'obra')),
  'Obra Nova Teste', 'cria obra (nome sem espaços nas pontas)');

select public.admin_ligar_engenheiro((select v from t where k = 'obra'), 'b0000000-0000-4000-8000-000000000002');
select is(
  (select perfil::text from public.admin_listar_acessos((select v from t where k = 'obra'))
    where usuario_id = 'b0000000-0000-4000-8000-000000000002'),
  'engenheiro', 'liga o engenheiro da obra nova');
select lives_ok(
  $$select public.admin_ligar_engenheiro('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004')$$,
  'quem já é da obra (consulta restrita) passa a engenheiro');
select is(
  (select perfil::text || '/' || coalesce(empresa, '-') from public.admin_listar_acessos('a0000000-0000-4000-8000-000000000001')
    where usuario_id = 'b0000000-0000-4000-8000-000000000004'),
  'engenheiro/-', 'engenheiro sem restrição de empresa');

select public.admin_situacao_obra((select v from t where k = 'obra'), 'encerrada');
select is(
  (select (not ativa and encerrada_em is not null) from public.admin_listar_obras() where id = (select v from t where k = 'obra')),
  true, 'encerrar desativa e grava a data');
select public.admin_situacao_obra((select v from t where k = 'obra'), 'ativa');
select is(
  (select (ativa and encerrada_em is null) from public.admin_listar_obras() where id = (select v from t where k = 'obra')),
  true, 'reativar limpa o encerramento');
select throws_ok($$select public.admin_situacao_obra('a0000000-0000-4000-8000-000000000001', 'sumida')$$,
  '22023', null, 'situação inválida é recusada');

select * from finish();
rollback;
