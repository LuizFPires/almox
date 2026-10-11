-- M6 · Devolução, avaria com foto, estorno e manutenção.

-- Fotos de avaria: Storage privado, caminho "{obra}/{uuid}.jpg". Quem lança envia; quem lança
-- vê (por URL assinada). Ninguém troca nem apaga (é prova da avaria).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avarias', 'avarias', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create function privado.obra_do_caminho(p_nome text) returns uuid
language plpgsql immutable
set search_path = ''
as $$
begin
  return split_part(p_nome, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

create policy avarias_enviar on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avarias'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
    and privado.pode_lancar(privado.obra_do_caminho(name))
  );
create policy avarias_ver on storage.objects for select to authenticated
  using (bucket_id = 'avarias' and privado.pode_lancar(privado.obra_do_caminho(name)));

-- Ordem de gravação dos movimentos (o criado_em é o mesmo dentro de uma transação).
alter table public.movimento add column ordem bigint generated always as identity;
create unique index movimento_ordem on public.movimento (ordem);
-- Na devolução, de qual retirada a peça veio (o estorno da devolução restaura exatamente).
alter table public.movimento_item add column retirada_id uuid,
  add constraint movimento_item_retirada_fk foreign key (retirada_id, obra_id)
    references public.movimento (id, obra_id);

-- Uma foto prova uma avaria só.
create unique index avaria_foto_unica on public.avaria (foto_path);

drop function public.registrar_devolucao(uuid, uuid, public.via_movimento, jsonb);

/**
 * Devolução (F-06). p_itens = [{"tipo": uuid, "quantidade": n,
 *   "avarias": [{"motivo": "quebrada", "foto": "{obra}/{uuid}.jpg"}, …]}, …]
 * - QR só com a conferência (M4) válida; vencida = AL001. Sem conferência só voltam os itens
 *   que saíram sem QR (RN-02/RN-06): pedir item que saiu com QR = AL004.
 * - Voltam as mais antigas com a pessoa (RN-08); as primeiras da lista são as avariadas
 *   (decisão do M6) e vão para manutenção, cada uma com foto e motivo (RN-09).
 * - p_chave: repetir o mesmo pedido devolve o mesmo movimento (rede que cai).
 */
create function public.registrar_devolucao(
  p_obra uuid,
  p_pessoa uuid,
  p_identificacao uuid,
  p_itens jsonb,
  p_chave uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via public.via_movimento := 'manual';
  v_movimento uuid;
  v_item record;
  v_tipo public.tipo_ferramenta;
  v_unidades uuid[];
  v_avarias jsonb;
  v_n_avarias integer;
  v_com_ela integer;
  v_i integer;
  v_av jsonb;
begin
  if not privado.pode_lancar(p_obra) then
    raise exception 'Sem permissão para lançar nesta obra.' using errcode = '42501';
  end if;

  if p_chave is not null then
    select id into v_movimento from public.movimento
     where obra_id = p_obra and chave_cliente = p_chave
       and pessoa_id = p_pessoa and usuario_id = (select auth.uid()) and tipo = 'devolucao';
    if v_movimento is not null then
      return v_movimento;
    end if;
  end if;

  if not exists (select 1 from public.pessoa where id = p_pessoa and obra_id = p_obra) then
    raise exception 'Pessoa não encontrada nesta obra.' using errcode = 'P0002';
  end if;

  if p_identificacao is not null then
    if not exists (
      select 1 from public.identificacao
       where id = p_identificacao and obra_id = p_obra and pessoa_id = p_pessoa
         and usuario_id = (select auth.uid()) and expira_em > now()
    ) then
      raise exception 'A conferência do capacete não vale mais. Leia o capacete de novo.' using errcode = 'AL001';
    end if;
    v_via := 'qr';
  end if;

  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe o que voltou.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) e
     where jsonb_typeof(e) <> 'object'
        or coalesce(e ->> 'quantidade', '') !~ '^[1-9][0-9]{0,2}$'
        or coalesce(e ->> 'tipo', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(coalesce(e -> 'avarias', '[]')) <> 'array'
        or jsonb_array_length(coalesce(e -> 'avarias', '[]')) > (e ->> 'quantidade')::integer
  ) or (select count(*) from jsonb_array_elements(p_itens) e) <>
       (select count(distinct e ->> 'tipo') from jsonb_array_elements(p_itens) e) then
    raise exception 'Lista de devolução inválida.' using errcode = '22023';
  end if;

  -- Cada avaria: motivo da lista e foto enviada por este usuário, desta obra, ainda não usada.
  if exists (
    select 1 from jsonb_array_elements(p_itens) e, jsonb_array_elements(coalesce(e -> 'avarias', '[]')) a
     where jsonb_typeof(a) <> 'object'
        or coalesce(a ->> 'motivo', '') not in ('quebrada', 'cabo_rompido', 'nao_liga', 'desgaste', 'peca_faltando')
        or coalesce(a ->> 'foto', '') !~ ('^' || p_obra::text || '/[0-9a-f-]{36}\.jpg$')
        or not exists (
          select 1 from storage.objects o
           where o.bucket_id = 'avarias' and o.name = a ->> 'foto' and o.owner = (select auth.uid())
        )
        or exists (select 1 from public.avaria v where v.foto_path = a ->> 'foto')
  ) then
    raise exception 'Cada avaria precisa de foto e motivo (RN-09).' using errcode = 'AL005';
  end if;

  insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via, chave_cliente)
  values (p_obra, 'devolucao', p_pessoa, (select auth.uid()), v_via, p_chave)
  returning id into v_movimento;

  for v_item in
    select (e ->> 'tipo')::uuid as tipo, (e ->> 'quantidade')::integer as quantidade,
           coalesce(e -> 'avarias', '[]') as avarias
      from jsonb_array_elements(p_itens) e
  loop
    select * into v_tipo from public.tipo_ferramenta where id = v_item.tipo and obra_id = p_obra;
    if v_tipo.id is null then
      raise exception 'Ferramenta não encontrada nesta obra.' using errcode = 'P0002';
    end if;

    -- As mais antigas com a pessoa; sem QR, só as que saíram sem QR.
    select array_agg(unidade_id) into v_unidades from (
      select p.unidade_id from public.posse p join public.unidade u on u.id = p.unidade_id
       where p.pessoa_id = p_pessoa and p.obra_id = p_obra and u.tipo_id = v_tipo.id
         and (v_via = 'qr' or p.via = 'manual')
       order by p.desde, length(u.codigo), u.codigo
       limit v_item.quantidade
       for update of p
    ) x;
    if coalesce(array_length(v_unidades, 1), 0) < v_item.quantidade then
      select count(*) into v_com_ela from public.posse p join public.unidade u on u.id = p.unidade_id
       where p.pessoa_id = p_pessoa and p.obra_id = p_obra and u.tipo_id = v_tipo.id;
      if v_com_ela >= v_item.quantidade then
        raise exception '% saiu com o capacete: só volta com o capacete de quem pegou (RN-02).', v_tipo.nome
          using errcode = 'AL004';
      end if;
      raise exception 'Não tem tantas % com ela: só %.', v_tipo.nome, v_com_ela using errcode = 'AL003';
    end if;

    v_avarias := v_item.avarias;
    v_n_avarias := jsonb_array_length(v_avarias);
    for v_i in 1 .. v_item.quantidade loop
      insert into public.movimento_item (movimento_id, obra_id, unidade_id, avariada, retirada_id)
      values (v_movimento, p_obra, v_unidades[v_i], v_i <= v_n_avarias,
        (select movimento_retirada_id from public.posse where unidade_id = v_unidades[v_i]));
      delete from public.posse where unidade_id = v_unidades[v_i];
      update public.unidade
         set status = (case when v_i <= v_n_avarias then 'manutencao' else 'livre' end)::public.status_unidade
       where id = v_unidades[v_i];
      if v_i <= v_n_avarias then
        v_av := v_avarias -> (v_i - 1);
        insert into public.avaria (obra_id, unidade_id, movimento_id, motivo, foto_path)
        values (p_obra, v_unidades[v_i], v_movimento, (v_av ->> 'motivo')::public.motivo_avaria, v_av ->> 'foto');
      end if;
    end loop;
  end loop;

  return v_movimento;
end;
$$;

/**
 * Estorno (RN-18): só o engenheiro, com motivo; grava um movimento novo e desfaz o efeito,
 * sem tocar no original. Só se as peças não tiveram nada depois (do mais novo para o mais velho).
 * - Retirada: as peças voltam a livre (a posse daquela retirada some).
 * - Devolução: a posse volta como estava (mesma retirada, mesma via e hora).
 */
create function public.estornar_movimento(p_obra uuid, p_movimento uuid, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.movimento;
  v_estorno uuid;
  v_item record;
  v_origem public.movimento;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro estorna lançamentos.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Escreva o motivo do estorno.' using errcode = '22023';
  end if;
  select * into v from public.movimento where id = p_movimento and obra_id = p_obra for update;
  if v.id is null or v.tipo not in ('retirada', 'devolucao') then
    raise exception 'Lançamento não encontrado.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.movimento where estorno_de = v.id) then
    raise exception 'Este lançamento já foi estornado.' using errcode = 'AL006';
  end if;
  -- Nada depois com as mesmas peças.
  if exists (
    select 1 from public.movimento_item i
      join public.movimento_item j on j.unidade_id = i.unidade_id and j.movimento_id <> i.movimento_id
      join public.movimento m on m.id = j.movimento_id
     where i.movimento_id = v.id and m.ordem > v.ordem
       -- o par lançamento estornado + estorno já se anulou: não conta
       and m.tipo <> 'estorno' and not exists (select 1 from public.movimento e where e.estorno_de = m.id)
  ) then
    raise exception 'As peças deste lançamento já tiveram outro movimento. Estorne primeiro o mais novo.'
      using errcode = 'AL007';
  end if;

  insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via, estorno_de, obs)
  values (p_obra, 'estorno', v.pessoa_id, (select auth.uid()), v.via, v.id, trim(p_motivo))
  returning id into v_estorno;

  for v_item in
    select i.unidade_id, i.avariada, i.retirada_id, u.status from public.movimento_item i
      join public.unidade u on u.id = i.unidade_id
     where i.movimento_id = v.id
     for update of u
  loop
    insert into public.movimento_item (movimento_id, obra_id, unidade_id)
    values (v_estorno, p_obra, v_item.unidade_id);
    if v.tipo = 'retirada' then
      if not exists (select 1 from public.posse where unidade_id = v_item.unidade_id and movimento_retirada_id = v.id) then
        raise exception 'As peças deste lançamento mudaram depois. Estorne primeiro o mais novo.' using errcode = 'AL007';
      end if;
      delete from public.posse where unidade_id = v_item.unidade_id;
      update public.unidade set status = 'livre' where id = v_item.unidade_id;
    else
      -- Ainda como a devolução deixou (sem conserto ou baixa no meio).
      if v_item.status <> (case when v_item.avariada then 'manutencao' else 'livre' end)::public.status_unidade then
        raise exception 'As peças deste lançamento mudaram depois. Estorne primeiro o mais novo.' using errcode = 'AL007';
      end if;
      select * into v_origem from public.movimento where id = v_item.retirada_id;
      insert into public.posse (unidade_id, obra_id, pessoa_id, desde, via, movimento_retirada_id)
      values (v_item.unidade_id, p_obra, v.pessoa_id, v_origem.criado_em, v_origem.via, v_origem.id);
      update public.unidade set status = 'em_uso' where id = v_item.unidade_id;
    end if;
  end loop;

  return v_estorno;
end;
$$;

/**
 * Manutenção: "Voltou do conserto" (volta a livre; quem lança) ou "Dar baixa" (sai do
 * estoque; só o engenheiro). Fica no log de alterações.
 */
create function public.concluir_manutencao(p_obra uuid, p_unidade uuid, p_acao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.unidade;
  v_novo public.status_unidade;
begin
  if p_acao = 'consertada' then
    if not privado.pode_lancar(p_obra) then
      raise exception 'Sem permissão nesta obra.' using errcode = '42501';
    end if;
    v_novo := 'livre';
  elsif p_acao = 'baixada' then
    if not privado.eh_engenheiro(p_obra) then
      raise exception 'Só o engenheiro dá baixa.' using errcode = '42501';
    end if;
    v_novo := 'baixada';
  else
    raise exception 'Ação inválida.' using errcode = '22023';
  end if;
  select * into v from public.unidade where id = p_unidade and obra_id = p_obra for update;
  if v.id is null or v.status <> 'manutencao' then
    raise exception 'Peça não está em manutenção.' using errcode = 'P0002';
  end if;
  update public.unidade set status = v_novo where id = v.id;
  insert into public.alteracao (obra_id, tabela, registro_id, campo, de, para, usuario_id)
  values (p_obra, 'unidade', v.id, 'status', 'manutencao', v_novo::text, (select auth.uid()));
end;
$$;

revoke all on function privado.obra_do_caminho(text) from public, anon;
-- A política do Storage roda como o usuário: ele precisa executar o helper.
grant execute on function privado.obra_do_caminho(text) to authenticated;
revoke all on function public.registrar_devolucao(uuid, uuid, uuid, jsonb, uuid),
  public.estornar_movimento(uuid, uuid, text), public.concluir_manutencao(uuid, uuid, text)
  from public, anon;
grant execute on function public.registrar_devolucao(uuid, uuid, uuid, jsonb, uuid),
  public.estornar_movimento(uuid, uuid, text), public.concluir_manutencao(uuid, uuid, text)
  to authenticated;
