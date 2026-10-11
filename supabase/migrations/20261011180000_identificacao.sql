-- M4 · Leitura do QR do capacete, conferência da pessoa (RN-03) e ocorrência (RN-04).

-- Identificação conferida ("Sim, é o …"): prova, no servidor, de que o capacete foi lido e a
-- pessoa conferida. Vale 10 minutos (PLAN › Decisões); M5/M6 exigem uma válida para via = qr.
create table public.identificacao (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  pessoa_id uuid not null,
  usuario_id uuid not null references public.usuario (id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  foreign key (pessoa_id, obra_id) references public.pessoa (id, obra_id)
);
create index identificacao_vigente on public.identificacao (pessoa_id, usuario_id, expira_em);
alter table public.identificacao enable row level security;
-- Ninguém lê nem escreve direto: só pelas funções abaixo.
revoke all on public.identificacao from public, anon, authenticated;

-- Pessoa ativa da obra dona do token (null se não houver). Token com formato errado = null.
create function privado.pessoa_por_token(p_obra uuid, p_token text) returns public.pessoa
language sql stable security definer
set search_path = ''
as $$
  select * from public.pessoa
   where obra_id = p_obra and qr_token = lower(trim(p_token))
     and lower(trim(p_token)) ~ '^[0-9a-f]{16,64}$'
$$;

/**
 * O que o app mostra depois de ler um capacete. Nunca devolve o token.
 * situacao: 'ok' | 'nao_cadastrado' | 'inativa' | 'outra_empresa' (consulta restrita).
 */
create function public.ler_capacete(p_obra uuid, p_token text)
returns table (situacao text, pessoa_id uuid, nome_capacete text, nome text, funcao text,
  empresa text, empresa_cor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.pessoa := privado.pessoa_por_token(p_obra, p_token);
begin
  if not privado.tem_acesso(p_obra) then
    raise exception 'Sem acesso a esta obra.' using errcode = '42501';
  end if;
  if v.id is null then
    return query select 'nao_cadastrado'::text, null::uuid, null::text, null::text, null::text, null::text, null::text;
  elsif not v.ativa then
    return query select 'inativa'::text, null::uuid, null::text, null::text, null::text, null::text, null::text;
  elsif privado.empresa_restrita(p_obra) is not null and privado.empresa_restrita(p_obra) <> v.empresa_id then
    return query select 'outra_empresa'::text, null::uuid, null::text, null::text, null::text, null::text, null::text;
  else
    return query
      select 'ok'::text, v.id, v.nome_capacete, v.nome, v.funcao, e.nome, e.cor
        from public.empresa e where e.id = v.empresa_id;
  end if;
end;
$$;

/** "Sim, é o …": grava a identificação conferida (10 minutos) e devolve o id da pessoa. */
create function public.confirmar_identificacao(p_obra uuid, p_token text) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.pessoa := privado.pessoa_por_token(p_obra, p_token);
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  if v.id is null or not v.ativa then
    raise exception 'Capacete não cadastrado.' using errcode = 'P0002';
  end if;
  insert into public.identificacao (obra_id, pessoa_id, usuario_id, expira_em)
  values (p_obra, v.id, (select auth.uid()), now() + interval '10 minutes');
  return v.id;
end;
$$;

/** Até quando vale a conferência deste usuário para a pessoa (null = não conferida). */
create function public.identificacao_vigente(p_obra uuid, p_pessoa uuid) returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(expira_em) from public.identificacao
   where obra_id = p_obra and pessoa_id = p_pessoa and usuario_id = (select auth.uid())
     and expira_em > now() and privado.pode_lancar(p_obra)
$$;

-- "Não é ele" (RN-04): nada é registrado além da ocorrência; derruba conferências vigentes.
drop function public.registrar_ocorrencia(uuid, uuid);
create function public.registrar_ocorrencia(p_obra uuid, p_token text) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.pessoa := privado.pessoa_por_token(p_obra, p_token);
  v_id uuid;
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  if v.id is null then
    raise exception 'Capacete não cadastrado.' using errcode = 'P0002';
  end if;
  update public.identificacao set expira_em = now()
   where pessoa_id = v.id and obra_id = p_obra and expira_em > now();
  insert into public.ocorrencia (obra_id, tipo, pessoa_id, usuario_id)
  values (p_obra, 'capacete_trocado', v.id, (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

-- Leitura das ocorrências (a política ocorrencia_ler já filtra por obra e empresa).
grant select (id, obra_id, tipo, pessoa_id, usuario_id, criado_em) on public.ocorrencia to authenticated;

revoke all on function privado.pessoa_por_token(uuid, text) from public, anon, authenticated;
revoke all on function public.ler_capacete(uuid, text), public.confirmar_identificacao(uuid, text),
  public.identificacao_vigente(uuid, uuid), public.registrar_ocorrencia(uuid, text)
  from public, anon;
grant execute on function public.ler_capacete(uuid, text), public.confirmar_identificacao(uuid, text),
  public.identificacao_vigente(uuid, uuid), public.registrar_ocorrencia(uuid, text)
  to authenticated;
