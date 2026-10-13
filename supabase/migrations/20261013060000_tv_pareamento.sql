-- TV sem mini PC (decisão de 13/10/2026): um aparelho Google TV abre /tv e mostra um código de
-- 6 dígitos (e um QR com ele); o engenheiro OU o almoxarife aprova no celular e a TV recebe a
-- credencial só de leitura do painel. A aprovação cria um dispositivo "só painel" (sem agente
-- de impressão). O caminho antigo (código de 10 min gerado para um mini PC) continua valendo.
--
-- Segurança: a TV guarda um segredo aleatório (cookie httpOnly) e só com ele recebe a
-- credencial; o código de 6 dígitos sozinho não dá nada. Aprovar exige login de quem lança na
-- obra. O pedido vale 10 minutos e entrega a credencial uma vez só. Pedir código só pelo
-- servidor do app (chave secreta), com o IP de quem pediu: no máximo 3 pedidos vivos por IP,
-- para ninguém lotar os códigos e travar as TVs das obras.

alter table public.dispositivo_tv add column so_painel boolean not null default false;
grant select (so_painel, revogado_em, ultimo_ping_tv) on public.dispositivo_tv to authenticated;

-- Quem lança na obra vê as TVs "só painel" (para conectar e desconectar); o mini PC continua
-- só do engenheiro (política anterior).
create policy dispositivo_tv_ler_painel on public.dispositivo_tv for select to authenticated
  using (so_painel and privado.pode_lancar(obra_id));

create table public.pareamento_tv (
  id uuid primary key default gen_random_uuid(),
  codigo text not null check (codigo ~ '^[0-9]{6}$'),
  segredo_hash text not null unique,
  expira_em timestamptz not null,
  -- IP de quem pediu (limite de pedidos por IP); nunca vai para a tela.
  ip text,
  obra_id uuid references public.obra (id),
  dispositivo_id uuid references public.dispositivo_tv (id),
  aprovado_por uuid references public.usuario (id),
  aprovado_em timestamptz,
  entregue_em timestamptz,
  criado_em timestamptz not null default now()
);
create index pareamento_tv_codigo on public.pareamento_tv (codigo, expira_em);
alter table public.pareamento_tv enable row level security;
revoke all on public.pareamento_tv from public, anon, authenticated;

/**
 * A TV pede um código (pelo servidor do app). `p_segredo` (64 hex) fica no cookie da TV; só o
 * hash fica aqui. Devolve o código de 6 dígitos, único entre os pedidos vivos.
 */
create function public.pedir_pareamento_tv(p_segredo text, p_ip text default null) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_tentativa integer := 0;
begin
  if coalesce(p_segredo, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Segredo inválido.' using errcode = '22023';
  end if;
  -- Um pedido por vez: o código sorteado não colide com outro pedido simultâneo.
  perform pg_advisory_xact_lock(hashtext('pareamento_tv'));
  -- Limpeza dos pedidos velhos e travas contra enxurrada de pedidos.
  delete from public.pareamento_tv where expira_em < now() - interval '1 day';
  if p_ip is not null and (
    select count(*) from public.pareamento_tv
     where ip = p_ip and expira_em > now() and aprovado_em is null
       and segredo_hash <> privado.hash_token(p_segredo)
  ) >= 3 then
    raise exception 'Muitos pedidos de TV deste endereço. Tente em alguns minutos.' using errcode = 'AL009';
  end if;
  if (select count(*) from public.pareamento_tv where expira_em > now() and aprovado_em is null) >= 5000 then
    raise exception 'Muitos pedidos de TV abertos. Tente em alguns minutos.' using errcode = 'AL009';
  end if;
  loop
    v_tentativa := v_tentativa + 1;
    v_codigo := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (
      select 1 from public.pareamento_tv where codigo = v_codigo and expira_em > now()
    );
    if v_tentativa > 20 then
      raise exception 'Não foi possível gerar o código.' using errcode = 'AL009';
    end if;
  end loop;
  insert into public.pareamento_tv (codigo, segredo_hash, expira_em, ip)
  values (v_codigo, privado.hash_token(p_segredo), now() + interval '10 minutes', p_ip)
  on conflict (segredo_hash) do update
    set codigo = excluded.codigo, expira_em = excluded.expira_em
    where public.pareamento_tv.aprovado_em is null;
  return v_codigo;
end;
$$;

/**
 * A TV pergunta (a cada poucos segundos) se o pedido foi aprovado. Aprovado e ainda não
 * entregue: gera a credencial do painel, grava só o hash e devolve o token uma vez.
 */
create function public.consultar_pareamento_tv(p_segredo text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.pareamento_tv;
  v_token text;
begin
  select * into v from public.pareamento_tv
   where segredo_hash = privado.hash_token(coalesce(p_segredo, ''))
   for update;
  if v.id is null or v.entregue_em is not null then
    return jsonb_build_object('estado', 'vencido');
  end if;
  if v.aprovado_em is null then
    if v.expira_em <= now() then
      return jsonb_build_object('estado', 'vencido');
    end if;
    return jsonb_build_object('estado', 'esperando', 'codigo', v.codigo, 'expira_em', v.expira_em);
  end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  update public.dispositivo_tv set tv_token_hash = privado.hash_token(v_token)
   where id = v.dispositivo_id and revogado_em is null;
  if not found then
    return jsonb_build_object('estado', 'vencido');
  end if;
  update public.pareamento_tv set entregue_em = now() where id = v.id;
  return jsonb_build_object('estado', 'aprovado', 'token', v_token);
end;
$$;

/**
 * Engenheiro ou almoxarife da obra aprova o código que aparece na TV. Cria a TV "só painel"
 * com o nome dado e devolve o id dela.
 */
create function public.aprovar_pareamento_tv(p_obra uuid, p_codigo text, p_nome text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido uuid;
  v_dispositivo uuid;
  v_nome text := nullif(btrim(coalesce(p_nome, '')), '');
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Só o engenheiro ou o almoxarife da obra conecta uma TV.' using errcode = '42501';
  end if;
  if v_nome is not null and length(v_nome) > 60 then
    raise exception 'Nome da TV com mais de 60 caracteres.' using errcode = '22023';
  end if;
  select id into v_pedido from public.pareamento_tv
   where codigo = coalesce(p_codigo, '') and expira_em > now() and aprovado_em is null
   order by criado_em desc
   limit 1
   for update;
  if v_pedido is null then
    raise exception 'Código não encontrado ou vencido. Confira o número na TV.' using errcode = 'P0002';
  end if;
  insert into public.dispositivo_tv (obra_id, nome, token_hash, so_painel)
  values (p_obra, coalesce(v_nome, 'TV do almoxarifado'),
          privado.hash_token(encode(extensions.gen_random_bytes(32), 'hex')), true)
  returning id into v_dispositivo;
  update public.pareamento_tv
     set obra_id = p_obra, dispositivo_id = v_dispositivo, aprovado_em = now(),
         aprovado_por = (select id from public.usuario where id = (select auth.uid()))
   where id = v_pedido;
  return v_dispositivo;
end;
$$;

/** Engenheiro ou almoxarife desconecta uma TV "só painel" da obra (o mini PC continua com o engenheiro). */
create function public.desconectar_tv(p_dispositivo uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.dispositivo_tv set revogado_em = now()
   where id = p_dispositivo and so_painel and revogado_em is null
     and privado.pode_lancar(obra_id);
  if not found then
    raise exception 'TV não encontrada nesta obra.' using errcode = '42501';
  end if;
end;
$$;

/** O mini PC antigo não reconecta uma TV "só painel" (trocaria a credencial dela sem aviso). */
create or replace function public.gerar_codigo_tv(p_dispositivo uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.dispositivo_tv;
  v_codigo text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  select * into v from public.dispositivo_tv
   where id = p_dispositivo and revogado_em is null and not so_painel;
  if v.id is null or not privado.eh_engenheiro(v.obra_id) then
    raise exception 'Só o engenheiro da obra conecta uma TV a um mini PC ativo.' using errcode = '42501';
  end if;
  -- Um código vivo por mini PC: o novo invalida o anterior.
  update public.codigo_tv set usado_em = now() where dispositivo_id = v.id and usado_em is null;
  insert into public.codigo_tv (codigo_hash, dispositivo_id, expira_em)
  values (privado.hash_token(v_codigo), v.id, now() + interval '10 minutes');
  return v_codigo;
end;
$$;

revoke all on function public.pedir_pareamento_tv(text, text), public.consultar_pareamento_tv(text),
  public.aprovar_pareamento_tv(uuid, text, text), public.desconectar_tv(uuid)
  from public, anon, authenticated;
-- Pedir código: só o servidor do app (chave secreta), que informa o IP de quem pediu.
grant execute on function public.pedir_pareamento_tv(text, text) to service_role;
-- A TV consulta com a chave pública (só com o segredo do cookie dela).
grant execute on function public.consultar_pareamento_tv(text) to anon;
grant execute on function public.aprovar_pareamento_tv(uuid, text, text), public.desconectar_tv(uuid)
  to authenticated;
