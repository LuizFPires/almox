-- Plano · bloco 3, ponto 16: o painel da TV responde "nada mudou" sem remontar, e muda a versão
-- quando algo que aparece na TV muda.
begin;
select plan(6);

create temp table t (k text primary key, v text) on commit drop;
grant all on t to authenticated, anon;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.criar_dispositivo('a0000000-0000-4000-8000-000000000001', 'TV versão');
insert into t values ('tok', public.trocar_codigo_tv(public.gerar_codigo_tv(
  (select id from public.dispositivo_tv where nome = 'TV versão' and revogado_em is null))));

create function pg_temp.versao() returns text language sql as $$
  select public.painel_tv((select v from t where k = 'tok')) ->> 'versao'
$$;
create function pg_temp.mesma() returns jsonb language sql as $$
  select public.painel_tv((select v from t where k = 'tok'), pg_temp.versao())
$$;

select is((select array_agg(k order by k) from jsonb_object_keys(pg_temp.mesma()) k),
  array['agora', 'versao'], 'sem mudança: só a versão e a hora');

insert into t values ('v0', pg_temp.versao());
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select id from public.pessoa where nome = 'Ivan Pereira'), null,
  jsonb_build_array(jsonb_build_object('tipo', (select tipo_id from public.unidade where status = 'livre'
    and obra_id = 'a0000000-0000-4000-8000-000000000001' limit 1), 'quantidade', 1)), true);
reset role;
insert into t values ('v1', pg_temp.versao());
select isnt((select v from t where k = 'v1'), (select v from t where k = 'v0'), 'retirada muda a versão');

update public.pessoa set nome = 'Ivan Pereira Jr' where nome = 'Ivan Pereira';
insert into t values ('v2', pg_temp.versao());
select isnt((select v from t where k = 'v2'), (select v from t where k = 'v1'), 'nome da pessoa muda a versão');

update public.empresa set cor = '#000000' where id = 'e0000000-0000-4000-8000-000000000003';
insert into t values ('v3', pg_temp.versao());
select isnt((select v from t where k = 'v3'), (select v from t where k = 'v2'), 'cor da empresa muda a versão');

insert into public.config_tv (obra_id, tempo_pagina_s) values ('a0000000-0000-4000-8000-000000000001', 9)
on conflict (obra_id) do update set tempo_pagina_s = 9;
insert into t values ('v4', pg_temp.versao());
select isnt((select v from t where k = 'v4'), (select v from t where k = 'v3'), 'configuração da TV muda a versão');

-- Mudança em outra obra não mexe na desta.
update public.empresa set cor = '#111111' where obra_id = 'a0000000-0000-4000-8000-000000000002';
select is(pg_temp.versao(), (select v from t where k = 'v4'), 'mudança em outra obra não muda a versão');

select * from finish();
rollback;
