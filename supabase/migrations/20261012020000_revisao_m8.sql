-- Revisão do M8 · painel da TV.
-- 1. A TV ganha credencial própria, que só lê o painel. O token do agente (que lê a fila de
--    impressão, com o QR dos capacetes) não abre mais o painel e não passa por URL: o
--    engenheiro gera um código de uso único (10 min) e a TV troca por essa credencial.
--    Revogar o mini PC continua desligando os dois (revogado_em).
-- 2. Erro próprio para "dispositivo não autorizado" (AL008): falta de grant (42501) não
--    pode desligar as TVs como se o token tivesse sido revogado.
-- 3. Sinal da TV em coluna própria: não pode fazer o agente de impressão parecer online.
-- 4. O painel devolve uma versão e responde só ela quando nada mudou (a TV pergunta a cada
--    2 s); sem o apelido do capacete, que a tela não usa.

alter table public.dispositivo_tv
  add column tv_token_hash text unique,
  add column ultimo_ping_tv timestamptz;
grant select (ultimo_ping_tv) on public.dispositivo_tv to authenticated;

-- Códigos de pareamento: só o hash, uso único. Fechada ao cliente (só as funções).
create table public.codigo_tv (
  codigo_hash text primary key,
  dispositivo_id uuid not null references public.dispositivo_tv (id),
  expira_em timestamptz not null,
  usado_em timestamptz
);
alter table public.codigo_tv enable row level security;
revoke all on public.codigo_tv from public, anon, authenticated;

create function privado.dispositivo_por_token_tv(p_token text) returns public.dispositivo_tv
language sql stable security definer
set search_path = ''
as $$
  select * from public.dispositivo_tv
   where tv_token_hash = privado.hash_token(p_token) and revogado_em is null
$$;
revoke execute on function privado.dispositivo_por_token_tv(text) from public, anon, authenticated;

/** Engenheiro gera o código para conectar uma TV a um mini PC ativo da obra. */
create function public.gerar_codigo_tv(p_dispositivo uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.dispositivo_tv;
  v_codigo text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  select * into v from public.dispositivo_tv where id = p_dispositivo and revogado_em is null;
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

/**
 * A TV troca o código (uma vez, em até 10 min) pela credencial dela. Uma TV por mini PC: a
 * credencial nova substitui a anterior.
 */
create function public.trocar_codigo_tv(p_codigo text) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispositivo uuid;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  update public.codigo_tv c
     set usado_em = now()
    from public.dispositivo_tv d
   where c.codigo_hash = privado.hash_token(coalesce(p_codigo, ''))
     and c.usado_em is null and c.expira_em > now()
     and d.id = c.dispositivo_id and d.revogado_em is null
  returning c.dispositivo_id into v_dispositivo;
  if v_dispositivo is null then
    raise exception 'Código vencido, já usado ou de um mini PC revogado.' using errcode = 'AL008';
  end if;
  update public.dispositivo_tv set tv_token_hash = privado.hash_token(v_token)
   where id = v_dispositivo;
  return v_token;
end;
$$;

drop function public.painel_tv(text);

/**
 * Tudo o que a TV mostra, pela credencial da TV (só leitura). `p_versao` é a versão que a TV
 * já tem: se nada mudou, volta só a versão. O sinal da TV é gravado no máximo uma vez por
 * minuto, em coluna própria.
 */
create function public.painel_tv(p_token text, p_versao text default null) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.dispositivo_tv := privado.dispositivo_por_token_tv(p_token);
  v_dados jsonb;
  v_versao text;
begin
  if v.id is null then
    raise exception 'Dispositivo não autorizado.' using errcode = 'AL008';
  end if;
  update public.dispositivo_tv set ultimo_ping_tv = now()
   where id = v.id and (ultimo_ping_tv is null or ultimo_ping_tv < now() - interval '1 minute');

  v_dados := jsonb_build_object(
    'obra', (select o.nome from public.obra o where o.id = v.obra_id),
    'config', (
      select jsonb_build_object(
        'tempoPaginaS', coalesce(c.tempo_pagina_s, 8),
        'velocidadePxS', coalesce(c.velocidade_px_s, 45),
        'pausaAntesMs', coalesce(c.pausa_antes_ms, 2500),
        'pausaDepoisMs', coalesce(c.pausa_depois_ms, 3000),
        'cartoesPorPagina', coalesce(c.cartoes_por_pagina, 12))
        from (select 1) x left join public.config_tv c on c.obra_id = v.obra_id),
    'empresas', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome, 'cor', e.cor,
               'propria', e.tipo = 'propria') order by e.tipo, e.nome)
        from public.empresa e where e.obra_id = v.obra_id), '[]'::jsonb),
    'pessoas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'nome', p.nome, 'funcao', p.funcao, 'empresaId', p.empresa_id,
               'itens', (
                 select jsonb_agg(jsonb_build_object('codigo', u.codigo, 'tipo', t.nome,
                          'icone', t.icone, 'desde', po.desde) order by po.desde, u.codigo)
                   from public.posse po
                   join public.unidade u on u.id = po.unidade_id
                   join public.tipo_ferramenta t on t.id = u.tipo_id
                  where po.pessoa_id = p.id and po.obra_id = v.obra_id))
             order by p.nome, p.id)
        from public.pessoa p
       where p.obra_id = v.obra_id
         and exists (select 1 from public.posse po where po.pessoa_id = p.id and po.obra_id = v.obra_id)
    ), '[]'::jsonb)
  );
  v_versao := md5(v_dados::text);
  if v_versao = p_versao then
    return jsonb_build_object('versao', v_versao, 'agora', now());
  end if;
  return v_dados || jsonb_build_object('versao', v_versao, 'agora', now());
end;
$$;

-- Padrões campo a campo (um `row(...)` por posição quebraria com uma coluna nova).
create or replace function public.salvar_config_tv(
  p_obra uuid,
  p_tempo_pagina_s integer,
  p_velocidade_px_s integer,
  p_pausa_antes_ms integer,
  p_pausa_depois_ms integer,
  p_cartoes_por_pagina integer
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes public.config_tv;
  v_depois public.config_tv;
  v_usuario text := (select nome from public.usuario where id = (select auth.uid()));
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro da obra configura o painel.' using errcode = '42501';
  end if;
  select * into v_antes from public.config_tv where obra_id = p_obra;
  if v_antes.obra_id is null then
    v_antes.tempo_pagina_s := 8;
    v_antes.velocidade_px_s := 45;
    v_antes.pausa_antes_ms := 2500;
    v_antes.pausa_depois_ms := 3000;
    v_antes.cartoes_por_pagina := 12;
  end if;

  insert into public.config_tv as c (obra_id, tempo_pagina_s, velocidade_px_s, pausa_antes_ms,
    pausa_depois_ms, cartoes_por_pagina, atualizado_em)
  values (p_obra, p_tempo_pagina_s, p_velocidade_px_s, p_pausa_antes_ms, p_pausa_depois_ms,
    p_cartoes_por_pagina, now())
  on conflict (obra_id) do update
     set tempo_pagina_s = excluded.tempo_pagina_s,
         velocidade_px_s = excluded.velocidade_px_s,
         pausa_antes_ms = excluded.pausa_antes_ms,
         pausa_depois_ms = excluded.pausa_depois_ms,
         cartoes_por_pagina = excluded.cartoes_por_pagina,
         atualizado_em = now()
  returning * into v_depois;

  insert into public.alteracao (obra_id, tabela, registro_id, campo, de, para, usuario_id, usuario_nome)
  select p_obra, 'config_tv', p_obra, x.campo, x.de, x.para, (select auth.uid()), v_usuario
    from (values
      ('tempo_pagina_s', v_antes.tempo_pagina_s::text, v_depois.tempo_pagina_s::text),
      ('velocidade_px_s', v_antes.velocidade_px_s::text, v_depois.velocidade_px_s::text),
      ('pausa_antes_ms', v_antes.pausa_antes_ms::text, v_depois.pausa_antes_ms::text),
      ('pausa_depois_ms', v_antes.pausa_depois_ms::text, v_depois.pausa_depois_ms::text),
      ('cartoes_por_pagina', v_antes.cartoes_por_pagina::text, v_depois.cartoes_por_pagina::text)
    ) as x (campo, de, para)
   where x.de is distinct from x.para;
end;
$$;

revoke all on function public.gerar_codigo_tv(uuid), public.trocar_codigo_tv(text),
  public.painel_tv(text, text) from public, anon, authenticated;
grant execute on function public.gerar_codigo_tv(uuid) to authenticated;
-- A TV entra só com a chave pública: troca o código e lê o painel.
grant execute on function public.trocar_codigo_tv(text), public.painel_tv(text, text) to anon;
