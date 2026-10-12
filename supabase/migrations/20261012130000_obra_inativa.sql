-- M10 · Obra inativa (encerrada ou desativada pelo administrador) fica fora do encerramento
-- automático das 23:59: não gera fechamento nem aviso.

create or replace function privado.encerrar_automatico() returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data date := ((now() at time zone 'America/Sao_Paulo') - interval '30 minutes')::date;
  v_obra uuid;
  v_n integer := 0;
begin
  for v_obra in select o.id from public.obra o where o.ativa and o.encerrada_em is null loop
    begin
      if exists (select 1 from public.fechamento_dia f where f.obra_id = v_obra and f.data = v_data) then
        perform privado.complementar_dia(v_obra, v_data);
      else
        perform privado.encerrar_dia(v_obra, null, true, v_data);
        v_n := v_n + 1;
      end if;
    exception when others then
      raise warning 'encerramento automático falhou na obra %: %', v_obra, sqlerrm;
    end;
  end loop;
  return v_n;
end;
$$;
