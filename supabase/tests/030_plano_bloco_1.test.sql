-- Plano de correção · bloco 1: desconto sem posse não é cobrado (ponto 3), troca de empresa com
-- ferramenta na mão (7), pessoa inativa devolve pelo QR (4), push só com vínculo vigente (9).
begin;
select plan(16);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon, service_role;

delete from public.envio;
delete from public.aviso_desconto;
delete from public.desconto;
delete from public.medicao;
delete from public.aviso;
delete from public.fechamento_dia;

insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000001', 'Prumo B1', 'regua', 'PRB', 10000);
insert into public.unidade (obra_id, tipo_id, codigo)
values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000b1', 'PRB-01'),
       ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000b1', 'PRB-02');
insert into t_ctx values ('formas', (select id::text from public.empresa where nome = 'Fôrmas Ribeiro'));
-- Pessoa só do teste (sem outras ferramentas), com token conhecido.
insert into public.pessoa (id, obra_id, empresa_id, nome, nome_capacete, funcao, qr_token)
values ('c0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000001',
        (select valor::uuid from t_ctx where chave = 'formas'), 'Teste Bloco Um', 'TESTE B1', 'Servente',
        'b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1');
insert into t_ctx values ('pessoa', 'c0000000-0000-4000-8000-0000000000b1');
insert into t_ctx values ('token', 'b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1');
insert into t_ctx values ('outra', (select id::text from public.empresa
  where obra_id = 'a0000000-0000-4000-8000-000000000001' and tipo = 'empreiteira' and nome <> 'Fôrmas Ribeiro' limit 1));

create function pg_temp.como(p_usuario text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.retirar(p_qtd integer) returns text language sql as $$
  select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
    (select valor::uuid from t_ctx where chave = 'pessoa'), null,
    json_build_array(json_build_object('tipo', 'f0000000-0000-4000-8000-0000000000b1', 'quantidade', p_qtd))::jsonb, true)::text
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- Ponto 3 · desconto "aberto" sem a posse (o que a corrida deixava) não é cobrado ------------------
select ok(
  exists (select 1 from pg_trigger where tgname = 'posse_trava_fechamento' and tgrelid = 'public.posse'::regclass),
  'saída de posse pega a trava do encerramento'
);
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000002');
insert into t_ctx values ('ret', pg_temp.retirar(2));
select public.encerrar_dia('a0000000-0000-4000-8000-000000000001');
reset role;
select is(
  (select count(*)::int from public.desconto where movimento_retirada_id = (select valor::uuid from t_ctx where chave = 'ret') and status = 'aberto'),
  2, 'encerramento gera os 2 descontos'
);
-- Simula a corrida: uma peça sai da posse sem o gatilho que cancelaria o desconto.
set constraints all immediate;
alter table public.posse disable trigger desconto_cancelar;
-- Num comando só: a conferência de posse × situação da unidade roda no fim do comando.
with saiu as (
  delete from public.posse where unidade_id = (select id from public.unidade where codigo = 'PRB-01')
  returning unidade_id)
update public.unidade set status = 'livre' where id in (select unidade_id from saiu);
alter table public.posse enable trigger desconto_cancelar;
set constraints all deferred;

set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000001');
insert into t_ctx values ('med', public.fechar_medicao('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'formas'), null)::text);
reset role;
select is(
  (select d.status::text from public.desconto d join public.unidade u on u.id = d.unidade_id where u.codigo = 'PRB-02'),
  'confirmado', 'medição cobra a peça que continua fora'
);
select is(
  (select d.status::text from public.desconto d join public.unidade u on u.id = d.unidade_id where u.codigo = 'PRB-01'),
  'cancelado', 'desconto da peça que voltou é cancelado'
);
select ok(
  exists (select 1 from public.envio where tipo = 'desconto_cancelado'),
  'a empreiteira é avisada do cancelamento'
);

-- Ponto 7 · trocar de empresa com ferramenta na mão -------------------------------------------
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000001');
select throws_ok(
  format($$update public.pessoa set empresa_id = %L where id = %L$$,
    (select valor from t_ctx where chave = 'outra'), (select valor from t_ctx where chave = 'pessoa')),
  'AL010', null, 'não troca de empresa com ferramenta na mão'
);
reset role;

-- Ponto 4 · inativa com ferramenta devolve pelo QR; retirada continua recusada ----------------
update public.pessoa set ativa = false where id = (select valor::uuid from t_ctx where chave = 'pessoa');
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000002');
select is(
  (select situacao from public.ler_capacete('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'token'))),
  'ok', 'inativa com ferramenta: o QR identifica'
);
insert into t_ctx select 'ident', identificacao::text
  from public.conferir_pessoa('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'token'));
select ok((select valor is not null from t_ctx where chave = 'ident'), 'conferência aceita');
select lives_ok(
  format($$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001', %L, %L,
    '[{"tipo":"f0000000-0000-4000-8000-0000000000b1","quantidade":1}]')$$,
    (select valor from t_ctx where chave = 'pessoa'), (select valor from t_ctx where chave = 'ident')),
  'devolve pelo QR'
);
select throws_ok(
  $$select pg_temp.retirar(1)$$, null, null, 'inativa não retira'
);
select is(
  (select situacao from public.ler_capacete('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'token'))),
  'inativa', 'sem ferramenta: volta a ser inativa'
);
select throws_ok(
  format($$select * from public.conferir_pessoa('a0000000-0000-4000-8000-000000000001', %L)$$,
    (select valor from t_ctx where chave = 'token')),
  'P0002', null, 'sem ferramenta: conferência recusada'
);
reset role;

-- Sem internet: inativa só vem enquanto tiver ferramenta, marcada.
update public.pessoa set ativa = false where id = 'c0000000-0000-4000-8000-0000000000b1';
set local role authenticated;
select pg_temp.como('b0000000-0000-4000-8000-000000000002');
select ok(
  not exists (select 1 from jsonb_array_elements(public.dados_offline('a0000000-0000-4000-8000-000000000001') -> 'pessoas') p
               where p ->> 'id' = (select valor from t_ctx where chave = 'pessoa')),
  'offline: inativa sem ferramenta não vem'
);
reset role;

-- Ponto 9 · push só para quem ainda tem vínculo ------------------------------------------------
insert into public.inscricao_push (endpoint, usuario_id, p256dh, auth)
values ('https://fcm.googleapis.com/b1', 'b0000000-0000-4000-8000-000000000004', 'k', 'a');
insert into public.envio (id, obra_id, tipo, canal, destino, referencia, dados)
values ('e1000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000001', 'desconto_cancelado', 'push',
        'b0000000-0000-4000-8000-000000000004', gen_random_uuid(),
        jsonb_build_object('empresa', (select valor from t_ctx where chave = 'formas'), 'descontos', '[]'::jsonb));
select is(
  jsonb_array_length(public.dados_envio('e1000000-0000-4000-8000-0000000000b1') -> 'inscricoes'),
  1, 'com vínculo da própria empresa: recebe'
);
update public.envio set dados = jsonb_set(dados, '{empresa}', to_jsonb((select valor from t_ctx where chave = 'outra')))
 where id = 'e1000000-0000-4000-8000-0000000000b1';
select is(
  jsonb_array_length(public.dados_envio('e1000000-0000-4000-8000-0000000000b1') -> 'inscricoes'),
  0, 'restrita a outra empresa: não recebe'
);
delete from public.usuario_obra where usuario_id = 'b0000000-0000-4000-8000-000000000004';
update public.envio set dados = jsonb_set(dados, '{empresa}', to_jsonb((select valor from t_ctx where chave = 'formas')))
 where id = 'e1000000-0000-4000-8000-0000000000b1';
select is(
  jsonb_array_length(public.dados_envio('e1000000-0000-4000-8000-0000000000b1') -> 'inscricoes'),
  0, 'sem vínculo com a obra: não recebe'
);

select * from finish();
rollback;
