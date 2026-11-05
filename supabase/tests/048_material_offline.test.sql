-- M13 · Tarefa 15: dados_offline manda os materiais ativos da obra (prévia do saldo sem internet).
begin;
select plan(6);

-- Preparação como postgres: Cimento com aviso, Areia sem aviso, Cal inativa e Brita de outra obra.
insert into public.material (id, obra_id, nome, unidade, saldo, estoque_cheio, aviso_tipo, aviso_valor)
values ('ad000000-0000-4000-8000-000000000481', 'a0000000-0000-4000-8000-000000000001', 'Cimento', 'sc', 118, 118, 'quantidade', 20);
insert into public.material (id, obra_id, nome, unidade, saldo, estoque_cheio)
values ('ad000000-0000-4000-8000-000000000482', 'a0000000-0000-4000-8000-000000000001', 'Areia', 'm³', 2.5, 4);
insert into public.material (id, obra_id, nome, unidade, ativo)
values ('ad000000-0000-4000-8000-000000000483', 'a0000000-0000-4000-8000-000000000001', 'Cal', 'sc', false);
insert into public.material (id, obra_id, nome, unidade)
values ('ad000000-0000-4000-8000-000000000484', 'a0000000-0000-4000-8000-000000000002', 'Brita', 'm³');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
create temp table t_dados on commit drop as
  select public.dados_offline('a0000000-0000-4000-8000-000000000001') as d;

select ok(
  (select d ? 'obra' and d ? 'geradoEm' and d ? 'pessoas' and d ? 'tipos' and d ? 'posses' from t_dados),
  'as chaves de antes continuam vindo'
);
select ok(
  (select jsonb_array_length(d -> 'pessoas') > 0 and jsonb_array_length(d -> 'tipos') > 0 from t_dados),
  'pessoas e ferramentas continuam preenchidas'
);
select ok((select d ? 'materiais' from t_dados), 'vem a chave materiais');
select is(
  (select jsonb_array_length(d -> 'materiais') from t_dados),
  2,
  'só os materiais ativos desta obra (sem a inativa e sem os de outra obra)'
);
select is(
  (select d -> 'materiais' -> 0 from t_dados),
  jsonb_build_object('id', 'ad000000-0000-4000-8000-000000000482', 'nome', 'Areia', 'unidade', 'm³',
    'saldo', 2.50::numeric, 'estoque_cheio', 4.00::numeric, 'aviso_tipo', null, 'aviso_valor', null),
  'Areia: em ordem de nome, sem aviso'
);
select is(
  (select d -> 'materiais' -> 1 from t_dados),
  jsonb_build_object('id', 'ad000000-0000-4000-8000-000000000481', 'nome', 'Cimento', 'unidade', 'sc',
    'saldo', 118.00::numeric, 'estoque_cheio', 118.00::numeric, 'aviso_tipo', 'quantidade',
    'aviso_valor', 20.00::numeric),
  'Cimento: saldo, estoque cheio e aviso'
);

select * from finish();
rollback;
