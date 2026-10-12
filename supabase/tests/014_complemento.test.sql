-- M9 · Complemento automático às 23:59 quando o dia foi encerrado à mão.
begin;
select plan(6);

delete from public.envio;
delete from public.aviso_desconto;
delete from public.desconto;
delete from public.medicao;
delete from public.aviso;
delete from public.fechamento_dia;

insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-000000000001', 'Nível 23h', 'regua', 'NVL', 7000);
insert into public.unidade (obra_id, tipo_id, codigo)
values ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-0000000000c1', 'NVL-01');

-- Encerrado à mão "às 17h".
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.encerrar_dia('a0000000-0000-4000-8000-000000000001');
reset role;
-- Contagem como administrador (o almoxarife não vê avisos).
create temp table t_antes on commit drop as select count(*)::int as avisos from public.aviso
  where obra_id = 'a0000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
-- Depois do encerramento, uma empreiteira leva uma peça e não devolve.
select public.registrar_retirada('a0000000-0000-4000-8000-000000000001',
  (select id from public.pessoa where nome = 'Ivan Pereira'), null,
  '[{"tipo":"f0000000-0000-4000-8000-0000000000c1","quantidade":1}]', true);
reset role;

-- 23:59: complemento.
select privado.encerrar_automatico();

select is(
  (select count(*)::int from public.aviso where obra_id = 'a0000000-0000-4000-8000-000000000001') - (select avisos from t_antes), 1,
  'um aviso de complemento (só a empreiteira com peça nova)'
);
select is(
  (select a.total from public.aviso a join public.aviso_desconto ad on ad.aviso_id = a.id
     join public.desconto d on d.id = ad.desconto_id where d.codigo = 'NVL-01'),
  7000, 'o complemento cobra só a peça que saiu depois (sem repetir as da tarde)'
);
select is(
  (select jsonb_array_length(a.itens) from public.aviso a join public.aviso_desconto ad on ad.aviso_id = a.id
     join public.desconto d on d.id = ad.desconto_id where d.codigo = 'NVL-01'),
  1, 'aviso do complemento com uma peça'
);
select ok(
  (select complementado_em is not null from public.fechamento_dia
    where obra_id = 'a0000000-0000-4000-8000-000000000001' and data = privado.hoje_na_obra()),
  'dia marcado como complementado'
);
select privado.encerrar_automatico();
select is(
  (select count(*)::int from public.aviso where obra_id = 'a0000000-0000-4000-8000-000000000001') - (select avisos from t_antes), 1,
  'rodar de novo não cria outro complemento'
);
select ok(
  exists (select 1 from public.fechamento_dia
           where obra_id = 'a0000000-0000-4000-8000-000000000002' and automatico),
  'obra não encerrada à mão é encerrada pelo automático'
);

select * from finish();
rollback;
