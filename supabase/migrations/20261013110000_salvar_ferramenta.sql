-- Plano de correção · bloco 2, ponto 6 (e ponto 15): cadastro de ferramenta numa transação só.
-- Antes eram três passos no app (locadora, tipo, unidades): uma falha no meio deixava cadastro
-- pela metade, e repetir depois de uma resposta perdida criava as unidades de novo. Agora uma RPC
-- faz tudo ou nada, com chave de operação (repetir devolve o mesmo resultado), e escolhe o
-- prefixo das peças no banco, sempre livre, com trava por obra (ponto 15).

-- Operações de cadastro já feitas (a chave vem da tela; repetir não refaz).
create table privado.operacao_cadastro (
  chave uuid primary key,
  obra_id uuid not null references public.obra (id),
  registro_id uuid not null,
  -- Impressão dos dados enviados: a mesma chave com dados diferentes (tela reaproveitada pelo
  -- "voltar" do navegador) não pode devolver o cadastro anterior como se fosse o novo.
  assinatura text not null,
  criado_em timestamptz not null default now()
);
alter table privado.operacao_cadastro enable row level security;
revoke all on privado.operacao_cadastro from public, anon, authenticated;

-- Prefixo livre da obra a partir do candidato (2–4 letras): o candidato, depois as 2 primeiras
-- letras + A–Z, depois a 1ª letra + duas letras quaisquer.
create function privado.prefixo_livre(p_obra uuid, p_candidato text) returns text
language plpgsql
set search_path = ''
as $$
declare
  v_base text := upper(coalesce(nullif(regexp_replace(p_candidato, '[^A-Za-z]', '', 'g'), ''), 'FE'));
  v text;
  a text;
  b text;
  letras text[] := string_to_array('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z', ' ');
begin
  if length(v_base) < 2 then
    v_base := v_base || 'X';
  end if;
  v := left(v_base, 4);
  if not exists (select 1 from public.tipo_ferramenta where obra_id = p_obra and prefixo = v) then
    return v;
  end if;
  foreach a in array letras loop
    v := left(v_base, 2) || a;
    if not exists (select 1 from public.tipo_ferramenta where obra_id = p_obra and prefixo = v) then
      return v;
    end if;
  end loop;
  foreach a in array letras loop
    foreach b in array letras loop
      v := left(v_base, 1) || a || b;
      if not exists (select 1 from public.tipo_ferramenta where obra_id = p_obra and prefixo = v) then
        return v;
      end if;
    end loop;
  end loop;
  raise exception 'Não há prefixo livre para esta ferramenta.' using errcode = 'AL012';
end;
$$;

create function public.salvar_ferramenta(
  p_obra uuid,
  p_chave uuid,
  p_nome text,
  p_icone text,
  p_valor integer,
  p_alto_valor boolean,
  p_propriedade text,
  p_quantidade integer,
  p_prefixo text,
  p_id uuid default null,
  p_locadora_id uuid default null,
  p_locadora_nova text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo uuid;
  v_locadora uuid;
  v_antes privado.operacao_cadastro;
  v_assinatura text := md5(concat_ws('|', p_id, p_nome, p_icone, p_valor, p_alto_valor, p_propriedade,
    p_locadora_id, p_locadora_nova, p_quantidade));
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro cadastra ferramentas.' using errcode = '42501';
  end if;
  if p_chave is null then
    raise exception 'Operação sem chave.' using errcode = '22023';
  end if;
  -- Mesma chave: a operação já foi feita (resposta perdida e o engenheiro salvou de novo).
  -- Duas chamadas juntas com a mesma chave: a segunda espera a primeira na chave primária.
  insert into privado.operacao_cadastro (chave, obra_id, registro_id, assinatura)
  values (p_chave, p_obra, coalesce(p_id, '00000000-0000-0000-0000-000000000000'), v_assinatura)
  on conflict (chave) do nothing;
  if not found then
    select * into v_antes from privado.operacao_cadastro where chave = p_chave;
    if v_antes.obra_id is distinct from p_obra then
      raise exception 'Operação de outra obra.' using errcode = '42501';
    end if;
    if v_antes.assinatura <> v_assinatura then
      raise exception 'Esta tela já foi usada para salvar. Abra o cadastro de novo para salvar outra ferramenta.'
        using errcode = 'AL013';
    end if;
    return v_antes.registro_id;
  end if;
  if p_quantidade is null or p_quantidade < 0 or p_quantidade > 200 then
    raise exception 'Quantidade de 0 a 200.' using errcode = '22023';
  end if;
  if p_id is null and p_quantidade < 1 then
    raise exception 'Ferramenta nova precisa de pelo menos 1 unidade.' using errcode = '22023';
  end if;

  -- Alugada: a locadora escolhida (da obra) ou a nova, sem repetir nome com outra grafia.
  if p_propriedade = 'alugada' then
    if p_locadora_id is not null then
      select id into v_locadora from public.locadora where id = p_locadora_id and obra_id = p_obra;
      if v_locadora is null then
        raise exception 'Locadora não encontrada nesta obra.' using errcode = 'P0002';
      end if;
    else
      select id into v_locadora from public.locadora
       where obra_id = p_obra and privado.chave_nome(nome) = privado.chave_nome(p_locadora_nova);
      if v_locadora is null then
        insert into public.locadora (obra_id, nome) values (p_obra, btrim(p_locadora_nova))
        returning id into v_locadora;
      end if;
    end if;
  end if;

  if p_id is not null then
    update public.tipo_ferramenta
       set nome = p_nome, icone = p_icone, valor_reposicao = p_valor, alto_valor = p_alto_valor,
           propriedade = p_propriedade, locadora_id = v_locadora
     where id = p_id and obra_id = p_obra
    returning id into v_tipo;
    if v_tipo is null then
      raise exception 'Ferramenta não encontrada nesta obra.' using errcode = 'P0002';
    end if;
  else
    -- Dois cadastros juntos não escolhem o mesmo prefixo.
    perform pg_advisory_xact_lock(hashtext('almox:prefixo'), hashtext(p_obra::text));
    insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao, alto_valor,
      propriedade, locadora_id)
    values (p_obra, p_nome, p_icone, privado.prefixo_livre(p_obra, p_prefixo), p_valor, p_alto_valor,
      p_propriedade, v_locadora)
    returning id into v_tipo;
  end if;

  if p_quantidade > 0 then
    perform public.adicionar_unidades(v_tipo, p_quantidade);
  end if;

  update privado.operacao_cadastro set registro_id = v_tipo where chave = p_chave;
  return v_tipo;
end;
$$;

revoke all on function privado.prefixo_livre(uuid, text) from public, anon, authenticated;
revoke all on function public.salvar_ferramenta(uuid, uuid, text, text, integer, boolean, text, integer, text, uuid, uuid, text)
  from public, anon;
grant execute on function public.salvar_ferramenta(uuid, uuid, text, text, integer, boolean, text, integer, text, uuid, uuid, text)
  to authenticated;
