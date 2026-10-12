-- M11 · Cadastro inicial do piloto por planilha: empresas, pessoas e ferramentas (com unidades)
-- numa transação só. SECURITY INVOKER: valem as permissões e a RLS do engenheiro, como nas
-- telas de cadastro (nada passa por cima delas). O app valida antes, linha a linha.

/**
 * p_dados = { empresas: [{nome, tipo, cor, donoNome, donoEmail, encarregadoEmail}],
 *             pessoas: [{nome, nomeCapacete, funcao, empresa}],
 *             ferramentas: [{nome, icone, prefixo, valor, quantidade, altoValor}] }
 * Pessoas apontam para a empresa pelo nome (nova na planilha ou já da obra).
 * Devolve os ids das pessoas criadas (para imprimir os adesivos em lote) e as contagens.
 */
create function public.importar_cadastro(p_obra uuid, p_dados jsonb) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_empresa uuid;
  v_tipo uuid;
  v_pessoas uuid[] := '{}';
  v_pessoa uuid;
  v_empresas integer := 0;
  v_ferramentas integer := 0;
  v_unidades integer := 0;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro importa o cadastro.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_dados) is distinct from 'object' then
    raise exception 'Planilha inválida.' using errcode = '22023';
  end if;
  if coalesce(jsonb_array_length(p_dados -> 'pessoas'), 0) > 2000
     or coalesce(jsonb_array_length(p_dados -> 'empresas'), 0) > 200
     or coalesce(jsonb_array_length(p_dados -> 'ferramentas'), 0) > 300 then
    raise exception 'Planilha grande demais: importe em partes.' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_dados -> 'empresas', '[]')) loop
    insert into public.empresa (obra_id, nome, tipo, cor, dono_nome, dono_email, encarregado_email)
    values (p_obra, v_item ->> 'nome', (v_item ->> 'tipo')::public.tipo_empresa,
            coalesce(v_item ->> 'cor', '#6B7280'), v_item ->> 'donoNome', v_item ->> 'donoEmail',
            v_item ->> 'encarregadoEmail');
    v_empresas := v_empresas + 1;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_dados -> 'pessoas', '[]')) loop
    select e.id into v_empresa from public.empresa e
     where e.obra_id = p_obra and lower(e.nome) = lower(v_item ->> 'empresa');
    if v_empresa is null then
      raise exception 'Empresa "%" não encontrada.', v_item ->> 'empresa' using errcode = 'P0002';
    end if;
    insert into public.pessoa (obra_id, empresa_id, nome, nome_capacete, funcao)
    values (p_obra, v_empresa, v_item ->> 'nome', v_item ->> 'nomeCapacete', v_item ->> 'funcao')
    returning id into v_pessoa;
    v_pessoas := v_pessoas || v_pessoa;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_dados -> 'ferramentas', '[]')) loop
    insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao, alto_valor)
    values (p_obra, v_item ->> 'nome', v_item ->> 'icone', v_item ->> 'prefixo',
            (v_item ->> 'valor')::integer, coalesce((v_item ->> 'altoValor')::boolean, false))
    returning id into v_tipo;
    perform public.adicionar_unidades(v_tipo, (v_item ->> 'quantidade')::integer);
    v_ferramentas := v_ferramentas + 1;
    v_unidades := v_unidades + (v_item ->> 'quantidade')::integer;
  end loop;

  return jsonb_build_object('empresas', v_empresas, 'pessoas', to_jsonb(v_pessoas),
    'ferramentas', v_ferramentas, 'unidades', v_unidades);
end;
$$;

revoke all on function public.importar_cadastro(uuid, jsonb) from public, anon;
grant execute on function public.importar_cadastro(uuid, jsonb) to authenticated;
