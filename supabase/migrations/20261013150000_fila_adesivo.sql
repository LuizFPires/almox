-- Plano de correção · bloco 2, pontos 11 e 17: fila da impressora de etiquetas.
-- Ponto 11: dois pedidos do mesmo adesivo (dois engenheiros, lote repetido) viravam dois
-- trabalhos na fila. Agora há no máximo um adesivo pendente por pessoa: pedir de novo devolve o
-- trabalho que já está na fila. Reimprimir de propósito continua valendo depois que ele sai.
-- Ponto 17: o lote mandava ~3 pedidos ao banco por pessoa; agora enfileira tudo de uma vez.

-- Duplicados que já estejam na fila: fica o mais antigo de cada pessoa.
update public.trabalho_impressao t
   set status = 'erro', erro = 'duplicado na fila (ficou o pedido mais antigo)', payload = '',
       atualizado_em = now()
 where t.tipo = 'adesivo' and t.pessoa_id is not null and t.status in ('pendente', 'enviando')
   and exists (
     select 1 from public.trabalho_impressao o
      where o.tipo = 'adesivo' and o.pessoa_id = t.pessoa_id and o.status in ('pendente', 'enviando')
        and (o.criado_em, o.id) < (t.criado_em, t.id));

create unique index trabalho_impressao_adesivo_unico on public.trabalho_impressao (pessoa_id)
  where tipo = 'adesivo' and status in ('pendente', 'enviando');

create or replace function public.enfileirar_impressao(p_obra uuid, p_tipo text, p_descricao text,
  p_payload text, p_copias integer, p_pessoa uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_impressora uuid;
  v_id uuid;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro da obra imprime.' using errcode = '42501';
  end if;
  if coalesce(p_payload, '') !~ '^(\^XA|SIZE )' then
    raise exception 'Conteúdo de etiqueta inválido.' using errcode = '22023';
  end if;
  select id into v_impressora from public.impressora where obra_id = p_obra and ativa;
  if v_impressora is null then
    raise exception 'Nenhuma impressora escolhida para esta obra.' using errcode = 'P0002';
  end if;
  insert into public.trabalho_impressao (obra_id, impressora_id, tipo, pessoa_id, descricao, payload, copias)
  values (p_obra, v_impressora, p_tipo, p_pessoa, coalesce(p_descricao, ''), p_payload, p_copias)
  on conflict (pessoa_id) where tipo = 'adesivo' and status in ('pendente', 'enviando') do nothing
  returning id into v_id;
  -- Já tem adesivo dessa pessoa esperando na fila: é o mesmo pedido.
  if v_id is null then
    select id into v_id from public.trabalho_impressao
     where obra_id = p_obra and tipo = 'adesivo' and pessoa_id = p_pessoa
       and status in ('pendente', 'enviando');
  end if;
  return v_id;
end;
$$;

-- Lote de adesivos numa chamada: [{pessoa, descricao, payload}], até 100. Quem já está na fila
-- fica de fora. Devolve quantos entraram.
create function public.enfileirar_adesivos(p_obra uuid, p_itens jsonb) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_impressora uuid;
  v_n integer;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro da obra imprime.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 100 then
    raise exception 'No máximo 100 adesivos por vez.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_itens) i where coalesce(i ->> 'payload', '') !~ '^(\^XA|SIZE )') then
    raise exception 'Conteúdo de etiqueta inválido.' using errcode = '22023';
  end if;
  select id into v_impressora from public.impressora where obra_id = p_obra and ativa;
  if v_impressora is null then
    raise exception 'Nenhuma impressora escolhida para esta obra.' using errcode = 'P0002';
  end if;
  insert into public.trabalho_impressao (obra_id, impressora_id, tipo, pessoa_id, descricao, payload, copias)
  select p_obra, v_impressora, 'adesivo', p.id, left(coalesce(i ->> 'descricao', ''), 200), i ->> 'payload', 1
    from jsonb_array_elements(p_itens) i
    -- Só pessoa ativa desta obra (id de outra obra é ignorado).
    join public.pessoa p on p.id = (i ->> 'pessoa')::uuid and p.obra_id = p_obra and p.ativa
  on conflict (pessoa_id) where tipo = 'adesivo' and status in ('pendente', 'enviando') do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.enfileirar_adesivos(uuid, jsonb) from public, anon;
grant execute on function public.enfileirar_adesivos(uuid, jsonb) to authenticated;
