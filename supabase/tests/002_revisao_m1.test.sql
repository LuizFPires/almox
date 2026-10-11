-- Testes das correções da revisão do M1 (usa o seed: Obra Demonstração).
begin;
select plan(17);

-- Privilégios ----------------------------------------------------------------------------

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'privado') and has_function_privilege('anon', p.oid, 'execute')),
  0, 'anon não executa nenhuma função de public/privado'
);
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
      and has_table_privilege('anon', c.oid, 'select')),
  0, 'anon não lê nenhuma tabela ou view de public'
);

create table public.tabela_futura_teste (id int);
create function public.funcao_futura_teste() returns int language sql as 'select 1';
select ok(not has_table_privilege('anon', 'public.tabela_futura_teste', 'select')
       and not has_table_privilege('authenticated', 'public.tabela_futura_teste', 'select'),
  'tabela criada no futuro não nasce aberta');
select ok(not has_function_privilege('anon', 'public.funcao_futura_teste()', 'execute')
       and not has_function_privilege('authenticated', 'public.funcao_futura_teste()', 'execute'),
  'função criada no futuro não nasce executável pelo cliente');
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and not coalesce('security_invoker=true' = any (c.reloptions), false)),
  0, 'toda view de public é security_invoker (respeita a RLS)'
);

select throws_ok($$truncate public.movimento cascade$$, 'P0001', null, 'TRUNCATE em movimento falha');

-- Integridade ---------------------------------------------------------------------------

select throws_ok(
  $$update public.empresa set encarregado_pessoa_id = (select id from public.pessoa where nome = 'Adriano Costa')
     where nome = 'Fôrmas Ribeiro'$$,
  '23503', null, 'encarregado precisa ser da própria empresa'
);
select throws_ok(
  $$insert into public.usuario_obra (usuario_id, obra_id, perfil, empresa_id)
    values ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'consulta',
            'e0000000-0000-4000-8000-000000000007')$$,
  '23514', null, 'consulta restrita só a empreiteira, nunca à construtora'
);

-- Posse ⇔ status em uso (conferido no fim da transação)
savepoint antes_posse;
update public.unidade set status = 'livre'
 where codigo = 'MT-01' and obra_id = 'a0000000-0000-4000-8000-000000000001';
select throws_ok($$set constraints all immediate$$, '23514', null, 'unidade com posse não pode ficar livre');
rollback to savepoint antes_posse;

savepoint antes_status;
update public.unidade set status = 'em_uso'
 where codigo = 'PA-09' and obra_id = 'a0000000-0000-4000-8000-000000000001';
select throws_ok($$set constraints all immediate$$, '23514', null, 'unidade em uso precisa de posse');
rollback to savepoint antes_status;

-- Como engenheira --------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.unidade (obra_id, tipo_id, codigo, status)
    select 'a0000000-0000-4000-8000-000000000001', id, 'PA-99', 'em_uso' from public.tipo_ferramenta where prefixo = 'PA'$$,
  '42501', null, 'unidade nova não escolhe status (nasce livre)'
);
select lives_ok(
  $$select public.adicionar_unidades((select id from public.tipo_ferramenta where prefixo = 'PA'), 1)$$,
  'engenheira adiciona unidade livre (pela RPC, desde o M2)'
);
select is_empty(
  $$update public.usuario_obra set perfil = 'consulta'
     where usuario_id = 'b0000000-0000-4000-8000-000000000001' returning usuario_id$$,
  'engenheira não rebaixa o próprio vínculo'
);

-- Como almoxarife ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select ok(
  (select count(*) from public.usuario) >= 3,
  'almoxarife vê o nome dos usuários da obra (quem lançou, RN-18)'
);
select throws_ok($$select email from public.usuario$$, '42501', null, 'e-mail dos usuários não é legível');
select is((select count(*)::int from public.aviso), 0, 'almoxarife não lê avisos (PRD §5)');

-- Como dono da Fôrmas Ribeiro ------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.posse p join public.pessoa pe on pe.id = p.pessoa_id
    where pe.empresa_id <> 'e0000000-0000-4000-8000-000000000003'),
  0, 'empreiteira não vê posses de outra empresa'
);

select * from finish();
rollback;
