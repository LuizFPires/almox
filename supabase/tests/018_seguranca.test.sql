-- M10 · Revisão de segurança: regras do catálogo inteiro (o que nascer depois também é
-- conferido), credencial da TV só lê, QR e painel não vazam dados pessoais.
begin;
select plan(14);

-- Catálogo ------------------------------------------------------------------------------------
select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}') from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  '{}'::text[], 'toda tabela de public tem RLS ativa'
);
select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'privado') and p.prosecdef
      and not coalesce(p.proconfig @> array['search_path=""'], false)),
  '{}'::text[], 'toda função security definer fixa search_path vazio'
);
select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'privado' and has_function_privilege('anon', p.oid, 'execute')),
  '{}'::text[], 'anônimo não executa nada de privado'
);
select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'public.pessoa'::regtype
      and has_function_privilege('authenticated', p.oid, 'execute')),
  '{}'::text[], 'nenhuma função do cliente devolve a linha inteira de pessoa (com o token)'
);
select ok(not has_column_privilege('authenticated', 'public.pessoa', 'qr_token', 'select'),
  'token do capacete não é legível pelo cliente');
select ok(not has_column_privilege('authenticated', 'public.dispositivo_tv', 'token_hash', 'select'),
  'hash da credencial da TV não é legível pelo cliente');
select ok((select not public from storage.buckets where id = 'avarias'),
  'fotos de avaria em bucket privado');
select ok(
  position('token' in lower(pg_get_function_result('public.ler_capacete(uuid, text)'::regprocedure))) = 0,
  'leitura do capacete não devolve o token'
);

-- Credencial da TV: só lê ---------------------------------------------------------------------
create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.criar_dispositivo('a0000000-0000-4000-8000-000000000001', 'TV segurança');
insert into t_ctx values ('codigo', public.gerar_codigo_tv(
  (select id from public.dispositivo_tv where nome = 'TV segurança' order by criado_em desc limit 1)));
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into t_ctx values ('tv', public.trocar_codigo_tv((select valor from t_ctx where chave = 'codigo')));
insert into t_ctx values ('painel', public.painel_tv((select valor from t_ctx where chave = 'tv'))::text);
select throws_ok(
  $$select public.registrar_retirada('a0000000-0000-4000-8000-000000000001', gen_random_uuid(), null, '[]', true)$$,
  '42501', null, 'credencial da TV não lança retirada'
);
select throws_ok(
  $$insert into public.ocorrencia (obra_id, tipo, pessoa_id, usuario_id) values
     ('a0000000-0000-4000-8000-000000000001', 'capacete_trocado', gen_random_uuid(), gen_random_uuid())$$,
  '42501', null, 'credencial da TV não grava em tabela'
);
reset role;

select ok(
  jsonb_array_length((select valor::jsonb -> 'pessoas' from t_ctx where chave = 'painel')) > 0,
  'o painel conferido tem pessoas (as checagens abaixo valem)'
);
select ok(
  not exists (select 1 from public.pessoa p
               where p.obra_id = 'a0000000-0000-4000-8000-000000000001'
                 and position(p.qr_token in (select valor from t_ctx where chave = 'painel')) > 0),
  'painel da TV não leva nenhum token de capacete'
);
select ok(
  (select valor from t_ctx where chave = 'painel') !~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}',
  'painel da TV não leva e-mail'
);
select ok(
  (select valor from t_ctx where chave = 'painel') !~* '"(valor|valor_reposicao|total|matricula|cpf)"',
  'painel da TV não leva valores nem matrícula (números só no app)'
);

select * from finish();
rollback;
