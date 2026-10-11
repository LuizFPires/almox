-- M2 · Cadastros do engenheiro: log de alterações e unidades com código sequencial.

-- Log de alterações ---------------------------------------------------------------------
-- Tudo que afeta cobrança e avisos (PLAN › Decisões M2). Gravado por gatilho, nunca pelo cliente.

create table public.alteracao (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  tabela text not null,
  registro_id uuid not null,
  campo text not null,
  de text,
  para text,
  usuario_id uuid references public.usuario (id),
  criado_em timestamptz not null default now()
);

create index alteracao_registro on public.alteracao (registro_id, criado_em desc);
create index alteracao_obra on public.alteracao (obra_id, criado_em desc);

alter table public.alteracao enable row level security;
create policy alteracao_ler on public.alteracao for select to authenticated
  using (privado.eh_engenheiro(obra_id));
grant select on public.alteracao to authenticated;

-- Gatilho genérico: TG_ARGV[0] = coluna do id do registro; demais = colunas acompanhadas.
create function privado.registrar_alteracoes() returns trigger
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
  i integer;
begin
  for i in 1 .. tg_nargs - 1 loop
    coluna := tg_argv[i];
    if (antes ->> coluna) is distinct from (depois ->> coluna) then
      insert into public.alteracao (obra_id, tabela, registro_id, campo, de, para, usuario_id)
      values (
        (linha ->> 'obra_id')::uuid, tg_table_name, (linha ->> coluna_id)::uuid, coluna,
        antes ->> coluna, depois ->> coluna,
        (select id from public.usuario where id = (select auth.uid()))
      );
    end if;
  end loop;
  return null;
end;
$$;

create trigger tipo_ferramenta_log
  after insert or update on public.tipo_ferramenta
  for each row execute function privado.registrar_alteracoes('id', 'valor_reposicao', 'alto_valor', 'nome');

create trigger pessoa_log
  after insert or update on public.pessoa
  for each row execute function privado.registrar_alteracoes('id', 'empresa_id', 'ativa');

create trigger empresa_log
  after insert or update on public.empresa
  for each row execute function privado.registrar_alteracoes(
    'id', 'tipo', 'dono_nome', 'dono_email', 'encarregado_pessoa_id', 'encarregado_email', 'proxima_medicao'
  );

create trigger usuario_obra_log
  after insert or update or delete on public.usuario_obra
  for each row execute function privado.registrar_alteracoes('usuario_id', 'perfil', 'empresa_id');

-- Colunas que o cliente pode gravar ------------------------------------------------------

-- Empresa: nunca troca de obra.
revoke insert, update on public.empresa from authenticated;
grant insert (obra_id, nome, tipo, cor, dono_nome, dono_email, encarregado_pessoa_id, encarregado_email, proxima_medicao)
  on public.empresa to authenticated;
grant update (nome, tipo, cor, dono_nome, dono_email, encarregado_pessoa_id, encarregado_email, proxima_medicao)
  on public.empresa to authenticated;

-- Tipo de ferramenta: prefixo fixo depois de criado (os códigos das unidades dependem dele).
revoke insert, update on public.tipo_ferramenta from authenticated;
grant insert (obra_id, nome, icone, prefixo, valor_reposicao, alto_valor) on public.tipo_ferramenta to authenticated;
grant update (nome, icone, valor_reposicao, alto_valor) on public.tipo_ferramenta to authenticated;

-- Unidades novas só pela RPC (códigos sequenciais sem colisão).
revoke insert on public.unidade from authenticated;

-- Unidades com código sequencial -----------------------------------------------------------

create function public.adicionar_unidades(p_tipo uuid, p_quantidade integer)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo public.tipo_ferramenta;
  v_ultimo integer;
  n integer;
begin
  -- Trava o tipo: duas inclusões ao mesmo tempo não geram o mesmo código.
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
    insert into public.unidade (obra_id, tipo_id, codigo)
    values (v_tipo.obra_id, v_tipo.id, v_tipo.prefixo || '-' || lpad(n::text, 2, '0'));
    return next v_tipo.prefixo || '-' || lpad(n::text, 2, '0');
  end loop;
end;
$$;

revoke all on function public.adicionar_unidades(uuid, integer) from public, anon;
grant execute on function public.adicionar_unidades(uuid, integer) to authenticated;
revoke all on function privado.registrar_alteracoes() from public, anon, authenticated;

-- Matrícula: default '' para o insert não precisar informá-la; o gatilho gera P-0001…
alter table public.pessoa alter column matricula set default '';

create or replace function public.definir_matricula() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  proximo integer;
begin
  if coalesce(new.matricula, '') <> '' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('matricula:' || new.obra_id::text));
  select coalesce(max(substring(matricula from '^P-(\d+)$')::integer), 0) + 1
    into proximo
    from public.pessoa
   where obra_id = new.obra_id;
  new.matricula := 'P-' || lpad(proximo::text, 4, '0');
  return new;
end;
$$;
revoke all on function public.definir_matricula() from public, anon, authenticated;

-- Acessos da obra (tela do engenheiro): nome, e-mail e perfil. E-mail de usuario é
-- fechado ao cliente; esta função só responde ao engenheiro da obra.
create function public.listar_acessos(p_obra uuid)
returns table (
  usuario_id uuid,
  nome text,
  email text,
  perfil public.perfil,
  empresa_id uuid,
  empresa_nome text,
  desde timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro da obra vê os acessos.' using errcode = '42501';
  end if;
  return query
    select u.id, u.nome, u.email, uo.perfil, uo.empresa_id, e.nome, uo.criado_em
      from public.usuario_obra uo
      join public.usuario u on u.id = uo.usuario_id
      left join public.empresa e on e.id = uo.empresa_id
     where uo.obra_id = p_obra
     order by u.nome, u.email;
end;
$$;

revoke all on function public.listar_acessos(uuid) from public, anon;
grant execute on function public.listar_acessos(uuid) to authenticated;
