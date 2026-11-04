-- M13 · Materiais: edição e exclusão de lançamentos pelo engenheiro.
-- O lançamento original nunca muda: cada edição grava uma nova versão em movimento_material_versao
-- (quantidade 0 = apagado). O saldo recebe só a diferença (nova − vigente) e nunca fica negativo.

/**
 * Edita (ou apaga, com p_quantidade = 0) um lançamento de material. Só o engenheiro da obra.
 * p_quantidade é a nova quantidade com sinal: entrada >= 0, saída <= 0, ajuste qualquer.
 * Conferência não é editável (AL106); material inativo, AL103; saldo negativo, AL101.
 * Se o lançamento é a entrada não apagada mais recente do material, o estoque cheio acompanha.
 */
create function public.editar_movimento_material(
  p_obra uuid,
  p_movimento uuid,
  p_quantidade numeric,
  p_motivo text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movimento public.movimento_material;
  v_material public.material;
  v_motivo text;
  v_vigente numeric;
  v_delta numeric;
  v_ultima_entrada uuid;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro edita lançamentos.' using errcode = '42501';
  end if;

  v_motivo := nullif(btrim(p_motivo), '');
  if char_length(v_motivo) > 200 then
    raise exception 'O motivo pode ter no máximo 200 letras.' using errcode = '22023';
  end if;

  select * into v_movimento from public.movimento_material
   where id = p_movimento and obra_id = p_obra;
  if v_movimento.id is null then
    raise exception 'Lançamento não encontrado nesta obra.' using errcode = 'P0002';
  end if;

  -- Trava o material antes de ler versões e saldo: duas edições ao mesmo tempo viram uma fila.
  select * into v_material from public.material
   where id = v_movimento.material_id and obra_id = p_obra
   for update;

  if v_movimento.tipo not in ('entrada', 'saida', 'ajuste') then
    raise exception 'Este lançamento não pode ser editado.' using errcode = 'AL106';
  end if;
  if not v_material.ativo then
    raise exception '% está inativo.', v_material.nome using errcode = 'AL103';
  end if;
  if p_quantidade is null
     or (v_movimento.tipo = 'entrada' and p_quantidade < 0)
     or (v_movimento.tipo = 'saida' and p_quantidade > 0)
     or not (p_quantidade = 0 or privado.quantidade_material_valida(v_material.unidade, abs(p_quantidade))) then
    raise exception 'Quantidade inválida para %.', v_material.unidade using errcode = '22023';
  end if;

  select coalesce((
    select v.quantidade from public.movimento_material_versao v
     where v.movimento_id = p_movimento
     order by v.criado_em desc, v.id desc
     limit 1), v_movimento.quantidade)
    into v_vigente;
  v_delta := p_quantidade - v_vigente;
  if v_delta = 0 then
    return; -- nada mudou: não grava versão
  end if;

  -- Entrada não apagada mais recente do material, antes de aplicar a edição.
  select m.id into v_ultima_entrada
    from public.movimento_material m
    left join lateral (
      select mv.quantidade from public.movimento_material_versao mv
       where mv.movimento_id = m.id
       order by mv.criado_em desc, mv.id desc
       limit 1
    ) v on true
   where m.material_id = v_material.id and m.tipo = 'entrada'
     and coalesce(v.quantidade, m.quantidade) <> 0
   order by m.criado_em desc, m.id desc
   limit 1;

  insert into public.movimento_material_versao (movimento_id, quantidade, motivo, desfeito, usuario_id)
  values (p_movimento, p_quantidade, v_motivo, false, (select auth.uid()));

  -- Estoque cheio antes de avaliar o aviso (o limite por percentual depende dele).
  if v_ultima_entrada = p_movimento then
    update public.material set estoque_cheio = greatest(estoque_cheio + v_delta, 0)
     where id = v_material.id;
  end if;

  -- Referência nova: um aviso disparado de novo por edição não pode ser engolido pelo
  -- unique(tipo, canal, destino, referencia) de um envio anterior do mesmo lançamento.
  perform privado.aplicar_movimento_material(v_material.id, v_delta, gen_random_uuid());
end;
$$;

revoke all on function public.editar_movimento_material(uuid, uuid, numeric, text) from public, anon;
grant execute on function public.editar_movimento_material(uuid, uuid, numeric, text) to authenticated;
