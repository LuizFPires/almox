import { beforeEach, expect, it, vi } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ criarClienteAdmin: vi.fn() }))
import { autenticar } from './auth'
import { consultar, validarFiltros, exigirDataset } from './consulta'
const org = '6d9394db-7fe2-4cc8-937c-440bfe3d7b05',
  uid = '6d652f19-8e57-46aa-80d0-582da78ee6e3'
beforeEach(() => vi.unstubAllEnvs())
it('requires service credential, valid signature, audience, time and allowed organization', () => {
  const keys = generateKeyPairSync('ed25519')
  vi.stubEnv('IOO_API_TOKEN', 'service')
  vi.stubEnv('IOO_SIGNING_KID', 'test')
  vi.stubEnv(
    'IOO_SIGNING_PUBLIC_KEY',
    keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  )
  vi.stubEnv('IOO_ALLOWED_ORGANIZATIONS', org)
  const token = (patch: Record<string, unknown> = {}) => {
    const now = Math.floor(Date.now() / 1000)
    const h = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: 'test' })).toString(
        'base64url',
      ),
      p = Buffer.from(
        JSON.stringify({
          iss: 'ioo',
          aud: 'almox',
          sub: uid,
          org,
          ext: uid,
          iat: now,
          exp: now + 60,
          ...patch,
        }),
      ).toString('base64url')
    return `${h}.${p}.${sign(null, Buffer.from(`${h}.${p}`), keys.privateKey).toString('base64url')}`
  }
  const req = (assertion: string, service = 'service') =>
    new Request('http://local', {
      headers: { authorization: `Bearer ${service}`, 'x-ioo-assertion': assertion },
    })
  expect(autenticar(req(token())).externalIdentity).toBe(uid)
  for (const patch of [
    { aud: 'warbra' },
    { org: uid },
    { exp: 1 },
    { iat: 9999999999 },
    { ext: 'invalid' },
  ])
    expect(() => autenticar(req(token(patch)))).toThrow()
  expect(() => autenticar(req(token(), 'wrong'))).toThrow()
  const forged = token().split('.')
  forged[1] = Buffer.from(JSON.stringify({ ext: 'other' })).toString('base64url')
  expect(() => autenticar(req(forged.join('.')))).toThrow()
})
it('validates datasets and filters rather than accepting SQL or ignored period', () => {
  expect(() => validarFiltros({ dataset: 'auth.users' })).toThrow()
  expect(() =>
    validarFiltros({ dataset: 'estoque', from: '2026-11-01', to: '2026-11-02' }),
  ).toThrow()
  expect(() => validarFiltros({ dataset: 'posses', usuario_id: uid })).toThrow()
  expect(() =>
    validarFiltros({ dataset: 'posses', from: '2026-11-31', to: '2026-12-01' }),
  ).toThrow()
  expect(() => validarFiltros({ dataset: 'posses', from: '2026-11-02' })).toThrow()
})
function fixture(
  company: string | null = 'a',
  perfil = 'consulta',
  extra: Record<string, Record<string, unknown>[]> = {},
  rpcError = false,
) {
  const tables: Record<string, Record<string, unknown>[]> = {
    usuario: [{ id: uid }],
    usuario_obra: [
      {
        obra_id: 'obra',
        perfil,
        empresa_id: company,
        obra: { id: 'obra', nome: 'Teste', ativa: true },
      },
    ],
    pessoa: [
      { id: 'p1', nome: 'Ana', empresa_id: 'a', obra_id: 'obra' },
      { id: 'p2', nome: 'Bruno', empresa_id: 'b', obra_id: 'obra' },
    ],
    empresa: [
      { id: 'a', nome: 'Empresa A', obra_id: 'obra' },
      { id: 'b', nome: 'Empresa B', obra_id: 'obra' },
    ],
    tipo_ferramenta: [
      {
        id: 't',
        nome: 'Furadeira',
        propriedade: 'propria',
        valor_reposicao: 10000,
        obra_id: 'obra',
      },
    ],
    unidade: [
      { id: 'u1', tipo_id: 't', codigo: 'FU-01', status: 'em_uso', obra_id: 'obra' },
      { id: 'u2', tipo_id: 't', codigo: 'FU-02', status: 'em_uso', obra_id: 'obra' },
    ],
    posse: [
      { unidade_id: 'u1', pessoa_id: 'p1', desde: '2026-10-01T12:00:00Z', obra_id: 'obra' },
      { unidade_id: 'u2', pessoa_id: 'p2', desde: '2026-10-01T12:00:00Z', obra_id: 'obra' },
    ],
    ...extra,
  }
  const db = {
    rpc: () => {
      const q = {
        order: () => q,
        range: async (a: number, b: number) => ({
          data: rpcError ? null : (tables.periodos ?? []).slice(a, b + 1),
          error: rpcError ? { message: 'missing function' } : null,
        }),
      }
      return q
    },
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: { id: uid, app_metadata: {} } }, error: null }),
      },
    },
    from: (table: string) => {
      let rows = tables[table] ?? []
      const q = {
        select: () => q,
        order: () => q,
        overrideTypes: () => q,
        eq: (key: string, value: unknown) => {
          if (key !== 'usuario_id' && key !== 'id') rows = rows.filter((r) => r[key] === value)
          return q
        },
        filter: (key: string, _op: string, value: unknown) => {
          rows = rows.filter((r) => r[key] === value)
          return q
        },
        range: (a: number, b: number) => {
          rows = rows.slice(a, b + 1)
          return q
        },
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (done: (v: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(done),
      }
      return q
    },
  }
  return db as unknown as Parameters<typeof consultar>[2]
}
it('keeps company custody isolated while allowing the whole-work stock defined by ALMOX', async () => {
  const custody = await consultar(uid, { dataset: 'posses' }, fixture())
  expect(custody.total).toBe(1)
  expect(JSON.stringify(custody)).toContain('Ana')
  expect(JSON.stringify(custody)).not.toContain('Bruno')
  const stock = await consultar(uid, { dataset: 'estoque' }, fixture())
  expect(stock.total).toBe(2)
  const engineer = await consultar(uid, { dataset: 'posses' }, fixture(null, 'engenheiro'))
  expect(engineer.total).toBe(2)
  const unknown = await consultar(uid, { dataset: 'estoque', project_id: 'outra' }, fixture())
  expect(unknown).toHaveProperty('necessita_esclarecimento')
  expect(unknown).not.toHaveProperty('total', 0)
})
it('does not expand a clerk into engineer-only financial visibility', () => {
  const v = {
    obra_id: 'o',
    empresa_id: null,
    perfil: 'almoxarife',
    obra: { id: 'o', nome: 'o', ativa: true },
  }
  expect(() => exigirDataset(v, 'descontos')).toThrow()
  expect(() => exigirDataset(v, 'medicoes')).toThrow()
  expect(() => exigirDataset(v, 'avisos')).toThrow()
  expect(() => exigirDataset({ ...v, perfil: 'engenheiro' }, 'descontos')).not.toThrow()
  expect(() => exigirDataset({ ...v, obra: { ...v.obra, ativa: false } }, 'estoque')).toThrow()
})
it('keeps past records with their historical company including the exact transfer instant', async () => {
  const before = '2026-10-01T12:00:00Z',
    boundary = '2026-10-02T12:00:00Z'
  const data = {
    pessoa: [{ id: 'p1', nome: 'Ana', empresa_id: 'b', obra_id: 'obra' }],
    periodos: [
      { pessoa_id: 'p1', empresa_id: 'a', de: '-infinity', ate: boundary },
      { pessoa_id: 'p1', empresa_id: 'b', de: boundary, ate: null },
    ],
    movimento: [
      { id: 'm1', pessoa_id: 'p1', criado_em: before, obra_id: 'obra' },
      { id: 'm2', pessoa_id: 'p1', criado_em: boundary, obra_id: 'obra' },
      { id: 'm3', pessoa_id: 'sem-periodo', criado_em: before, obra_id: 'obra' },
    ],
    movimento_item: [
      { movimento_id: 'm1', unidade_id: 'u1', obra_id: 'obra' },
      { movimento_id: 'm2', unidade_id: 'u2', obra_id: 'obra' },
      { movimento_id: 'm3', unidade_id: 'u2', obra_id: 'obra' },
    ],
    avaria: [
      { id: 'a1', movimento_id: 'm1', unidade_id: 'u1', criado_em: boundary, obra_id: 'obra' },
    ],
    ocorrencia: [
      { id: 'o1', pessoa_id: 'p1', criado_em: before, obra_id: 'obra' },
      { id: 'o2', pessoa_id: 'p1', criado_em: boundary, obra_id: 'obra' },
    ],
    desconto: [{ id: 'd1', pessoa_id: 'p1', empresa_id: 'a', valor: 10000, obra_id: 'obra' }],
  }
  for (const dataset of ['historico', 'ocorrencias'] as const) {
    const a = await consultar(uid, { dataset }, fixture('a', 'consulta', data)),
      b = await consultar(uid, { dataset }, fixture('b', 'consulta', data))
    expect(a.total).toBe(1)
    expect(b.total).toBe(1)
    expect(a.registros?.[0]).toMatchObject({ empresa_id: 'a', criado_em: before })
    expect(b.registros?.[0]).toMatchObject({ empresa_id: 'b', criado_em: boundary })
  }
  const history = await consultar(uid, { dataset: 'historico' }, fixture('a', 'consulta', data))
  expect(history).toHaveProperty('total_movimentos_distintos', 1)
  expect(history.registros?.[0]).toHaveProperty('empresa_do_trabalhador', 'Empresa A')
  expect(history.registros?.[0]).not.toHaveProperty('empresa')
  expect((await consultar(uid, { dataset: 'avarias' }, fixture('a', 'consulta', data))).total).toBe(
    1,
  )
  expect((await consultar(uid, { dataset: 'avarias' }, fixture('b', 'consulta', data))).total).toBe(
    0,
  )
  expect(
    (await consultar(uid, { dataset: 'descontos' }, fixture('a', 'consulta', data))).total,
  ).toBe(1)
  expect(
    (await consultar(uid, { dataset: 'descontos' }, fixture('b', 'consulta', data))).total,
  ).toBe(0)
  await expect(
    consultar(uid, { dataset: 'historico' }, fixture('a', 'consulta', data, true)),
  ).rejects.toThrow()
  for (const dataset of ['historico', 'descontos', 'avarias', 'ocorrencias'] as const) {
    const filtered = await consultar(
      uid,
      { dataset, person: 'Ana' },
      fixture('a', 'consulta', data),
    )
    expect(filtered.partial).toBe(true)
    expect(filtered).toHaveProperty('necessita_esclarecimento')
    expect(filtered).not.toHaveProperty('total', 0)
  }
})
