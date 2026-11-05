-- Extrato de materiais por período (linha do tempo): lançamentos com o saldo logo depois de cada
-- um e resumo por material (saldo no início, entradas, saídas, ajustes, saldo no fim).
--
-- O saldo de um material é a soma das quantidades vigentes dos lançamentos (apagado/desfeito
-- valem 0); conferência não mexe no saldo, mesmo com divergência. "De" e "até" são dias da obra
-- (America/Sao_Paulo), inclusive. Funções `security invoker`: a RLS da view decide o que se vê.

create function public.extrato_material_periodo(
  p_obra uuid, p_de date, p_ate date, p_material uuid default null)
returns table (
  id uuid,
  obra_id uuid,
  material_id uuid,
  tipo text,
  quantidade_original numeric,
  quantidade numeric,
  apagado boolean,
  desfeito boolean,
  editado_por_nome text,
  editado_em timestamptz,
  usuario_nome text,
  criado_em timestamptz,
  registrado_no_aparelho_em timestamptz,
  saldo_depois numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with limites as (
    select (p_de::timestamp at time zone 'America/Sao_Paulo') as inicio,
           ((p_ate + 1)::timestamp at time zone 'America/Sao_Paulo') as fim
  ),
  acumulado as (
    select e.*,
           sum(case when e.tipo <> 'conferencia' then e.quantidade else 0 end)
             over (partition by e.material_id order by e.criado_em, e.id) as saldo_depois
      from public.extrato_material e, limites l
     where e.obra_id = p_obra
       and (p_material is null or e.material_id = p_material)
       and e.criado_em < l.fim
  )
  select a.id, a.obra_id, a.material_id, a.tipo, a.quantidade_original::numeric,
         a.quantidade::numeric, a.apagado, a.desfeito, a.editado_por_nome::text, a.editado_em,
         a.usuario_nome::text, a.criado_em, a.registrado_no_aparelho_em, a.saldo_depois::numeric
    from acumulado a, limites l
   where a.criado_em >= l.inicio
   order by a.criado_em desc, a.id desc
   -- Um a mais que a tela mostra: avisa que o período tem mais lançamentos.
   limit 1001;
$$;

create function public.resumo_material_periodo(p_obra uuid, p_de date, p_ate date)
returns table (
  material_id uuid,
  saldo_inicio numeric,
  entradas numeric,
  saidas numeric,
  ajustes numeric,
  saldo_fim numeric,
  lancamentos integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with limites as (
    select (p_de::timestamp at time zone 'America/Sao_Paulo') as inicio,
           ((p_ate + 1)::timestamp at time zone 'America/Sao_Paulo') as fim
  ),
  linhas as (
    select e.material_id, e.tipo,
           case when e.tipo <> 'conferencia' then e.quantidade else 0 end as efeito,
           e.criado_em >= l.inicio as no_periodo
      from public.extrato_material e, limites l
     where e.obra_id = p_obra and e.criado_em < l.fim
  )
  select material_id,
         coalesce(sum(efeito) filter (where not no_periodo), 0)::numeric,
         coalesce(sum(efeito) filter (where no_periodo and tipo = 'entrada'), 0)::numeric,
         coalesce(-sum(efeito) filter (where no_periodo and tipo = 'saida'), 0)::numeric,
         coalesce(sum(efeito) filter (where no_periodo and tipo = 'ajuste'), 0)::numeric,
         coalesce(sum(efeito), 0)::numeric,
         (count(*) filter (where no_periodo))::integer
    from linhas
   group by material_id;
$$;

revoke all on function public.extrato_material_periodo(uuid, date, date, uuid),
  public.resumo_material_periodo(uuid, date, date)
  from public, anon;
grant execute on function public.extrato_material_periodo(uuid, date, date, uuid),
  public.resumo_material_periodo(uuid, date, date)
  to authenticated;
