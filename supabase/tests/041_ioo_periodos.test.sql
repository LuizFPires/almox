begin;
select plan(5);
select ok(not has_function_privilege('anon', 'public.ioo_periodos_empresa(uuid)', 'EXECUTE'), 'anon não acessa períodos');
select ok(not has_function_privilege('authenticated', 'public.ioo_periodos_empresa(uuid)', 'EXECUTE'), 'navegador não acessa períodos');
select ok(has_function_privilege('service_role', 'public.ioo_periodos_empresa(uuid)', 'EXECUTE'), 'somente backend acessa períodos');
select is((select count(*) from public.ioo_periodos_empresa('00000000-0000-0000-0000-000000000000')), 0::bigint, 'obra inexistente não retorna outra obra');
select is(
 (select count(*) from public.ioo_periodos_empresa('a0000000-0000-4000-8000-000000000001')),
 (select count(*) from privado.pessoa_empresa_periodo pp join public.pessoa p on p.id=pp.pessoa_id where p.obra_id='a0000000-0000-4000-8000-000000000001'),
 'fonte temporal autoritativa sem truncamento');
select * from finish();
rollback;
