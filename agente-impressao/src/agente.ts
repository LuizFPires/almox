/**
 * Agente de impressão do Almox. Roda no mini PC da TV, na rede da obra:
 * consulta a fila a cada 2 s e manda os adesivos para a impressora (porta 9100).
 * Só faz conexões de saída. Nunca registra o token nem a chave no log.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { criarApi, ErroApi } from './api.ts'
import { proximaEspera, rodarCiclo } from './ciclo.ts'
import { ErroConfig, lerConfig } from './config.ts'
import { enviarParaImpressora } from './impressora.ts'

const pasta = join(dirname(fileURLToPath(import.meta.url)), '..')
const arquivoEnv = join(pasta, '.env')
if (existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv)

function log(mensagem: string) {
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  console.log(`[${hora}] ${mensagem}`)
}

let config
try {
  config = lerConfig(process.env)
} catch (erro) {
  if (erro instanceof ErroConfig) {
    log(`Configuração: ${erro.message}`)
    process.exit(1)
  }
  throw erro
}

const api = criarApi(config)
const { intervaloMs, timeoutImpressoraMs } = config
const enviar = (ip: string, porta: number, payload: string) =>
  enviarParaImpressora(ip, porta, payload, timeoutImpressoraMs)

let parar = false
let relogio: NodeJS.Timeout | undefined
let falhasSeguidas = 0
let ultimoProblema = ''

function encerrar() {
  parar = true
  if (relogio) clearTimeout(relogio)
  log('Agente encerrado.')
  process.exit(0)
}
process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)

async function volta() {
  let naoAutorizado = false
  try {
    await rodarCiclo(api, enviar, log)
    if (falhasSeguidas > 0) log('Conexão com o Almox restabelecida.')
    falhasSeguidas = 0
    ultimoProblema = ''
  } catch (erro) {
    falhasSeguidas++
    naoAutorizado = erro instanceof ErroApi && erro.naoAutorizado
    const problema = naoAutorizado
      ? 'Token do dispositivo recusado (revogado?). Cadastre de novo na tela Impressora.'
      : erro instanceof Error
        ? erro.message
        : 'erro desconhecido'
    // Só registra quando o problema muda, para o log não crescer a cada 2 s.
    if (problema !== ultimoProblema) log(`Problema: ${problema}`)
    ultimoProblema = problema
  }
  if (!parar) relogio = setTimeout(volta, proximaEspera(intervaloMs, falhasSeguidas, naoAutorizado))
}

try {
  const obra = await api.ping()
  log(`Agente ligado na obra "${obra}". Consultando a fila a cada ${intervaloMs / 1000} s.`)
} catch (erro) {
  log(
    `Ainda sem falar com o Almox: ${erro instanceof Error ? erro.message : erro}. Tentando de novo.`,
  )
}
void volta()
