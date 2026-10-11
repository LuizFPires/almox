-- M3 · Fila de impressão, dispositivo e agente (usa o seed: Obra Demonstração).
begin;
select plan(18);

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

-- Almoxarife ----------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.dados_adesivo((select id from public.pessoa where nome = 'Joaquim Silva'))$$,
  '42501', null, 'almoxarife não lê o token do QR'
);
select throws_ok(
  $$select public.enfileirar_impressao('a0000000-0000-4000-8000-000000000001', 'teste', '', 'x', 1)$$,
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

-- Revogar desliga o dispositivo.
update public.dispositivo_tv set revogado_em = now() where nome = 'Mini PC do almoxarifado';
set local role anon;
select throws_ok(
  $$select public.agente_ping((select valor from t_ctx where chave = 'token'))$$,
  '42501', null, 'token revogado é recusado'
);
reset role;

select * from finish();
rollback;
