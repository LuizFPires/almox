-- M9 · Fechamento do dia, descontos peça a peça, avisos, medição e fila de envios (usa o seed).
begin;
select plan(39);

create temp table t_ctx (chave text primary key, valor text) on commit drop;
grant all on t_ctx to authenticated, anon;

-- Parte do zero mesmo num banco local já usado (tudo volta no rollback).
delete from public.envio;
delete from public.aviso_desconto;
delete from public.desconto;
delete from public.medicao;
delete from public.aviso;
delete from public.fechamento_dia;

-- Empreiteiras com peça fora agora (o que o encerramento tem que cobrar).
create temp table t_esperado on commit drop as
select e.id as empresa_id, e.nome, sum(t.valor_reposicao)::int as total, count(*)::int as pecas
  from public.posse po
  join public.pessoa pe on pe.id = po.pessoa_id
  join public.empresa e on e.id = pe.empresa_id
  join public.unidade u on u.id = po.unidade_id
  join public.tipo_ferramenta t on t.id = u.tipo_id
 where po.obra_id = 'a0000000-0000-4000-8000-000000000001' and e.tipo = 'empreiteira'
 group by e.id, e.nome;
grant select on t_esperado to authenticated;

-- Quem encerra -------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select public.encerrar_dia('a0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'consulta não encerra o dia'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx values ('fechamento', public.encerrar_dia('a0000000-0000-4000-8000-000000000001')::text);
select is(
  public.encerrar_dia('a0000000-0000-4000-8000-000000000001')::text,
  (select valor from t_ctx where chave = 'fechamento'),
  'encerrar de novo no mesmo dia devolve o mesmo fechamento (uma vez por data)'
);
select throws_ok(
  $$insert into public.desconto (obra_id, empresa_id, pessoa_id, unidade_id, movimento_retirada_id, tipo_nome, codigo, valor)
    select obra_id, (select empresa_id from public.pessoa where id = pessoa_id), pessoa_id, unidade_id, movimento_retirada_id, 'x', 'x', 1
      from public.posse limit 1$$,
  '42501', null, 'ninguém grava desconto direto'
);
select throws_ok($$select * from public.envio$$, '42501', null, 'fila de envios fechada ao cliente');
reset role;

-- RN-12: nada mudou de lugar ----------------------------------------------------------------
select is(
  (select count(*)::int from public.posse where obra_id = 'a0000000-0000-4000-8000-000000000001'),
  (select coalesce(sum(pecas), 0)::int from t_esperado)
    + (select count(*)::int from public.posse po join public.pessoa pe on pe.id = po.pessoa_id
         join public.empresa e on e.id = pe.empresa_id where e.tipo = 'propria'
           and po.obra_id = 'a0000000-0000-4000-8000-000000000001'),
  'encerrar não dá baixa: as posses continuam'
);
select is(
  (select automatico from public.fechamento_dia where id = (select valor::uuid from t_ctx where chave = 'fechamento')),
  false, 'fechamento manual'
);

-- RN-13/RN-15/RN-16: um aviso por empreiteira, com o total certo; própria não ----------------
select is(
  (select count(*)::int from public.aviso where fechamento_id = (select valor::uuid from t_ctx where chave = 'fechamento')),
  (select count(*)::int from t_esperado),
  'um aviso por empreiteira com peça fora'
);
select is(
  (select count(*)::int from public.aviso a join t_esperado x on x.empresa_id = a.empresa_id
    where a.fechamento_id = (select valor::uuid from t_ctx where chave = 'fechamento') and a.total = x.total),
  (select count(*)::int from t_esperado),
  'total de cada aviso = soma dos valores das peças da empreiteira'
);
select is(
  (select count(*)::int from public.aviso a join public.empresa e on e.id = a.empresa_id where e.tipo = 'propria'),
  0, 'funcionário próprio não gera aviso (RN-15)'
);
select is(
  (select count(*)::int from public.desconto), (select coalesce(sum(pecas), 0)::int from t_esperado),
  'um desconto por peça de empreiteira fora'
);
select is(
  (select jsonb_array_length(itens) from public.aviso a join public.empresa e on e.id = a.empresa_id
    where e.nome = 'Fôrmas Ribeiro'),
  (select pecas from t_esperado where nome = 'Fôrmas Ribeiro'),
  'aviso traz as peças (pessoa, tipo, código, valor)'
);

-- Envios ---------------------------------------------------------------------------------------
select is(
  (select array_agg(destino order by destino) from public.envio e
    join public.aviso a on a.id = e.referencia join public.empresa em on em.id = a.empresa_id
   where e.tipo = 'aviso' and e.canal = 'email' and em.nome = 'Fôrmas Ribeiro'),
  array['paulo@formasribeiro.exemplo', 'roberto@formasribeiro.exemplo'],
  'e-mail do aviso para o dono e o encarregado'
);
select ok(
  exists (select 1 from public.envio e join public.aviso a on a.id = e.referencia
           join public.empresa em on em.id = a.empresa_id
          where e.tipo = 'aviso' and e.canal = 'push' and em.nome = 'Fôrmas Ribeiro'
            and e.destino = 'b0000000-0000-4000-8000-000000000004'),
  'notificação do aviso para o login de consulta da empreiteira'
);
select is(
  (select count(*)::int from public.envio e join public.aviso a on a.id = e.referencia
    join public.empresa em on em.id = a.empresa_id
   where e.canal = 'email' and em.nome = 'Hidráulica JR'),
  0, 'empresa sem e-mail cadastrado: nenhum e-mail (o aviso fica no app)'
);
select ok(
  exists (select 1 from public.envio where tipo = 'resumo_proprios' and canal = 'push'
            and destino = 'b0000000-0000-4000-8000-000000000001'),
  'resumo das pendências próprias para o engenheiro (notificação)'
);
select is(
  (select count(*)::int from public.envio where tipo = 'resumo_proprios' and canal = 'email'),
  0, 'resumo próprio sem e-mail'
);

-- Quem vê o quê ----------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(
  (select array_agg(distinct e.nome) from public.aviso a join public.empresa e on e.id = a.empresa_id),
  array['Fôrmas Ribeiro'], 'consulta da empreiteira vê só o aviso dela'
);
select is(
  (select count(distinct empresa_id)::int from public.desconto), 1,
  'consulta da empreiteira vê só os descontos dela'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.aviso), 0, 'almoxarife não vê avisos (PRD §5)');
reset role;

-- RN-14: devolução cancela peça a peça --------------------------------------------------------
-- Uma peça de Fôrmas volta (a empresa tem mais peças fora: o aviso continua, com total novo).
insert into t_ctx values ('peca', (
  select d.unidade_id::text from public.desconto d join public.empresa e on e.id = d.empresa_id
   where e.nome = 'Fôrmas Ribeiro' order by d.codigo limit 1));
delete from public.posse where unidade_id = (select valor::uuid from t_ctx where chave = 'peca');
select is(
  (select status::text from public.desconto where unidade_id = (select valor::uuid from t_ctx where chave = 'peca')),
  'cancelado', 'peça devolvida: desconto cancelado'
);
select is(
  (select a.status::text from public.aviso a join public.empresa e on e.id = a.empresa_id where e.nome = 'Fôrmas Ribeiro'),
  'enviado', 'aviso com outras peças em aberto continua valendo'
);
select ok(
  exists (select 1 from public.envio where tipo = 'desconto_cancelado' and canal = 'email'
            and destino = 'roberto@formasribeiro.exemplo'),
  'e-mail de atualização para a empreiteira'
);
-- Estorno da devolução: a posse volta e o desconto também.
insert into public.posse (unidade_id, obra_id, pessoa_id, desde, via, movimento_retirada_id)
select d.unidade_id, d.obra_id, d.pessoa_id, now() - interval '1 day', 'qr', d.movimento_retirada_id
  from public.desconto d where d.unidade_id = (select valor::uuid from t_ctx where chave = 'peca');
select is(
  (select status::text from public.desconto where unidade_id = (select valor::uuid from t_ctx where chave = 'peca')),
  'aberto', 'estorno da devolução reabre o desconto'
);

-- Todas as peças de uma empreiteira voltam: o aviso vira cancelado.
insert into t_ctx values ('pinturas', (select id::text from public.empresa where nome = 'Pinturas Aurora'));
delete from public.posse po using public.pessoa pe
 where pe.id = po.pessoa_id and pe.empresa_id = (select valor::uuid from t_ctx where chave = 'pinturas');
select is(
  (select status::text from public.aviso where empresa_id = (select valor::uuid from t_ctx where chave = 'pinturas')),
  'cancelado', 'todas devolvidas: aviso cancelado'
);
select is(
  (select count(*)::int from public.desconto
    where empresa_id = (select valor::uuid from t_ctx where chave = 'pinturas') and status <> 'cancelado'),
  0, 'nenhum desconto da empresa em aberto'
);

-- RN-16: o valor é o do primeiro encerramento ---------------------------------------------------
update public.tipo_ferramenta set valor_reposicao = valor_reposicao * 2
 where id in (select u.tipo_id from public.unidade u join public.desconto d on d.unidade_id = u.id);
select is(
  (select count(*)::int from public.desconto d join public.unidade u on u.id = d.unidade_id
     join public.tipo_ferramenta t on t.id = u.tipo_id where d.valor = t.valor_reposicao),
  0, 'mudar o valor depois não muda o desconto já criado'
);

-- Lembrete no dia seguinte: mesmo desconto, novo aviso, sem somar de novo ----------------------
update public.fechamento_dia set data = data - 1
 where id = (select valor::uuid from t_ctx where chave = 'fechamento');
insert into t_ctx values ('desconto_antes', (select count(*)::text from public.desconto));
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx values ('fechamento2', public.encerrar_dia('a0000000-0000-4000-8000-000000000001')::text);
reset role;
select is(
  (select count(*)::text from public.desconto), (select valor from t_ctx where chave = 'desconto_antes'),
  'lembrete não cria desconto novo (não acumula)'
);
select is(
  (select a.total from public.aviso a join public.empresa e on e.id = a.empresa_id
    where e.nome = 'Fôrmas Ribeiro' and a.fechamento_id = (select valor::uuid from t_ctx where chave = 'fechamento2')),
  (select total from t_esperado where nome = 'Fôrmas Ribeiro'),
  'aviso do dia seguinte lembra as mesmas peças, com o mesmo valor'
);
select is(
  (select count(*)::int from public.aviso
    where empresa_id = (select valor::uuid from t_ctx where chave = 'pinturas')
      and fechamento_id = (select valor::uuid from t_ctx where chave = 'fechamento2')),
  0, 'empresa que devolveu tudo não recebe lembrete'
);

-- Medição --------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.fechar_medicao('a0000000-0000-4000-8000-000000000001', (select id from public.empresa where nome = 'Fôrmas Ribeiro'), null)$$,
  '42501', null, 'almoxarife não fecha medição'
);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.fechar_medicao('a0000000-0000-4000-8000-000000000001', (select id from public.empresa where nome = 'Fôrmas Ribeiro'), current_date - 1)$$,
  '22023', null, 'próxima medição no passado: recusada'
);
select throws_ok(
  $$select public.fechar_medicao('a0000000-0000-4000-8000-000000000001', (select id from public.empresa where nome = 'Construtora' and obra_id = 'a0000000-0000-4000-8000-000000000001'), null)$$,
  'P0002', null, 'medição só de empreiteira'
);
insert into t_ctx values ('medicao', public.fechar_medicao('a0000000-0000-4000-8000-000000000001',
  (select id from public.empresa where nome = 'Fôrmas Ribeiro'), current_date + 30)::text);
reset role;
select is(
  (select total from public.medicao where id = (select valor::uuid from t_ctx where chave = 'medicao')),
  (select total from t_esperado where nome = 'Fôrmas Ribeiro'),
  'medição soma os descontos em aberto (cada peça uma vez, mesmo com lembretes)'
);
select is(
  (select count(*)::int from public.aviso a join public.empresa e on e.id = a.empresa_id
    where e.nome = 'Fôrmas Ribeiro' and a.status <> 'confirmado'),
  0, 'avisos da empresa confirmados'
);
delete from public.posse where unidade_id = (select valor::uuid from t_ctx where chave = 'peca');
select is(
  (select status::text from public.desconto where unidade_id = (select valor::uuid from t_ctx where chave = 'peca')),
  'confirmado', 'devolvida depois da medição: o desconto continua (RN-14 só antes da medição)'
);

-- "Não é ele": notificação ao encarregado na hora ---------------------------------------------
insert into public.ocorrencia (obra_id, tipo, pessoa_id, usuario_id)
values ('a0000000-0000-4000-8000-000000000001', 'capacete_trocado',
        (select id from public.pessoa where nome = 'Hélio Moreira'), 'b0000000-0000-4000-8000-000000000002');
select ok(
  exists (select 1 from public.envio where tipo = 'ocorrencia' and canal = 'push'
            and destino = 'b0000000-0000-4000-8000-000000000004'),
  'ocorrência avisa o login da empreiteira por notificação'
);
select is((select count(*)::int from public.envio where tipo = 'ocorrencia' and canal = 'email'), 0,
  'ocorrência sem e-mail');

-- Automático (23:59): só obras ainda não encerradas -----------------------------------------------
select is(privado.encerrar_automatico(), 1, 'automático encerra só a obra que faltava (B)');
select ok(
  (select automatico and encerrado_por is null from public.fechamento_dia
    where obra_id = 'a0000000-0000-4000-8000-000000000002' and data = privado.hoje_na_obra()),
  'fechamento automático marcado'
);

select * from finish();
rollback;
