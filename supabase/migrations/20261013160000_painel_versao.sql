-- Plano de correção · bloco 3, ponto 16: o painel da TV não remonta tudo a cada consulta.
-- A TV pergunta a cada 2 s mandando a versão que tem. Antes o banco montava o painel inteiro
-- (todas as pessoas com ferramenta) só para calcular o md5 e responder "nada mudou": ~15 ms por
-- consulta numa obra com 1500 peças fora. Agora um contador por obra, atualizado por gatilho
-- quando muda algo que aparece na TV, responde "nada mudou" sem montar nada.

create table privado.painel_versao (
  obra_id uuid primary key references public.obra (id) on delete cascade,
  versao bigint not null default 0
);
alter table privado.painel_versao enable row level security;
revoke all on privado.painel_versao from public, anon, authenticated;

-- Muda a versão da obra da linha (TG_ARGV[0] = coluna com o id da obra).
create function privado.mudou_painel() returns trigger
language plpgsql
security definer
set search_path = ''
as $f$
declare
  v_obra uuid := coalesce(to_jsonb(new), to_jsonb(old)) ->> tg_argv[0];
begin
  if v_obra is not null then
    insert into privado.painel_versao (obra_id, versao) values (v_obra, 1)
    on conflict (obra_id) do update set versao = privado.painel_versao.versao + 1;
  end if;
  return null;
end;
$f$;
revoke all on function privado.mudou_painel() from public, anon, authenticated;

create trigger painel_posse after insert or update or delete on public.posse
  for each row execute function privado.mudou_painel('obra_id');
create trigger painel_pessoa after insert or update or delete on public.pessoa
  for each row execute function privado.mudou_painel('obra_id');
create trigger painel_empresa after insert or update or delete on public.empresa
  for each row execute function privado.mudou_painel('obra_id');
create trigger painel_tipo_ferramenta after insert or update or delete on public.tipo_ferramenta
  for each row execute function privado.mudou_painel('obra_id');
create trigger painel_config_tv after insert or update or delete on public.config_tv
  for each row execute function privado.mudou_painel('obra_id');
create trigger painel_obra after update of nome on public.obra
  for each row execute function privado.mudou_painel('id');

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
    ), '[]'::jsonb)
  );
  return v_dados || jsonb_build_object('versao', v_versao, 'agora', now());
end;
$$;
