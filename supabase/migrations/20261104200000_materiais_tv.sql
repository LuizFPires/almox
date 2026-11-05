-- M13 · Tarefa 16: a TV mostra os materiais ativos da obra (terceira tela do loop, com alerta).
-- Redefine public.painel_tv (última versão: 20261013160000_painel_versao.sql) somando a chave
-- `materiais`. A versão do painel já sobe a cada mudança em public.material (gatilho
-- painel_material, 20261104130000_materiais.sql). Grants e atributos da função continuam os
-- mesmos (create or replace não mexe neles).

create or replace function public.painel_tv(p_token text, p_versao text DEFAULT NULL::text)
returns jsonb
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

  -- Versão lida antes dos dados: se algo mudar no meio, a próxima consulta só remonta de novo.
  v_versao := 'v' || coalesce((select pv.versao from privado.painel_versao pv where pv.obra_id = v.obra_id), 0);
  if v_versao = p_versao then
    return jsonb_build_object('versao', v_versao, 'agora', now());
  end if;

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
    ), '[]'::jsonb),
    'materiais', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'nome', m.nome, 'unidade', m.unidade, 'saldo', m.saldo,
               'estoque_cheio', m.estoque_cheio, 'aviso_tipo', m.aviso_tipo,
               'aviso_valor', m.aviso_valor)
             order by m.nome, m.id)
        from public.material m
       where m.obra_id = v.obra_id and m.ativo
    ), '[]'::jsonb)
  );
  return v_dados || jsonb_build_object('versao', v_versao, 'agora', now());
end;
$$;
