-- M9 · Agendamento (pg_cron) e processamento da fila de envios.
--
-- - 23:59 (02:59 UTC; São Paulo é UTC−3 fixo): encerra as obras ainda não encerradas no dia e
--   chama o processador de envios do app.
-- - A cada 10 min: chama o processador (novas tentativas, cancelamentos, ocorrências).
-- - 03:30 UTC: o processador também apaga fotos de avaria órfãs (pendência do M6).
-- O endereço e o segredo do processador ficam no Vault (`almox_envios_url`,
-- `almox_envios_segredo`); sem eles, nada é chamado (ambiente local e CI).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

alter table public.envio add column pego_em timestamptz;

/** Chama o processador de envios do app (assíncrono, via pg_net). */
create function privado.chamar_processador(p_tarefa text default 'envios') returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'almox_envios_url');
  v_segredo text := (select decrypted_secret from vault.decrypted_secrets where name = 'almox_envios_segredo');
begin
  if v_url is null or v_segredo is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_segredo, 'Content-Type', 'application/json'),
    body := jsonb_build_object('tarefa', p_tarefa),
    timeout_milliseconds := 60000
  );
end;
$$;

/**
 * O processador pega até `p_limite` envios para mandar: pendentes, ou com erro e menos de 5
 * tentativas, e que ninguém pegou nos últimos 5 minutos (dois processadores não mandam o mesmo).
 */
create function public.pegar_envios(p_limite integer default 50)
returns setof public.envio
language sql
security definer
set search_path = ''
as $$
  update public.envio e
     set pego_em = now(), tentativas = e.tentativas + 1
   where e.id in (
     select id from public.envio
      where status <> 'enviado' and tentativas < 5
        and (pego_em is null or pego_em < now() - interval '5 minutes')
      order by criado_em
      limit least(greatest(p_limite, 1), 200)
      for update skip locked)
  returning e.*;
$$;

create function public.concluir_envio(p_envio uuid, p_ok boolean, p_erro text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.envio
     set status = case when p_ok then 'enviado'::public.status_envio else 'erro'::public.status_envio end,
         enviado_em = case when p_ok then now() else null end,
         erro = case when p_ok then null else left(coalesce(p_erro, 'falha no envio'), 300) end,
         pego_em = null
   where id = p_envio;
$$;

/** Fotos de avaria com mais de 24 h que nenhuma avaria usa (devolução abandonada). */
create function public.fotos_orfas(p_limite integer default 100) returns setof text
language sql stable
security definer
set search_path = ''
as $$
  select o.name from storage.objects o
   where o.bucket_id = 'avarias' and o.created_at < now() - interval '24 hours'
     and not exists (select 1 from public.avaria a where a.foto_path = o.name)
   order by o.created_at
   limit least(greatest(p_limite, 1), 500);
$$;

-- Só o processador (chave secreta do servidor) usa estas.
revoke all on function public.pegar_envios(integer), public.concluir_envio(uuid, boolean, text),
  public.fotos_orfas(integer) from public, anon, authenticated;
grant execute on function public.pegar_envios(integer), public.concluir_envio(uuid, boolean, text),
  public.fotos_orfas(integer) to service_role;
revoke execute on function privado.chamar_processador(text) from public, anon, authenticated;

-- Agenda (refazer a migration não duplica: o nome do job é único).
select cron.schedule('almox-encerrar-dia', '59 2 * * *',
  $$select privado.encerrar_automatico(); select privado.chamar_processador();$$);
select cron.schedule('almox-processar-envios', '*/10 * * * *',
  $$select privado.chamar_processador();$$);
select cron.schedule('almox-limpar-fotos', '30 3 * * *',
  $$select privado.chamar_processador('limpeza');$$);
