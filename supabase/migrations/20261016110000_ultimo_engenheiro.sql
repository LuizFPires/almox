-- Obra com engenheiro: rebaixar ou tirar o último engenheiro deixaria a obra sem quem cadastra
-- e dá acesso. O engenheiro já não mexe no próprio vínculo; isto fecha o caminho de um
-- engenheiro tirar o outro. Apagar o login inteiro (cascata do Auth) não passa por aqui.

create function privado.manter_engenheiro() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() = 1 and old.perfil = 'engenheiro'
     and (tg_op = 'DELETE' or new.perfil <> 'engenheiro')
     and not exists (
       select 1 from public.usuario_obra
        where obra_id = old.obra_id and perfil = 'engenheiro' and usuario_id <> old.usuario_id)
  then
    raise exception 'ultimo_engenheiro' using
      errcode = 'P0001', hint = 'A obra precisa de pelo menos um engenheiro.';
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;
revoke all on function privado.manter_engenheiro() from public, anon, authenticated;

create trigger usuario_obra_manter_engenheiro
  before update of perfil or delete on public.usuario_obra
  for each row execute function privado.manter_engenheiro();
