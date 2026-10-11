-- M1 · Schema do Almox (PRD §8, com perfil por obra em usuario_obra).
-- Dinheiro em centavos (integer); datas em timestamptz. Tabelas filhas repetem
-- obra_id e usam chave estrangeira composta (id, obra_id) para nunca misturar obras.

create extension if not exists pgcrypto with schema extensions;

-- Tipos -----------------------------------------------------------------------

create type public.perfil as enum ('engenheiro', 'almoxarife', 'consulta');
create type public.tipo_empresa as enum ('propria', 'empreiteira');
create type public.status_unidade as enum ('livre', 'em_uso', 'manutencao', 'baixada');
create type public.via_movimento as enum ('qr', 'manual');
create type public.tipo_movimento as enum ('retirada', 'devolucao', 'estorno');
create type public.tipo_ocorrencia as enum ('capacete_trocado');
create type public.motivo_avaria as enum ('quebrada', 'cabo_rompido', 'nao_liga', 'desgaste', 'peca_faltando');
create type public.status_aviso as enum ('enviado', 'cancelado', 'confirmado');
create type public.linguagem_impressora as enum ('ZPL', 'TSPL');
create type public.status_impressao as enum ('pendente', 'enviado', 'erro');

-- Obra, empresas e pessoas -----------------------------------------------------

create table public.obra (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  endereco text,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.empresa (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  nome text not null check (length(trim(nome)) > 0),
  tipo public.tipo_empresa not null,
  cor text not null default '#6B7280' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  dono_nome text,
  dono_email text check (dono_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  encarregado_pessoa_id uuid,
  encarregado_email text check (encarregado_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  proxima_medicao date,
  criado_em timestamptz not null default now(),
  unique (obra_id, nome),
  unique (id, obra_id)
);

create table public.pessoa (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  empresa_id uuid not null,
  nome text not null check (length(trim(nome)) > 0),
  nome_capacete text not null check (nome_capacete = upper(nome_capacete) and length(trim(nome_capacete)) > 0),
  funcao text not null,
  matricula text not null,
  -- Token opaco do QR (RN-17): só caracteres aleatórios, nunca dado pessoal.
  qr_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (obra_id, matricula),
  unique (id, obra_id),
  foreign key (empresa_id, obra_id) references public.empresa (id, obra_id)
);

alter table public.empresa
  add constraint empresa_encarregado_fk
  foreign key (encarregado_pessoa_id, obra_id) references public.pessoa (id, obra_id);

-- Matrícula automática por obra: P-0001, P-0002…
create function public.definir_matricula() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  proximo integer;
begin
  if new.matricula is not null then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('matricula:' || new.obra_id::text));
  select coalesce(max(substring(matricula from '^P-(\d+)$')::integer), 0) + 1
    into proximo
    from public.pessoa
   where obra_id = new.obra_id;
  new.matricula := 'P-' || lpad(proximo::text, 4, '0');
  return new;
end;
$$;

create trigger pessoa_matricula
  before insert on public.pessoa
  for each row execute function public.definir_matricula();

-- Usuários e perfil por obra ---------------------------------------------------

create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null,
  criado_em timestamptz not null default now()
);

create table public.usuario_obra (
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  obra_id uuid not null references public.obra (id),
  perfil public.perfil not null,
  -- Preenchido só para consulta de empreiteira (dono/encarregado): vê só a própria empresa.
  empresa_id uuid,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, obra_id),
  foreign key (empresa_id, obra_id) references public.empresa (id, obra_id),
  check (empresa_id is null or perfil = 'consulta')
);

-- Cria o registro em public.usuario quando o Auth cria o login (convite).
create function public.criar_usuario() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuario (id, email, nome)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'nome', ''));
  return new;
end;
$$;

create trigger auth_usuario_criado
  after insert on auth.users
  for each row execute function public.criar_usuario();

-- Ferramentas ------------------------------------------------------------------

create table public.tipo_ferramenta (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  nome text not null check (length(trim(nome)) > 0),
  -- Chave do ícone (components/icones-ferramenta.ts).
  icone text not null check (icone in (
    'pa', 'enxada', 'carrinho', 'colher', 'regua', 'linha', 'furadeira', 'martelete',
    'esmerilhadeira', 'serra_circular', 'martelo', 'escada', 'extensao'
  )),
  prefixo text not null check (prefixo ~ '^[A-Z]{2,4}$'),
  valor_reposicao integer not null check (valor_reposicao > 0),
  alto_valor boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (obra_id, nome),
  unique (obra_id, prefixo),
  unique (id, obra_id)
);

create table public.unidade (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  tipo_id uuid not null,
  codigo text not null check (codigo ~ '^[A-Z]{2,4}-\d{2,}$'),
  status public.status_unidade not null default 'livre',
  criado_em timestamptz not null default now(),
  unique (obra_id, codigo),
  unique (id, obra_id),
  foreign key (tipo_id, obra_id) references public.tipo_ferramenta (id, obra_id)
);

create index unidade_tipo_status on public.unidade (tipo_id, status, codigo);

-- Movimentos (imutáveis, RN-18) e posse ----------------------------------------

create table public.movimento (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  tipo public.tipo_movimento not null,
  pessoa_id uuid not null,
  usuario_id uuid not null references public.usuario (id),
  via public.via_movimento not null,
  criado_em timestamptz not null default now(),
  conferido boolean not null default false,
  obs text,
  estorno_de uuid references public.movimento (id),
  unique (id, obra_id),
  foreign key (pessoa_id, obra_id) references public.pessoa (id, obra_id),
  check ((tipo = 'estorno') = (estorno_de is not null)),
  check (tipo <> 'estorno' or length(trim(coalesce(obs, ''))) > 0)
);

create index movimento_obra_criado on public.movimento (obra_id, criado_em desc);
create index movimento_pessoa on public.movimento (pessoa_id, criado_em desc);

create table public.movimento_item (
  movimento_id uuid not null,
  obra_id uuid not null,
  unidade_id uuid not null,
  avariada boolean not null default false,
  primary key (movimento_id, unidade_id),
  foreign key (movimento_id, obra_id) references public.movimento (id, obra_id),
  foreign key (unidade_id, obra_id) references public.unidade (id, obra_id)
);

create index movimento_item_unidade on public.movimento_item (unidade_id);

-- Registro vivo do que está com quem: no máximo uma posse por unidade.
create table public.posse (
  unidade_id uuid primary key,
  obra_id uuid not null,
  pessoa_id uuid not null,
  desde timestamptz not null default now(),
  via public.via_movimento not null,
  movimento_retirada_id uuid not null,
  foreign key (unidade_id, obra_id) references public.unidade (id, obra_id),
  foreign key (pessoa_id, obra_id) references public.pessoa (id, obra_id),
  foreign key (movimento_retirada_id, obra_id) references public.movimento (id, obra_id)
);

create index posse_pessoa on public.posse (pessoa_id, desde);

create table public.avaria (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  unidade_id uuid not null,
  movimento_id uuid not null,
  motivo public.motivo_avaria not null,
  foto_path text not null check (length(trim(foto_path)) > 0),
  criado_em timestamptz not null default now(),
  foreign key (unidade_id, obra_id) references public.unidade (id, obra_id),
  foreign key (movimento_id, obra_id) references public.movimento (id, obra_id)
);

create table public.ocorrencia (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  tipo public.tipo_ocorrencia not null,
  -- Dono do capacete que foi usado por outra pessoa.
  pessoa_id uuid not null,
  usuario_id uuid not null references public.usuario (id),
  criado_em timestamptz not null default now(),
  foreign key (pessoa_id, obra_id) references public.pessoa (id, obra_id)
);

-- Fechamento do dia e avisos -----------------------------------------------------

create table public.fechamento_dia (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  data date not null,
  encerrado_por uuid references public.usuario (id),
  encerrado_em timestamptz not null default now(),
  automatico boolean not null default false,
  unique (obra_id, data),
  unique (id, obra_id),
  check (automatico or encerrado_por is not null)
);

create table public.aviso (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  fechamento_id uuid not null,
  empresa_id uuid not null,
  total integer not null check (total >= 0),
  status public.status_aviso not null default 'enviado',
  itens jsonb not null default '[]'::jsonb,
  enviado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (fechamento_id, obra_id) references public.fechamento_dia (id, obra_id),
  foreign key (empresa_id, obra_id) references public.empresa (id, obra_id)
);

-- Impressão e TV -------------------------------------------------------------------

create table public.impressora (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  nome text not null,
  ip inet not null,
  porta integer not null default 9100 check (porta between 1 and 65535),
  linguagem public.linguagem_impressora not null,
  rolo text,
  criado_em timestamptz not null default now(),
  unique (id, obra_id)
);

create table public.trabalho_impressao (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  impressora_id uuid not null,
  payload text not null,
  copias integer not null default 1 check (copias between 1 and 5),
  status public.status_impressao not null default 'pendente',
  erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (impressora_id, obra_id) references public.impressora (id, obra_id)
);

create index trabalho_impressao_pendente on public.trabalho_impressao (obra_id, criado_em)
  where status = 'pendente';

create table public.dispositivo_tv (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  nome text not null,
  -- Só o hash do token do dispositivo fica no banco; o token em si é mostrado uma vez.
  token_hash text not null unique,
  ultimo_ping timestamptz,
  criado_em timestamptz not null default now()
);
