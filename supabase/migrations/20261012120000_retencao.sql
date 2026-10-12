-- M10 · Retenção de dados (LGPD), proposta a validar com o jurídico (POLITICA-DE-DADOS.md):
-- - foto de avaria: apagada 12 meses depois do conserto ou da baixa da peça;
-- - fila de envios (tem e-mails) e conferências de capacete: apagadas depois de 12 meses;
-- - obra encerrada há mais de 5 anos: pessoas anonimizadas e contatos das empresas apagados;
-- - pessoa inativa sem lançamento há 5 anos: anonimizada.
-- Movimentos continuam imutáveis (RN-16): o histórico fica, mas sem dado pessoal.
-- Prazos em privado.retencao (uma linha), mudados só por quem administra o banco.

create table privado.retencao (
  id boolean primary key default true check (id),
  meses_fotos integer not null default 12 check (meses_fotos >= 1),
  meses_operacionais integer not null default 12 check (meses_operacionais >= 1),
  anos_apos_obra integer not null default 5 check (anos_apos_obra >= 1),
  anos_pessoa_inativa integer not null default 5 check (anos_pessoa_inativa >= 1)
);
insert into privado.retencao default values;
alter table privado.retencao enable row level security;
revoke all on privado.retencao from public, anon, authenticated;

alter table public.obra add column encerrada_em date;
comment on column public.obra.encerrada_em is 'Fim da obra (conta o prazo de retenção); cadastro do administrador.';
alter table public.pessoa add column anonimizada_em timestamptz;
alter table public.avaria add column foto_apagada_em timestamptz;
grant select (encerrada_em) on public.obra to authenticated;
grant select (anonimizada_em) on public.pessoa to authenticated;
grant select (foto_apagada_em) on public.avaria to authenticated;

/** Fotos de avaria vencidas: peça consertada ou baixada há mais de N meses. */
create function public.fotos_vencidas(p_limite integer default 100) returns setof text
language sql stable
security definer
set search_path = ''
as $$
  select a.foto_path from public.avaria a
   where a.foto_apagada_em is null
     and exists (
       select 1 from public.alteracao l
        where l.tabela = 'unidade' and l.registro_id = a.unidade_id and l.campo = 'status'
          and l.de = 'manutencao' and l.criado_em > a.criado_em
          and l.criado_em < now() - make_interval(months => (select meses_fotos from privado.retencao)))
   order by a.criado_em
   limit least(greatest(p_limite, 1), 500);
$$;

/** O processador apagou as fotos no Storage: a avaria fica, marcada sem foto. */
create function public.marcar_fotos_apagadas(p_caminhos text[]) returns void
language sql
security definer
set search_path = ''
as $$ update public.avaria set foto_apagada_em = now() where foto_path = any (p_caminhos) $$;

revoke all on function public.fotos_vencidas(integer), public.marcar_fotos_apagadas(text[])
  from public, anon, authenticated;
grant execute on function public.fotos_vencidas(integer), public.marcar_fotos_apagadas(text[])
  to service_role;

/** Tira o nome de uma pessoa do sistema (cadastro e itens de aviso). O token deixa de valer. */
create function privado.anonimizar_pessoa(p_pessoa uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.pessoa;
begin
  select * into v from public.pessoa where id = p_pessoa for update;
  if v.id is null or v.anonimizada_em is not null then
    return;
  end if;
  update public.aviso a
     set itens = (select jsonb_agg(case when i ->> 'pessoa' = v.nome
                                        then i || jsonb_build_object('pessoa', 'Pessoa anonimizada')
                                        else i end)
                    from jsonb_array_elements(a.itens) i)
   where a.obra_id = v.obra_id and a.itens @> jsonb_build_array(jsonb_build_object('pessoa', v.nome));
  update public.pessoa
     set nome = 'Pessoa anonimizada', nome_capacete = 'ANONIMIZADA', funcao = '-', ativa = false,
         qr_token = encode(extensions.gen_random_bytes(18), 'hex'), anonimizada_em = now()
   where id = v.id;
end;
$$;

/**
 * Aplica a retenção (agendado todo mês). Devolve o que fez, para o log do cron.
 * Pessoa com ferramenta ainda na mão nunca é anonimizada (a posse precisa de quem devolve).
 */
create function privado.aplicar_retencao() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r privado.retencao := (select x from privado.retencao x);
  v_pessoa uuid;
  v_pessoas integer := 0;
  v_empresas integer := 0;
  v_envios integer := 0;
  v_conferencias integer := 0;
begin
  for v_pessoa in
    select p.id from public.pessoa p join public.obra o on o.id = p.obra_id
     where p.anonimizada_em is null
       and not exists (select 1 from public.posse po where po.pessoa_id = p.id)
       and (
         o.encerrada_em < current_date - make_interval(years => r.anos_apos_obra)
         or (not p.ativa
             and p.criado_em < now() - make_interval(years => r.anos_pessoa_inativa)
             and not exists (select 1 from public.movimento m where m.pessoa_id = p.id
                              and m.criado_em > now() - make_interval(years => r.anos_pessoa_inativa))
             and not exists (select 1 from public.ocorrencia oc where oc.pessoa_id = p.id
                              and oc.criado_em > now() - make_interval(years => r.anos_pessoa_inativa)))
       )
  loop
    perform privado.anonimizar_pessoa(v_pessoa);
    v_pessoas := v_pessoas + 1;
  end loop;

  -- Contatos das empresas de obras encerradas há mais de N anos (e o log das trocas).
  with alvo as (
    select e.id from public.empresa e join public.obra o on o.id = e.obra_id
     where o.encerrada_em < current_date - make_interval(years => r.anos_apos_obra)
       and (e.dono_nome is not null or e.dono_email is not null or e.encarregado_email is not null)
  ), feito as (
    update public.empresa e set dono_nome = null, dono_email = null, encarregado_email = null
      from alvo where e.id = alvo.id returning e.id
  )
  select count(*) into v_empresas from feito;
  delete from public.alteracao l
   using public.empresa e join public.obra o on o.id = e.obra_id
   where l.tabela = 'empresa' and l.registro_id = e.id
     and l.campo in ('dono_nome', 'dono_email', 'encarregado_email')
     and o.encerrada_em < current_date - make_interval(years => r.anos_apos_obra);

  -- Dados operacionais: fila de envios (endereços de e-mail) e conferências de capacete.
  delete from public.envio
   where criado_em < now() - make_interval(months => r.meses_operacionais);
  get diagnostics v_envios = row_count;
  delete from public.identificacao
   where criado_em < now() - make_interval(months => r.meses_operacionais);
  get diagnostics v_conferencias = row_count;

  return jsonb_build_object('pessoas', v_pessoas, 'empresas', v_empresas, 'envios', v_envios,
    'conferencias', v_conferencias);
end;
$$;

revoke execute on function privado.anonimizar_pessoa(uuid), privado.aplicar_retencao()
  from public, anon, authenticated;

-- Todo dia 1º às 04:00 de São Paulo (07:00 UTC). As fotos vencidas saem na limpeza diária.
select cron.schedule('almox-retencao', '0 7 1 * *', $$select privado.aplicar_retencao();$$);
