-- M10 (revisão): conferência não volta a valer pela hora do celular, a hora do celular respeita a
-- linha do tempo das peças, "Não é ele" sem internet sem duplicar, impressão sai na anonimização.
begin;
select plan(11);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-000000000001', 'Pá revisão', 'pa', 'PRV', 5000);
insert into public.unidade (obra_id, tipo_id, codigo)
values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000e1', 'PRV-01');
insert into t_ctx
  select 'joaquim', qr_token from public.pessoa where nome = 'Joaquim Silva'
  union all select 'joaquim_id', id::text from public.pessoa where nome = 'Joaquim Silva'
  union all select 'helio', qr_token from public.pessoa where nome = 'Hélio Moreira'
  union all select 'helio_id', id::text from public.pessoa where nome = 'Hélio Moreira';
-- Conferência de 2 h atrás, já vencida.
insert into public.identificacao (id, obra_id, pessoa_id, usuario_id, criado_em, expira_em)
select 'd0000000-0000-4000-8000-0000000000f9', 'a0000000-0000-4000-8000-000000000001', id,
       'b0000000-0000-4000-8000-000000000002', now() - interval '2 hours', now() - interval '110 minutes'
  from public.pessoa where nome = 'Joaquim Silva';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), 'd0000000-0000-4000-8000-0000000000f9',
      '[{"tipo":"f0000000-0000-4000-8000-0000000000e1","quantidade":1}]', true,
      gen_random_uuid(), null, now() - interval '115 minutes')$$,
  '22023', null, 'conferência + hora do celular: recusado (não ressuscita conferência vencida)'
);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), 'd0000000-0000-4000-8000-0000000000f9',
      '[{"tipo":"f0000000-0000-4000-8000-0000000000e1","quantidade":1}]', true)$$,
  'AL001', null, 'conferência vencida continua recusada'
);

-- Linha do tempo: Hélio pega às (agora - 30 min) e devolve agora; retirada sem internet do
-- Joaquim "às 2 h atrás" da mesma peça fica com a hora da devolução.
insert into t_ctx select 'r1', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000e1","quantidade":1}]', true,
  gen_random_uuid(), (select valor from t_ctx where chave = 'helio'), now() - interval '30 minutes')::text;
insert into t_ctx select 'd1', public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000e1","quantidade":1}]',
  gen_random_uuid(), (select valor from t_ctx where chave = 'helio'), now() - interval '2 hours')::text;
select ok(
  (select criado_em from public.movimento where id = (select valor::uuid from t_ctx where chave = 'd1')) >=
  (select criado_em from public.movimento where id = (select valor::uuid from t_ctx where chave = 'r1')),
  'devolução nunca fica antes da retirada da peça'
);
insert into t_ctx select 'r2', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000e1","quantidade":1}]', true,
  gen_random_uuid(), (select valor from t_ctx where chave = 'joaquim'), now() - interval '3 hours')::text;
select is(
  (select criado_em from public.movimento where id = (select valor::uuid from t_ctx where chave = 'r2')),
  (select criado_em from public.movimento where id = (select valor::uuid from t_ctx where chave = 'd1')),
  'retirada sem internet fica com a hora em que a peça voltou'
);
select is(
  (select desde from public.posse where movimento_retirada_id = (select valor::uuid from t_ctx where chave = 'r2')),
  (select criado_em from public.movimento where id = (select valor::uuid from t_ctx where chave = 'r2')),
  'e a posse começa na mesma hora'
);
select ok(
  (select recebido_em is not null from public.movimento where id = (select valor::uuid from t_ctx where chave = 'r2')),
  'continua marcada como lançada sem internet'
);

-- "Não é ele" sem internet.
insert into t_ctx values ('chave_oc', gen_random_uuid()::text);
insert into t_ctx select 'oc1', public.registrar_ocorrencia('a0000000-0000-4000-8000-000000000001',
  (select valor from t_ctx where chave = 'helio'), (select valor::uuid from t_ctx where chave = 'chave_oc'),
  now() - interval '40 minutes')::text;
select is(
  public.registrar_ocorrencia('a0000000-0000-4000-8000-000000000001',
    (select valor from t_ctx where chave = 'helio'), (select valor::uuid from t_ctx where chave = 'chave_oc'),
    now() - interval '40 minutes'),
  (select valor::uuid from t_ctx where chave = 'oc1'), 'reenvio do "Não é ele" não duplica'
);
select ok(
  (select criado_em < now() - interval '39 minutes' from public.ocorrencia
    where id = (select valor::uuid from t_ctx where chave = 'oc1')),
  'ocorrência com a hora do celular'
);
select throws_ok(
  $$select public.registrar_ocorrencia('a0000000-0000-4000-8000-000000000001',
      (select valor from t_ctx where chave = 'helio'), gen_random_uuid(), now() - interval '2 days')$$,
  'AL012', null, 'ocorrência com mais de 24 h: recusada'
);
reset role;

-- Anonimizar apaga os trabalhos de impressão da pessoa.
insert into public.impressora (id, obra_id, nome, ip, porta, linguagem)
values ('70000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-000000000001', 'Teste', '10.0.0.9', 9100, 'ZPL')
on conflict do nothing;
insert into public.trabalho_impressao (obra_id, impressora_id, payload, pessoa_id, descricao)
values ('a0000000-0000-4000-8000-000000000001',
        (select id from public.impressora where obra_id = 'a0000000-0000-4000-8000-000000000001' limit 1), 'payload com nome',
        (select valor::uuid from t_ctx where chave = 'joaquim_id'), 'Adesivo de JOAQUIM');
-- Joaquim devolve antes (quem tem ferramenta não é anonimizado; aqui chamamos direto).
select privado.anonimizar_pessoa((select valor::uuid from t_ctx where chave = 'joaquim_id'));
select is(
  (select count(*)::int from public.trabalho_impressao where pessoa_id = (select valor::uuid from t_ctx where chave = 'joaquim_id')),
  0, 'trabalhos de impressão da pessoa apagados'
);
select is(
  (select nome from public.pessoa where id = (select valor::uuid from t_ctx where chave = 'joaquim_id')),
  'Pessoa anonimizada', 'pessoa anonimizada'
);

select * from finish();
rollback;
