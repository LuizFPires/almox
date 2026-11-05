import 'server-only'
import type { Database } from '@/lib/supabase/tipos-banco'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { buscarTodas } from '@/lib/dados/paginar'
import { ConsultaErro } from './auth'
import { datasets, filtrosPermitidos, type Dataset } from './catalogo'

type Row = Record<string, unknown>
type DB = ReturnType<typeof criarClienteAdmin>
type Table = keyof Database['public']['Tables']
type Vinculo = {
  obra_id: string
  perfil: string
  empresa_id: string | null
  obra: { id: string; nome: string; ativa: boolean } | null
}
export type Filtros = {
  dataset: Dataset
  project_id?: string
  search?: string
  tool?: string
  person?: string
  company?: string
  status?: string
  from?: string
  to?: string
}
const norm = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
const hoje = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const date = (v: unknown) =>
  typeof v === 'string'
    ? v.length === 10
      ? v
      : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(v))
    : ''
const match = (value: unknown, filter?: string) => !filter || norm(value).includes(norm(filter))

/** Explicit projection: credentials, QR tokens, push endpoints and private operational data never leave the source. */
const tables = {
  pessoas: [
    'pessoa',
    'id,nome,nome_capacete,funcao,matricula,ativa,empresa_id,criado_em',
    'criado_em',
  ],
  empresas: ['empresa', 'id,nome,tipo,dono_nome,proxima_medicao,criado_em', 'criado_em'],
  ferramentas: [
    'tipo_ferramenta',
    'id,nome,prefixo,valor_reposicao,alto_valor,propriedade,locadora_id,criado_em',
    'criado_em',
  ],
  locadoras: ['locadora', 'id,nome,criado_em', 'criado_em'],
  avarias: [
    'avaria',
    'id,unidade_id,movimento_id,motivo,detalhes,valor_indenizacao,criado_em',
    'criado_em',
  ],
  ocorrencias: ['ocorrencia', 'id,pessoa_id,tipo,criado_em', 'criado_em'],
  avisos: ['aviso', 'id,empresa_id,total,status,enviado_em,atualizado_em', 'enviado_em'],
  descontos: [
    'desconto',
    'id,empresa_id,pessoa_id,unidade_id,tipo_nome,codigo,valor,status,criado_em,cancelado_em,medicao_id,movimento_retirada_id,primeiro_aviso_id',
    'criado_em',
  ],
  medicoes: ['medicao', 'id,empresa_id,total,fechada_em,proxima', 'fechada_em'],
  fechamentos: ['fechamento_dia', 'id,data,encerrado_em,automatico', 'data'],
} as const

export function validarFiltros(body: unknown): Filtros {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ConsultaErro(400, 'Consulta inválida.')
  const b = body as Record<string, unknown>
  if (typeof b.dataset !== 'string' || !Object.hasOwn(datasets, b.dataset))
    throw new ConsultaErro(400, 'Conjunto de dados inválido.')
  const allowed = ['dataset', ...filtrosPermitidos(String(b.dataset))]
  for (const [key, value] of Object.entries(b))
    if (!allowed.includes(key) || typeof value !== 'string' || value.length > 160)
      throw new ConsultaErro(400, 'Filtro inválido.')
  if (Boolean(b.from) !== Boolean(b.to))
    throw new ConsultaErro(400, 'Informe início e fim do período.')
  for (const key of ['from', 'to'])
    if (b[key]) {
      const parsed = new Date(`${b[key]}T12:00:00Z`)
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(String(b[key])) ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== b[key]
      )
        throw new ConsultaErro(400, 'Data inválida.')
    }
  if (b.from && String(b.from) > String(b.to)) throw new ConsultaErro(400, 'Período invertido.')
  return b as Filtros
}

/** Source-side scope mirrors ALMOX membership, active-work and restricted-company rules. */
export function exigirDataset(v: Vinculo, dataset: Dataset) {
  if (!['engenheiro', 'almoxarife', 'consulta'].includes(v.perfil) || !v.obra?.ativa)
    throw new ConsultaErro(403, 'Acesso não permitido.')
  if (
    ['avisos', 'descontos', 'medicoes'].includes(dataset) &&
    v.perfil !== 'engenheiro' &&
    !v.empresa_id
  )
    throw new ConsultaErro(403, 'Seu perfil não permite esta consulta.')
}

export type ConsultaResultado = {
  source: 'almox'
  dataset: Dataset
  partial: boolean
  total?: number
  registros?: Row[]
  [field: string]: unknown
}
export async function consultar(
  identity: string,
  f: Filtros,
  db: DB = criarClienteAdmin(),
): Promise<ConsultaResultado> {
  // Identity was signed by IOO, never supplied as a model filter. Resolve UUID or an explicitly mapped email.
  const userQuery = db
    .from('usuario')
    .select('id')
    .eq(identity.includes('@') ? 'email' : 'id', identity)
  const user = await userQuery.maybeSingle()
  if (user.error) throw new ConsultaErro(503, 'Não foi possível conferir o acesso.')
  if (!user.data) throw new ConsultaErro(403, 'Conta não vinculada no ALMOX.')
  const auth = await db.auth.admin.getUserById(user.data.id)
  const a = auth.data.user
  if (
    auth.error ||
    !a ||
    a.app_metadata?.trocar_senha === true ||
    (a.banned_until && new Date(a.banned_until).getTime() > Date.now())
  )
    throw new ConsultaErro(403, 'Acesso indisponível no ALMOX.')
  const links = await db
    .from('usuario_obra')
    .select('obra_id,perfil,empresa_id,obra:obra_id(id,nome,ativa)')
    .eq('usuario_id', user.data.id)
    .overrideTypes<Vinculo[], { merge: false }>()
  if (links.error) throw new ConsultaErro(503, 'Não foi possível conferir as obras.')
  const accessible = links.data.filter((v) => v.obra?.ativa)
  if (f.dataset === 'obras')
    return {
      source: 'almox',
      dataset: f.dataset,
      registros: accessible.map((v) => v.obra!).filter((o) => match(o.nome, f.search)),
      consultado_em: new Date().toISOString(),
      partial: false,
    }
  const selected = f.project_id
    ? accessible.filter(
        (v) => v.obra_id === f.project_id || norm(v.obra?.nome) === norm(f.project_id),
      )
    : accessible
  if (selected.length !== 1)
    return {
      source: 'almox',
      dataset: f.dataset,
      necessita_esclarecimento:
        'Informe qual destas obras deseja consultar. Não interprete ausência de obra identificada como estoque zero.',
      obras: accessible.map((v) => v.obra),
      partial: true,
    }
  const v = selected[0]!
  exigirDataset(v, f.dataset)
  const obraId = v.obra_id
  const all = (table: Table, fields: string, order = 'id') =>
    buscarTodas<Row>(
      (de, ate) =>
        db
          .from(table)
          .select(fields)
          .filter('obra_id', 'eq', obraId)
          .order(order)
          .order(order === 'movimento_id' ? 'unidade_id' : order)
          .range(de, ate)
          .overrideTypes<Row[], { merge: false }>(),
      'Dados indisponíveis.',
    )
  // Each collection is scoped in the source before it can be returned to IOO.
  const peopleAll = await all(
    'pessoa',
    'id,nome,nome_capacete,funcao,matricula,ativa,empresa_id,criado_em',
  )
  const people = peopleAll.filter((p) => !v.empresa_id || p.empresa_id === v.empresa_id)
  const personMap = new Map(people.map((p) => [p.id, p]))
  // The authoritative periods are maintained by ALMOX's own trigger. Never infer
  // historical access from current employment or rebuild it from audit entries.
  type Periodo = { pessoa_id: string; empresa_id: string; de: string; ate: string | null }
  let periods: Periodo[] = []
  if (['historico', 'avarias', 'ocorrencias'].includes(f.dataset)) {
    // Narrow RPC added by the connector migration; service_role only, never a tool.
    type PeriodQuery = {
      order(key: string): PeriodQuery
      range(
        a: number,
        b: number,
      ): PromiseLike<{ data: Periodo[] | null; error: { message: string } | null }>
    }
    const rpc = db.rpc.bind(db) as unknown as (
      name: 'ioo_periodos_empresa',
      args: { p_obra: string },
    ) => PeriodQuery
    periods = await buscarTodas<Periodo>(
      (de, ate) =>
        rpc('ioo_periodos_empresa', { p_obra: obraId })
          .order('pessoa_id')
          .order('de')
          .range(de, ate),
      'Histórico indisponível: conferir instalação do conector.',
    )
  }
  const periodAt = (r: Row) =>
    periods.find(
      (p) =>
        p.pessoa_id === r.pessoa_id &&
        (p.de === '-infinity' || Date.parse(p.de) <= Date.parse(String(r.criado_em))) &&
        (p.ate === null || Date.parse(String(r.criado_em)) < Date.parse(p.ate)),
    )
  const historical = (r: Row): Row[] => {
    const p = periodAt(r)
    if (v.empresa_id && p?.empresa_id !== v.empresa_id) return []
    return [
      {
        ...r,
        empresa_id:
          p?.empresa_id ?? peopleAll.find((person) => person.id === r.pessoa_id)?.empresa_id,
      },
    ]
  }
  const [types, units, companyRows, locadoras] = await Promise.all([
    all('tipo_ferramenta', tables.ferramentas[1]),
    all('unidade', 'id,tipo_id,codigo,status'),
    all('empresa', tables.empresas[1]),
    all('locadora', 'id,nome'),
  ])
  const companies = companyRows.filter((c) => !v.empresa_id || c.id === v.empresa_id)
  const typeMap = new Map(types.map((t) => [t.id, t]))
  const unitMap = new Map(units.map((u) => [u.id, u]))
  const enrich = (r: Row): Row => {
    const person = personMap.get(r.pessoa_id)
    const unit = unitMap.get(r.unidade_id) ?? (r.tipo_id ? r : undefined)
    const type = typeMap.get(unit?.tipo_id ?? r.tipo_id) ?? (r.prefixo ? r : undefined)
    return {
      ...r,
      ...(person
        ? {
            trabalhador: person.nome,
            nome_capacete: person.nome_capacete,
            empresa_id: r.empresa_id ?? person.empresa_id,
          }
        : {}),
      ...(unit ? { codigo: unit.codigo } : {}),
      ...(type
        ? {
            ferramenta: type.nome,
            propriedade: type.propriedade,
            valor_reposicao_centavos: type.valor_reposicao,
            locadora: locadoras.find((l) => l.id === type.locadora_id)?.nome ?? null,
          }
        : {}),
      ...(r.pessoa_id
        ? {
            empresa_do_trabalhador:
              companies.find((c) => c.id === (r.empresa_id ?? person?.empresa_id))?.nome ?? null,
          }
        : { empresa: companies.find((c) => c.id === r.empresa_id)?.nome ?? null }),
    }
  }
  let rows: Row[], dateField: string
  if (f.dataset === 'estoque') {
    rows = units.map(enrich)
    dateField = ''
  } else if (f.dataset === 'posses' || f.dataset === 'pendencias') {
    rows = (await all('posse', 'unidade_id,pessoa_id,desde,via', 'unidade_id'))
      .filter(
        (r) => personMap.has(r.pessoa_id) && (f.dataset !== 'pendencias' || date(r.desde) < hoje()),
      )
      .map(enrich)
    dateField = 'desde'
  } else if (f.dataset === 'historico' || f.dataset === 'avarias') {
    const moves = (
      await all('movimento', 'id,pessoa_id,tipo,via,criado_em,recebido_em,conferido,obs,estorno_de')
    ).flatMap(historical)
    const moveMap = new Map(moves.map((m) => [m.id, m]))
    if (f.dataset === 'historico') {
      rows = (await all('movimento_item', 'movimento_id,unidade_id,avariada', 'movimento_id'))
        .filter((i) => moveMap.has(i.movimento_id))
        .map((i) => enrich({ ...moveMap.get(i.movimento_id), ...i }))
    } else
      rows = (await all('avaria', tables.avarias[1]))
        .filter((r) => moveMap.has(r.movimento_id))
        .map((r) =>
          enrich({
            ...r,
            pessoa_id: moveMap.get(r.movimento_id)?.pessoa_id,
            empresa_id: moveMap.get(r.movimento_id)?.empresa_id,
          }),
        )
    dateField = 'criado_em'
  } else {
    const config = tables[f.dataset]
    rows =
      f.dataset === 'pessoas'
        ? people
        : f.dataset === 'empresas'
          ? companies
          : await all(config[0], config[1])
    if (f.dataset === 'ocorrencias') rows = rows.flatMap(historical)
    if (['avisos', 'descontos', 'medicoes'].includes(f.dataset) && v.empresa_id)
      rows = rows.filter((r) => r.empresa_id === v.empresa_id)
    rows = rows.map((r) => enrich(f.dataset === 'pessoas' ? { ...r, pessoa_id: r.id } : r))
    dateField = config[2]
  }
  if (f.from && !dateField)
    throw new ConsultaErro(
      400,
      'Este conjunto mostra a situação atual. Para período use histórico, posses ou pendências.',
    )
  // A transferred person's current profile may no longer be visible, although
  // their old movement is. Never turn an unavailable name into a false zero.
  if (
    (f.person || f.search) &&
    rows.some((r) => r.pessoa_id && !r.trabalhador && !r.nome_capacete)
  ) {
    return {
      source: 'almox',
      dataset: f.dataset,
      obra: v.obra,
      consultado_em: new Date().toISOString(),
      partial: true,
      necessita_esclarecimento:
        'Há registros históricos autorizados cujo cadastro atual do trabalhador não está acessível ao seu perfil. Não é possível confirmar a busca por nome ou texto. Consulte sem esse filtro ou solicite a consulta a um engenheiro autorizado. Isso não significa ausência de registros.',
    }
  }
  rows = rows.filter(
    (r) =>
      match(r.ferramenta ?? (f.dataset === 'ferramentas' ? r.nome : ''), f.tool) &&
      match(r.trabalhador ?? r.nome_capacete, f.person) &&
      match(
        r.empresa_do_trabalhador ?? r.empresa ?? (f.dataset === 'empresas' ? r.nome : ''),
        f.company,
      ) &&
      (!f.status || norm(r.status ?? r.propriedade ?? r.tipo) === norm(f.status)) &&
      match(JSON.stringify(r), f.search) &&
      (!f.from || (date(r[dateField]) >= f.from && date(r[dateField]) <= f.to!)),
  )
  const total = rows.length
  const counts: Record<string, number> = {}
  for (const r of rows) {
    const key = String(r.status ?? r.tipo ?? 'registros')
    counts[key] = (counts[key] ?? 0) + 1
  }
  const movimentos = new Map(rows.map((r) => [r.movimento_id, r]))
  const movimentosPorTipo: Record<string, number> = {}
  if (f.dataset === 'historico')
    for (const m of movimentos.values()) {
      const tipo = String(m.tipo ?? 'movimento')
      movimentosPorTipo[tipo] = (movimentosPorTipo[tipo] ?? 0) + 1
    }
  // A bounded evidence envelope; totals use the complete authorized result, never just the excerpt.
  let bytes = 0
  const returned: Row[] = []
  for (const row of rows) {
    bytes += Buffer.byteLength(JSON.stringify(row))
    if (bytes > 180000) break
    returned.push(row)
  }
  return {
    source: 'almox',
    dataset: f.dataset,
    obra: v.obra,
    consultado_em: new Date().toISOString(),
    escopo: v.empresa_id
      ? 'Somente registros da empresa permitida; estoque físico é visível por obra.'
      : 'Obra autorizada',
    significado: datasets[f.dataset],
    filtros: f,
    total,
    unidade_da_contagem:
      f.dataset === 'historico' ? 'itens movimentados, não movimentos distintos' : 'registros',
    ...(f.dataset === 'historico'
      ? {
          total_itens_movimentados: total,
          itens_por_tipo: counts,
          total_movimentos_distintos: movimentos.size,
          movimentos_por_tipo: movimentosPorTipo,
        }
      : { contagem_por_status: counts }),
    registros: returned,
    partial: returned.length < total,
    observacao:
      'Valores monetários em centavos. Empresa do trabalhador identifica vínculo laboral, não o proprietário da ferramenta. Propriedade própria/alugada descreve o acervo da obra, sem identificar o dono pelo empregador. Ausência de registros não comprova ausência de atividade fora do sistema. Histórico: cada linha é uma unidade por movimento; contagens de movimentos distintos estão separadas.',
  }
}
