-- M8 · Painel da TV: configuração por obra e leitura pelo token do dispositivo (sem login).

-- Configuração do painel (PRD F-13). Sem linha = valores padrão.
create table public.config_tv (
  obra_id uuid primary key references public.obra (id),
  tempo_pagina_s integer not null default 8 check (tempo_pagina_s between 3 and 30),
  velocidade_px_s integer not null default 45 check (velocidade_px_s between 15 and 150),
  pausa_antes_ms integer not null default 2500 check (pausa_antes_ms between 0 and 15000),
  pausa_depois_ms integer not null default 3000 check (pausa_depois_ms between 0 and 15000),
  cartoes_por_pagina integer not null default 12 check (cartoes_por_pagina in (8, 12, 16)),
  atualizado_em timestamptz not null default now()
);

alter table public.config_tv enable row level security;
create policy config_tv_ler on public.config_tv for select to authenticated
  using (privado.tem_acesso(obra_id));
revoke all on public.config_tv from public, anon, authenticated;
grant select (obra_id, tempo_pagina_s, velocidade_px_s, pausa_antes_ms, pausa_depois_ms,
  cartoes_por_pagina, atualizado_em) on public.config_tv to authenticated;

/** Só o engenheiro muda; cada campo alterado fica no log de alterações. */
create function public.salvar_config_tv(
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
    v_antes := row(p_obra, 8, 45, 2500, 3000, 12, now())::public.config_tv;
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

/**
 * Tudo o que a TV mostra, pelo token do dispositivo (a TV entra só com a chave pública).
 * Só leitura: pessoas com ferramenta (nome, função, empresa, peças e desde), empresas e a
 * configuração. Nada de token de QR, e-mail ou valores. O "último sinal" do dispositivo é
 * gravado no máximo uma vez por minuto (a TV pergunta a cada 2 s).
 */
create function public.painel_tv(p_token text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.dispositivo_tv := privado.dispositivo_por_token(p_token);
begin
  if v.id is null then
    raise exception 'Dispositivo não autorizado.' using errcode = '42501';
  end if;
  update public.dispositivo_tv set ultimo_ping = now()
   where id = v.id and (ultimo_ping is null or ultimo_ping < now() - interval '1 minute');

  return jsonb_build_object(
    'agora', now(),
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
               'id', p.id, 'nome', p.nome, 'apelido', p.nome_capacete, 'funcao', p.funcao,
               'empresaId', p.empresa_id,
               'itens', (
                 select jsonb_agg(jsonb_build_object('codigo', u.codigo, 'tipo', t.nome,
                          'icone', t.icone, 'desde', po.desde) order by po.desde, u.codigo)
                   from public.posse po
                   join public.unidade u on u.id = po.unidade_id
                   join public.tipo_ferramenta t on t.id = u.tipo_id
                  where po.pessoa_id = p.id and po.obra_id = v.obra_id))
             order by p.nome)
        from public.pessoa p
       where p.obra_id = v.obra_id
         and exists (select 1 from public.posse po where po.pessoa_id = p.id and po.obra_id = v.obra_id)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.salvar_config_tv(uuid, integer, integer, integer, integer, integer),
  public.painel_tv(text) from public, anon, authenticated;
grant execute on function public.salvar_config_tv(uuid, integer, integer, integer, integer, integer)
  to authenticated;
-- A TV entra só com a chave pública e o token do dispositivo.
grant execute on function public.painel_tv(text) to anon;
