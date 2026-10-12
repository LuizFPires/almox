import 'server-only'
import { after } from 'next/server'
import { processarEnvios } from './processar'

/**
 * Processa a fila de envios logo depois da resposta (encerramento, devolução que cancela
 * desconto, "Não é ele"). Se falhar, fica na fila: o agendamento tenta de novo em até 10 min.
 */
export function enviarDepois() {
  after(async () => {
    try {
      await processarEnvios()
    } catch {
      // fica na fila
    }
  })
}
