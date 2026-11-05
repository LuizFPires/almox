-- Quem cria a obra participa imediatamente; convidados continuam sujeitos ao aceite.
create or replace function public.admin_criar_obra(p_nome text, p_endereco text default null)
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
  insert into public.usuario_obra (usuario_id, obra_id, perfil)
  values (auth.uid(), v_id, 'engenheiro');
  return v_id;
end;
$$;
