-- Avaria com detalhes: texto livre opcional (até 300 caracteres) gravado com a avaria.
begin;
select plan(5);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001', 'Serra detalhes', 'serra_circular', 'SDT', 9000);
insert into public.unidade (obra_id, tipo_id, codigo)
select 'a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000a7', 'SDT-0' || n
  from generate_series(1, 3) n;
insert into t_ctx select 'pessoa', id::text from public.pessoa where nome = 'Joaquim Silva';
insert into storage.objects (bucket_id, name, owner, owner_id) values
  ('avarias', 'a0000000-0000-4000-8000-000000000001/e7000000-0000-4000-8000-000000000001.jpg', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002'),
  ('avarias', 'a0000000-0000-4000-8000-000000000001/e7000000-0000-4000-8000-000000000002.jpg', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002'),
  ('avarias', 'a0000000-0000-4000-8000-000000000001/e7000000-0000-4000-8000-000000000003.jpg', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.registrar_retirada('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'pessoa'),
  null, '[{"tipo":"f0000000-0000-4000-8000-0000000000a7","quantidade":3}]', true);

select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'pessoa'), null,
      jsonb_build_array(jsonb_build_object('tipo', 'f0000000-0000-4000-8000-0000000000a7', 'quantidade', 1,
        'avarias', jsonb_build_array(jsonb_build_object('motivo', 'quebrada',
          'foto', 'a0000000-0000-4000-8000-000000000001/e7000000-0000-4000-8000-000000000001.jpg',
          'detalhes', repeat('x', 301))))))$$,
  '22023', null, 'detalhes com mais de 300 caracteres: recusado'
);
select throws_ok(
  $$select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'pessoa'), null,
      jsonb_build_array(jsonb_build_object('tipo', 'f0000000-0000-4000-8000-0000000000a7', 'quantidade', 1,
        'avarias', jsonb_build_array(jsonb_build_object('motivo', 'quebrada',
          'foto', 'a0000000-0000-4000-8000-000000000001/e7000000-0000-4000-8000-000000000001.jpg',
          'detalhes', 123)))))$$,
  '22023', null, 'detalhes que não são texto: recusado'
);

select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'pessoa'), null,
  jsonb_build_array(jsonb_build_object('tipo', 'f0000000-0000-4000-8000-0000000000a7', 'quantidade', 3,
    'avarias', jsonb_build_array(
      jsonb_build_object('motivo', 'quebrada',
        'foto', 'a0000000-0000-4000-8000-000000000001/e7000000-0000-4000-8000-000000000001.jpg',
        'detalhes', '  Disco trincado perto do eixo  '),
      jsonb_build_object('motivo', 'nao_liga',
        'foto', 'a0000000-0000-4000-8000-000000000001/e7000000-0000-4000-8000-000000000002.jpg',
        'detalhes', '   '),
      jsonb_build_object('motivo', 'desgaste',
        'foto', 'a0000000-0000-4000-8000-000000000001/e7000000-0000-4000-8000-000000000003.jpg')))));
reset role;

select is(
  (select detalhes from public.avaria where foto_path like '%e7000000-0000-4000-8000-000000000001.jpg'),
  'Disco trincado perto do eixo', 'detalhes gravados (sem espaços nas pontas)'
);
select is(
  (select detalhes from public.avaria where foto_path like '%e7000000-0000-4000-8000-000000000002.jpg'),
  null, 'detalhes só com espaços: fica vazio'
);
select is(
  (select detalhes from public.avaria where foto_path like '%e7000000-0000-4000-8000-000000000003.jpg'),
  null, 'sem detalhes: continua valendo (opcional)'
);

select * from finish();
rollback;
