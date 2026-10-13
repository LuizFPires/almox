'use client'

import { destinoDoEnvio, type DadosOffline, type RespostaEnvio } from '@/lib/dominio/offline'
import { criarClienteNavegador } from '@/lib/supabase/navegador'
import { guardarDados, guardarNaFila, listarFila, tirarDaFila } from './banco'

type Cliente = ReturnType<typeof criarClienteNavegador>

/** Usuário logado neste celular (lido do cookie da sessão; funciona sem internet). */
export async function usuarioAtual(cliente: Cliente = criarClienteNavegador()) {
  const { data } = await cliente.auth.getSession()
  return data.session?.user.id ?? null
}

/** Download em andamento por obra: pedidos iguais ao mesmo tempo usam o mesmo. */
const baixando = new Map<string, Promise<boolean>>()

/**
 * Baixa e guarda os dados da obra para lançar sem internet (só almoxarife e engenheiro). Se já
 * há um download dessa obra em andamento, espera ele em vez de baixar de novo.
 */
export function atualizarDados(obra: string, cliente: Cliente = criarClienteNavegador()) {
  const emAndamento = baixando.get(obra)
  if (emAndamento) return emAndamento
  const pedido = baixarDados(obra, cliente).finally(() => baixando.delete(obra))
  baixando.set(obra, pedido)
  return pedido
}

async function baixarDados(obra: string, cliente: Cliente): Promise<boolean> {
  const usuario = await usuarioAtual(cliente)
  if (!usuario) return false
  const { data, error } = await cliente.rpc('dados_offline', { p_obra: obra })
  if (error || !data) return false
  await guardarDados({
    ...(data as unknown as DadosOffline),
    usuario,
    guardadoEm: new Date().toISOString(),
  })
  return true
}

/**
 * Manda a fila em ordem. Sem rede, sessão vencida ou servidor fora: para e tenta depois (erro
 * do servidor conta; depois de 5, o item é recusado para não travar a fila). Resposta de que o
 * lançamento não vale: o item fica marcado com o motivo para o almoxarife ver e descartar.
 * Só manda o que este login lançou. Devolve quantos foram enviados.
 */
export async function enviarFila(cliente: Cliente = criarClienteNavegador()): Promise<number> {
  const fazer = async () => {
    const usuario = await usuarioAtual(cliente)
    if (!usuario) return 0
    let enviados = 0
    const obras = new Set<string>()
    for (const item of await listarFila()) {
      if (item.situacao !== 'aguardando' || item.usuario !== usuario) continue
      let resposta: RespostaEnvio
      try {
        const { error, status } =
          item.tipo === 'retirada'
            ? await cliente.rpc('registrar_retirada', {
                p_obra: item.obra,
                p_pessoa: item.pessoa,
                p_identificacao: null as unknown as string,
                p_itens: item.itens,
                p_confirmado: true,
                p_chave: item.chave,
                p_token: item.token ?? undefined,
                p_quando: item.quando,
              })
            : item.tipo === 'devolucao'
              ? await cliente.rpc('registrar_devolucao', {
                  p_obra: item.obra,
                  p_pessoa: item.pessoa,
                  p_identificacao: null as unknown as string,
                  p_itens: item.itens,
                  p_chave: item.chave,
                  p_token: item.token ?? undefined,
                  p_quando: item.quando,
                })
              : await cliente.rpc('registrar_ocorrencia', {
                  p_obra: item.obra,
                  p_token: item.token ?? '',
                  p_chave: item.chave,
                  p_quando: item.quando,
                })
        resposta = error
          ? { ok: false, status, codigo: error.code, mensagem: error.message }
          : { ok: true }
      } catch {
        resposta = { ok: false }
      }
      const destino = destinoDoEnvio(resposta, item.tentativas ?? 0)
      if (destino.acao === 'tentarDepois') {
        if (destino.contar) await guardarNaFila({ ...item, tentativas: (item.tentativas ?? 0) + 1 })
        break
      }
      if (destino.acao === 'enviado') {
        await tirarDaFila(item.chave)
        enviados++
      } else {
        // O token não fica guardado depois da resposta do servidor.
        await guardarNaFila({ ...item, token: null, situacao: 'recusado', erro: destino.erro })
      }
      obras.add(item.obra)
    }
    for (const obra of obras) await atualizarDados(obra, cliente)
    return enviados
  }
  // Duas telas abertas não mandam a fila ao mesmo tempo.
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return (
      (await navigator.locks.request('almox-fila', { ifAvailable: true }, (trava) =>
        trava ? fazer() : 0,
      )) ?? 0
    )
  }
  return fazer()
}
