-- Convites não concedem acesso até o aceite do titular do e-mail confirmado.
create table public.convite_obra (
 id uuid primary key default gen_random_uuid(),
 obra_id uuid not null references public.obra(id),
 email text not null check (email = lower(trim(email))),
 perfil public.perfil not null,
 empresa_id uuid,
 criado_por uuid not null references public.usuario(id),
 criado_em timestamptz not null default now(),
 respondido_em timestamptz,
 foreign key (empresa_id, obra_id) references public.empresa(id, obra_id),
 check (empresa_id is null or perfil = 'consulta')
);
create unique index convite_pendente on public.convite_obra(obra_id,email) where respondido_em is null;
alter table public.convite_obra enable row level security;

create function public.convidar_obra(p_obra uuid, p_email text, p_perfil public.perfil, p_empresa uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not (privado.eh_administrador() or privado.eh_engenheiro(p_obra)) then raise exception 'Sem permissão'; end if;
 if not exists(select 1 from public.obra where id=p_obra and ativa) then raise exception 'Obra inativa'; end if;
 if trim(p_email) = '' then raise exception 'E-mail obrigatório'; end if;
 if exists(select 1 from public.usuario_obra u join public.usuario a on a.id=u.usuario_id where u.obra_id=p_obra and lower(a.email)=lower(trim(p_email))) then raise exception 'Usuário já participa'; end if;
 insert into public.convite_obra(obra_id,email,perfil,empresa_id,criado_por) values(p_obra,lower(trim(p_email)),p_perfil,p_empresa,auth.uid());
end $$;
create function public.meus_convites() returns table(id uuid, obra text, perfil public.perfil)
language sql stable security definer set search_path = '' as $$
 select c.id,o.nome,c.perfil from public.convite_obra c join public.obra o on o.id=c.obra_id
 join auth.users u on u.id=auth.uid() and lower(u.email)=c.email and u.email_confirmed_at is not null
 where c.respondido_em is null and o.ativa order by c.criado_em desc
$$;
create function public.responder_convite(p_convite uuid, p_aceitar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.convite_obra;
begin
 select i.* into c from public.convite_obra i join auth.users u on u.id=auth.uid() and lower(u.email)=i.email and u.email_confirmed_at is not null
 where i.id=p_convite and i.respondido_em is null for update of i;
 if not found then raise exception 'Convite indisponível'; end if;
 if p_aceitar then
 if not exists(select 1 from public.obra where id=c.obra_id and ativa) then raise exception 'Obra inativa'; end if;
 insert into public.usuario_obra(usuario_id,obra_id,perfil,empresa_id) values(auth.uid(),c.obra_id,c.perfil,c.empresa_id) on conflict do nothing;
 end if;
 update public.convite_obra set respondido_em=now() where id=c.id;
end $$;
revoke all on function public.convidar_obra(uuid,text,public.perfil,uuid), public.meus_convites(), public.responder_convite(uuid,boolean) from public, anon;
grant execute on function public.convidar_obra(uuid,text,public.perfil,uuid), public.meus_convites(), public.responder_convite(uuid,boolean) to authenticated;

-- O v�nculo novo s� pode ser criado pelo aceite.
drop policy usuario_obra_criar on public.usuario_obra;
revoke execute on function public.admin_ligar_engenheiro(uuid,uuid) from authenticated;
