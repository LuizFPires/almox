-- M2 · Correções da revisão (etapa 3). A migration de cadastros já está no almox-dev.

-- 1. Código da 100ª unidade: lpad(texto, 2) corta "100" para "10". Usa o tamanho real.
create or replace function public.adicionar_unidades(p_tipo uuid, p_quantidade integer)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo public.tipo_ferramenta;
  v_ultimo integer;
  v_codigo text;
  n integer;
begin
  select * into v_tipo from public.tipo_ferramenta where id = p_tipo for update;
  if not found or not privado.eh_engenheiro(v_tipo.obra_id) then
    raise exception 'Só o engenheiro da obra adiciona unidades.' using errcode = '42501';
  end if;
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 200 then
    raise exception 'Quantidade deve ser de 1 a 200.' using errcode = '22023';
  end if;

  select coalesce(max(substring(codigo from '-(\d+)$')::integer), 0)
    into v_ultimo
    from public.unidade
   where obra_id = v_tipo.obra_id and codigo like v_tipo.prefixo || '-%';

  for n in v_ultimo + 1 .. v_ultimo + p_quantidade loop
    v_codigo := v_tipo.prefixo || '-' || lpad(n::text, greatest(2, length(n::text)), '0');
    insert into public.unidade (obra_id, tipo_id, codigo) values (v_tipo.obra_id, v_tipo.id, v_codigo);
    return next v_codigo;
  end loop;
end;
$$;
revoke all on function public.adicionar_unidades(uuid, integer) from public, anon;
grant execute on function public.adicionar_unidades(uuid, integer) to authenticated;

-- 2. Vínculo de acesso: só perfil e empresa mudam (nada de trocar a pessoa nem a data).
revoke update on public.usuario_obra from authenticated;
grant update (perfil, empresa_id) on public.usuario_obra to authenticated;

-- 3. Senha provisória pendente: o banco também não dá acesso a nada até a troca.
create function privado.senha_pendente() returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'trocar_senha')::boolean, false)
$$;

create or replace function privado.perfil_na_obra(p_obra uuid) returns public.perfil
language sql stable security definer
set search_path = ''
as $$
  select perfil from public.usuario_obra
   where usuario_id = (select auth.uid()) and obra_id = p_obra
     and not privado.senha_pendente()
$$;

create or replace function privado.tem_acesso(p_obra uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select not privado.senha_pendente() and exists (
    select 1 from public.usuario_obra
     where usuario_id = (select auth.uid()) and obra_id = p_obra
  )
$$;

create or replace function privado.compartilha_obra(p_usuario uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select not privado.senha_pendente() and exists (
    select 1
      from public.usuario_obra outro
      join public.usuario_obra eu on eu.obra_id = outro.obra_id
     where outro.usuario_id = p_usuario and eu.usuario_id = (select auth.uid())
  )
$$;

-- 5. Empresa com consulta restrita não vira "própria" (a restrição só vale para empreiteira).
create function privado.conferir_tipo_empresa() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo = 'propria' and old.tipo = 'empreiteira' and exists (
    select 1 from public.usuario_obra where empresa_id = new.id
  ) then
    raise exception 'Há acessos de consulta restritos a esta empresa: ajuste-os antes de torná-la própria.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger empresa_tipo_com_consulta
  before update of tipo on public.empresa
  for each row execute function privado.conferir_tipo_empresa();

-- 8. Log guarda o nome de quem alterou (continua legível se a pessoa sair da obra).
alter table public.alteracao add column usuario_nome text;

create or replace function privado.registrar_alteracoes() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  depois jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  linha jsonb := coalesce(depois, antes);
  coluna_id text := tg_argv[0];
  coluna text;
  v_usuario public.usuario;
  i integer;
begin
  select * into v_usuario from public.usuario where id = (select auth.uid());
  for i in 1 .. tg_nargs - 1 loop
    coluna := tg_argv[i];
    if (antes ->> coluna) is distinct from (depois ->> coluna) then
      insert into public.alteracao (obra_id, tabela, registro_id, campo, de, para, usuario_id, usuario_nome)
      values (
        (linha ->> 'obra_id')::uuid, tg_table_name, (linha ->> coluna_id)::uuid, coluna,
        antes ->> coluna, depois ->> coluna, v_usuario.id, nullif(v_usuario.nome, '')
      );
    end if;
  end loop;
  return null;
end;
$$;

revoke execute on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated;
revoke execute on function privado.conferir_posse_status(), privado.conferir_empresa_consulta(),
  privado.bloquear_alteracao(), privado.registrar_alteracoes(), privado.conferir_tipo_empresa()
  from authenticated;
