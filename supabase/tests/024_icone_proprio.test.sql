-- Ícone próprio: arquivo só da própria obra; envio ao bucket só pelo engenheiro.
begin;
select plan(7);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao)
    values ('a0000000-0000-4000-8000-000000000001', 'Betoneira', 'arquivo:a0000000-0000-4000-8000-000000000001/e8000000-0000-4000-8000-000000000001.png', 'BET', 429000)$$,
  'engenheiro grava ferramenta com ícone próprio da obra'
);
select throws_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao)
    values ('a0000000-0000-4000-8000-000000000001', 'Betoneira B', 'arquivo:a0000000-0000-4000-8000-000000000002/e8000000-0000-4000-8000-000000000001.png', 'BEB', 429000)$$,
  '23514', null, 'ícone de arquivo de outra obra: recusado'
);
select throws_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao)
    values ('a0000000-0000-4000-8000-000000000001', 'Betoneira C', 'arquivo:https://exemplo.com/x.png', 'BEC', 429000)$$,
  '23514', null, 'ícone com endereço externo: recusado'
);
select throws_ok(
  $$insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao)
    values ('a0000000-0000-4000-8000-000000000001', 'Betoneira D', 'betoneira', 'BED', 429000)$$,
  '23514', null, 'chave de ícone que não existe: recusada'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('icones', 'a0000000-0000-4000-8000-000000000001/e8000000-0000-4000-8000-000000000002.png', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  'engenheiro envia ícone da própria obra'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('icones', 'a0000000-0000-4000-8000-000000000002/e8000000-0000-4000-8000-000000000003.png', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'engenheiro não envia ícone para obra onde é só consulta'
);

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('icones', 'a0000000-0000-4000-8000-000000000001/e8000000-0000-4000-8000-000000000004.png', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'almoxarife não envia ícone'
);

select * from finish();
rollback;
