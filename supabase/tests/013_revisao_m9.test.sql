-- Revisão do M9 com as funções reais (retirada, devolução, estorno, encerramento e medição).
begin;
select plan(23);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon, service_role;

delete from public.envio;
delete from public.aviso_desconto;
delete from public.desconto;
delete from public.medicao;
delete from public.aviso;
delete from public.fechamento_dia;

-- Uma peça só do teste, com uma pessoa da Fôrmas (empreiteira).
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-000000000001', 'Prumo M9', 'regua', 'PRM', 10000);
insert into public.unidade (obra_id, tipo_id, codigo)
values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000f1', 'PRM-01');
insert into t_ctx values ('pessoa', (select id::text from public.pessoa where nome = 'Ivan Pereira'));
insert into t_ctx values ('formas', (select id::text from public.empresa where nome = 'Fôrmas Ribeiro'));

create function pg_temp.como(p_usuario text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.retirar() returns text language sql as $$
  select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
    (select valor::uuid from t_ctx where chave = 'pessoa'), null,
    '[{"tipo":"f0000000-0000-4000-8000-0000000000f1","quantidade":1}]', true)::text
$$;
create function pg_temp.devolver() returns text language sql as $$
  select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
    (select valor::uuid from t_ctx where chave = 'pessoa'), null,
    '[{"tipo":"f0000000-0000-4000-8000-0000000000f1","quantidade":1}]')::text
$$;
create function pg_temp.desconto_de(p_retirada text) returns public.desconto language sql as $$
  select d.* from public.desconto d where d.movimento_retirada_id = (
    select valor::uuid from t_ctx where chave = p_retirada)
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- Ciclo 1: retira, encerra, devolve -------------------------------------------------------------
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000002');
insert into t_ctx values ('ret1', pg_temp.retirar());
insert into t_ctx values ('fech1', public.encerrar_dia('a0000000-0000-4000-8000-000000000001')::text);
reset role;
insert into t_ctx values ('d1', (pg_temp.desconto_de('ret1')).id::text);
select ok(
  (select primeiro_aviso_id is not null from public.desconto where id = (select valor::uuid from t_ctx where chave = 'd1')),
  'desconto lembra o primeiro aviso que o cobrou'
);
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000002');
insert into t_ctx values ('dev1', pg_temp.devolver());
reset role;
select is((pg_temp.desconto_de('ret1')).status::text, 'cancelado', 'ciclo 1: devolvida, desconto cancelado');

-- Ciclo 2: a mesma peça sai de novo, vira pendência e volta -----------------------------------
update public.fechamento_dia set data = data - 1 where id = (select valor::uuid from t_ctx where chave = 'fech1');
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000002');
insert into t_ctx values ('ret2', pg_temp.retirar());
select public.encerrar_dia('a0000000-0000-4000-8000-000000000001');
reset role;
insert into t_ctx values ('d2', (pg_temp.desconto_de('ret2')).id::text);
select isnt((select valor from t_ctx where chave = 'd2'), (select valor from t_ctx where chave = 'd1'),
  'ciclo 2: desconto novo para a retirada nova');
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000002');
insert into t_ctx values ('dev2', pg_temp.devolver());
reset role;

set local role service_role;
select is(
  (select jsonb_array_length(public.dados_envio(e.id) -> 'devolvidas') from public.envio e
    where e.tipo = 'desconto_cancelado' and e.canal = 'email'
      and e.referencia = (select valor::uuid from t_ctx where chave = 'dev2') limit 1),
  1, 'e-mail do ciclo 2 lista só a peça daquela devolução (não soma o ciclo 1)'
);
select is(
  (select public.dados_envio(e.id) ->> 'motivo' from public.envio e
    where e.tipo = 'desconto_cancelado' and e.referencia = (select valor::uuid from t_ctx where chave = 'dev2') limit 1),
  'devolucao', 'motivo: devolução'
);
reset role;

-- Estorno da devolução: desconto volta, aviso volta a valer, e-mail de correção -----------------
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000001');
insert into t_ctx values ('est_dev', public.estornar_movimento('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'dev2'), 'Devolução lançada por engano')::text);
reset role;
select is((pg_temp.desconto_de('ret2')).status::text, 'aberto', 'estorno da devolução reabre o desconto');
select is(
  (select a.status::text from public.aviso a where a.id = (pg_temp.desconto_de('ret2')).primeiro_aviso_id),
  'enviado', 'o aviso volta para "a descontar"'
);
select ok(
  exists (select 1 from public.envio where tipo = 'desconto_reaberto' and canal = 'email'
            and destino = 'roberto@formasribeiro.exemplo'),
  'a empreiteira recebe o e-mail de correção'
);

-- Troca de empresa com desconto em aberto: recusada ---------------------------------------------
select throws_ok(
  $$update public.pessoa set empresa_id = (select id from public.empresa where nome = 'Hidráulica JR')
     where id = (select valor::uuid from t_ctx where chave = 'pessoa')$$,
  'AL010', null, 'pessoa com desconto em aberto não troca de empresa'
);
select throws_ok(
  $$update public.empresa set tipo = 'propria' where nome = 'Pinturas Aurora'
      and obra_id = 'a0000000-0000-4000-8000-000000000001'$$,
  'AL010', null, 'empreiteira com desconto em aberto não vira própria'
);
select lives_ok(
  $$update public.pessoa set funcao = 'Servente' where id = (select valor::uuid from t_ctx where chave = 'pessoa')$$,
  'outras mudanças na pessoa continuam livres'
);

-- Medição atômica ---------------------------------------------------------------------------------
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000001');
insert into t_ctx values ('med', public.fechar_medicao('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'formas'), current_date + 30)::text);
select throws_ok(
  $$select public.fechar_medicao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'formas'), current_date + 60)$$,
  'AL011', null, 'segundo clique: nada em aberto, sem medição vazia'
);
reset role;
select is(
  (select total from public.medicao where id = (select valor::uuid from t_ctx where chave = 'med')),
  (select sum(valor)::int from public.desconto where medicao_id = (select valor::uuid from t_ctx where chave = 'med')),
  'total da medição = soma do que foi confirmado'
);
select is((pg_temp.desconto_de('ret2')).status::text, 'confirmado', 'desconto confirmado na medição');

-- Estorno da retirada depois da medição: recusado -------------------------------------------------
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.estornar_movimento('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'ret2'), 'Retirada lançada por engano')$$,
  'AL009', null, 'retirada já descontada na medição não pode ser estornada'
);
reset role;

-- Estorno de retirada antes da medição: cancela com "lançamento corrigido" ---------------------
update public.fechamento_dia set data = data - 2 where data = privado.hoje_na_obra()
   and obra_id = 'a0000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000002');
select pg_temp.devolver();
insert into t_ctx values ('ret3', pg_temp.retirar());
select public.encerrar_dia('a0000000-0000-4000-8000-000000000001');
select pg_temp.como('b0000000-0000-4000-8000-000000000001');
insert into t_ctx values ('est_ret', public.estornar_movimento('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'ret3'), 'Retirada lançada por engano')::text);
reset role;
select is((pg_temp.desconto_de('ret3')).status::text, 'cancelado', 'estorno da retirada antes da medição cancela');
set local role service_role;
select is(
  (select public.dados_envio(e.id) ->> 'motivo' from public.envio e
    where e.tipo = 'desconto_cancelado' and e.referencia = (select valor::uuid from t_ctx where chave = 'est_ret') limit 1),
  'corrigido', 'motivo: lançamento corrigido (não "devolvida")'
);
reset role;

-- Fila: espera crescente e sem destino -------------------------------------------------------------
delete from public.envio;
insert into public.envio (id, obra_id, tipo, canal, destino, referencia)
values ('e0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-000000000001', 'ocorrencia', 'push', 'x', gen_random_uuid());
set local role service_role;
select is((select count(*)::int from public.pegar_envios(5)), 1, 'pega o envio');
select public.concluir_envio('e0000000-0000-4000-8000-0000000000e1', false, 'fora do ar');
select is((select count(*)::int from public.pegar_envios(5)), 0, 'com erro, espera antes de tentar de novo');
reset role;
select ok(
  (select proxima_tentativa_em > now() from public.envio where id = 'e0000000-0000-4000-8000-0000000000e1'),
  'próxima tentativa marcada para depois'
);
set local role service_role;
select public.concluir_envio('e0000000-0000-4000-8000-0000000000e1', true, null, true);
reset role;
select is(
  (select status::text from public.envio where id = 'e0000000-0000-4000-8000-0000000000e1'),
  'sem_destino', 'notificação sem aparelho ativado fica "sem destino", não "enviado"'
);

-- Almoxarife: só o encerramento de hoje -------------------------------------------------------------
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000002');
select is(public.resumo_fechamento((select valor::uuid from t_ctx where chave = 'fech1')), null,
  'almoxarife não vê encerramento de outro dia');
select pg_temp.como('b0000000-0000-4000-8000-000000000001');
select isnt(public.resumo_fechamento((select valor::uuid from t_ctx where chave = 'fech1')), null,
  'engenheiro vê o histórico');
reset role;

select * from finish();
rollback;
