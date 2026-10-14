-- Plano · bloco 2, pontos 6 e 15: cadastro de ferramenta numa transação, repetição sem
-- duplicar e prefixo sempre livre.
begin;
select plan(11);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated;

create function pg_temp.salvar(p_chave uuid, p_nome text, p_qtd integer, p_prefixo text,
  p_id uuid default null, p_icone text default 'pa', p_locadora_nova text default null)
returns uuid language sql as $$
  select public.salvar_ferramenta('a0000000-0000-4000-8000-000000000001', p_chave, p_nome, p_icone,
    5000, false, case when p_locadora_nova is null then 'propria' else 'alugada' end, p_qtd, p_prefixo,
    p_id, null, p_locadora_nova)
$$;
grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select pg_temp.salvar('11111111-1111-4111-8111-000000000001', 'Almox não', 1, 'AN')$$,
  '42501', null, 'só o engenheiro cadastra'
);

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t_ctx values ('tipo', pg_temp.salvar('11111111-1111-4111-8111-000000000002', 'Cunha de aço', 3, 'CU')::text);
select is(
  (select count(*)::int from public.unidade where tipo_id = (select valor::uuid from t_ctx where chave = 'tipo')),
  3, 'cria a ferramenta com 3 unidades'
);
-- Resposta perdida: o engenheiro salva de novo com a mesma chave.
select is(
  pg_temp.salvar('11111111-1111-4111-8111-000000000002', 'Cunha de aço', 3, 'CU')::text,
  (select valor from t_ctx where chave = 'tipo'), 'repetir devolve a mesma ferramenta'
);
select is(
  (select count(*)::int from public.unidade where tipo_id = (select valor::uuid from t_ctx where chave = 'tipo')),
  3, 'repetir não cria unidades de novo'
);
-- Tela reaproveitada pelo "voltar" com outra ferramenta: erro, não devolve a anterior.
select throws_ok(
  $$select pg_temp.salvar('11111111-1111-4111-8111-000000000002', 'Enxada nova', 3, 'EN')$$,
  'AL013', null, 'mesma chave com outros dados: recusado'
);
-- Edição que adiciona 2 unidades, repetida: só 2 a mais.
select pg_temp.salvar('11111111-1111-4111-8111-000000000003', 'Cunha de aço', 2, null,
  (select valor::uuid from t_ctx where chave = 'tipo'));
select pg_temp.salvar('11111111-1111-4111-8111-000000000003', 'Cunha de aço', 2, null,
  (select valor::uuid from t_ctx where chave = 'tipo'));
select is(
  (select count(*)::int from public.unidade where tipo_id = (select valor::uuid from t_ctx where chave = 'tipo')),
  5, 'edição repetida adiciona as unidades uma vez só'
);

-- Falha no meio (ícone inválido): nem a locadora nova fica gravada.
select throws_ok(
  $$select pg_temp.salvar('11111111-1111-4111-8111-000000000004', 'Gerador alugado', 1, 'GE',
      null, 'icone-que-nao-existe', 'Locadora Fantasma')$$,
  '23514', null, 'falha no cadastro'
);
select ok(
  not exists (select 1 from public.locadora where nome = 'Locadora Fantasma'),
  'nada fica pela metade (a locadora nova também não)'
);
reset role;
select ok(
  not exists (select 1 from privado.operacao_cadastro where chave = '11111111-1111-4111-8111-000000000004'),
  'operação com falha não fica registrada'
);

-- Ponto 15: com os prefixos do candidato ocupados, o banco escolhe outro livre.
insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao)
select 'a0000000-0000-4000-8000-000000000001', 'Ocupa ' || l, 'pa', 'XQ' || l, 1000
  from unnest(string_to_array('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z', ' ')) l;
insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao)
values ('a0000000-0000-4000-8000-000000000001', 'Ocupa base', 'pa', 'XQ', 1000);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into t_ctx values ('xq', pg_temp.salvar('11111111-1111-4111-8111-000000000005', 'Xquadro novo', 1, 'XQ')::text);
reset role;
select ok(
  (select prefixo !~ '^XQ' from public.tipo_ferramenta where id = (select valor::uuid from t_ctx where chave = 'xq')),
  'XQ e XQA–XQZ ocupados: usa outro prefixo livre'
);
select is(
  (select count(*)::int from public.tipo_ferramenta t1 join public.tipo_ferramenta t2
     on t1.obra_id = t2.obra_id and t1.prefixo = t2.prefixo and t1.id <> t2.id),
  0, 'nenhum prefixo repetido'
);

select * from finish();
rollback;
