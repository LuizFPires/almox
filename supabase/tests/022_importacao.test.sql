-- M11 · Importação do cadastro inicial: só o engenheiro, tudo ou nada, RLS do próprio login.
begin;
select plan(11);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into t_ctx values ('dados', jsonb_build_object(
  'empresas', jsonb_build_array(jsonb_build_object('nome', 'Importada Ltda', 'tipo', 'empreiteira',
    'cor', '#9A6BFF', 'donoNome', 'Dono Imp', 'donoEmail', 'dono@imp.exemplo', 'encarregadoEmail', null)),
  'pessoas', jsonb_build_array(
    jsonb_build_object('nome', 'Pedro Importado', 'nomeCapacete', 'PEDRO I.', 'funcao', 'Pedreiro', 'empresa', 'Importada Ltda'),
    jsonb_build_object('nome', 'Paulo Importado', 'nomeCapacete', 'PAULO I.', 'funcao', 'Servente', 'empresa', 'Construtora')),
  'ferramentas', jsonb_build_array(jsonb_build_object('nome', 'Betoneira Imp', 'icone', 'carrinho',
    'prefixo', 'BTI', 'valor', 450000, 'quantidade', 2, 'altoValor', true))
)::text);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.importar_cadastro('a0000000-0000-4000-8000-000000000001', (select valor::jsonb from t_ctx where chave = 'dados'))$$,
  '42501', null, 'almoxarife não importa'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.importar_cadastro('a0000000-0000-4000-8000-000000000001', (select valor::jsonb from t_ctx where chave = 'dados'))$$,
  '42501', null, 'consulta não importa'
);

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t_ctx select 'r', public.importar_cadastro('a0000000-0000-4000-8000-000000000001',
  (select valor::jsonb from t_ctx where chave = 'dados'))::text;
reset role;

select is((select (valor::jsonb ->> 'empresas')::int from t_ctx where chave = 'r'), 1, 'uma empresa');
select is((select jsonb_array_length(valor::jsonb -> 'pessoas') from t_ctx where chave = 'r'), 2, 'duas pessoas (ids para os adesivos)');
select is(
  (select array_agg(codigo order by codigo) from public.unidade u join public.tipo_ferramenta t on t.id = u.tipo_id
    where t.nome = 'Betoneira Imp'),
  array['BTI-01', 'BTI-02'], 'ferramenta com as unidades'
);
select is(
  (select valor_reposicao from public.tipo_ferramenta where nome = 'Betoneira Imp'), 450000,
  'valor em centavos'
);
select ok(
  (select matricula ~ '^P-\d+$' from public.pessoa where nome = 'Pedro Importado'),
  'matrícula automática'
);
select is(
  (select e.nome from public.pessoa p join public.empresa e on e.id = p.empresa_id where p.nome = 'Paulo Importado'),
  'Construtora', 'empresa existente encontrada pelo nome'
);

-- Tudo ou nada: a segunda importação repete o prefixo e nada da segunda fica.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.importar_cadastro('a0000000-0000-4000-8000-000000000001', jsonb_build_object(
      'empresas', jsonb_build_array(jsonb_build_object('nome', 'Outra Imp', 'tipo', 'propria')),
      'ferramentas', jsonb_build_array(jsonb_build_object('nome', 'Outra Betoneira', 'icone', 'carrinho',
        'prefixo', 'BTI', 'valor', 1000, 'quantidade', 1))))$$,
  null, null, 'erro em qualquer linha desfaz a importação inteira'
);
select throws_ok(
  $$select public.importar_cadastro('a0000000-0000-4000-8000-000000000001', jsonb_build_object(
      'pessoas', jsonb_build_object('nome', 'Não sou lista')))$$,
  '22023', null, 'abas que não são lista: recusado'
);
reset role;
select is((select count(*)::int from public.empresa where nome = 'Outra Imp'), 0,
  'nada da importação recusada ficou gravado');

select * from finish();
rollback;
