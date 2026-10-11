-- M3 (revisão) · privilégios, impressora só na rede local, fila sem impressão dupla.

-- 1. O grant geral em privado.* da migration do M3 devolveu as funções de gatilho que o
--    M2 tinha tirado do cliente. Tira de novo.
revoke execute on function privado.conferir_posse_status(), privado.conferir_empresa_consulta(),
  privado.bloquear_alteracao(), privado.registrar_alteracoes(), privado.conferir_tipo_empresa()
  from authenticated;

-- 2. Impressora só na rede da obra (IPv4 privado; 127.x = o próprio mini PC) e na porta RAW.
--    Sem isso o agente mandaria bytes para qualquer endereço da internet.
alter table public.impressora
  add constraint impressora_ip_rede_local check (
    family(ip) = 4 and (ip << inet '10.0.0.0/8' or ip << inet '172.16.0.0/12'
      or ip << inet '192.168.0.0/16' or ip << inet '127.0.0.0/8')),
  add constraint impressora_porta_raw check (porta between 9100 and 9199);

-- 3. Fila: quem pegou o trabalho, quantas vezes foi pego; índice que serve à consulta.
alter table public.trabalho_impressao
  add column pego_por uuid references public.dispositivo_tv (id),
  add column tentativas integer not null default 0;
drop index public.trabalho_impressao_pendente;
create index trabalho_impressao_fila on public.trabalho_impressao (obra_id, criado_em)
  where status in ('pendente', 'enviando');

-- 4. Só aceita etiqueta (ZPL começa com ^XA; TSPL com SIZE).
create or replace function public.enfileirar_impressao(
  p_obra uuid,
  p_tipo text,
  p_descricao text,
  p_payload text,
  p_copias integer,
  p_pessoa uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_impressora uuid;
  v_id uuid;
begin
  if not privado.eh_engenheiro(p_obra) then
    raise exception 'Só o engenheiro da obra imprime.' using errcode = '42501';
  end if;
  if coalesce(p_payload, '') !~ '^(\^XA|SIZE )' then
    raise exception 'Conteúdo de etiqueta inválido.' using errcode = '22023';
  end if;
  select id into v_impressora from public.impressora where obra_id = p_obra and ativa;
  if v_impressora is null then
    raise exception 'Nenhuma impressora escolhida para esta obra.' using errcode = 'P0002';
  end if;
  insert into public.trabalho_impressao (obra_id, impressora_id, tipo, pessoa_id, descricao, payload, copias)
  values (p_obra, v_impressora, p_tipo, p_pessoa, coalesce(p_descricao, ''), p_payload, p_copias)
  returning id into v_id;
  return v_id;
end;
$$;

/**
 * Pega até 5 trabalhos e marca quem pegou. "enviando" sem confirmação há mais de 3 minutos
 * (pior caso do agente: 5 × 10 s de impressora + confirmações) volta para a fila; depois de
 * 3 tentativas vira erro, para não imprimir o mesmo adesivo sem parar.
 */
create or replace function public.agente_proximos(p_token text)
returns table (id uuid, payload text, ip text, porta integer, descricao text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v public.dispositivo_tv := privado.dispositivo_por_token(p_token);
begin
  if v.id is null then
    raise exception 'Dispositivo não autorizado.' using errcode = '42501';
  end if;
  update public.dispositivo_tv set ultimo_ping = now() where dispositivo_tv.id = v.id;

  update public.trabalho_impressao t
     set status = 'erro',
         erro = 'o agente não confirmou a impressão. Confira se o adesivo saiu antes de reimprimir.',
         payload = '', atualizado_em = now()
   where t.obra_id = v.obra_id and t.status = 'enviando' and t.tentativas >= 3
     and t.atualizado_em < now() - interval '3 minutes';

  return query
    with livres as (
      select t.id from public.trabalho_impressao t
       where t.obra_id = v.obra_id
         and (t.status = 'pendente' or (t.status = 'enviando' and t.atualizado_em < now() - interval '3 minutes'))
       order by t.criado_em
       limit 5
       for update skip locked
    ), pegos as (
      update public.trabalho_impressao t
         set status = 'enviando', pego_por = v.id, tentativas = t.tentativas + 1, atualizado_em = now()
        from livres where t.id = livres.id
      returning t.id, t.payload, t.impressora_id, t.descricao
    )
    select p.id, p.payload, host(i.ip), i.porta, p.descricao
      from pegos p join public.impressora i on i.id = p.impressora_id;
end;
$$;

-- Só quem pegou conclui; o conteúdo (com o token do QR) não fica guardado depois.
create or replace function public.agente_concluir(p_token text, p_trabalho uuid, p_ok boolean, p_erro text)
returns void
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
  update public.trabalho_impressao
     set status = case when p_ok then 'enviado'::public.status_impressao else 'erro'::public.status_impressao end,
         erro = case when p_ok then null else left(coalesce(p_erro, 'falha ao imprimir'), 300) end,
         enviado_em = case when p_ok then now() else null end,
         payload = '',
         atualizado_em = now()
   where id = p_trabalho and obra_id = v.obra_id and status = 'enviando' and pego_por = v.id;
end;
$$;

-- Trabalhos já concluídos antes desta migration: tira o conteúdo também.
update public.trabalho_impressao set payload = '' where status in ('enviado', 'erro');
