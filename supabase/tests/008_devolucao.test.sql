-- M6 · Devolução (RN-02, RN-06, RN-08, RN-09), estorno (RN-18) e manutenção. Usa o seed.
begin;
select plan(47);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into t_ctx
  select 'joaquim', qr_token from public.pessoa where nome = 'Joaquim Silva'
  union all select 'joaquim_id', id::text from public.pessoa where nome = 'Joaquim Silva'
  union all select 'helio_id', id::text from public.pessoa where nome = 'Hélio Moreira';

-- Ferramentas só do teste: Pá teste (TP-01, TP-02) e Colher teste (TC-01).
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao) values
  ('f0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-000000000001', 'Pá teste', 'pa', 'TP', 5000),
  ('f0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-000000000001', 'Colher teste', 'colher', 'TC', 3000);
insert into public.unidade (id, obra_id, tipo_id, codigo) values
  ('d1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000a1', 'TP-01'),
  ('d1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000a1', 'TP-02'),
  ('d1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000a2', 'TC-01');

-- Fotos já enviadas pelo almoxarife (e uma pela engenheira) ao Storage.
insert into storage.objects (bucket_id, name, owner, owner_id) values
  ('avarias', 'a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000001.jpg', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002'),
  ('avarias', 'a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000002.jpg', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001'),
  ('avarias', 'a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000005.jpg', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002'),
  ('avarias', 'a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000006.jpg', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002');

-- Almoxarife ----------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

insert into t_ctx select 'ident', identificacao::text from public.conferir_pessoa(
  'a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim'));
insert into t_ctx select 'ret', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
  '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":2}]', true)::text;

-- Sem QR, item que saiu com QR não volta (RN-02) — bloqueado na API.
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), null,
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1}]')$$,
  'AL004', null, 'pela lista, item retirado com QR é bloqueado pela API'
);
-- Avaria exige foto e motivo válidos (RN-09).
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1,"avarias":[{"motivo":"quebrada"}]}]')$$,
  'AL005', null, 'avaria sem foto não conclui'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1,"avarias":[{"motivo":"quebrada","foto":"a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-0000000000ff.jpg"}]}]')$$,
  'AL005', null, 'foto que não foi enviada não vale'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1,"avarias":[{"motivo":"quebrada","foto":"a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000002.jpg"}]}]')$$,
  'AL005', null, 'foto enviada por outro usuário não vale'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1,"avarias":[{"motivo":"sumiu","foto":"a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000001.jpg"}]}]')$$,
  'AL005', null, 'motivo fora da lista não vale'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1,"avarias":[{"motivo":"quebrada","foto":"x"},{"motivo":"quebrada","foto":"y"}]}]')$$,
  '22023', null, 'mais avariadas que devolvidas é recusado'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":3}]')$$,
  'AL003', null, 'não devolve mais do que está com a pessoa'
);

-- Critério de aceite: devolve 1 de 2 pás, 1 avariada com foto.
insert into t_ctx select 'dev', public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
  '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1,"avarias":[{"motivo":"cabo_rompido","foto":"a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000001.jpg"}]}]',
  'e0000000-0000-4000-8000-0000000000d1')::text;
reset role;
select results_eq(
  $$select tipo::text, via::text from public.movimento where id = (select valor::uuid from t_ctx where chave = 'dev')$$,
  $$values ('devolucao'::text, 'qr'::text)$$, 'devolução com QR registrada');
select is((select status::text from public.unidade where id = 'd1000000-0000-4000-8000-000000000001'),
  'manutencao', 'a mais antiga (TP-01) voltou avariada: manutenção');
select is((select count(*)::int from public.posse where unidade_id = 'd1000000-0000-4000-8000-000000000001'),
  0, 'TP-01 não está mais com ele');
select is((select pessoa_id from public.posse where unidade_id = 'd1000000-0000-4000-8000-000000000002'),
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), 'a outra pá continua com o Joaquim');
select results_eq(
  $$select motivo::text, foto_path from public.avaria where movimento_id = (select valor::uuid from t_ctx where chave = 'dev')$$,
  $$values ('cabo_rompido'::text, 'a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000001.jpg'::text)$$,
  'avaria com motivo e foto');
select results_eq(
  $$select avariada, retirada_id from public.movimento_item where movimento_id = (select valor::uuid from t_ctx where chave = 'dev')$$,
  $$select true, (select valor::uuid from t_ctx where chave = 'ret')$$,
  'item avariado guarda de qual retirada veio');
select is((select count(*)::int from public.unidade where status = 'em_uso') - (select count(*)::int from public.posse),
  0, 'unidade em uso ⇔ posse');

set local role authenticated;
-- Idempotência: repetir o mesmo pedido devolve o mesmo movimento.
select is(
  public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
    (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
    '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1}]', 'e0000000-0000-4000-8000-0000000000d1'),
  (select valor::uuid from t_ctx where chave = 'dev'), 'repetir o pedido não devolve de novo');
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1,"avarias":[{"motivo":"quebrada","foto":"a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000001.jpg"}]}]')$$,
  'AL005', null, 'a mesma foto não prova duas avarias'
);

-- Critério de aceite: item retirado sem QR volta sem QR.
insert into t_ctx select 'ret_manual', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000a2","quantidade":1}]', true)::text;
insert into t_ctx select 'dev_manual', public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000a2","quantidade":1}]')::text;
reset role;
select results_eq(
  $$select m.via::text, u.status::text from public.movimento m
      join public.movimento_item i on i.movimento_id = m.id join public.unidade u on u.id = i.unidade_id
     where m.id = (select valor::uuid from t_ctx where chave = 'dev_manual')$$,
  $$values ('manual'::text, 'livre'::text)$$, 'item que saiu sem QR voltou sem QR e está livre');

-- Revisão do M6 ------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a2","quantidade":1}]')$$,
  'AL001', null, 'conferência do Joaquim não vale para devolução do Hélio'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1,"avarias":[{"motivo":"quebrada","foto":"a0000000-0000-4000-8000-000000000002/e1000000-0000-4000-8000-000000000005.jpg"}]}]')$$,
  'AL005', null, 'foto com caminho de outra obra não vale'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":2,"avarias":[
        {"motivo":"quebrada","foto":"a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000005.jpg"},
        {"motivo":"desgaste","foto":"a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000005.jpg"}]}]')$$,
  'AL005', null, 'a mesma foto duas vezes no mesmo pedido não vale'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'joaquim_id'), (select valor::uuid from t_ctx where chave = 'ident'),
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":"abc"}]')$$,
  '22023', null, 'quantidade em texto é recusada com mensagem própria'
);
-- Apagar foto (dono, não usada) é conferido pela API do Storage (o banco bloqueia delete direto).
set local role authenticated;

-- Consulta não devolve; ninguém altera devolução nem avaria (RN-18).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
      (select valor::uuid from t_ctx where chave = 'helio_id'), null,
      '[{"tipo":"f0000000-0000-4000-8000-0000000000a2","quantidade":1}]')$$,
  '42501', null, 'consulta não devolve'
);
select throws_ok($$delete from public.avaria$$, '42501', null, 'ninguém apaga avaria');
select throws_ok(
  $$select public.concluir_manutencao('a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'consertada')$$,
  '42501', null, 'consulta não mexe na manutenção'
);

-- Storage: quem lança envia foto da própria obra; consulta não vê fotos.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('avarias', 'a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000003.jpg',
            'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002')$$,
  'almoxarife envia foto de avaria da obra dele'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('avarias', 'a0000000-0000-4000-8000-000000000002/e1000000-0000-4000-8000-000000000004.jpg', 'b0000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'não envia foto para outra obra'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('avarias', 'a0000000-0000-4000-8000-000000000001/qualquer.png', 'b0000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'só .jpg com nome opaco'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'avarias'), 0, 'consulta não vê fotos de avaria');

-- Estorno ------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.estornar_movimento('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'dev'), 'lançado errado')$$,
  '42501', null, 'almoxarife não estorna'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.estornar_movimento('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'dev'), '')$$,
  '22023', null, 'estorno exige motivo'
);
select throws_ok(
  $$select public.estornar_movimento('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'ret'), 'lançado errado')$$,
  'AL007', null, 'retirada com devolução depois não estorna antes da devolução'
);
insert into t_ctx select 'est_dev', public.estornar_movimento('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'dev'), 'Devolução lançada na pessoa errada')::text;
reset role;
select results_eq(
  $$select tipo::text, estorno_de, obs from public.movimento where id = (select valor::uuid from t_ctx where chave = 'est_dev')$$,
  $$select 'estorno'::text, (select valor::uuid from t_ctx where chave = 'dev'), 'Devolução lançada na pessoa errada'::text$$,
  'estorno é um movimento novo, com motivo');
select results_eq(
  $$select p.pessoa_id, p.via::text, p.movimento_retirada_id, u.status::text from public.posse p
      join public.unidade u on u.id = p.unidade_id where p.unidade_id = 'd1000000-0000-4000-8000-000000000001'$$,
  $$select (select valor::uuid from t_ctx where chave = 'joaquim_id'), 'qr'::text,
           (select valor::uuid from t_ctx where chave = 'ret'), 'em_uso'::text$$,
  'estornar a devolução devolve a posse como estava');
select is((select tipo::text from public.movimento where id = (select valor::uuid from t_ctx where chave = 'dev')),
  'devolucao', 'o lançamento original continua como estava (RN-18)');
set local role authenticated;
select throws_ok(
  $$select public.estornar_movimento('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'dev'), 'de novo')$$,
  'AL006', null, 'não estorna duas vezes'
);
-- Agora a retirada pode ser estornada (a devolução já foi anulada).
insert into t_ctx select 'est_ret', public.estornar_movimento('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'ret'), 'Retirada lançada em duplicidade')::text;
reset role;
select is((select count(*)::int from public.posse where movimento_retirada_id = (select valor::uuid from t_ctx where chave = 'ret')),
  0, 'estornar a retirada tira as peças do nome dele');
select is((select string_agg(status::text, ',' order by codigo) from public.unidade where tipo_id = 'f0000000-0000-4000-8000-0000000000a1'),
  'livre,livre', 'as pás voltam a livres');
select is((select count(*)::int from public.unidade where status = 'em_uso') - (select count(*)::int from public.posse),
  0, 'unidade em uso ⇔ posse depois dos estornos');

-- Manutenção ---------------------------------------------------------------------------------------
update public.unidade set status = 'manutencao' where id in ('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$select public.concluir_manutencao('a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'consertada')$$,
  'almoxarife marca "Voltou do conserto"'
);
select throws_ok(
  $$select public.concluir_manutencao('a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'baixada')$$,
  '42501', null, 'almoxarife não dá baixa'
);
select throws_ok(
  $$select public.concluir_manutencao('a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'consertada')$$,
  'P0002', null, 'peça fora da manutenção não "volta do conserto"'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.concluir_manutencao('a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'baixada')$$,
  'engenheira dá baixa'
);
reset role;
select is((select string_agg(status::text, ',' order by codigo) from public.unidade where tipo_id = 'f0000000-0000-4000-8000-0000000000a1'),
  'livre,baixada', 'consertada volta a livre; baixada sai do estoque');
select is((select count(*)::int from public.alteracao where tabela = 'unidade' and campo = 'status'
             and registro_id in ('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002')),
  2, 'conserto e baixa ficam no log de alterações');
select is((select count(*)::int from public.alteracao where tabela = 'unidade' and usuario_nome is not null
             and registro_id in ('d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002')),
  2, 'o log da manutenção guarda o nome de quem fez');

-- Estorno de devolução depois de conserto: bloqueado (a peça mudou).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx select 'ret2', public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000a1","quantidade":1}]', true)::text;
insert into t_ctx select 'dev2', public.registrar_devolucao('a0000000-0000-4000-8000-000000000001',
  (select valor::uuid from t_ctx where chave = 'helio_id'), null,
  jsonb_build_array(jsonb_build_object('tipo', 'f0000000-0000-4000-8000-0000000000a1', 'quantidade', 1,
    'avarias', jsonb_build_array(jsonb_build_object('motivo', 'nao_liga',
      'foto', 'a0000000-0000-4000-8000-000000000001/e1000000-0000-4000-8000-000000000003.jpg')))))::text;
select lives_ok(
  $$select public.concluir_manutencao('a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'consertada')$$,
  'conserto depois da devolução avariada'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.estornar_movimento('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'dev2'), 'errado')$$,
  'AL007', null, 'devolução cuja peça já voltou do conserto não estorna'
);
reset role;

select * from finish();
rollback;
