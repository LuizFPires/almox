// Teste de resistência do painel da TV (M8: "72 h sem travar nem vazar memória").
//
// Roda o /tv num Chromium com a configuração acelerada (cada ciclo dura segundos em vez de
// ~1 min), recolhe o lixo e mede memória, nós do DOM e listeners em intervalos. Falha se algo
// cresce depois do aquecimento. Uso (com `npm run dev` ou `npm start` e o Supabase local):
//
//   node scripts/soak-tv.mjs [minutos=10] [url=http://localhost:3000]
//
// Só para desenvolvimento: usa o login do seed para criar um dispositivo e acelerar a obra
// de demonstração, e devolve a configuração padrão no fim.
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const minutos = Number(process.argv[2] ?? 10)
const base = process.argv[3] ?? 'http://localhost:3000'
const OBRA = 'a0000000-0000-4000-8000-000000000001'

const env = readFileSync('.env.local', 'utf8').split('\n')
const valor = (k) =>
  (env.find((l) => l.startsWith(`${k}=`)) ?? '')
    .slice(k.length + 1)
    .trim()
    .replace(/^"(.*)"$/, '$1')
const url = valor('NEXT_PUBLIC_SUPABASE_URL')
const chave = valor('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
  console.error('Só roda contra o Supabase local (.env.local).')
  process.exit(1)
}

const login = await (
  await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: chave, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'engenheiro@almox.exemplo', password: 'almox-dev-2026' }),
  })
).json()
const cabecalhos = {
  apikey: chave,
  Authorization: `Bearer ${login.access_token}`,
  'content-type': 'application/json',
}
const rpc = async (nome, corpo) => {
  const r = await fetch(`${url}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: cabecalhos,
    body: JSON.stringify(corpo),
  })
  if (!r.ok) throw new Error(`${nome}: ${await r.text()}`)
  const texto = await r.text()
  return texto ? JSON.parse(texto) : null
}
const configurar = (tempo, velocidade, antes, depois) =>
  rpc('salvar_config_tv', {
    p_obra: OBRA,
    p_tempo_pagina_s: tempo,
    p_velocidade_px_s: velocidade,
    p_pausa_antes_ms: antes,
    p_pausa_depois_ms: depois,
    p_cartoes_por_pagina: 12,
  })

const get = async (caminho) => {
  const r = await fetch(`${url}/rest/v1/${caminho}`, { headers: cabecalhos })
  if (!r.ok) throw new Error(`${caminho}: ${await r.text()}`)
  return r.json()
}

await configurar(3, 150, 500, 500)
const nomeMiniPc = `Soak ${Date.now()}`
await rpc('criar_dispositivo', { p_obra: OBRA, p_nome: nomeMiniPc })
const [miniPc] = await get(`dispositivo_tv?select=id&nome=eq.${encodeURIComponent(nomeMiniPc)}`)
const codigo = await rpc('gerar_codigo_tv', { p_dispositivo: miniPc.id })

// Dados mudando durante o teste (o caminho de re-render que mais poderia vazar): uma peça
// própria do soak vai e volta da mesma pessoa a cada 20 s.
const [pessoa] = await get(`pessoa?select=id&obra_id=eq.${OBRA}&nome=eq.Joaquim%20Silva`)
const prefixo = Array.from({ length: 4 }, () =>
  String.fromCharCode(65 + Math.floor(Math.random() * 26)),
).join('')
const tipoCriado = await fetch(`${url}/rest/v1/tipo_ferramenta?select=id`, {
  method: 'POST',
  headers: { ...cabecalhos, Prefer: 'return=representation' },
  body: JSON.stringify({
    obra_id: OBRA,
    nome: `Soak ${prefixo}`,
    icone: 'regua',
    prefixo,
    valor_reposicao: 100,
  }),
}).then((r) => r.json())
const tipo = tipoCriado[0].id
await rpc('adicionar_unidades', { p_tipo: tipo, p_quantidade: 1 })
let comEle = false
const lancamento = (t) =>
  rpc(t === 'retirada' ? 'registrar_retirada' : 'registrar_devolucao', {
    p_obra: OBRA,
    p_pessoa: pessoa.id,
    p_identificacao: null,
    p_itens: [{ tipo, quantidade: 1 }],
    ...(t === 'retirada' ? { p_confirmado: true } : {}),
  })
const mudarDados = setInterval(() => {
  const t = comEle ? 'devolucao' : 'retirada'
  comEle = !comEle
  lancamento(t).catch((e) => console.error(`lançamento: ${e.message}`))
}, 20_000)

const navegador = await chromium.launch()
try {
  const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } })
  const cdp = await pagina.context().newCDPSession(pagina)
  await cdp.send('Performance.enable')
  await pagina.goto(`${base}/tv/entrar?c=${codigo}`)
  await pagina.getByText(/Pessoas 1–/).waitFor({ timeout: 60_000 })

  const medir = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    const { metrics } = await cdp.send('Performance.getMetrics')
    const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]))
    return {
      heapMb: m.JSHeapUsedSize / 1024 / 1024,
      nos: m.Nodes,
      listeners: m.JSEventListeners,
      ciclos: m.TaskDuration,
    }
  }

  const amostras = []
  const inicio = Date.now()
  const intervaloMs = Math.max(15_000, (minutos * 60_000) / 20)
  while (Date.now() - inicio < minutos * 60_000) {
    await new Promise((r) => setTimeout(r, intervaloMs))
    const a = await medir()
    amostras.push(a)
    console.log(
      `${((Date.now() - inicio) / 60_000).toFixed(1).padStart(5)} min  ` +
        `heap ${a.heapMb.toFixed(1)} MB  nós ${a.nos}  listeners ${a.listeners}`,
    )
  }

  // Depois do aquecimento (primeiro quarto), compara a primeira metade com a segunda. Os nós
  // variam com a fase (páginas × colunas), então vale o pico de cada metade, não a última
  // amostra; memória pela média.
  const aquecido = amostras.slice(Math.floor(amostras.length / 4))
  const meio = Math.floor(aquecido.length / 2)
  const [a, b] = [aquecido.slice(0, meio), aquecido.slice(meio)]
  const media = (xs, f) => xs.reduce((s, x) => s + f(x), 0) / xs.length
  const pico = (xs, f) => Math.max(...xs.map(f))
  const problemas = []
  const heapA = media(a, (x) => x.heapMb)
  const heapB = media(b, (x) => x.heapMb)
  if (heapB > heapA * 1.2 + 1) {
    problemas.push(`heap médio cresceu de ${heapA.toFixed(1)} para ${heapB.toFixed(1)} MB`)
  }
  const listA = pico(a, (x) => x.listeners)
  const listB = pico(b, (x) => x.listeners)
  if (listB > listA + 20) problemas.push(`listeners cresceram de ${listA} para ${listB}`)
  const nosA = pico(a, (x) => x.nos)
  const nosB = pico(b, (x) => x.nos)
  if (nosB > nosA * 1.2) problemas.push(`pico de nós do DOM cresceu de ${nosA} para ${nosB}`)
  if (problemas.length > 0) {
    console.error(`FALHOU: ${problemas.join('; ')}`)
    process.exitCode = 1
  } else {
    console.log(`OK: ${minutos} min sem crescimento de memória, nós ou listeners.`)
  }
} finally {
  clearInterval(mudarDados)
  await navegador.close()
  if (comEle) await lancamento('devolucao').catch(() => undefined)
  await rpc('revogar_dispositivo', { p_dispositivo: miniPc.id })
  await configurar(8, 45, 2500, 3000)
}
