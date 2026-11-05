-- M13 · Controle de materiais: tabelas, RLS e extrato.
-- Material de consumo (cimento, areia, vergalhão…) tem saldo por obra, sem dono nem posse.
-- Escrita só por RPC (próximas tarefas): o cliente só lê. Movimentos, versões e contagens são
-- imutáveis; uma edição de lançamento vira uma nova linha em movimento_material_versao.

-- Chave de busca: minúsculas e sem acento (a extensão unaccent não está habilitada).
create function privado.normalizar(p_texto text) returns text
language sql immutable
set search_path = ''
as $$
  select lower(translate(btrim(p_texto),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
$$;
revoke all on function privado.normalizar(text) from public, anon;
grant execute on function privado.normalizar(text) to authenticated;

-- Material -------------------------------------------------------------------------------------
create table public.material (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  nome text not null check (btrim(nome) <> ''),
  unidade text not null
    check (unidade in ('sc', 'un', 'barra', 'rolo', 'lata', 'm³', 'kg', 'm', 'm²', 'l')),
  saldo numeric(12,2) not null default 0 check (saldo >= 0),
  estoque_cheio numeric(12,2) not null default 0 check (estoque_cheio >= 0),
  aviso_tipo text check (aviso_tipo in ('quantidade', 'percentual')),
  aviso_valor numeric(12,2) check (aviso_valor > 0),
  aviso_disparado boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (id, obra_id),
  constraint material_aviso_completo check ((aviso_tipo is null) = (aviso_valor is null)),
  constraint material_aviso_percentual check (aviso_tipo is distinct from 'percentual' or aviso_valor between 1 and 100)
);
create unique index material_nome_unico on public.material (obra_id, privado.normalizar(nome));

-- Contagem (ajustar o saldo ou só conferir) ----------------------------------------------------
create table public.contagem_material (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  modo text not null check (modo in ('ajustar', 'conferir')),
  usuario_id uuid not null references public.usuario (id),
  criado_em timestamptz not null default now(),
  chave_cliente uuid,
  unique (id, obra_id)
);
create unique index contagem_material_chave on public.contagem_material (obra_id, chave_cliente);

-- Movimento (quantidade com sinal: entrada +, saída −, ajuste ±; conferência não mexe no saldo) --
create table public.movimento_material (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  material_id uuid not null,
  tipo text not null check (tipo in ('entrada', 'saida', 'ajuste', 'conferencia')),
  quantidade numeric(12,2) not null,
  contagem_id uuid,
  usuario_id uuid not null references public.usuario (id),
  criado_em timestamptz not null default now(),
  registrado_no_aparelho_em timestamptz,
  chave_cliente uuid,
  foreign key (material_id, obra_id) references public.material (id, obra_id),
  foreign key (contagem_id, obra_id) references public.contagem_material (id, obra_id),
  constraint movimento_material_sinal check (
    (tipo = 'entrada' and quantidade > 0)
    or (tipo = 'saida' and quantidade < 0)
    or (tipo = 'ajuste' and quantidade <> 0)
    or tipo = 'conferencia')
);
create unique index movimento_material_chave on public.movimento_material (obra_id, chave_cliente)
  where chave_cliente is not null;
create index movimento_material_por_material on public.movimento_material (material_id, criado_em desc);
create index movimento_material_por_obra on public.movimento_material (obra_id, criado_em desc);
create index movimento_material_por_contagem on public.movimento_material (contagem_id)
  where contagem_id is not null;

-- Versões de um lançamento (edição, apagar = quantidade 0, desfazer) ----------------------------
-- criado_em usa clock_timestamp() para ordenar duas versões gravadas na mesma transação.
create table public.movimento_material_versao (
  id uuid primary key default gen_random_uuid(),
  movimento_id uuid not null references public.movimento_material (id),
  quantidade numeric(12,2) not null,
  motivo text,
  desfeito boolean not null default false,
  usuario_id uuid not null references public.usuario (id),
  criado_em timestamptz not null default clock_timestamp()
);
create index movimento_material_versao_por_movimento
  on public.movimento_material_versao (movimento_id, criado_em desc);

-- Pedido de cadastro (almoxarife pede, engenheiro cadastra ou dispensa) ------------------------
create table public.pedido_cadastro_material (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  nome text not null check (btrim(nome) <> ''),
  pedido_por uuid not null references public.usuario (id),
  status text not null default 'aberto' check (status in ('aberto', 'cadastrado', 'dispensado')),
  material_id uuid,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  foreign key (material_id, obra_id) references public.material (id, obra_id)
);
create index pedido_cadastro_material_aberto on public.pedido_cadastro_material (obra_id)
  where status = 'aberto';

-- Imutabilidade (como movimento/movimento_item) ------------------------------------------------
create trigger movimento_material_imutavel
  before update or delete on public.movimento_material
  for each row execute function privado.bloquear_alteracao();
create trigger movimento_material_imutavel_truncate
  before truncate on public.movimento_material
  for each statement execute function privado.bloquear_alteracao();
create trigger movimento_material_versao_imutavel
  before update or delete on public.movimento_material_versao
  for each row execute function privado.bloquear_alteracao();
create trigger movimento_material_versao_imutavel_truncate
  before truncate on public.movimento_material_versao
  for each statement execute function privado.bloquear_alteracao();
create trigger contagem_material_imutavel
  before update or delete on public.contagem_material
  for each row execute function privado.bloquear_alteracao();
create trigger contagem_material_imutavel_truncate
  before truncate on public.contagem_material
  for each statement execute function privado.bloquear_alteracao();

-- Log de alterações e versão do painel da TV ---------------------------------------------------
create trigger material_log after insert or update on public.material
  for each row execute function privado.registrar_alteracoes('id', 'nome', 'unidade', 'aviso_tipo', 'aviso_valor', 'ativo');
create trigger painel_material after insert or update or delete on public.material
  for each row execute function privado.mudou_painel('obra_id');

-- RLS: quem tem acesso à obra lê; ninguém escreve direto ---------------------------------------
alter table public.material enable row level security;
alter table public.contagem_material enable row level security;
alter table public.movimento_material enable row level security;
alter table public.movimento_material_versao enable row level security;
alter table public.pedido_cadastro_material enable row level security;

create policy material_ler on public.material for select to authenticated
  using (privado.tem_acesso(obra_id));
create policy contagem_material_ler on public.contagem_material for select to authenticated
  using (privado.tem_acesso(obra_id));
create policy movimento_material_ler on public.movimento_material for select to authenticated
  using (privado.tem_acesso(obra_id));
create policy movimento_material_versao_ler on public.movimento_material_versao for select to authenticated
  using (exists (
    select 1 from public.movimento_material m
     where m.id = movimento_id and privado.tem_acesso(m.obra_id)));
create policy pedido_cadastro_material_ler on public.pedido_cadastro_material for select to authenticated
  using (privado.tem_acesso(obra_id));

revoke all on public.material, public.contagem_material, public.movimento_material,
  public.movimento_material_versao, public.pedido_cadastro_material
  from public, anon, authenticated;
grant select on public.material, public.contagem_material, public.movimento_material,
  public.movimento_material_versao, public.pedido_cadastro_material
  to authenticated;

-- Extrato: cada lançamento com a quantidade vigente (última versão ou a original) --------------
create view public.extrato_material
with (security_invoker = true)
as
select
  m.id,
  m.obra_id,
  m.material_id,
  m.tipo,
  m.quantidade as quantidade_original,
  coalesce(v.quantidade, m.quantidade) as quantidade,
  (coalesce(v.quantidade, m.quantidade) = 0 and m.tipo <> 'conferencia') as apagado,
  coalesce(v.desfeito, false) as desfeito,
  ue.nome as editado_por_nome,
  v.criado_em as editado_em,
  u.nome as usuario_nome,
  m.criado_em,
  m.registrado_no_aparelho_em
from public.movimento_material m
left join lateral (
  select mv.quantidade, mv.desfeito, mv.usuario_id, mv.criado_em
    from public.movimento_material_versao mv
   where mv.movimento_id = m.id
   order by mv.criado_em desc, mv.id desc
   limit 1
) v on true
left join public.usuario u on u.id = m.usuario_id
left join public.usuario ue on ue.id = v.usuario_id;

revoke all on public.extrato_material from public, anon, authenticated;
grant select on public.extrato_material to authenticated;

-- Realtime: saldo e extrato atualizam na tela ---------------------------------------------------
alter publication supabase_realtime add table public.material, public.movimento_material;
