-- M5 (revisão) · retirada idempotente (rede que cai depois de gravar não duplica) e
-- validação de cada item da lista.

-- Chave gerada pelo celular ao entrar na revisão: repetir o "Concluir" devolve o mesmo
-- movimento em vez de criar outro.
alter table public.movimento add column chave_cliente uuid;
create unique index movimento_chave_cliente on public.movimento (obra_id, chave_cliente)
  where chave_cliente is not null;

drop function public.registrar_retirada(uuid, uuid, uuid, jsonb, boolean);

create function public.registrar_retirada(
  p_obra uuid,
  p_pessoa uuid,
  p_identificacao uuid,
  p_itens jsonb,
  p_confirmado boolean,
  p_chave uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via public.via_movimento := 'manual';
  v_movimento uuid;
  v_item record;
  v_tipo public.tipo_ferramenta;
  v_unidades uuid[];
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;

  -- Mesmo pedido de novo (a resposta se perdeu): devolve o que já foi gravado.
  if p_chave is not null then
    select id into v_movimento from public.movimento
     where obra_id = p_obra and chave_cliente = p_chave
       and pessoa_id = p_pessoa and usuario_id = (select auth.uid()) and tipo = 'retirada';
    if v_movimento is not null then
      return v_movimento;
    end if;
  end if;

  if not coalesce(p_confirmado, false) then
    raise exception 'Confirme que conferiu pessoalmente quem está pegando.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.pessoa where id = p_pessoa and obra_id = p_obra and ativa) then
    raise exception 'Pessoa não encontrada nesta obra.' using errcode = 'P0002';
  end if;

  if p_identificacao is not null then
    if not exists (
      select 1 from public.identificacao
       where id = p_identificacao and obra_id = p_obra and pessoa_id = p_pessoa
         and usuario_id = (select auth.uid()) and expira_em > now()
    ) then
      raise exception 'A conferência do capacete não vale mais. Leia o capacete de novo.' using errcode = 'AL001';
    end if;
    v_via := 'qr';
  end if;

  -- Cada item: objeto com tipo (uuid) e quantidade inteira de 1 a 999.
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Escolha pelo menos uma ferramenta.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) e
     where jsonb_typeof(e) <> 'object'
        or coalesce(e ->> 'quantidade', '') !~ '^[1-9][0-9]{0,2}$'
        or coalesce(e ->> 'tipo', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'Lista de ferramentas inválida.' using errcode = '22023';
  end if;

  insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via, conferido, chave_cliente)
  values (p_obra, 'retirada', p_pessoa, (select auth.uid()), v_via, true, p_chave)
  returning id into v_movimento;

  for v_item in
    select (e ->> 'tipo')::uuid as tipo, sum((e ->> 'quantidade')::integer) as quantidade
      from jsonb_array_elements(p_itens) e
     group by 1
  loop
    select * into v_tipo from public.tipo_ferramenta where id = v_item.tipo and obra_id = p_obra;
    if v_tipo.id is null then
      raise exception 'Ferramenta não encontrada nesta obra.' using errcode = 'P0002';
    end if;

    -- skip locked: não espera outro celular (sem risco de deadlock). Se ele desistir,
    -- uma unidade travada por ele pode faltar aqui: "acabou de sair" e tenta de novo.
    select array_agg(id) into v_unidades from (
      select u.id from public.unidade u
       where u.tipo_id = v_tipo.id and u.obra_id = p_obra and u.status = 'livre'
       order by length(u.codigo), u.codigo
       limit v_item.quantidade
       for update skip locked
    ) livres;
    if coalesce(array_length(v_unidades, 1), 0) < v_item.quantidade then
      raise exception '% acabou de sair: só % livre(s) agora.', v_tipo.nome,
        coalesce(array_length(v_unidades, 1), 0) using errcode = 'AL002';
    end if;

    insert into public.movimento_item (movimento_id, obra_id, unidade_id)
      select v_movimento, p_obra, unnest(v_unidades);
    update public.unidade set status = 'em_uso' where id = any (v_unidades);
    insert into public.posse (unidade_id, obra_id, pessoa_id, via, movimento_retirada_id)
      select unnest(v_unidades), p_obra, p_pessoa, v_via, v_movimento;
  end loop;

  return v_movimento;
end;
$$;

revoke all on function public.registrar_retirada(uuid, uuid, uuid, jsonb, boolean, uuid) from public, anon;
grant execute on function public.registrar_retirada(uuid, uuid, uuid, jsonb, boolean, uuid) to authenticated;
