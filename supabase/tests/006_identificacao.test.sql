-- M4 · Leitura do capacete, conferência (RN-03) e ocorrência (RN-04). Usa o seed.
begin;
select plan(24);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
insert into t_ctx
  select 'joaquim', qr_token from public.pessoa where nome = 'Joaquim Silva'
  union all select 'joaquim_id', id::text from public.pessoa where nome = 'Joaquim Silva'
  union all select 'helio', qr_token from public.pessoa where nome = 'Hélio Moreira'
  union all select 'posses', (select count(*)::text from public.posse);

-- Pessoa inativa e capacete de outra obra.
insert into public.empresa (id, obra_id, nome, tipo)
values ('e0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000002', 'Construtora B', 'propria');
insert into public.pessoa (obra_id, empresa_id, nome, nome_capacete, funcao)
values ('a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-0000000000b1', 'Beto Lima', 'BETO', 'Pedreiro');
insert into t_ctx select 'beto', qr_token from public.pessoa where nome = 'Beto Lima';
update public.pessoa set ativa = false where nome = 'Ivan Pereira';
insert into t_ctx select 'ivan', qr_token from public.pessoa where nome = 'Ivan Pereira';

-- Almoxarife -----------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select results_eq(
  $$select situacao, nome_capacete, nome, empresa from public.ler_capacete(
      'a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim'))$$,
  $$values ('ok'::text, 'JOAQUIM'::text, 'Joaquim Silva'::text, 'Construtora'::text)$$,
  'capacete lido: nome no capacete, nome completo e empresa'
);
select is(
  (select situacao from public.ler_capacete('a0000000-0000-4000-8000-000000000001', repeat('0', 36))),
  'nao_cadastrado', 'token desconhecido: capacete não cadastrado'
);
select is(
  (select situacao from public.ler_capacete('a0000000-0000-4000-8000-000000000001', 'Joaquim Silva')),
  'nao_cadastrado', 'QR com texto qualquer (não token) não identifica ninguém'
);
select is(
  (select situacao from public.ler_capacete('a0000000-0000-4000-8000-000000000001',
     (select valor from t_ctx where chave = 'beto'))),
  'nao_cadastrado', 'capacete de outra obra não vale nesta'
);
select is(
  (select situacao from public.ler_capacete('a0000000-0000-4000-8000-000000000001',
     (select valor from t_ctx where chave = 'ivan'))),
  'inativa', 'pessoa inativa é avisada'
);
select is(
  (select upper((select valor from t_ctx where chave = 'joaquim')) = (select valor from t_ctx where chave = 'joaquim')),
  false, 'token em minúsculas (sanidade do teste)'
);
select is(
  (select situacao from public.ler_capacete('a0000000-0000-4000-8000-000000000001',
     ' ' || upper((select valor from t_ctx where chave = 'joaquim')) || ' ')),
  'ok', 'leitura tolera espaços e maiúsculas do leitor'
);
select is(
  public.identificacao_vigente('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'joaquim_id')),
  null, 'antes de conferir não há identificação'
);
select is(
  public.confirmar_identificacao('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim')),
  (select valor::uuid from t_ctx where chave = 'joaquim_id'), '"Sim, é o Joaquim" devolve a pessoa'
);
select ok(
  public.identificacao_vigente('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'joaquim_id'))
    between now() + interval '9 minutes' and now() + interval '10 minutes',
  'conferência vale 10 minutos'
);
select throws_ok($$select * from public.identificacao$$, '42501', null, 'identificação não é legível direto');
select throws_ok(
  $$insert into public.identificacao (obra_id, pessoa_id, usuario_id, expira_em)
    values ('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'joaquim_id'),
            'b0000000-0000-4000-8000-000000000002', now() + interval '1 day')$$,
  '42501', null, 'ninguém forja identificação direto'
);
select throws_ok(
  $$select public.confirmar_identificacao('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'ivan'))$$,
  'P0002', null, 'não confere pessoa inativa'
);

-- "Não é ele": ocorrência, nenhuma posse muda, conferência cai.
select isnt(
  public.registrar_ocorrencia('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim')),
  null, '"Não é ele" grava a ocorrência'
);
select is(
  public.identificacao_vigente('a0000000-0000-4000-8000-000000000001', (select valor::uuid from t_ctx where chave = 'joaquim_id')),
  null, 'depois de "Não é ele" a conferência não vale mais'
);
reset role;
select is((select count(*)::text from public.posse), (select valor from t_ctx where chave = 'posses'),
  '"Não é ele" não altera nenhuma posse');
select results_eq(
  $$select tipo::text, usuario_id from public.ocorrencia where pessoa_id = (select valor::uuid from t_ctx where chave = 'joaquim_id')$$,
  $$values ('capacete_trocado'::text, 'b0000000-0000-4000-8000-000000000002'::uuid)$$,
  'ocorrência: capacete trocado, com quem lançou'
);

-- Consulta da obra inteira (mestre) ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select situacao from public.ler_capacete('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim'))),
  'ok', 'consulta lê o capacete (para ver a ficha)'
);
select throws_ok(
  $$select public.confirmar_identificacao('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim'))$$,
  '42501', null, 'consulta não confere para lançar'
);
select throws_ok(
  $$select public.registrar_ocorrencia('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim'))$$,
  '42501', null, 'consulta não registra ocorrência'
);
select is(
  (select count(*)::int from public.ocorrencia), 1, 'consulta da obra vê a ocorrência'
);

-- Consulta restrita à Fôrmas Ribeiro -----------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select results_eq(
  $$select situacao, pessoa_id, nome from public.ler_capacete('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'joaquim'))$$,
  $$values ('outra_empresa'::text, null::uuid, null::text)$$,
  'consulta de empreiteira: pessoa de outra empresa, sem nome'
);
select is(
  (select situacao from public.ler_capacete('a0000000-0000-4000-8000-000000000001', (select valor from t_ctx where chave = 'helio'))),
  'ok', 'consulta de empreiteira lê o capacete da própria empresa'
);
select is((select count(*)::int from public.ocorrencia), 0, 'consulta de empreiteira não vê ocorrência de outra empresa');
reset role;

select * from finish();
rollback;
