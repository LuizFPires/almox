-- Administrador (multi-obra): cuida das obras e das contas acima da obra.
-- - cria obra, edita, desativa, encerra e reativa;
-- - liga o engenheiro da obra (o engenheiro dá os demais acessos, como antes);
-- - gera senha nova para quem o engenheiro não pode (login de várias obras, outro engenheiro).
-- Não ganha acesso aos dados das obras: para lançar ou ver relatórios, liga-se como engenheiro.
-- Quem é administrador é decidido fora do app (scripts/tornar-administrador.mjs).

create table public.administrador (
  usuario_id uuid primary key references public.usuario (id),
  criado_em timestamptz not null default now()
);
alter table public.administrador enable row level security;
revoke all on public.administrador from public, anon, authenticated;
grant select on public.administrador to authenticated;
-- Cada um só descobre se ele mesmo é administrador.
create policy administrador_ler on public.administrador for select to authenticated
  using (usuario_id = (select auth.uid()));

-- Com a senha do primeiro acesso pendente, não vale (como o resto do banco: privado.senha_pendente).
create function privado.eh_administrador() returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select not privado.senha_pendente()
     and exists (select 1 from public.administrador where usuario_id = (select auth.uid()))
$$;
revoke all on function privado.eh_administrador() from public, anon;
grant execute on function privado.eh_administrador() to authenticated;

create function privado.exigir_administrador() returns void
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  if not privado.eh_administrador() then
    raise exception 'só o administrador' using errcode = '42501';
  end if;
end;
$$;
revoke all on function privado.exigir_administrador() from public, anon;
grant execute on function privado.exigir_administrador() to authenticated;

-- Obras ------------------------------------------------------------------------------------

/** Todas as obras, com quantos engenheiros e acessos cada uma tem. */
create function public.admin_listar_obras()
returns table (
  id uuid, nome text, endereco text, ativa boolean, encerrada_em date,
  engenheiros integer, acessos integer
)
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_administrador();
  return query
    select o.id, o.nome, o.endereco, o.ativa, o.encerrada_em,
           (select count(*)::int from public.usuario_obra uo
             where uo.obra_id = o.id and uo.perfil = 'engenheiro'),
           (select count(*)::int from public.usuario_obra uo where uo.obra_id = o.id)
      from public.obra o
     order by o.ativa desc, o.nome;
end;
$$;

create function public.admin_criar_obra(p_nome text, p_endereco text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform privado.exigir_administrador();
  insert into public.obra (nome, endereco)
  values (btrim(p_nome), nullif(btrim(coalesce(p_endereco, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_editar_obra(p_obra uuid, p_nome text, p_endereco text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_administrador();
  update public.obra
     set nome = btrim(p_nome), endereco = nullif(btrim(coalesce(p_endereco, '')), '')
   where id = p_obra;
  if not found then raise exception 'obra não encontrada' using errcode = 'P0002'; end if;
end;
$$;

/**
 * Situação da obra: 'ativa', 'desativada' (some do app e do fechamento das 23:59, dados
 * intactos) ou 'encerrada' (também desativada; a data conta o prazo de retenção da LGPD).
 */
create function public.admin_situacao_obra(p_obra uuid, p_situacao text) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_administrador();
  if p_situacao not in ('ativa', 'desativada', 'encerrada') then
    raise exception 'situação inválida' using errcode = '22023';
  end if;
  update public.obra
     set ativa = (p_situacao = 'ativa'),
         encerrada_em = case p_situacao
           when 'encerrada' then coalesce(encerrada_em, (now() at time zone 'America/Sao_Paulo')::date)
           when 'ativa' then null
           else encerrada_em end
   where id = p_obra;
  if not found then raise exception 'obra não encontrada' using errcode = 'P0002'; end if;
end;
$$;

-- Acessos ----------------------------------------------------------------------------------

/** Acessos de qualquer obra (nome, e-mail, perfil e empresa da consulta restrita). */
create function public.admin_listar_acessos(p_obra uuid)
returns table (usuario_id uuid, nome text, email text, perfil public.perfil, empresa text)
language plpgsql stable
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_administrador();
  return query
    select u.id, u.nome, u.email, uo.perfil, e.nome
      from public.usuario_obra uo
      join public.usuario u on u.id = uo.usuario_id
      left join public.empresa e on e.id = uo.empresa_id
     where uo.obra_id = p_obra
     order by (uo.perfil = 'engenheiro') desc, lower(coalesce(nullif(u.nome, ''), u.email));
end;
$$;

/** Liga um login como engenheiro da obra (quem já é da obra passa a engenheiro). */
create function public.admin_ligar_engenheiro(p_obra uuid, p_usuario uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_administrador();
  insert into public.usuario_obra (usuario_id, obra_id, perfil)
  values (p_usuario, p_obra, 'engenheiro')
  on conflict (usuario_id, obra_id)
    do update set perfil = 'engenheiro', empresa_id = null;
end;
$$;

revoke all on function
  public.admin_listar_obras(), public.admin_criar_obra(text, text),
  public.admin_editar_obra(uuid, text, text), public.admin_situacao_obra(uuid, text),
  public.admin_listar_acessos(uuid), public.admin_ligar_engenheiro(uuid, uuid)
  from public, anon;
grant execute on function
  public.admin_listar_obras(), public.admin_criar_obra(text, text),
  public.admin_editar_obra(uuid, text, text), public.admin_situacao_obra(uuid, text),
  public.admin_listar_acessos(uuid), public.admin_ligar_engenheiro(uuid, uuid)
  to authenticated;
