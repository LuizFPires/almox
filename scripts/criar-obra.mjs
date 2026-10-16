#!/usr/bin/env node
/**
 * Cria uma obra e dá acesso de engenheiro a ela (M11 · obra do piloto). Hoje o administrador
 * faz isso no app (Conta › Administração); o script fica para a primeira obra de um projeto novo.
 *
 *   node scripts/criar-obra.mjs --env <arquivo> --obra "Nome da obra" [--endereco "..."] \
 *     --email engenheiro@empresa.com.br --nome "Nome do engenheiro" [--confirmar]
 *
 * --env: arquivo com SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SECRET_KEY.
 *        As chaves nunca são impressas.
 * Sem --confirmar, só mostra o que faria. Pode rodar de novo: completa o que faltou (login,
 * obra ou vínculo) sem duplicar.
 * Login que já existe só ganha o vínculo: a senha dele nunca é trocada nem mostrada.
 * Login novo nasce com senha provisória (mostrada uma vez, aqui) e troca obrigatória no
 * primeiro acesso, como em Cadastros › Acessos.
 */
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'

function argumentos(lista) {
  const r = {}
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i]
    if (!a.startsWith('--')) continue
    const chave = a.slice(2)
    const valor = lista[i + 1] && !lista[i + 1].startsWith('--') ? lista[++i] : true
    r[chave] = valor
  }
  return r
}

function lerEnv(arquivo) {
  const env = {}
  for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linha)
    if (m) env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2')
  }
  return env
}

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function senhaProvisoria() {
  const limite = Math.floor(256 / ALFABETO.length) * ALFABETO.length
  const c = []
  while (c.length < 12) {
    for (const b of webcrypto.getRandomValues(new Uint8Array(16))) {
      if (b < limite && c.length < 12) c.push(ALFABETO[b % ALFABETO.length])
    }
  }
  return [c.slice(0, 4), c.slice(4, 8), c.slice(8)].map((g) => g.join('')).join('-')
}

async function principal() {
  const a = argumentos(process.argv.slice(2))
  const falta = ['env', 'obra', 'email', 'nome'].filter(
    (k) => typeof a[k] !== 'string' || !a[k].trim(),
  )
  if (falta.length) {
    console.error(`Faltam: ${falta.map((f) => `--${f}`).join(', ')}`)
    return 1
  }
  const email = a.email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('E-mail inválido.')
    return 1
  }
  const env = lerEnv(a.env)
  const url = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const chave = env.SUPABASE_SECRET_KEY ?? ''
  if (!/^https?:\/\//.test(url) || !chave) {
    console.error('O arquivo --env precisa de SUPABASE_URL e SUPABASE_SECRET_KEY.')
    return 1
  }
  const cab = {
    apikey: chave,
    Authorization: `Bearer ${chave}`,
    'Content-Type': 'application/json',
  }

  async function rest(caminho, opcoes = {}) {
    const r = await fetch(`${url}/rest/v1/${caminho}`, {
      ...opcoes,
      headers: { ...cab, Prefer: 'return=representation', ...(opcoes.headers ?? {}) },
    })
    const texto = await r.text()
    if (!r.ok) throw new Error(`${caminho.split('?')[0]}: ${r.status} ${texto.slice(0, 200)}`)
    return texto ? JSON.parse(texto) : null
  }

  /** Login no Auth pelo e-mail (fonte de verdade: pega login sem linha em public.usuario). */
  async function loginPorEmail() {
    for (let pagina = 1; pagina <= 50; pagina++) {
      const r = await fetch(`${url}/auth/v1/admin/users?page=${pagina}&per_page=200`, {
        headers: cab,
      })
      if (!r.ok) throw new Error(`auth/admin/users: ${r.status}`)
      const { users = [] } = await r.json()
      const achado = users.find((u) => (u.email ?? '').toLowerCase() === email)
      if (achado) return achado.id
      if (users.length < 200) return null
    }
    return null
  }

  const projeto = new URL(url).host.split('.')[0]
  const nomeObra = a.obra.trim()
  const [obraExistente] = await rest(`obra?select=id&nome=eq.${encodeURIComponent(nomeObra)}`)
  const loginExistente = await loginPorEmail()
  const vinculo =
    obraExistente && loginExistente
      ? (
          await rest(
            `usuario_obra?select=perfil&obra_id=eq.${obraExistente.id}&usuario_id=eq.${loginExistente}`,
          )
        )[0]
      : null

  console.log(`Projeto: ${projeto}`)
  console.log(`Obra: "${nomeObra}" — ${obraExistente ? 'já existe' : 'nova'}`)
  console.log(
    `Engenheiro: ${a.nome.trim()} — ${loginExistente ? 'login já existe (a senha dele não é tocada)' : 'login novo, com senha provisória'}`,
  )
  if (vinculo) {
    console.log(`Vínculo: já existe (${vinculo.perfil}). Nada a fazer.`)
    return 0
  }
  if (!a.confirmar) {
    console.log('\nNada foi feito. Rode de novo com --confirmar.')
    return 0
  }

  // 1. Login primeiro (a senha aparece logo; se algo falhar depois, rodar de novo completa).
  let usuarioId = loginExistente
  if (!usuarioId) {
    const senha = senhaProvisoria()
    const r = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: cab,
      body: JSON.stringify({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: a.nome.trim() },
        app_metadata: { trocar_senha: true },
      }),
    })
    const corpo = await r.json().catch(() => ({}))
    if (!r.ok || !corpo.id) {
      console.error(`Não foi possível criar o login (${r.status}). Nada foi criado.`)
      return 1
    }
    usuarioId = corpo.id
    console.log(`\nLogin criado: ${email}`)
    console.log(
      `Senha provisória (mostrada só agora; ele cria a própria no primeiro acesso): ${senha}`,
    )
  }

  // 2. Obra (se ainda não existe) e 3. vínculo de engenheiro.
  let obraId = obraExistente?.id
  if (!obraId) {
    const [obra] = await rest('obra?select=id', {
      method: 'POST',
      body: JSON.stringify({
        nome: nomeObra,
        endereco: typeof a.endereco === 'string' ? a.endereco.trim() : null,
      }),
    })
    obraId = obra.id
    console.log(`Obra criada: ${obraId}`)
  }
  await rest('usuario_obra', {
    method: 'POST',
    body: JSON.stringify({ usuario_id: usuarioId, obra_id: obraId, perfil: 'engenheiro' }),
    headers: { Prefer: 'return=minimal' },
  })
  console.log(`Engenheiro vinculado à obra: ${email}`)
  return 0
}

process.exitCode = await principal()
