-- M1 · Permissões no banco (RLS). Regras do PRD §5 e do CLAUDE.md:
-- - tudo é filtrado pela obra do usuário (usuario_obra);
-- - cadastros e valores só pelo engenheiro;
-- - consulta de empreiteira (usuario_obra.empresa_id preenchido) só vê a própria empresa;
-- - escritas de negócio (movimento, posse, avaria, ocorrência, fechamento, aviso) só por RPC.

create schema if not exists privado;
grant usage on schema privado to authenticated;

-- Funções auxiliares (security definer: leem usuario_obra sem cair na própria RLS) ----

create function privado.perfil_na_obra(p_obra uuid) returns public.perfil
language sql stable security definer
set search_path = ''
as $$
  select perfil from public.usuario_obra
   where usuario_id = (select auth.uid()) and obra_id = p_obra
$$;

create function privado.tem_acesso(p_obra uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuario_obra
     where usuario_id = (select auth.uid()) and obra_id = p_obra
  )
$$;

create function privado.eh_engenheiro(p_obra uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(privado.perfil_na_obra(p_obra) = 'engenheiro', false)
$$;

create function privado.pode_lancar(p_obra uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(privado.perfil_na_obra(p_obra) in ('engenheiro', 'almoxarife'), false)
$$;

-- Empresa a que a consulta de empreiteira está restrita; null = vê a obra inteira.
create function privado.empresa_restrita(p_obra uuid) returns uuid
language sql stable security definer
set search_path = ''
as $$
  select empresa_id from public.usuario_obra
   where usuario_id = (select auth.uid()) and obra_id = p_obra
$$;

-- A pessoa é visível para o usuário (obra + restrição de empresa)?
create function privado.ve_pessoa(p_obra uuid, p_pessoa uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select privado.tem_acesso(p_obra)
     and (
       privado.empresa_restrita(p_obra) is null
       or exists (
         select 1 from public.pessoa
          where id = p_pessoa and empresa_id = privado.empresa_restrita(p_obra)
       )
     )
$$;

revoke all on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated;

-- Ninguém anônimo lê ou grava tabelas do app (a TV entra por RPC com token no M8).
revoke all on all tables in schema public from anon;

-- RLS em todas as tabelas ----------------------------------------------------------

alter table public.obra enable row level security;
alter table public.empresa enable row level security;
alter table public.pessoa enable row level security;
alter table public.usuario enable row level security;
alter table public.usuario_obra enable row level security;
alter table public.tipo_ferramenta enable row level security;
alter table public.unidade enable row level security;
alter table public.movimento enable row level security;
alter table public.movimento_item enable row level security;
alter table public.posse enable row level security;
alter table public.avaria enable row level security;
alter table public.ocorrencia enable row level security;
alter table public.fechamento_dia enable row level security;
alter table public.aviso enable row level security;
alter table public.impressora enable row level security;
alter table public.trabalho_impressao enable row level security;
alter table public.dispositivo_tv enable row level security;

-- obra: quem tem acesso lê; engenheiro edita. Obra nova só pelo administrador.
create policy obra_ler on public.obra for select to authenticated
  using (privado.tem_acesso(id));
create policy obra_editar on public.obra for update to authenticated
  using (privado.eh_engenheiro(id)) with check (privado.eh_engenheiro(id));

-- empresa
create policy empresa_ler on public.empresa for select to authenticated
  using (
    privado.tem_acesso(obra_id)
    and (privado.empresa_restrita(obra_id) is null or id = privado.empresa_restrita(obra_id))
  );
create policy empresa_criar on public.empresa for insert to authenticated
  with check (privado.eh_engenheiro(obra_id));
create policy empresa_editar on public.empresa for update to authenticated
  using (privado.eh_engenheiro(obra_id)) with check (privado.eh_engenheiro(obra_id));

-- pessoa (o qr_token não é legível pelo cliente: busca por token só via RPC)
create policy pessoa_ler on public.pessoa for select to authenticated
  using (
    privado.tem_acesso(obra_id)
    and (privado.empresa_restrita(obra_id) is null or empresa_id = privado.empresa_restrita(obra_id))
  );
create policy pessoa_criar on public.pessoa for insert to authenticated
  with check (privado.eh_engenheiro(obra_id));
create policy pessoa_editar on public.pessoa for update to authenticated
  using (privado.eh_engenheiro(obra_id)) with check (privado.eh_engenheiro(obra_id));

revoke select, insert, update on public.pessoa from authenticated;
grant select (id, obra_id, empresa_id, nome, nome_capacete, funcao, matricula, ativa, criado_em)
  on public.pessoa to authenticated;
grant insert (obra_id, empresa_id, nome, nome_capacete, funcao) on public.pessoa to authenticated;
grant update (empresa_id, nome, nome_capacete, funcao, ativa) on public.pessoa to authenticated;

-- usuario: cada um lê o próprio; engenheiro lê os usuários das suas obras.
create policy usuario_ler on public.usuario for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.usuario_obra uo
       where uo.usuario_id = usuario.id and privado.eh_engenheiro(uo.obra_id)
    )
  );
create policy usuario_editar_proprio on public.usuario for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.usuario from authenticated;
grant update (nome) on public.usuario to authenticated;

-- usuario_obra: cada um lê os próprios vínculos; engenheiro gerencia os da obra.
create policy usuario_obra_ler on public.usuario_obra for select to authenticated
  using (usuario_id = (select auth.uid()) or privado.eh_engenheiro(obra_id));
create policy usuario_obra_criar on public.usuario_obra for insert to authenticated
  with check (privado.eh_engenheiro(obra_id));
create policy usuario_obra_editar on public.usuario_obra for update to authenticated
  using (privado.eh_engenheiro(obra_id)) with check (privado.eh_engenheiro(obra_id));
create policy usuario_obra_remover on public.usuario_obra for delete to authenticated
  using (privado.eh_engenheiro(obra_id) and usuario_id <> (select auth.uid()));

-- ferramentas: todos da obra leem (estoque é da obra); só engenheiro cadastra.
create policy tipo_ferramenta_ler on public.tipo_ferramenta for select to authenticated
  using (privado.tem_acesso(obra_id));
create policy tipo_ferramenta_criar on public.tipo_ferramenta for insert to authenticated
  with check (privado.eh_engenheiro(obra_id));
create policy tipo_ferramenta_editar on public.tipo_ferramenta for update to authenticated
  using (privado.eh_engenheiro(obra_id)) with check (privado.eh_engenheiro(obra_id));

create policy unidade_ler on public.unidade for select to authenticated
  using (privado.tem_acesso(obra_id));
create policy unidade_criar on public.unidade for insert to authenticated
  with check (privado.eh_engenheiro(obra_id));
-- O status da unidade muda pelas RPCs de retirada/devolução, não pelo cliente.
revoke update, delete on public.unidade from authenticated;

-- movimentos, posse, avaria, ocorrência: só leitura pelo cliente.
create policy movimento_ler on public.movimento for select to authenticated
  using (privado.ve_pessoa(obra_id, pessoa_id));
create policy movimento_item_ler on public.movimento_item for select to authenticated
  using (
    exists (
      select 1 from public.movimento m
       where m.id = movimento_item.movimento_id and privado.ve_pessoa(m.obra_id, m.pessoa_id)
    )
  );
create policy posse_ler on public.posse for select to authenticated
  using (privado.ve_pessoa(obra_id, pessoa_id));
create policy avaria_ler on public.avaria for select to authenticated
  using (
    exists (
      select 1 from public.movimento m
       where m.id = avaria.movimento_id and privado.ve_pessoa(m.obra_id, m.pessoa_id)
    )
  );
create policy ocorrencia_ler on public.ocorrencia for select to authenticated
  using (privado.ve_pessoa(obra_id, pessoa_id));

revoke insert, update, delete on public.movimento, public.movimento_item, public.posse,
  public.avaria, public.ocorrencia from authenticated;

-- fechamento e avisos: fechamento é da obra; aviso só para quem lança ou a própria empreiteira.
create policy fechamento_ler on public.fechamento_dia for select to authenticated
  using (privado.tem_acesso(obra_id));
create policy aviso_ler on public.aviso for select to authenticated
  using (
    privado.pode_lancar(obra_id)
    or (privado.empresa_restrita(obra_id) is not null and empresa_id = privado.empresa_restrita(obra_id))
  );
revoke insert, update, delete on public.fechamento_dia, public.aviso from authenticated;

-- impressão e TV: só o engenheiro.
create policy impressora_ler on public.impressora for select to authenticated
  using (privado.pode_lancar(obra_id));
create policy impressora_criar on public.impressora for insert to authenticated
  with check (privado.eh_engenheiro(obra_id));
create policy impressora_editar on public.impressora for update to authenticated
  using (privado.eh_engenheiro(obra_id)) with check (privado.eh_engenheiro(obra_id));

create policy trabalho_impressao_ler on public.trabalho_impressao for select to authenticated
  using (privado.eh_engenheiro(obra_id));
create policy trabalho_impressao_criar on public.trabalho_impressao for insert to authenticated
  with check (privado.eh_engenheiro(obra_id));

create policy dispositivo_tv_ler on public.dispositivo_tv for select to authenticated
  using (privado.eh_engenheiro(obra_id));
revoke select on public.dispositivo_tv from authenticated;
grant select (id, obra_id, nome, ultimo_ping, criado_em) on public.dispositivo_tv to authenticated;
revoke insert, update, delete on public.dispositivo_tv from authenticated;

-- Sem DELETE em nada pelo cliente (inativar em vez de apagar), exceto vínculo de usuário.
revoke delete on public.obra, public.empresa, public.pessoa, public.usuario,
  public.tipo_ferramenta, public.impressora, public.trabalho_impressao from authenticated;
revoke truncate, references, trigger on all tables in schema public from authenticated;
