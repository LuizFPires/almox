#!/usr/bin/env node
/**
 * Torna um login administrador do Almox (cria e encerra obras, liga engenheiros e gera senha
 * de qualquer obra, na tela Administração). Ninguém vira administrador pelo app.
 *
 *   node scripts/tornar-administrador.mjs [--env <arquivo>] --email pessoa@empresa.com.br [--remover] [--confirmar]
 *
 * --env: arquivo com SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SECRET_KEY; sem ele,
 *        usa as variáveis de ambiente com esses nomes. As chaves nunca são impressas.
 * O login precisa existir (dê o acesso pela obra antes). Sem --confirmar, só mostra o que faria.
 */
import { readFileSync } from 'node:fs'

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

async function principal() {
  const a = argumentos(process.argv.slice(2))
  if (typeof a.email !== 'string' || !a.email.trim()) {
    console.error('Falta --email.')
    return 1
  }
  const email = a.email.trim().toLowerCase()
  const env = typeof a.env === 'string' ? lerEnv(a.env) : process.env
  const url = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const chave = env.SUPABASE_SECRET_KEY ?? ''
  if (!/^https?:\/\//.test(url) || !chave) {
    console.error('Preciso de SUPABASE_URL e SUPABASE_SECRET_KEY (--env ou variáveis de ambiente).')
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

  const projeto = new URL(url).host.split('.')[0]
  const [usuario] = await rest(`usuario?select=id,nome&email=eq.${encodeURIComponent(email)}`)
  if (!usuario) {
    console.error('Login não encontrado. Dê o acesso a uma obra antes.')
    return 1
  }
  const [atual] = await rest(`administrador?select=usuario_id&usuario_id=eq.${usuario.id}`)
  console.log(`Projeto: ${projeto}`)
  console.log(
    `Login: ${usuario.nome || email} — ${atual ? 'já é administrador' : 'não é administrador'}`,
  )
  const remover = Boolean(a.remover)
  if (Boolean(atual) !== remover) {
    console.log('Nada a fazer.')
    return 0
  }
  if (!a.confirmar) {
    console.log(
      `\nNada foi feito. Rode de novo com --confirmar para ${remover ? 'remover' : 'tornar administrador'}.`,
    )
    return 0
  }
  if (remover) {
    await rest(`administrador?usuario_id=eq.${usuario.id}`, { method: 'DELETE' })
    console.log('Deixou de ser administrador.')
  } else {
    await rest('administrador', {
      method: 'POST',
      body: JSON.stringify({ usuario_id: usuario.id }),
      headers: { Prefer: 'return=minimal' },
    })
    console.log('Agora é administrador (Conta › Administração).')
  }
  return 0
}

process.exitCode = await principal()
