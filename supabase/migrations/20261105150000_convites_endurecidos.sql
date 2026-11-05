-- Convites endurecidos (revisão de segurança de 05/11/2026):
-- - validade de 7 dias; convite vencido não aparece nem pode ser aceito;
-- - no aceite, quem convidou precisa continuar engenheiro da obra (ou administrador);
-- - o engenheiro vê e cancela os convites pendentes da obra;
-- - convite vencido ou cancelado não impede convidar o mesmo e-mail de novo.
-- A prova de que a pessoa é dona do e-mail continua sendo o e-mail confirmado no Auth
-- (em produção a confirmação é obrigatória; no local, config.toml › enable_confirmations).

alter table public.convite_obra
  add column expira_em timestamptz not null default (now() + interval '7 days'),
  add column cancelado_em timestamptz;

drop index public.convite_pendente;
create unique index convite_pendente on public.convite_obra (obra_id, email)
  where respondido_em is null and cancelado_em is null;

/** Convite ainda vale: não respondido, não cancelado, no prazo e com quem convidou ainda com poder. */
create function privado.convite_vale(c public.convite_obra) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select c.respondido_em is null
     and c.cancelado_em is null
     and c.expira_em > now()
     and exists (select 1 from public.obra o where o.id = c.obra_id and o.ativa)
     and (exists (select 1 from public.usuario_obra uo
                   where uo.usuario_id = c.criado_por and uo.obra_id = c.obra_id
                     and uo.perfil = 'engenheiro')
          or exists (select 1 from public.administrador a where a.usuario_id = c.criado_por))
$$;
revoke all on function privado.convite_vale(public.convite_obra) from public, anon, authenticated;

create or replace function public.convidar_obra(
  p_obra uuid, p_email text, p_perfil public.perfil, p_empresa uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if not (privado.eh_administrador() or privado.eh_engenheiro(p_obra)) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if not exists (select 1 from public.obra where id = p_obra and ativa) then
    raise exception 'Obra inativa';
  end if;
  if v_email = '' then raise exception 'E-mail obrigatório'; end if;
  if exists (select 1 from public.usuario_obra u join public.usuario a on a.id = u.usuario_id
              where u.obra_id = p_obra and lower(a.email) = v_email) then
    raise exception 'Usuário já participa';
  end if;
  -- Pendente que já não vale (vencido ou de quem perdeu o acesso) sai do caminho.
  update public.convite_obra c set cancelado_em = now()
   where c.obra_id = p_obra and c.email = v_email
     and c.respondido_em is null and c.cancelado_em is null
     and not privado.convite_vale(c);
  insert into public.convite_obra (obra_id, email, perfil, empresa_id, criado_por)
  values (p_obra, v_email, p_perfil, p_empresa, auth.uid());
end;
$$;

create or replace function public.meus_convites()
returns table (id uuid, obra text, perfil public.perfil)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, o.nome, c.perfil
    from public.convite_obra c
    join public.obra o on o.id = c.obra_id
    join auth.users u on u.id = auth.uid() and lower(u.email) = c.email
                     and u.email_confirmed_at is not null
   where privado.convite_vale(c)
   order by c.criado_em desc
$$;

create or replace function public.responder_convite(p_convite uuid, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.convite_obra;
begin
  select i.* into c
    from public.convite_obra i
    join auth.users u on u.id = auth.uid() and lower(u.email) = i.email
                     and u.email_confirmed_at is not null
   where i.id = p_convite
     for update of i;
  if not found or not privado.convite_vale(c) then
    raise exception 'Convite indisponível';
  end if;
  if p_aceitar then
    insert into public.usuario_obra (usuario_id, obra_id, perfil, empresa_id)
    values (auth.uid(), c.obra_id, c.perfil, c.empresa_id)
    on conflict do nothing;
  end if;
  update public.convite_obra set respondido_em = now() where id = c.id;
end;
$$;

/** Convites que ainda valem, para o engenheiro da obra (ou o administrador). */
create function public.convites_pendentes(p_obra uuid)
returns table (id uuid, email text, perfil public.perfil, criado_em timestamptz, expira_em timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (privado.eh_administrador() or privado.eh_engenheiro(p_obra)) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  return query
    select c.id, c.email, c.perfil, c.criado_em, c.expira_em
      from public.convite_obra c
     where c.obra_id = p_obra and privado.convite_vale(c)
     order by c.criado_em desc;
end;
$$;

create function public.cancelar_convite(p_convite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_obra uuid;
begin
  select obra_id into v_obra from public.convite_obra
   where id = p_convite and respondido_em is null and cancelado_em is null
     for update;
  if v_obra is null then raise exception 'Convite indisponível'; end if;
  if not (privado.eh_administrador() or privado.eh_engenheiro(v_obra)) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  update public.convite_obra set cancelado_em = now() where id = p_convite;
end;
$$;

revoke all on function public.convites_pendentes(uuid), public.cancelar_convite(uuid)
  from public, anon;
grant execute on function public.convites_pendentes(uuid), public.cancelar_convite(uuid)
  to authenticated;
