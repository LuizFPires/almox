-- Adesivos em folha A4 (decisão de 13/10/2026): sem mini PC nem impressora de etiquetas, o
-- engenheiro imprime os adesivos dos capacetes na impressora comum da obra (9 por folha, 60 ×
-- 80 mm, com linha de corte). O QR continua só com o token (RN-17).
-- `adesivo_impresso_em` marca quem já teve o adesivo impresso em A4, para o lote não repetir
-- (quem foi pela impressora de etiquetas continua marcado pela fila de impressão).

alter table public.pessoa add column adesivo_impresso_em timestamptz;
grant select (adesivo_impresso_em) on public.pessoa to authenticated;

/** Dados de vários adesivos de uma vez (inclui o token do QR). Só o engenheiro da obra. */
create function public.dados_adesivos(p_obra uuid, p_pessoas uuid[])
returns table (pessoa_id uuid, token text, nome_capacete text, nome text, funcao text,
  empresa text, obra text, matricula text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro da obra imprime adesivos.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_pessoas), 0) > 200 then
    raise exception 'No máximo 200 adesivos por vez.' using errcode = '22023';
  end if;
  return query
    select p.id, p.qr_token, p.nome_capacete, p.nome, p.funcao, e.nome, o.nome, p.matricula
      from public.pessoa p
      join public.empresa e on e.id = p.empresa_id
      join public.obra o on o.id = p.obra_id
     where p.obra_id = p_obra and p.ativa and p.id = any (p_pessoas)
     order by p.nome, p.id;
end;
$$;

/** Engenheiro marca os adesivos como impressos em A4 (ao tocar em "Imprimir"). */
create function public.marcar_adesivos_impressos(p_obra uuid, p_pessoas uuid[]) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro da obra imprime adesivos.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_pessoas), 0) > 200 then
    raise exception 'No máximo 200 adesivos por vez.' using errcode = '22023';
  end if;
  update public.pessoa set adesivo_impresso_em = now()
   where obra_id = p_obra and id = any (p_pessoas);
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.dados_adesivos(uuid, uuid[]),
  public.marcar_adesivos_impressos(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.dados_adesivos(uuid, uuid[]),
  public.marcar_adesivos_impressos(uuid, uuid[]) to authenticated;
