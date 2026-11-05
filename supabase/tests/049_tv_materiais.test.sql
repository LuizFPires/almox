-- M13 · Tarefa 16: a TV recebe os materiais ativos da obra do dispositivo (terceira tela).
begin;
select plan(7);

create temp table t (k text primary key, v text) on commit drop;
grant all on t to authenticated, anon;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.criar_dispositivo('a0000000-0000-4000-8000-000000000001', 'TV materiais');
insert into t values ('tok', public.trocar_codigo_tv(public.gerar_codigo_tv(
  (select id from public.dispositivo_tv where nome = 'TV materiais' and revogado_em is null))));

-- Materiais da obra A (dois ativos e um inativo) e um da obra B.
insert into public.material (id, obra_id, nome, unidade, saldo, estoque_cheio, aviso_tipo, aviso_valor, ativo) values
  ('f1600000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'TV Cimento', 'sc', 18, 100, 'quantidade', 20, true),
  ('f1600000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'TV Areia', 'm³', 6.5, 12, 'percentual', 50, true),
  ('f1600000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'TV Inativo', 'un', 0, 0, null, null, false),
  ('f1600000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'TV Obra B', 'kg', 5, 10, null, null, true);

create function pg_temp.painel() returns jsonb language sql as $$
  select public.painel_tv((select v from t where k = 'tok'))
$$;

select ok(pg_temp.painel() ? 'materiais', 'o painel traz a chave materiais');
select ok(
  (select array_agg(k order by k) from jsonb_object_keys(pg_temp.painel()) k)
    @> array['agora', 'config', 'empresas', 'materiais', 'obra', 'pessoas', 'versao'],
  'as chaves de antes continuam lá');

select is(
  (select array_agg(m ->> 'id' order by m ->> 'id')
     from jsonb_array_elements(pg_temp.painel() -> 'materiais') m
    where m ->> 'nome' like 'TV %'),
  array['f1600000-0000-4000-8000-000000000001', 'f1600000-0000-4000-8000-000000000002'],
  'só os materiais ativos da obra do dispositivo');

select is(
  (select count(*)::int from jsonb_array_elements(pg_temp.painel() -> 'materiais') m
    join public.material x on x.id = (m ->> 'id')::uuid
   where x.obra_id <> 'a0000000-0000-4000-8000-000000000001' or not x.ativo),
  0, 'nenhum material de outra obra nem inativo');

select is(
  (select m from jsonb_array_elements(pg_temp.painel() -> 'materiais') m
    where m ->> 'id' = 'f1600000-0000-4000-8000-000000000002'),
  jsonb_build_object('id', 'f1600000-0000-4000-8000-000000000002', 'nome', 'TV Areia', 'unidade', 'm³',
    'saldo', 6.5, 'estoque_cheio', 12, 'aviso_tipo', 'percentual', 'aviso_valor', 50),
  'campos do material: id, nome, unidade, saldo, estoque cheio e aviso');

select is(
  (select m -> 'aviso_tipo' from jsonb_array_elements(pg_temp.painel() -> 'materiais') m
    where m ->> 'id' = 'f1600000-0000-4000-8000-000000000001'),
  '"quantidade"'::jsonb, 'aviso por quantidade');

-- Saldo novo muda a versão (a TV busca de novo).
insert into t values ('v0', pg_temp.painel() ->> 'versao');
update public.material set saldo = 17 where id = 'f1600000-0000-4000-8000-000000000001';
select isnt(pg_temp.painel() ->> 'versao', (select v from t where k = 'v0'), 'saldo novo muda a versão do painel');

select * from finish();
rollback;
