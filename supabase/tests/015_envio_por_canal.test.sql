-- M10 · Sem provedor de e-mail, o processador pega só as notificações.
begin;
select plan(4);

delete from public.envio;
insert into public.envio (obra_id, tipo, canal, destino, referencia)
values ('a0000000-0000-4000-8000-000000000001', 'ocorrencia', 'push', 'u1', gen_random_uuid()),
       ('a0000000-0000-4000-8000-000000000001', 'aviso', 'email', 'x@exemplo.com', gen_random_uuid());

set local role service_role;
create temp table t_push on commit drop as select * from public.pegar_envios(10, array['push']::public.canal_envio[]);
select is((select count(*)::int from t_push), 1, 'só push pedido: pega uma');
select is((select canal::text from t_push), 'push', 'e é a notificação');
select is(
  (select tentativas from public.envio where canal = 'email'), 0,
  'o e-mail fica aguardando sem gastar tentativa'
);
select is((select count(*)::int from public.pegar_envios(10)), 1, 'sem filtro, pega o e-mail também');
reset role;

select * from finish();
rollback;
