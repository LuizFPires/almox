-- M9 · Agendamento e fila de envios.
begin;
select plan(14);

select is(
  (select array_agg(jobname order by jobname) from cron.job where jobname like 'almox-%'),
  array['almox-encerrar-dia', 'almox-limpar-fotos', 'almox-processar-envios'],
  'jobs agendados'
);
select is(
  (select schedule from cron.job where jobname = 'almox-encerrar-dia'), '59 2 * * *',
  'encerramento às 23:59 de São Paulo (02:59 UTC)'
);
select lives_ok($$select privado.chamar_processador()$$, 'sem endereço no Vault: não chama nada e não falha');

delete from public.envio;
insert into public.envio (obra_id, tipo, canal, destino, referencia)
select 'a0000000-0000-4000-8000-000000000001', 'ocorrencia', 'push', 'u' || g, gen_random_uuid()
  from generate_series(1, 3) g;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$select * from public.pegar_envios(10)$$, '42501', null, 'logado não pega envios');
select throws_ok($$select public.fotos_orfas()$$, '42501', null, 'logado não lista fotos órfãs');
reset role;

set local role service_role;
create temp table t_pegos on commit drop as select * from public.pegar_envios(2);
select is((select count(*)::int from t_pegos), 2, 'pega até o limite');
select is((select count(*)::int from public.pegar_envios(10)), 1, 'os já pegos não saem de novo (só o que sobrou)');
select public.concluir_envio((select id from t_pegos limit 1), true);
select is(
  (select count(*)::int from public.envio where status = 'enviado' and enviado_em is not null), 1,
  'concluído com sucesso vira enviado'
);
select public.concluir_envio((select id from t_pegos order by id desc limit 1), false, 'caixa cheia');
select is(
  (select erro from public.envio where id = (select id from t_pegos order by id desc limit 1)), 'caixa cheia',
  'erro guardado para nova tentativa'
);
update public.envio set tentativas = 5, pego_em = null where status = 'erro';
select is(
  (select count(*)::int from public.pegar_envios(10) where status = 'erro'), 0,
  'depois de 5 tentativas, desiste'
);
reset role;

-- Inscrições de notificação: cada login só as próprias -----------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.inscricao_push (endpoint, usuario_id, p256dh, auth)
    values ('https://push.exemplo/formas', 'b0000000-0000-4000-8000-000000000004', 'k', 'a')$$,
  'login grava a própria inscrição'
);
select throws_ok(
  $$insert into public.inscricao_push (endpoint, usuario_id, p256dh, auth)
    values ('https://push.exemplo/outro', 'b0000000-0000-4000-8000-000000000001', 'k', 'a')$$,
  '42501', null, 'não grava inscrição em nome de outro login'
);
select throws_ok(
  $$insert into public.inscricao_push (endpoint, usuario_id, p256dh, auth)
    values ('http://push.exemplo/x', 'b0000000-0000-4000-8000-000000000004', 'k', 'a')$$,
  '23514', null, 'endereço de notificação só https'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.inscricao_push), 0, 'engenheiro não vê a inscrição de outro login');
reset role;

select * from finish();
rollback;
