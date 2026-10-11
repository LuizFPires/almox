-- M1 · Movimentos imutáveis (RN-18) e esqueletos das RPCs de negócio.

-- Nenhum papel, nem o administrador, altera ou apaga movimentos. Correção = estorno.
create function privado.bloquear_alteracao() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Movimentos são imutáveis (RN-18): use um estorno com motivo.'
    using errcode = 'P0001', hint = 'tabela ' || tg_table_name;
end;
$$;

create trigger movimento_imutavel
  before update or delete on public.movimento
  for each row execute function privado.bloquear_alteracao();
create trigger movimento_imutavel_truncate
  before truncate on public.movimento
  for each statement execute function privado.bloquear_alteracao();

create trigger movimento_item_imutavel
  before update or delete on public.movimento_item
  for each row execute function privado.bloquear_alteracao();
create trigger movimento_item_imutavel_truncate
  before truncate on public.movimento_item
  for each statement execute function privado.bloquear_alteracao();

-- Esqueletos: validam permissão no servidor e ainda não registram nada.
-- registrar_retirada → M5 · registrar_devolucao → M6 · registrar_ocorrencia → M4.

create function public.registrar_retirada(
  p_obra uuid,
  p_pessoa uuid,
  p_via public.via_movimento,
  p_itens jsonb,
  p_confirmado boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  raise exception 'registrar_retirada ainda não implementada (M5).' using errcode = '0A000';
end;
$$;

create function public.registrar_devolucao(
  p_obra uuid,
  p_pessoa uuid,
  p_via public.via_movimento,
  p_itens jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  raise exception 'registrar_devolucao ainda não implementada (M6).' using errcode = '0A000';
end;
$$;

create function public.registrar_ocorrencia(
  p_obra uuid,
  p_pessoa uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  raise exception 'registrar_ocorrencia ainda não implementada (M4).' using errcode = '0A000';
end;
$$;

revoke all on function public.registrar_retirada(uuid, uuid, public.via_movimento, jsonb, boolean),
  public.registrar_devolucao(uuid, uuid, public.via_movimento, jsonb),
  public.registrar_ocorrencia(uuid, uuid)
  from public, anon;
grant execute on function public.registrar_retirada(uuid, uuid, public.via_movimento, jsonb, boolean),
  public.registrar_devolucao(uuid, uuid, public.via_movimento, jsonb),
  public.registrar_ocorrencia(uuid, uuid)
  to authenticated;

-- Funções internas não são chamáveis pela API.
revoke all on function public.definir_matricula(), public.criar_usuario() from public, anon, authenticated;
