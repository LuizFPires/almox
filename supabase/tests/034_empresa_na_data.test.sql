-- Plano · bloco 2, ponto 7 (complemento): lançamentos ficam com a empresa da época.
begin;
select plan(8);

insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-000000000001', 'Prumo E', 'regua', 'PRE', 10000);
insert into public.unidade (obra_id, tipo_id, codigo)
values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000e1', 'PRE-01');
insert into public.pessoa (id, obra_id, empresa_id, nome, nome_capacete, funcao)
values ('c0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-000000000001',
        'e0000000-0000-4000-8000-000000000003', 'Troca Empresa', 'TROCA E', 'Servente');

-- Retira e devolve enquanto é da Fôrmas.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.registrar_retirada('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000e1', null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000e1","quantidade":1}]', true);
select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000e1', null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000e1","quantidade":1}]');
reset role;

-- Depois passa para a Hidráulica JR (sem ferramenta na mão, a troca é aceita).
update public.pessoa set empresa_id = 'e0000000-0000-4000-8000-000000000004'
 where id = 'c0000000-0000-4000-8000-0000000000e1';
-- Na transação do teste tudo tem a mesma hora: a troca passa para depois dos lançamentos.
select is(
  (select count(*)::int from privado.pessoa_empresa_periodo where pessoa_id = 'c0000000-0000-4000-8000-0000000000e1'),
  2, 'a troca abre um período novo e fecha o anterior'
);
update privado.pessoa_empresa_periodo set ate = now() + interval '1 hour'
 where pessoa_id = 'c0000000-0000-4000-8000-0000000000e1' and ate is not null;
update privado.pessoa_empresa_periodo set de = now() + interval '1 hour'
 where pessoa_id = 'c0000000-0000-4000-8000-0000000000e1' and ate is null;

select is(
  privado.empresa_na_data('c0000000-0000-4000-8000-0000000000e1', now()),
  'e0000000-0000-4000-8000-000000000003'::uuid, 'na hora dos lançamentos era da Fôrmas'
);
select is(
  privado.empresa_na_data('c0000000-0000-4000-8000-0000000000e1', now() + interval '2 hours'),
  'e0000000-0000-4000-8000-000000000004'::uuid, 'depois da troca é da Hidráulica'
);

-- A consulta da Fôrmas continua vendo o histórico do tempo em que a pessoa era dela.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.movimento where pessoa_id = 'c0000000-0000-4000-8000-0000000000e1'),
  2, 'consulta da Fôrmas vê a retirada e a devolução da época'
);
select ok(
  (select count(*) > 0 from public.movimento_item mi join public.movimento m on m.id = mi.movimento_id
    where m.pessoa_id = 'c0000000-0000-4000-8000-0000000000e1'),
  'e os itens desses lançamentos'
);

-- Uma consulta restrita à Hidráulica (empresa nova) não vê o que foi do tempo da Fôrmas.
reset role;
update public.usuario_obra set empresa_id = 'e0000000-0000-4000-8000-000000000004'
 where usuario_id = 'b0000000-0000-4000-8000-000000000003' and obra_id = 'a0000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.movimento where pessoa_id = 'c0000000-0000-4000-8000-0000000000e1'),
  0, 'a empresa nova não vê o histórico da antiga'
);

-- Histórico do engenheiro: empresa e filtro pela empresa da época.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  (select l ->> 'empresa' from jsonb_array_elements(public.historico('a0000000-0000-4000-8000-000000000001',
     current_date - 1, current_date + 1, 'c0000000-0000-4000-8000-0000000000e1')) l limit 1),
  'Fôrmas Ribeiro', 'histórico mostra a empresa da época'
);
select is(
  jsonb_array_length(public.historico('a0000000-0000-4000-8000-000000000001', current_date - 1, current_date + 1,
    'c0000000-0000-4000-8000-0000000000e1', 'e0000000-0000-4000-8000-000000000004')),
  0, 'filtrar pela empresa nova não traz o que foi da antiga'
);

select * from finish();
rollback;
