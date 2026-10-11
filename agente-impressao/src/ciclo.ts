import type { Api } from './api.ts'

export type Enviar = (ip: string, porta: number, payload: string) => Promise<void>
export type Log = (mensagem: string) => void
export type Esperar = (ms: number) => Promise<void>

export type ResultadoCiclo = { enviados: number; erros: number }

const esperarDeVerdade: Esperar = (ms) => new Promise((r) => setTimeout(r, ms))

/** Começo do id, para o log (sem nome nem matrícula de ninguém). */
export const idCurto = (id: string) => id.slice(0, 8)

/** Limite da memória de "impresso, falta confirmar" (os mais antigos saem primeiro). */
const MEMORIA_MAXIMA = 200

/**
 * Informa o resultado ao Almox, tentando de novo algumas vezes: se a confirmação se
 * perder, o trabalho volta para a fila e o adesivo sairia duas vezes.
 */
async function confirmar(
  api: Api,
  id: string,
  ok: boolean,
  motivo: string | undefined,
  esperar: Esperar,
) {
  const esperas = [1000, 3000]
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await api.concluir(id, ok, motivo)
    } catch (erro) {
      const espera = esperas[tentativa]
      if (espera === undefined) throw erro
      await esperar(espera)
    }
  }
}

/**
 * Uma volta: pega os trabalhos da fila, manda um por vez para a impressora e informa o
 * resultado. Falha da impressora vira status "erro" no trabalho (aparece na tela).
 *
 * `impressos` guarda, entre as voltas, o que já saiu na impressora mas ainda não foi
 * confirmado: se o trabalho voltar da fila, só confirma, sem imprimir de novo.
 */
export async function rodarCiclo(
  api: Api,
  enviar: Enviar,
  log: Log,
  impressos: Set<string> = new Set(),
  esperar: Esperar = esperarDeVerdade,
): Promise<ResultadoCiclo> {
  const trabalhos = await api.proximos()
  const resultado = { enviados: 0, erros: 0 }
  for (const t of trabalhos) {
    let motivo: string | undefined
    if (impressos.has(t.id)) {
      log(`Trabalho ${idCurto(t.id)} já tinha saído; só confirmando.`)
    } else {
      try {
        await enviar(t.ip, t.porta, t.payload)
        impressos.add(t.id)
        if (impressos.size > MEMORIA_MAXIMA) {
          const maisAntigo = impressos.values().next().value
          if (maisAntigo) impressos.delete(maisAntigo)
        }
      } catch (erro) {
        motivo = erro instanceof Error ? erro.message : 'falha ao imprimir'
      }
    }
    // Se mesmo assim a confirmação falhar, o erro sobe e a volta termina aqui.
    await confirmar(api, t.id, motivo === undefined, motivo, esperar)
    if (motivo === undefined) {
      impressos.delete(t.id)
      resultado.enviados++
      log(`Impresso: trabalho ${idCurto(t.id)}`)
    } else {
      resultado.erros++
      log(`Erro no trabalho ${idCurto(t.id)}: impressora ${motivo}`)
    }
  }
  return resultado
}

/** Espera até a próxima consulta: 2 s normal; mais devagar quando algo está fora. */
export function proximaEspera(intervaloMs: number, falhasSeguidas: number, naoAutorizado: boolean) {
  if (naoAutorizado) return 60_000
  if (falhasSeguidas === 0) return intervaloMs
  return Math.min(30_000, intervaloMs * 2 ** Math.min(falhasSeguidas, 4))
}
