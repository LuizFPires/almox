-- Segurança · onda 1 (auditoria de 13/10/2026, docs/seguranca/auditoria-2026-10-13.md).

-- DB-01 · Obra: o engenheiro só muda nome e endereço. `ativa` e `encerrada_em` são do
-- administrador (desligam o encerramento das 23:59 e disparam a anonimização da LGPD).
-- Toda mudança na obra entra no histórico de alterações.
revoke update on public.obra from authenticated;
grant update (nome, endereco) on public.obra to authenticated;

create function privado.registrar_alteracoes_obra() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes jsonb := to_jsonb(old);
  depois jsonb := to_jsonb(new);
  coluna text;
  v_usuario public.usuario;
begin
  -- Como privado.registrar_alteracoes: guarda o nome (legível se a pessoa sair da obra).
  select * into v_usuario from public.usuario where id = (select auth.uid());
  foreach coluna in array array['nome', 'endereco', 'ativa', 'encerrada_em'] loop
    if (antes ->> coluna) is distinct from (depois ->> coluna) then
      insert into public.alteracao
        (obra_id, tabela, registro_id, campo, de, para, usuario_id, usuario_nome)
      values (
        new.id, 'obra', new.id, coluna, antes ->> coluna, depois ->> coluna,
        v_usuario.id, nullif(v_usuario.nome, '')
      );
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function privado.registrar_alteracoes_obra() from public, anon, authenticated;
create trigger obra_log
  after update on public.obra
  for each row execute function privado.registrar_alteracoes_obra();

-- DB-03 · Nome do login: o próprio usuário não edita (o histórico mostra quem lançou; o
-- almoxarife não pode se renomear como a engenheira). O nome vem do convite.
drop policy usuario_editar_proprio on public.usuario;
revoke update on public.usuario from authenticated;

-- DB-04 · Consulta restrita de empreiteira: vê o nome de quem lança na obra (engenheiro e
-- almoxarife, que aparecem no histórico) e dos logins da própria empresa; não vê os logins
-- de consulta das outras empreiteiras.
create or replace function privado.compartilha_obra(p_usuario uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select not privado.senha_pendente() and exists (
    select 1
      from public.usuario_obra outro
      join public.usuario_obra eu on eu.obra_id = outro.obra_id
     where outro.usuario_id = p_usuario and eu.usuario_id = (select auth.uid())
       and (
         eu.empresa_id is null
         or outro.perfil in ('engenheiro', 'almoxarife')
         or outro.empresa_id = eu.empresa_id
       )
  )
$$;

-- DB-05 · Inscrições de notificação: tamanhos de verdade e no máximo 10 aparelhos por login
-- (a mais antiga sai). Evita inchar a tabela e multiplicar cada envio.
alter table public.inscricao_push
  add constraint inscricao_push_tamanhos check (
    length(endpoint) <= 1000 and length(p256dh) <= 200 and length(auth) <= 100
  ) not valid;

create function privado.limitar_inscricoes_push() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.inscricao_push
   where endpoint in (
     select endpoint from public.inscricao_push
      where usuario_id = new.usuario_id and endpoint <> new.endpoint
      order by criado_em desc
     offset 9
   );
  return new;
end;
$$;
revoke all on function privado.limitar_inscricoes_push() from public, anon, authenticated;
create trigger inscricao_push_limite
  before insert on public.inscricao_push
  for each row execute function privado.limitar_inscricoes_push();

-- DB-09 · Limites de tamanho nos textos que o cliente grava (sem travar dados antigos).
alter table public.obra
  add constraint obra_nome_tamanho check (length(nome) <= 120) not valid,
  add constraint obra_endereco_tamanho check (length(endereco) <= 300) not valid;
alter table public.empresa
  add constraint empresa_nome_tamanho check (length(nome) <= 120) not valid,
  add constraint empresa_dono_nome_tamanho check (length(dono_nome) <= 120) not valid;
alter table public.pessoa
  add constraint pessoa_nome_tamanho check (length(nome) <= 120) not valid,
  add constraint pessoa_nome_capacete_tamanho check (length(nome_capacete) <= 30) not valid,
  add constraint pessoa_funcao_tamanho check (length(funcao) <= 80) not valid;
alter table public.tipo_ferramenta
  add constraint tipo_ferramenta_nome_tamanho check (length(nome) <= 80) not valid;
alter table public.usuario
  add constraint usuario_nome_tamanho check (length(nome) <= 120) not valid;
alter table public.impressora
  add constraint impressora_nome_tamanho check (length(nome) <= 80) not valid;
alter table public.dispositivo_tv
  add constraint dispositivo_tv_nome_tamanho check (length(nome) <= 80) not valid;
