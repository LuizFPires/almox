-- M1 · Correções da revisão (etapa 3). Migrations anteriores já aplicadas no almox-dev:
-- tudo o que muda vem aqui.

-- 1. Privilégios padrão: objetos futuros não nascem abertos para anon/authenticated.
--    Cada migration nova concede explicitamente o que precisar (ver CLAUDE.md).
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema privado
  revoke execute on functions from anon, authenticated;

-- 2. Unidade nova sempre nasce livre; o status só muda pelas RPCs.
revoke insert on public.unidade from authenticated;
grant insert (obra_id, tipo_id, codigo) on public.unidade to authenticated;

-- 3. Posse e avaria apontam para o item do movimento da mesma unidade.
alter table public.posse
  add constraint posse_item_retirada_fk
  foreign key (movimento_retirada_id, unidade_id)
  references public.movimento_item (movimento_id, unidade_id);
alter table public.avaria
  add constraint avaria_item_fk
  foreign key (movimento_id, unidade_id)
  references public.movimento_item (movimento_id, unidade_id);

-- 4. Posse existe se, e somente se, a unidade está em uso (conferido no fim da transação).
create function privado.conferir_posse_status() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_unidade uuid;
  v_status public.status_unidade;
  v_tem_posse boolean;
begin
  if tg_table_name = 'posse' then
    v_unidade := case when tg_op = 'DELETE' then old.unidade_id else new.unidade_id end;
  else
    v_unidade := new.id;
  end if;
  select status into v_status from public.unidade where id = v_unidade;
  if not found then
    return null;
  end if;
  v_tem_posse := exists (select 1 from public.posse where unidade_id = v_unidade);
  if v_tem_posse <> (v_status = 'em_uso') then
    raise exception 'Unidade % está "%" mas % posse aberta.', v_unidade, v_status,
      case when v_tem_posse then 'tem' else 'não tem' end
      using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger posse_confere_status
  after insert or update or delete on public.posse
  deferrable initially deferred
  for each row execute function privado.conferir_posse_status();
create constraint trigger unidade_confere_posse
  after insert or update of status on public.unidade
  deferrable initially deferred
  for each row execute function privado.conferir_posse_status();

-- 5. Encarregado é pessoa da própria empresa.
alter table public.pessoa add constraint pessoa_id_empresa_unico unique (id, empresa_id);
alter table public.empresa
  add constraint empresa_encarregado_mesma_empresa_fk
  foreign key (encarregado_pessoa_id, id) references public.pessoa (id, empresa_id);

-- 6. Estorno só de movimento da mesma obra.
alter table public.movimento drop constraint movimento_estorno_de_fkey;
alter table public.movimento
  add constraint movimento_estorno_mesma_obra_fk
  foreign key (estorno_de, obra_id) references public.movimento (id, obra_id);

-- 7. Consulta restrita só a empreiteira (dono/encarregado), nunca à construtora própria.
create function privado.conferir_empresa_consulta() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.empresa_id is not null and not exists (
    select 1 from public.empresa where id = new.empresa_id and tipo = 'empreiteira'
  ) then
    raise exception 'Consulta restrita só pode ser de empreiteira.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger usuario_obra_empresa_empreiteira
  before insert or update of empresa_id on public.usuario_obra
  for each row execute function privado.conferir_empresa_consulta();

-- 8. Engenheiro não altera o próprio vínculo (não deixa a obra sem engenheiro por engano).
drop policy usuario_obra_editar on public.usuario_obra;
create policy usuario_obra_editar on public.usuario_obra for update to authenticated
  using (privado.eh_engenheiro(obra_id) and usuario_id <> (select auth.uid()))
  with check (privado.eh_engenheiro(obra_id) and usuario_id <> (select auth.uid()));

-- 9. Nome de quem lançou é visível para quem é da mesma obra (RN-18); e-mail não.
-- security definer: a subconsulta não pode cair na RLS de usuario_obra (cada um só vê os seus vínculos).
create function privado.compartilha_obra(p_usuario uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.usuario_obra outro
      join public.usuario_obra eu on eu.obra_id = outro.obra_id
     where outro.usuario_id = p_usuario and eu.usuario_id = (select auth.uid())
  )
$$;

drop policy usuario_ler on public.usuario;
create policy usuario_ler on public.usuario for select to authenticated
  using (id = (select auth.uid()) or privado.compartilha_obra(id));
revoke select on public.usuario from authenticated;
grant select (id, nome, criado_em) on public.usuario to authenticated;

-- E-mail de public.usuario acompanha o Auth.
create function public.sincronizar_email_usuario() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.usuario set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;
revoke all on function public.sincronizar_email_usuario() from public, anon, authenticated;

create trigger auth_usuario_email
  after update of email on auth.users
  for each row execute function public.sincronizar_email_usuario();

-- 10. Avisos: engenheiro e a própria empreiteira (PRD §5: almoxarife não recebe aviso).
drop policy aviso_ler on public.aviso;
create policy aviso_ler on public.aviso for select to authenticated
  using (
    privado.eh_engenheiro(obra_id)
    or (privado.empresa_restrita(obra_id) is not null and empresa_id = privado.empresa_restrita(obra_id))
  );

revoke execute on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated;
revoke execute on function privado.conferir_posse_status(), privado.conferir_empresa_consulta(),
  privado.bloquear_alteracao() from authenticated;
