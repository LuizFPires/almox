-- Criar conta pela tela pública (02/11/2026).
--
-- A pessoa cria o login sozinha (nome + e-mail) e prova o e-mail com o código de 8 dígitos, no
-- mesmo passo do "Esqueci a senha". A conta nasce SEM obra: o engenheiro a encontra em
-- Cadastros › Acessos ("Contas aguardando obra") e dá o acesso com o perfil que quiser.
-- - listar_contas_sem_obra: só o engenheiro vê, e só as contas com e-mail confirmado que não
--   são de obra nenhuma (login de outra obra não aparece: continua pelo e-mail exato).
-- - Conta que nunca confirmou o e-mail em 24 h é apagada (limpeza diária).

create function public.listar_contas_sem_obra(p_obra uuid)
returns table (
  usuario_id uuid,
  nome text,
  email text,
  criado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro da obra vê as contas.' using errcode = '42501';
  end if;
  return query
    select u.id, u.nome, u.email, u.criado_em
      from public.usuario u
      join auth.users au on au.id = u.id
     where au.email_confirmed_at is not null
       and not exists (select 1 from public.usuario_obra uo where uo.usuario_id = u.id)
       and not exists (select 1 from public.administrador a where a.usuario_id = u.id)
     order by u.criado_em desc, u.email;
end;
$$;
revoke all on function public.listar_contas_sem_obra(uuid) from public, anon;
grant execute on function public.listar_contas_sem_obra(uuid) to authenticated;

/**
 * Apaga logins criados pela tela pública que nunca confirmaram o e-mail (código não digitado)
 * em 24 h. Nunca toca em quem tem obra, é administrador ou já lançou movimento (RN-18).
 * Devolve quantos apagou, para o log do cron.
 */
create function privado.limpar_contas_nao_confirmadas() returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apagadas integer;
begin
  with apagadas as (
    delete from auth.users au
     where au.email_confirmed_at is null
       and au.created_at < now() - interval '1 day'
       and not exists (select 1 from public.usuario_obra uo where uo.usuario_id = au.id)
       and not exists (select 1 from public.administrador a where a.usuario_id = au.id)
       and not exists (select 1 from public.movimento m where m.usuario_id = au.id)
    returning au.id
  )
  select count(*) into v_apagadas from apagadas;
  return v_apagadas;
end;
$$;
revoke all on function privado.limpar_contas_nao_confirmadas() from public, anon, authenticated;

select cron.schedule('almox-limpar-contas', '15 4 * * *',
  $$select privado.limpar_contas_nao_confirmadas();$$);
