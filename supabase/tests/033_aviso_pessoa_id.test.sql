-- Plano · bloco 2, ponto 8: aviso guarda o id da pessoa; anonimização pelo id, sem atingir homônimo.
begin;
select plan(5);

delete from public.envio;
delete from public.aviso_desconto;
delete from public.desconto;
delete from public.medicao;
delete from public.aviso;
delete from public.fechamento_dia;

-- Dois "José Homônimo": um na Fôrmas, outro na Elétrica, os dois com ferramenta.
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000d1', 'a0000000-0000-4000-8000-000000000001', 'Prumo H', 'regua', 'PRH', 10000);
insert into public.unidade (obra_id, tipo_id, codigo)
values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000d1', 'PRH-01'),
       ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000d1', 'PRH-02');
insert into public.pessoa (id, obra_id, empresa_id, nome, nome_capacete, funcao) values
  ('c0000000-0000-4000-8000-0000000000d1', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', 'José Homônimo', 'JOSÉ H', 'Servente'),
  ('c0000000-0000-4000-8000-0000000000d2', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'José Homônimo', 'JOSÉ H', 'Servente');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.registrar_retirada('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000d1', null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000d1","quantidade":1}]', true);
select public.registrar_retirada('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000d2', null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000d1","quantidade":1}]', true);
select public.encerrar_dia('a0000000-0000-4000-8000-000000000001');
reset role;

select ok(
  exists (select 1 from public.aviso a, jsonb_array_elements(a.itens) i
           where i ->> 'pessoaId' = 'c0000000-0000-4000-8000-0000000000d1'),
  'item do aviso guarda o id da pessoa'
);

-- Renomeia e anonimiza o José da Fôrmas: o aviso dele é alcançado pelo id, o da Elétrica não.
update public.pessoa set nome = 'José Renomeado' where id = 'c0000000-0000-4000-8000-0000000000d1';
select privado.anonimizar_pessoa('c0000000-0000-4000-8000-0000000000d1');
select is(
  (select i ->> 'pessoa' from public.aviso a, jsonb_array_elements(a.itens) i
    where i ->> 'pessoaId' = 'c0000000-0000-4000-8000-0000000000d1'),
  'Pessoa anonimizada', 'renomeado e anonimizado: o aviso antigo é alcançado'
);
select is(
  (select i ->> 'pessoa' from public.aviso a, jsonb_array_elements(a.itens) i
    where i ->> 'pessoaId' = 'c0000000-0000-4000-8000-0000000000d2'),
  'José Homônimo', 'o homônimo da outra empresa continua com o nome'
);
select is(
  (select sum((i ->> 'valor')::int)::int from public.aviso a, jsonb_array_elements(a.itens) i
    where i ->> 'pessoaId' in ('c0000000-0000-4000-8000-0000000000d1', 'c0000000-0000-4000-8000-0000000000d2')),
  20000, 'valores dos itens não mudam'
);

-- Push/e-mail de desconto cancelado também traz o id.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.registrar_devolucao('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000d2', null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000d1","quantidade":1}]');
reset role;
select ok(
  (select public.dados_envio(id) -> 'devolvidas' -> 0 ? 'pessoaId'
     from public.envio where tipo = 'desconto_cancelado' limit 1),
  'aviso de devolução traz o id da pessoa'
);

select * from finish();
rollback;
