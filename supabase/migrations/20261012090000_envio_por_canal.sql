-- M10 · Pendência do M9: sem provedor de e-mail configurado, o processador pega só as
-- notificações; os e-mails ficam aguardando (sem gastar as 5 tentativas) até o Resend entrar.

drop function public.pegar_envios(integer);

/**
 * O processador pega até `p_limite` envios dos canais pedidos (todos, se nulo): pendentes, ou
 * com erro e menos de 5 tentativas na hora da nova tentativa, e que ninguém pegou nos últimos
 * 5 minutos (dois processadores não mandam o mesmo).
 */
create function public.pegar_envios(
  p_limite integer default 50, p_canais public.canal_envio[] default null
) returns setof public.envio
language sql
security definer
set search_path = ''
as $$
  update public.envio e
     set pego_em = now(), tentativas = e.tentativas + 1
   where e.id in (
     select id from public.envio
      where status in ('pendente', 'erro') and tentativas < 5 and proxima_tentativa_em <= now()
        and (pego_em is null or pego_em < now() - interval '5 minutes')
        and (p_canais is null or canal = any (p_canais))
      order by criado_em
      limit least(greatest(p_limite, 1), 200)
      for update skip locked)
  returning e.*;
$$;

revoke all on function public.pegar_envios(integer, public.canal_envio[]) from public, anon, authenticated;
grant execute on function public.pegar_envios(integer, public.canal_envio[]) to service_role;

-- E-mails que desistiram só por falta de provedor voltam para a fila.
update public.envio
   set status = 'pendente', tentativas = 0, erro = null, pego_em = null, proxima_tentativa_em = now()
 where canal = 'email' and status = 'erro' and erro like 'envio de e-mail não configurado%';
