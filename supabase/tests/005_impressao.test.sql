-- M3 · Fila de impressão, dispositivo e agente (usa o seed: Obra Demonstração).
begin;
select plan(41);

-- Parte do zero mesmo num banco local já usado (tudo volta no rollback).
delete from public.trabalho_impressao;
delete from public.impressora;
delete from public.dispositivo_tv;

-- Sem impressora escolhida, nada entra na fila.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.enfileirar_impressao('a0000000-0000-4000-8000-000000000001', 'teste', '', '^XA^XZ', 1)$$,
  'P0002', null, 'sem impressora escolhida: erro claro'
);
reset role;

-- Preparação como administrador: impressora da obra.
insert into public.impressora (id, obra_id, nome, ip, porta, linguagem)
values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
        'Etiquetadora', '192.168.0.50', 9100, 'ZPL');

-- Engenheira -------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;

insert into t_ctx values ('token', public.criar_dispositivo('a0000000-0000-4000-8000-000000000001', 'Mini PC do almoxarifado'));
select ok((select valor from t_ctx where chave = 'token') ~ '^[0-9a-f]{64}$', 'token do dispositivo: 64 hex, mostrado uma vez');
select is(
  (select count(*)::int from public.dispositivo_tv where nome = 'Mini PC do almoxarifado'),
  1, 'dispositivo cadastrado'
);
select throws_ok($$select token_hash from public.dispositivo_tv$$, '42501', null, 'hash do token não é legível');

select ok(
  (select token ~ '^[0-9a-f]{36}$' from public.dados_adesivo((select id from public.pessoa where nome = 'Joaquim Silva'))),
  'engenheira lê os dados do adesivo (token opaco)'
);

insert into t_ctx values ('trabalho', public.enfileirar_impressao(
  'a0000000-0000-4000-8000-000000000001', 'adesivo', 'Adesivo de JOAQUIM', '^XA^XZ', 1,
  (select id from public.pessoa where nome = 'Joaquim Silva'))::text);
select is(
  (select status::text from public.trabalho_impressao where id = (select valor::uuid from t_ctx where chave = 'trabalho')),
  'pendente', 'trabalho entra na fila como pendente'
);
select throws_ok($$select payload from public.trabalho_impressao$$, '42501', null, 'conteúdo da etiqueta não é legível');
select throws_ok(
  $$insert into public.trabalho_impressao (obra_id, impressora_id, payload)
    values ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'x')$$,
  '42501', null, 'ninguém insere trabalho direto (só pela função)'
);
select throws_ok(
  $$select public.enfileirar_impressao('a0000000-0000-4000-8000-000000000001', 'teste', '', '^XA^XZ', 6)$$,
  '23514', null, 'no máximo 5 cópias'
);
select throws_ok(
  $$select public.enfileirar_impressao('a0000000-0000-4000-8000-000000000002', 'teste', '', '^XA^XZ', 1)$$,
  '42501', null, 'não imprime em obra onde só consulta'
);

-- Almoxarife ----------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.dados_adesivo((select id from public.pessoa where nome = 'Joaquim Silva'))$$,
  '42501', null, 'almoxarife não lê o token do QR'
);
select throws_ok(
  $$select public.enfileirar_impressao('a0000000-0000-4000-8000-000000000001', 'teste', '', '^XA^XZ', 1)$$,
  '42501', null, 'almoxarife não imprime'
);
select throws_ok(
  $$select public.criar_dispositivo('a0000000-0000-4000-8000-000000000001', 'Pirata')$$,
  '42501', null, 'almoxarife não cadastra dispositivo'
);

-- Agente (anônimo com o token) ---------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$select public.agente_ping('token-errado')$$, '42501', null, 'token errado é recusado');
select is(public.agente_ping((select valor from t_ctx where chave = 'token')), 'Obra Demonstração', 'ping devolve a obra');
select results_eq(
  $$select descricao, ip, porta from public.agente_proximos((select valor from t_ctx where chave = 'token'))$$,
  $$values ('Adesivo de JOAQUIM'::text, '192.168.0.50'::text, 9100)$$,
  'agente pega o trabalho com o IP da impressora'
);
select is_empty(
  $$select * from public.agente_proximos((select valor from t_ctx where chave = 'token'))$$,
  'trabalho pego não volta na próxima consulta'
);
select lives_ok(
  $$select public.agente_concluir((select valor from t_ctx where chave = 'token'),
      (select valor::uuid from t_ctx where chave = 'trabalho'), true, null)$$,
  'agente conclui o trabalho'
);
select throws_ok($$select * from public.pessoa$$, '42501', null, 'anônimo continua sem ler tabelas');
reset role;
select is(
  (select status::text from public.trabalho_impressao where id = (select valor::uuid from t_ctx where chave = 'trabalho')),
  'enviado', 'trabalho fica como enviado'
);
select is(
  (select payload from public.trabalho_impressao where id = (select valor::uuid from t_ctx where chave = 'trabalho')),
  '', 'conteúdo (com o token do QR) apagado depois de impresso'
);

-- Só uma impressora ativa por obra.
select throws_ok(
  $$insert into public.impressora (obra_id, nome, ip, porta, linguagem)
    values ('a0000000-0000-4000-8000-000000000001', 'Outra', '192.168.0.51', 9100, 'TSPL')$$,
  '23505', null, 'uma impressora ativa por obra'
);

-- Dispositivo da obra B não vê nem conclui trabalho da obra A.
insert into public.impressora (obra_id, nome, ip, porta, linguagem)
values ('a0000000-0000-4000-8000-000000000002', 'Etiquetadora B', '192.168.1.50', 9100, 'ZPL');
insert into public.dispositivo_tv (obra_id, nome, token_hash)
values ('a0000000-0000-4000-8000-000000000002', 'Mini PC B', privado.hash_token(repeat('b', 64)));
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t_ctx values ('trabalho2', public.enfileirar_impressao(
  'a0000000-0000-4000-8000-000000000001', 'teste', 'Teste A', '^XA^XZ', 1)::text);
reset role;
set local role anon;
select is_empty(
  $$select * from public.agente_proximos(repeat('b', 64))$$,
  'agente de outra obra não pega o trabalho'
);
select is(
  (select count(*)::int from public.agente_proximos((select valor from t_ctx where chave = 'token'))),
  1, 'agente da obra pega o próprio trabalho'
);
select lives_ok(
  $$select public.agente_concluir(repeat('b', 64), (select valor::uuid from t_ctx where chave = 'trabalho2'), true, null)$$,
  'concluir trabalho de outra obra não dá erro, mas não muda nada'
);
reset role;
select is(
  (select status::text from public.trabalho_impressao where id = (select valor::uuid from t_ctx where chave = 'trabalho2')),
  'enviando', 'agente de outra obra não conclui o trabalho'
);

-- Agente caiu no meio: "enviando" há mais de 3 minutos volta para a fila (2ª tentativa).
update public.trabalho_impressao set atualizado_em = now() - interval '4 minutes'
 where id = (select valor::uuid from t_ctx where chave = 'trabalho2');
set local role anon;
select results_eq(
  $$select descricao from public.agente_proximos((select valor from t_ctx where chave = 'token'))$$,
  $$values ('Teste A'::text)$$,
  'trabalho parado em "enviando" volta para a fila'
);
reset role;

-- Outro mini PC da mesma obra não conclui o que o primeiro pegou.
insert into public.dispositivo_tv (obra_id, nome, token_hash)
values ('a0000000-0000-4000-8000-000000000001', 'Mini PC 2', privado.hash_token(repeat('c', 64)));
set local role anon;
select lives_ok(
  $$select public.agente_concluir(repeat('c', 64), (select valor::uuid from t_ctx where chave = 'trabalho2'), true, null)$$,
  'outro mini PC tenta concluir'
);
reset role;
select is(
  (select status::text from public.trabalho_impressao where id = (select valor::uuid from t_ctx where chave = 'trabalho2')),
  'enviando', 'só quem pegou o trabalho conclui'
);

-- Sem confirmação depois de 3 tentativas: vira erro (não imprime o mesmo adesivo sem parar).
update public.trabalho_impressao set atualizado_em = now() - interval '4 minutes'
 where id = (select valor::uuid from t_ctx where chave = 'trabalho2');
set local role anon;
select is(
  (select count(*)::int from public.agente_proximos((select valor from t_ctx where chave = 'token'))),
  1, 'terceira tentativa'
);
reset role;
update public.trabalho_impressao set atualizado_em = now() - interval '4 minutes'
 where id = (select valor::uuid from t_ctx where chave = 'trabalho2');
set local role anon;
select is_empty(
  $$select * from public.agente_proximos((select valor from t_ctx where chave = 'token'))$$,
  'depois de 3 tentativas o trabalho não volta mais'
);
reset role;
select is(
  (select status::text from public.trabalho_impressao where id = (select valor::uuid from t_ctx where chave = 'trabalho2')),
  'erro', 'vira erro pedindo para conferir o adesivo'
);

-- Impressora só na rede da obra e na porta RAW.
select throws_ok(
  $$insert into public.impressora (obra_id, nome, ip, porta, linguagem, ativa)
    values ('a0000000-0000-4000-8000-000000000001', 'Na internet', '8.8.8.8', 9100, 'ZPL', false)$$,
  '23514', null, 'impressora com IP da internet é recusada'
);
select throws_ok(
  $$insert into public.impressora (obra_id, nome, ip, porta, linguagem, ativa)
    values ('a0000000-0000-4000-8000-000000000001', 'Porta 25', '192.168.0.60', 25, 'ZPL', false)$$,
  '23514', null, 'impressora fora da porta RAW é recusada'
);

-- Pessoa da obra B (a engenheira só consulta lá).
insert into public.empresa (id, obra_id, nome, tipo)
values ('e0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000002', 'Construtora B', 'propria');
insert into public.pessoa (obra_id, empresa_id, nome, nome_capacete, funcao)
values ('a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-0000000000b1', 'Beto Lima', 'BETO', 'Pedreiro');
insert into t_ctx
  select 'pessoa_b', id::text from public.pessoa where nome = 'Beto Lima'
  union all select 'disp_b', id::text from public.dispositivo_tv where nome = 'Mini PC B'
  union all select 'disp_2', id::text from public.dispositivo_tv where nome = 'Mini PC 2'
  union all select 'disp_1', id::text from public.dispositivo_tv where nome = 'Mini PC do almoxarifado';

-- Engenheira ---------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.dados_adesivo((select valor::uuid from t_ctx where chave = 'pessoa_b'))$$,
  '42501', null, 'não lê o token do QR de pessoa de outra obra'
);
select throws_ok(
  $$select public.enfileirar_impressao('a0000000-0000-4000-8000-000000000001', 'teste', '', 'oi', 1)$$,
  '22023', null, 'só aceita etiqueta ZPL ou TSPL'
);
select throws_ok(
  $$select public.revogar_dispositivo((select valor::uuid from t_ctx where chave = 'disp_b'))$$,
  '42501', null, 'não revoga mini PC de outra obra'
);
select ok(
  not has_function_privilege('authenticated', 'privado.conferir_posse_status()', 'execute')
  and not has_function_privilege('authenticated', 'privado.conferir_empresa_consulta()', 'execute')
  and not has_function_privilege('authenticated', 'privado.bloquear_alteracao()', 'execute')
  and not has_function_privilege('authenticated', 'privado.registrar_alteracoes()', 'execute')
  and not has_function_privilege('authenticated', 'privado.conferir_tipo_empresa()', 'execute'),
  'funções de gatilho continuam fora do alcance do cliente'
);

-- Almoxarife não revoga.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.revogar_dispositivo((select valor::uuid from t_ctx where chave = 'disp_2'))$$,
  '42501', null, 'almoxarife não revoga mini PC'
);

-- Engenheira revoga pela função; o token deixa de valer.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.revogar_dispositivo((select valor::uuid from t_ctx where chave = 'disp_1'))$$,
  'engenheira revoga o mini PC'
);
reset role;
set local role anon;
select throws_ok(
  $$select public.agente_ping((select valor from t_ctx where chave = 'token'))$$,
  '42501', null, 'token revogado é recusado'
);
reset role;

select * from finish();
rollback;
