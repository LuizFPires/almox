-- Ferramenta própria ou alugada (decisão de 13/10/2026): alugada exige a locadora. As
-- locadoras ficam salvas por obra para escolher de novo nos próximos cadastros (o nome não se
-- repete, sem diferença de maiúsculas, acentos ou espaços). Cadastro só do engenheiro.

create table public.locadora (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obra (id),
  nome text not null check (length(btrim(nome)) between 2 and 80),
  criado_em timestamptz not null default now(),
  unique (id, obra_id)
);
-- Chave do nome para não repetir locadora: sem acento, minúsculas, espaços simples.
create function privado.chave_nome(p_nome text) returns text
language sql immutable
set search_path = ''
as $$
  select lower(translate(regexp_replace(btrim(p_nome), '\s+', ' ', 'g'),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
$$;
revoke all on function privado.chave_nome(text) from public, anon;
grant execute on function privado.chave_nome(text) to authenticated;
create unique index locadora_nome_unico on public.locadora (obra_id, privado.chave_nome(nome));

alter table public.locadora enable row level security;
create policy locadora_ler on public.locadora for select to authenticated
  using (privado.tem_acesso(obra_id));
create policy locadora_criar on public.locadora for insert to authenticated
  with check (privado.eh_engenheiro(obra_id));
revoke all on public.locadora from public, anon, authenticated;
grant select (id, obra_id, nome, criado_em) on public.locadora to authenticated;
grant insert (obra_id, nome) on public.locadora to authenticated;

alter table public.tipo_ferramenta
  add column propriedade text not null default 'propria'
    check (propriedade in ('propria', 'alugada')),
  add column locadora_id uuid,
  add constraint tipo_ferramenta_locadora_fk foreign key (locadora_id, obra_id)
    references public.locadora (id, obra_id),
  add constraint tipo_ferramenta_alugada_tem_locadora
    check ((propriedade = 'alugada') = (locadora_id is not null));
grant select (propriedade, locadora_id) on public.tipo_ferramenta to authenticated;
grant insert (propriedade, locadora_id) on public.tipo_ferramenta to authenticated;
grant update (propriedade, locadora_id) on public.tipo_ferramenta to authenticated;

-- Mudança de própria/alugada e de locadora entra no histórico da ferramenta.
drop trigger tipo_ferramenta_log on public.tipo_ferramenta;
create trigger tipo_ferramenta_log
  after insert or update on public.tipo_ferramenta
  for each row execute function privado.registrar_alteracoes(
    'id', 'valor_reposicao', 'alto_valor', 'nome', 'propriedade', 'locadora_id'
  );
