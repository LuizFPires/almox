import { ErroApi, type Api } from './api.ts'

export type Enviar = (ip: string, porta: number, payload: string) => Promise<void>
export type Log = (mensagem: string) => void

export type ResultadoCiclo = { enviados: number; erros: number }

/**
 * Uma volta: pega os trabalhos da fila, manda um por vez para a impressora e informa o
 * resultado. Falha da impressora vira status "erro" no trabalho (aparece na tela).
 */
export async function rodarCiclo(api: Api, enviar: Enviar, log: Log): Promise<ResultadoCiclo> {
  const trabalhos = await api.proximos()
  const resultado = { enviados: 0, erros: 0 }
  for (const t of trabalhos) {
    try {
      await enviar(t.ip, t.porta, t.payload)
      await api.concluir(t.id, true)
      resultado.enviados++
      log(`Impresso: ${t.descricao}`)
    } catch (erro) {
      // Erro da API ao concluir: o trabalho fica "enviando" e volta à fila em 1 minuto.
      if (erro instanceof ErroApi) throw erro
      const motivo = erro instanceof Error ? erro.message : 'falha ao imprimir'
      resultado.erros++
      log(`Erro em "${t.descricao}": impressora ${motivo}`)
      await api.concluir(t.id, false, motivo)
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
