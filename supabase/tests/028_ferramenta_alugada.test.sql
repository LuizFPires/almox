-- Ferramenta própria ou alugada: locadora da obra, nome sem repetir, só o engenheiro cadastra.
begin;
select plan(10);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
-- Locadora de outra obra (para conferir que não serve aqui).
insert into public.locadora (id, obra_id, nome)
values ('c1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Locadora B');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.locadora (obra_id, nome) values ('a0000000-0000-4000-8000-000000000001', 'Mills')$$,
  '42501', null, 'almoxarife não cadastra locadora'
);

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.locadora (obra_id, nome) values ('a0000000-0000-4000-8000-000000000001', 'Mills Locação')$$,
  'engenheiro cadastra locadora'
);
insert into t_ctx select 'mills', id::text from public.locadora where nome = 'Mills Locação';
select throws_ok(
  $$insert into public.locadora (obra_id, nome) values ('a0000000-0000-4000-8000-000000000001', '  mills   LOCACAO ')$$,
  '23505', null, 'mesmo nome com outra grafia: não repete'
);
select throws_ok(
  $$insert into public.locadora (obra_id, nome) values ('a0000000-0000-4000-8000-000000000001', 'x')$$,
  '23514', null, 'nome curto demais: recusado'
);

select lives_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao, propriedade, locadora_id)
    values ('a0000000-0000-4000-8000-000000000001', 'Betoneira alugada', 'betoneira', 'BTA', 429000, 'alugada',
            (select valor::uuid from t_ctx where chave = 'mills'))$$,
  'ferramenta alugada com locadora da obra'
);
select is(
  (select propriedade from public.tipo_ferramenta where nome = 'Betoneira alugada'),
  'alugada', 'grava alugada'
);
select throws_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao, propriedade)
    values ('a0000000-0000-4000-8000-000000000001', 'Sem locadora', 'betoneira', 'SLC', 1000, 'alugada')$$,
  '23514', null, 'alugada sem locadora: recusada'
);
select throws_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao, propriedade, locadora_id)
    values ('a0000000-0000-4000-8000-000000000001', 'Própria com locadora', 'betoneira', 'PCL', 1000, 'propria',
            (select valor::uuid from t_ctx where chave = 'mills'))$$,
  '23514', null, 'própria não tem locadora'
);
select throws_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao, propriedade, locadora_id)
    values ('a0000000-0000-4000-8000-000000000001', 'Locadora de fora', 'betoneira', 'LDF', 1000, 'alugada',
            'c1000000-0000-4000-8000-000000000002')$$,
  '23503', null, 'locadora de outra obra: recusada'
);
select is(
  (select propriedade from public.tipo_ferramenta where nome = 'Pá'),
  'propria', 'ferramentas que já existiam ficam próprias'
);

select * from finish();
rollback;
