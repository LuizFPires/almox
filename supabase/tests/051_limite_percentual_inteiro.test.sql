-- Aviso de limite por %: limite inteiro arredondado para cima; o cliente não chama a função.
begin;
select plan(6);

select is(privado.limite_aviso_material('percentual', 25, 55), 14::numeric, '25% de 55 = 13,75 → 14');
select is(privado.limite_aviso_material('percentual', 1, 1301), 14::numeric, '1% de 1301 = 13,01 → 14');
select is(privado.limite_aviso_material('percentual', 25, 56), 14::numeric, '25% de 56 = 14 exato');
select is(privado.limite_aviso_material('quantidade', 12.5, 99), 12.5::numeric, 'por quantidade fica como foi salvo');
select is(privado.limite_aviso_material(null, null, 10), null::numeric, 'sem aviso: sem limite');

set local role authenticated;
select throws_ok(
  $$ select privado.limite_aviso_material('percentual', 25, 55) $$,
  '42501', null, 'cliente não executa a função interna');

select * from finish();
rollback;
