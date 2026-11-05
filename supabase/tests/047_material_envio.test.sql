-- M13 · dados_envio devolve os dados dos três envios de material.
begin;
select plan(13);

insert into public.material (id, obra_id, nome, unidade, aviso_tipo, aviso_valor)
values ('ad000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000001', 'Cimento', 'sc', 'quantidade', 20);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.registrar_entrada_material('a0000000-0000-4000-8000-000000000001',
  'ad000000-0000-4000-8000-000000000041', 30, 'cc000000-0000-4000-8000-000000000041');
select public.registrar_saida_material('a0000000-0000-4000-8000-000000000001',
  'ad000000-0000-4000-8000-000000000041', 12, 'cc000000-0000-4000-8000-000000000042');
select public.pedir_cadastro_material('a0000000-0000-4000-8000-000000000001', 'Cal hidratada 20 kg');
reset role;

set local role service_role;

select is(
  public.dados_envio((select id from public.envio where tipo = 'limite_material' and canal = 'push' limit 1)) ->> 'tipo',
  'limite_material', 'limite: tipo');
select is(
  public.dados_envio((select id from public.envio where tipo = 'limite_material' limit 1)) ->> 'material',
  'Cimento', 'limite: nome do material');
select is(
  (public.dados_envio((select id from public.envio where tipo = 'limite_material' limit 1)) ->> 'saldo')::numeric,
  18::numeric, 'limite: saldo atual');
select is(
  (public.dados_envio((select id from public.envio where tipo = 'limite_material' limit 1)) ->> 'limite')::numeric,
  20::numeric, 'limite: limite calculado');
select is(
  public.dados_envio((select id from public.envio where tipo = 'limite_material' limit 1)) ->> 'unidade',
  'sc', 'limite: unidade');
select is(
  public.dados_envio((select id from public.envio where tipo = 'limite_material' limit 1)) ->> 'materialId',
  'ad000000-0000-4000-8000-000000000041', 'limite: id do material');
select ok(
  public.dados_envio((select id from public.envio where tipo = 'limite_material' limit 1)) ? 'inscricoes',
  'limite: traz inscricoes');

select is(
  public.dados_envio((select id from public.envio where tipo = 'pedido_cadastro_material' limit 1)) ->> 'nome',
  'Cal hidratada 20 kg', 'pedido: nome');
select is(
  public.dados_envio((select id from public.envio where tipo = 'pedido_cadastro_material' limit 1)) ->> 'quem',
  (select nome from public.usuario where id = 'b0000000-0000-4000-8000-000000000002'), 'pedido: quem');

reset role;
insert into public.inscricao_push (endpoint, usuario_id, p256dh, auth)
values ('https://push.exemplo/consulta-empreiteira', 'b0000000-0000-4000-8000-000000000004', 'p', 'a');
set local role service_role;
select is(
  jsonb_array_length(public.dados_envio((select id from public.envio
    where tipo = 'limite_material' and destino = 'b0000000-0000-4000-8000-000000000004')) -> 'inscricoes'),
  1, 'limite: consulta restrita a empreiteira recebe a inscrição');

reset role;
insert into public.envio (obra_id, tipo, canal, destino, referencia, dados)
values ('a0000000-0000-4000-8000-000000000001', 'material_cadastrado', 'push',
        'b0000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000051',
        '{"material":"ad000000-0000-4000-8000-000000000041","nome":"Cal"}');
set local role service_role;
select is(
  public.dados_envio((select id from public.envio where tipo = 'material_cadastrado' limit 1)) ->> 'nome',
  'Cal', 'cadastrado: nome');
select is(
  public.dados_envio((select id from public.envio where tipo = 'material_cadastrado' limit 1)) ->> 'materialId',
  'ad000000-0000-4000-8000-000000000041', 'cadastrado: id do material');
select is(
  public.dados_envio((select id from public.envio where tipo = 'material_cadastrado' limit 1)) ->> 'tipo',
  'material_cadastrado', 'cadastrado: tipo');

select * from finish();
rollback;
