-- M13 · Materiais: cadastro (só engenheiro), aviso de limite, inativar e pedido de cadastro
-- (o almoxarife pede, o engenheiro cadastra ou dispensa). As mudanças de nome, unidade, aviso e
-- ativo vão para public.alteracao pelo gatilho material_log.

/** Nome limpo: sem espaços nas pontas e com espaços internos colapsados. */
create function privado.limpar_nome_material(p_nome text) returns text
language sql immutable
set search_path = ''
as $$
  select regexp_replace(btrim(p_nome), '\s+', ' ', 'g')
$$;

/**
 * Cria (p_id null) ou edita um material. Só engenheiro. Nome repetido na obra → AL104; trocar a
 * unidade de material com lançamentos → 22023. Com p_pedido (aberto, da mesma obra), marca o
 * pedido como cadastrado e avisa quem pediu (push material_cadastrado).
 */
create function public.salvar_material(
  p_obra uuid,
  p_id uuid,
  p_nome text,
  p_unidade text,
  p_pedido uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := privado.limpar_nome_material(p_nome);
  v_material public.material;
  v_pedido public.pedido_cadastro_material;
  v_id uuid;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro cadastra materiais.' using errcode = '42501';
  end if;

  if v_nome is null or char_length(v_nome) < 2 or char_length(v_nome) > 80 then
    raise exception 'O nome precisa ter de 2 a 80 letras.' using errcode = '22023';
  end if;
  if p_unidade is null or p_unidade not in ('sc', 'un', 'barra', 'rolo', 'lata', 'm³', 'kg', 'm', 'm²', 'l') then
    raise exception 'Unidade inválida.' using errcode = '22023';
  end if;

  if p_pedido is not null then
    select * into v_pedido from public.pedido_cadastro_material
     where id = p_pedido and obra_id = p_obra
     for update;
    if v_pedido.id is null or v_pedido.status <> 'aberto' then
      raise exception 'Este pedido não está mais aberto.' using errcode = '22023';
    end if;
  end if;

  if exists (select 1 from public.material
              where obra_id = p_obra
                and privado.normalizar(nome) = privado.normalizar(v_nome)
                and id is distinct from p_id) then
    raise exception 'Já existe um material com o nome %.', v_nome using errcode = 'AL104';
  end if;

  begin
    if p_id is null then
      insert into public.material (obra_id, nome, unidade)
      values (p_obra, v_nome, p_unidade)
      returning id into v_id;
    else
      select * into v_material from public.material
       where id = p_id and obra_id = p_obra
       for update;
      if v_material.id is null then
        raise exception 'Material não encontrado nesta obra.' using errcode = 'P0002';
      end if;
      if v_material.unidade <> p_unidade
         and exists (select 1 from public.movimento_material where material_id = p_id) then
        raise exception 'Não dá para trocar a unidade de um material que já tem lançamentos.'
          using errcode = '22023';
      end if;
      update public.material set nome = v_nome, unidade = p_unidade where id = p_id;
      v_id := p_id;
    end if;
  exception when unique_violation then
    raise exception 'Já existe um material com o nome %.', v_nome using errcode = 'AL104';
  end;

  if p_pedido is not null then
    update public.pedido_cadastro_material
       set status = 'cadastrado', material_id = v_id, resolvido_em = now()
     where id = p_pedido;
    insert into public.envio (obra_id, tipo, canal, destino, referencia, dados)
    values (p_obra, 'material_cadastrado', 'push', v_pedido.pedido_por::text, p_pedido,
            jsonb_build_object('material', v_id, 'nome', v_nome))
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

/**
 * Salva (ou remove, com p_tipo null) o aviso de limite. Só engenheiro. Depois de salvar: saldo já
 * no limite e aviso armado → dispara na hora; saldo acima do limite → rearma.
 */
create function public.salvar_aviso_material(p_obra uuid, p_material uuid, p_tipo text, p_valor numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_material public.material;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro configura o aviso.' using errcode = '42501';
  end if;

  if p_tipo is not null then
    if p_tipo not in ('quantidade', 'percentual') then
      raise exception 'Tipo de aviso inválido.' using errcode = '22023';
    end if;
    if p_valor is null or p_valor <= 0 or p_valor > 999999 or p_valor <> round(p_valor, 2)
       or (p_tipo = 'percentual' and (p_valor < 1 or p_valor > 100)) then
      raise exception 'Valor do aviso inválido.' using errcode = '22023';
    end if;
  end if;

  select * into v_material from public.material
   where id = p_material and obra_id = p_obra
   for update;
  if v_material.id is null then
    raise exception 'Material não encontrado nesta obra.' using errcode = 'P0002';
  end if;

  update public.material
     set aviso_tipo = p_tipo,
         aviso_valor = case when p_tipo is null then null else p_valor end
   where id = p_material;

  perform privado.avaliar_aviso_material(p_material, null, gen_random_uuid());
end;
$$;

/** Inativa um material. Só engenheiro. Saldo diferente de zero → AL105. */
create function public.inativar_material(p_obra uuid, p_material uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_material public.material;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro inativa materiais.' using errcode = '42501';
  end if;

  select * into v_material from public.material
   where id = p_material and obra_id = p_obra
   for update;
  if v_material.id is null then
    raise exception 'Material não encontrado nesta obra.' using errcode = 'P0002';
  end if;
  if v_material.saldo <> 0 then
    raise exception 'Para inativar, o saldo de % precisa ser zero.', v_material.nome
      using errcode = 'AL105';
  end if;

  update public.material set ativo = false where id = p_material and ativo;
end;
$$;

/**
 * Pedido de cadastro de material feito por quem lança. Avisa cada engenheiro da obra
 * (push pedido_cadastro_material). Devolve o id do pedido.
 */
create function public.pedir_cadastro_material(p_obra uuid, p_nome text) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := privado.limpar_nome_material(p_nome);
  v_quem uuid := (select auth.uid());
  v_id uuid;
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  if v_nome is null or char_length(v_nome) < 2 or char_length(v_nome) > 80 then
    raise exception 'O nome precisa ter de 2 a 80 letras.' using errcode = '22023';
  end if;

  insert into public.pedido_cadastro_material (obra_id, nome, pedido_por)
  values (p_obra, v_nome, v_quem)
  returning id into v_id;

  insert into public.envio (obra_id, tipo, canal, destino, referencia, dados)
  select p_obra, 'pedido_cadastro_material', 'push', uo.usuario_id::text, v_id,
         jsonb_build_object('pedido', v_id, 'nome', v_nome, 'quem', v_quem)
    from public.usuario_obra uo
   where uo.obra_id = p_obra and uo.perfil = 'engenheiro'
  on conflict do nothing;

  return v_id;
end;
$$;

/** Dispensa um pedido de cadastro aberto. Só engenheiro. */
create function public.dispensar_pedido_material(p_obra uuid, p_pedido uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedido_cadastro_material;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro dispensa pedidos.' using errcode = '42501';
  end if;

  select * into v_pedido from public.pedido_cadastro_material
   where id = p_pedido and obra_id = p_obra
   for update;
  if v_pedido.id is null then
    raise exception 'Pedido não encontrado nesta obra.' using errcode = 'P0002';
  end if;
  if v_pedido.status <> 'aberto' then
    raise exception 'Este pedido não está mais aberto.' using errcode = '22023';
  end if;

  update public.pedido_cadastro_material
     set status = 'dispensado', resolvido_em = now()
   where id = p_pedido;
end;
$$;

revoke all on function privado.limpar_nome_material(text) from public, anon, authenticated;

revoke all on function public.salvar_material(uuid, uuid, text, text, uuid),
  public.salvar_aviso_material(uuid, uuid, text, numeric),
  public.inativar_material(uuid, uuid),
  public.pedir_cadastro_material(uuid, text),
  public.dispensar_pedido_material(uuid, uuid)
  from public, anon;
grant execute on function public.salvar_material(uuid, uuid, text, text, uuid),
  public.salvar_aviso_material(uuid, uuid, text, numeric),
  public.inativar_material(uuid, uuid),
  public.pedir_cadastro_material(uuid, text),
  public.dispensar_pedido_material(uuid, uuid)
  to authenticated;
