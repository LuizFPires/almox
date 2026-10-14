-- Plano · bloco 2, ponto 5: sem internet o celular recebe uma linha por peça, na ordem da devolução.
begin;
select plan(3);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
create temp table t_posses on commit drop as
  select p, ordinality as ordem
    from jsonb_array_elements(public.dados_offline('a0000000-0000-4000-8000-000000000001') -> 'posses')
         with ordinality as x(p, ordinality);

select is(
  (select count(*)::int from t_posses),
  (select count(*)::int from public.posse where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'uma linha por peça com alguém'
);
select ok(
  (select bool_and((p ->> 'quantidade')::int = 1 and p ? 'desde') from t_posses),
  'cada linha é uma peça, com a hora de saída'
);
-- Dentro de cada pessoa e tipo, da mais antiga para a mais nova (como registrar_devolucao).
select ok(
  not exists (
    select 1 from t_posses a join t_posses b
      on a.p ->> 'pessoa' = b.p ->> 'pessoa' and a.p ->> 'tipo' = b.p ->> 'tipo' and a.ordem < b.ordem
     where (a.p ->> 'desde')::timestamptz > (b.p ->> 'desde')::timestamptz),
  'peças da mesma pessoa e tipo vêm da mais antiga para a mais nova'
);

select * from finish();
rollback;
