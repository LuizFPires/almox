-- M3 · Fila de impressão, impressora da obra e dispositivo (mini PC) com token.

alter type public.status_impressao add value if not exists 'enviando' after 'pendente';

-- Impressora: uma ativa por obra (a do almoxarifado).
alter table public.impressora add column ativa boolean not null default true;
create unique index impressora_uma_ativa on public.impressora (obra_id) where ativa;
revoke insert, update on public.impressora from authenticated;
grant insert (obra_id, nome, ip, porta, linguagem, rolo) on public.impressora to authenticated;
grant update (nome, ip, porta, linguagem, rolo, ativa) on public.impressora to authenticated;

-- Trabalho: o conteúdo (payload) leva o token do QR — só o agente lê.
alter table public.trabalho_impressao
  add column tipo text not null default 'adesivo' check (tipo in ('adesivo', 'teste')),
  add column pessoa_id uuid,
  add column descricao text not null default '',
  add column enviado_em timestamptz,
  add constraint trabalho_pessoa_fk foreign key (pessoa_id, obra_id) references public.pessoa (id, obra_id);
revoke all on public.trabalho_impressao from authenticated;
grant select (id, obra_id, impressora_id, tipo, pessoa_id, descricao, copias, status, erro, criado_em,
  atualizado_em, enviado_em) on public.trabalho_impressao to authenticated;
drop policy trabalho_impressao_criar on public.trabalho_impressao;

-- Dispositivo da obra (mini PC: TV + agente). Token mostrado uma vez; o banco guarda o hash.
alter table public.dispositivo_tv add column revogado_em timestamptz;

create function privado.hash_token(p_token text) returns text
language sql immutable
set search_path = ''
as $$ select encode(extensions.digest(p_token, 'sha256'), 'hex') $$;

create function privado.dispositivo_por_token(p_token text) returns public.dispositivo_tv
language sql stable security definer
set search_path = ''
as $$
  select * from public.dispositivo_tv
   where token_hash = privado.hash_token(p_token) and revogado_em is null
$$;

create function public.criar_dispositivo(p_obra uuid, p_nome text) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro da obra cadastra dispositivos.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'Informe o nome do dispositivo.' using errcode = '22023';
  end if;
  insert into public.dispositivo_tv (obra_id, nome, token_hash)
  values (p_obra, trim(p_nome), privado.hash_token(v_token));
  return v_token;
end;
$$;

create function public.revogar_dispositivo(p_dispositivo uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.dispositivo_tv set revogado_em = now()
   where id = p_dispositivo and revogado_em is null and privado.eh_engenheiro(obra_id);
  if not found then
    raise exception 'Dispositivo não encontrado.' using errcode = '42501';
  end if;
end;
$$;

grant select (revogado_em) on public.dispositivo_tv to authenticated;

-- Engenheiro: dados para o adesivo (única forma de ler o token do QR) e enfileirar.
create function public.dados_adesivo(p_pessoa uuid)
returns table (token text, nome_capacete text, nome text, funcao text, empresa text, obra text,
  matricula text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select p.qr_token, p.nome_capacete, p.nome, p.funcao, e.nome, o.nome, p.matricula
      from public.pessoa p
      join public.empresa e on e.id = p.empresa_id
      join public.obra o on o.id = p.obra_id
     where p.id = p_pessoa and privado.eh_engenheiro(p.obra_id);
  if not found then
    raise exception 'Só o engenheiro da obra imprime adesivos.' using errcode = '42501';
  end if;
end;
$$;

create function public.enfileirar_impressao(
  p_obra uuid,
  p_tipo text,
  p_descricao text,
  p_payload text,
  p_copias integer,
  p_pessoa uuid default null
) returns uuid
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
  select id into v_impressora from public.impressora where obra_id = p_obra and ativa;
  if v_impressora is null then
    raise exception 'Nenhuma impressora escolhida para esta obra.' using errcode = 'P0002';
  end if;
  insert into public.trabalho_impressao (obra_id, impressora_id, tipo, pessoa_id, descricao, payload, copias)
  values (p_obra, v_impressora, p_tipo, p_pessoa, coalesce(p_descricao, ''), p_payload, p_copias)
  returning id into v_id;
  return v_id;
end;
$$;

-- Agente (chave pública + token do dispositivo; sem login) ---------------------------------

create function public.agente_ping(p_token text) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.dispositivo_tv := privado.dispositivo_por_token(p_token);
begin
  if v.id is null then
    raise exception 'Dispositivo não autorizado.' using errcode = '42501';
  end if;
  update public.dispositivo_tv set ultimo_ping = now() where id = v.id;
  return (select nome from public.obra where id = v.obra_id);
end;
$$;

/**
 * Pega até 5 trabalhos pendentes da obra do dispositivo e marca como "enviando".
 * skip locked: dois agentes não pegam o mesmo trabalho. "enviando" parado há mais de
 * 1 minuto (agente caiu no meio) volta para a fila.
 */
create function public.agente_proximos(p_token text)
returns table (id uuid, payload text, ip text, porta integer, descricao text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v public.dispositivo_tv := privado.dispositivo_por_token(p_token);
begin
  if v.id is null then
    raise exception 'Dispositivo não autorizado.' using errcode = '42501';
  end if;
  update public.dispositivo_tv set ultimo_ping = now() where dispositivo_tv.id = v.id;
  return query
    with livres as (
      select t.id from public.trabalho_impressao t
       where t.obra_id = v.obra_id
         and (t.status = 'pendente' or (t.status = 'enviando' and t.atualizado_em < now() - interval '1 minute'))
       order by t.criado_em
       limit 5
       for update skip locked
    ), pegos as (
      update public.trabalho_impressao t set status = 'enviando', atualizado_em = now()
        from livres where t.id = livres.id
      returning t.id, t.payload, t.impressora_id, t.descricao
    )
    select p.id, p.payload, host(i.ip), i.porta, p.descricao
      from pegos p join public.impressora i on i.id = p.impressora_id;
end;
$$;

create function public.agente_concluir(p_token text, p_trabalho uuid, p_ok boolean, p_erro text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.dispositivo_tv := privado.dispositivo_por_token(p_token);
begin
  if v.id is null then
    raise exception 'Dispositivo não autorizado.' using errcode = '42501';
  end if;
  update public.trabalho_impressao
     set status = case when p_ok then 'enviado'::public.status_impressao else 'erro'::public.status_impressao end,
         erro = case when p_ok then null else left(coalesce(p_erro, 'Falha ao imprimir'), 300) end,
         enviado_em = case when p_ok then now() else null end,
         atualizado_em = now()
   where id = p_trabalho and obra_id = v.obra_id and status = 'enviando';
end;
$$;

-- Permissões -------------------------------------------------------------------------------
revoke all on function public.criar_dispositivo(uuid, text), public.revogar_dispositivo(uuid),
  public.dados_adesivo(uuid), public.enfileirar_impressao(uuid, text, text, text, integer, uuid),
  public.agente_ping(text), public.agente_proximos(text), public.agente_concluir(text, uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.criar_dispositivo(uuid, text), public.revogar_dispositivo(uuid),
  public.dados_adesivo(uuid), public.enfileirar_impressao(uuid, text, text, text, integer, uuid)
  to authenticated;
-- O agente entra só com a chave pública: estas três são as únicas abertas ao anônimo.
grant execute on function public.agente_ping(text), public.agente_proximos(text),
  public.agente_concluir(text, uuid, boolean, text) to anon;

revoke execute on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated;
revoke execute on function privado.dispositivo_por_token(text) from authenticated;
