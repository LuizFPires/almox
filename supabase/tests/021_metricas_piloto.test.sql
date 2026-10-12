-- M11 · Métricas do piloto: conferência gravada na retirada, tempo, % sem QR, só o engenheiro.
begin;
select plan(9);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
-- Obra só do teste (as métricas da obra demo dependem do que os outros testes lançaram).
insert into public.obra (id, nome) values ('a0000000-0000-4000-8000-0000000000d9', 'Obra métricas');
insert into public.empresa (id, obra_id, nome, tipo)
values ('e0000000-0000-4000-8000-0000000000d9', 'a0000000-0000-4000-8000-0000000000d9', 'Construtora M', 'propria');
insert into public.pessoa (id, obra_id, empresa_id, nome, nome_capacete, funcao) values
  ('c0000000-0000-4000-8000-0000000000d1', 'a0000000-0000-4000-8000-0000000000d9', 'e0000000-0000-4000-8000-0000000000d9', 'Ana Métrica', 'ANA', 'Servente'),
  ('c0000000-0000-4000-8000-0000000000d2', 'a0000000-0000-4000-8000-0000000000d9', 'e0000000-0000-4000-8000-0000000000d9', 'Beto Métrica', 'BETO', 'Servente');
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000d9', 'a0000000-0000-4000-8000-0000000000d9', 'Pá', 'pa', 'PA', 5000);
insert into public.unidade (obra_id, tipo_id, codigo)
select 'a0000000-0000-4000-8000-0000000000d9', 'f0000000-0000-4000-8000-0000000000d9', 'PA-0' || n from generate_series(1, 4) n;
insert into public.usuario_obra (usuario_id, obra_id, perfil) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000d9', 'engenheiro'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-0000000000d9', 'almoxarife');
-- Conferência lida 12 s antes da retirada.
insert into public.identificacao (id, obra_id, pessoa_id, usuario_id, criado_em, expira_em)
values ('d0000000-0000-4000-8000-0000000000d9', 'a0000000-0000-4000-8000-0000000000d9',
        'c0000000-0000-4000-8000-0000000000d1', 'b0000000-0000-4000-8000-000000000002',
        now() - interval '12 seconds', now() + interval '10 minutes');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx select 'qr', public.registrar_retirada('a0000000-0000-4000-8000-0000000000d9',
  'c0000000-0000-4000-8000-0000000000d1', 'd0000000-0000-4000-8000-0000000000d9',
  '[{"tipo":"f0000000-0000-4000-8000-0000000000d9","quantidade":1}]', true)::text;
select public.registrar_retirada('a0000000-0000-4000-8000-0000000000d9',
  'c0000000-0000-4000-8000-0000000000d2', null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000d9","quantidade":1}]', true);
select throws_ok(
  $$select public.metricas_piloto('a0000000-0000-4000-8000-0000000000d9', current_date, current_date)$$,
  '42501', null, 'almoxarife não vê as métricas'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t_ctx select 'm', (public.metricas_piloto('a0000000-0000-4000-8000-0000000000d9',
  (now() at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date) -> 0)::text;
reset role;

select is(
  (select identificacao_id from public.movimento where id = (select valor::uuid from t_ctx where chave = 'qr')),
  'd0000000-0000-4000-8000-0000000000d9'::uuid, 'retirada com QR guarda a conferência usada'
);
select is((select (valor::jsonb ->> 'retiradas')::int from t_ctx where chave = 'm'), 2, 'retiradas da semana');
select is((select (valor::jsonb ->> 'semQr')::int from t_ctx where chave = 'm'), 1, 'uma sem QR');
select is((select (valor::jsonb ->> 'tempoMedidas')::int from t_ctx where chave = 'm'), 1, 'uma com tempo medido');
select ok(
  (select (valor::jsonb ->> 'tempoMedianaS')::numeric between 11 and 14 from t_ctx where chave = 'm'),
  'tempo do QR à retirada: ~12 s'
);
select is((select (valor::jsonb ->> 'tempoAte15s')::int from t_ctx where chave = 'm'), 1, 'dentro da meta de 15 s');
select is(
  (select (valor::jsonb ->> 'movimentosCompletos')::int - (valor::jsonb ->> 'movimentos')::int from t_ctx where chave = 'm'),
  0, 'rastreabilidade: todos os movimentos completos'
);

set local role anon;
select throws_ok(
  $$select public.metricas_piloto('a0000000-0000-4000-8000-0000000000d9', current_date, current_date)$$,
  '42501', null, 'anônimo não chama'
);
reset role;

select * from finish();
rollback;
