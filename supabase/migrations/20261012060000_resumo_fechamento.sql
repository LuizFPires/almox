-- M9 · Resumo de um fechamento para quem encerrou (tela "Dia encerrado" e "Ver aviso enviado").
-- O almoxarife não lê a tabela de avisos (M1), mas vê o resultado do encerramento que fez.

create function public.resumo_fechamento(p_fechamento uuid) returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v public.fechamento_dia;
begin
  select * into v from public.fechamento_dia where id = p_fechamento;
  if v.id is null or not privado.pode_lancar(v.obra_id) then
    return null;
  end if;
  return jsonb_build_object(
    'id', v.id,
    'data', v.data,
    'encerradoEm', v.encerrado_em,
    'automatico', v.automatico,
    'avisos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'empresa', e.nome, 'dono', e.dono_nome, 'donoEmail', e.dono_email,
               'encarregado', (select p.nome from public.pessoa p where p.id = e.encarregado_pessoa_id),
               'encarregadoEmail', e.encarregado_email, 'total', a.total, 'status', a.status,
               'itens', a.itens)
             order by e.nome)
        from public.aviso a join public.empresa e on e.id = a.empresa_id
       where a.fechamento_id = v.id), '[]'::jsonb),
    -- Funcionários próprios ainda com ferramenta (engenheiro avisado), agora.
    'proprios', coalesce((
      select jsonb_agg(jsonb_build_object('nome', x.nome, 'valor', x.valor) order by x.nome)
        from (select pe.nome, sum(t.valor_reposicao)::integer as valor
                from public.posse po
                join public.pessoa pe on pe.id = po.pessoa_id
                join public.empresa e on e.id = pe.empresa_id
                join public.unidade u on u.id = po.unidade_id
                join public.tipo_ferramenta t on t.id = u.tipo_id
               where po.obra_id = v.obra_id and e.tipo = 'propria'
               group by pe.id, pe.nome) x), '[]'::jsonb),
    'pessoasPendentes', (select count(distinct po.pessoa_id) from public.posse po where po.obra_id = v.obra_id)
  );
end;
$$;

revoke all on function public.resumo_fechamento(uuid) from public, anon, authenticated;
grant execute on function public.resumo_fechamento(uuid) to authenticated;
