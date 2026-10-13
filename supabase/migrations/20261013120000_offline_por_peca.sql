-- Plano de correção · bloco 2, ponto 5: o saldo sem internet segue a regra do servidor.
-- O celular recebia só a contagem por pessoa, tipo e via; a devolução com QR no servidor leva
-- as peças mais antigas (de qualquer via), e o celular deixava lançar devoluções sem QR que o
-- servidor recusava. Agora vem uma linha por peça, com a hora de saída e na ordem da devolução.

create or replace function public.dados_offline(p_obra uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'obra', p_obra,
    'geradoEm', now(),
    'pessoas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'nome', p.nome, 'nomeCapacete', p.nome_capacete, 'funcao', p.funcao,
               'empresa', e.nome, 'empresaCor', e.cor, 'ativa', p.ativa,
               'hash', encode(sha256(convert_to(p.qr_token, 'UTF8')), 'hex'))
             order by p.nome)
        from public.pessoa p join public.empresa e on e.id = p.empresa_id
       where p.obra_id = p_obra
         and (p.ativa or exists (select 1 from public.posse po where po.pessoa_id = p.id))), '[]'::jsonb),
    'tipos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'nome', t.nome, 'icone', t.icone, 'altoValor', t.alto_valor,
               'livres', (select count(*) from public.unidade u
                           where u.tipo_id = t.id and u.status = 'livre'))
             order by t.nome)
        from public.tipo_ferramenta t where t.obra_id = p_obra), '[]'::jsonb),
    -- Uma linha por peça, na ordem em que o servidor devolve (mais antigas primeiro): o
    -- celular simula a mesma escolha sem internet.
    'posses', coalesce((
      select jsonb_agg(jsonb_build_object('pessoa', po.pessoa_id, 'tipo', u.tipo_id, 'via', po.via,
               'quantidade', 1, 'desde', po.desde)
             order by po.pessoa_id, u.tipo_id, po.desde, length(u.codigo), u.codigo)
        from public.posse po join public.unidade u on u.id = po.unidade_id
       where po.obra_id = p_obra), '[]'::jsonb)
  );
end;
$$;
