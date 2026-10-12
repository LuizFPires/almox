'use client'

import type { DadosOffline, ItemFila } from '@/lib/dominio/offline'

/**
 * Banco do celular (IndexedDB) para lançar sem internet: os dados da obra (`dados`, por obra)
 * e a fila de lançamentos (`fila`, pela chave do celular). Apagado ao sair (BotaoSair).
 */
const NOME = 'almox'
const VERSAO = 1
/** Avisa as outras abas/telas que a fila mudou (selo do Início, tela sem internet). */
export const CANAL_FILA = 'almox-fila'

export type DadosGuardados = DadosOffline & { usuario: string; guardadoEm: string }

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME, VERSAO)
    pedido.onupgradeneeded = () => {
      const banco = pedido.result
      if (!banco.objectStoreNames.contains('dados'))
        banco.createObjectStore('dados', { keyPath: 'obra' })
      if (!banco.objectStoreNames.contains('fila'))
        banco.createObjectStore('fila', { keyPath: 'chave' })
    }
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error ?? new Error('IndexedDB indisponível'))
  })
}

async function transacao<T>(
  loja: 'dados' | 'fila',
  modo: IDBTransactionMode,
  fazer: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const banco = await abrir()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = banco.transaction(loja, modo)
      const pedido = fazer(tx.objectStore(loja))
      tx.oncomplete = () => resolve(pedido ? pedido.result : undefined)
      tx.onerror = () => reject(tx.error ?? new Error('falha no IndexedDB'))
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB abortado'))
    })
  } finally {
    banco.close()
  }
}

function avisarMudanca() {
  try {
    const canal = new BroadcastChannel(CANAL_FILA)
    canal.postMessage('mudou')
    canal.close()
  } catch {
    // navegador sem BroadcastChannel: as telas releem no próximo intervalo
  }
}

export async function guardarDados(dados: DadosGuardados): Promise<void> {
  await transacao('dados', 'readwrite', (s) => s.put(dados))
}

/** Dados guardados deste login (de uma obra, ou o mais recente). Os de outro login não servem. */
export async function lerDados(usuario: string, obra?: string): Promise<DadosGuardados | null> {
  const todas = (await transacao<DadosGuardados[]>('dados', 'readonly', (s) => s.getAll())) ?? []
  return (
    todas
      .filter((d) => d.usuario === usuario && (!obra || d.obra === obra))
      .sort((a, b) => b.guardadoEm.localeCompare(a.guardadoEm))[0] ?? null
  )
}

/** Outro login entrou neste celular: os dados guardados do anterior saem. */
export async function apagarDadosDeOutros(usuario: string): Promise<void> {
  const todas = (await transacao<DadosGuardados[]>('dados', 'readonly', (s) => s.getAll())) ?? []
  for (const d of todas.filter((x) => x.usuario !== usuario)) {
    await transacao('dados', 'readwrite', (s) => s.delete(d.obra))
  }
}

export async function listarFila(): Promise<ItemFila[]> {
  const itens = (await transacao<ItemFila[]>('fila', 'readonly', (s) => s.getAll())) ?? []
  return itens.sort((a, b) => a.quando.localeCompare(b.quando))
}

export async function guardarNaFila(item: ItemFila): Promise<void> {
  await transacao('fila', 'readwrite', (s) => s.put(item))
  avisarMudanca()
}

export async function tirarDaFila(chave: string): Promise<void> {
  await transacao('fila', 'readwrite', (s) => s.delete(chave))
  avisarMudanca()
}

/** Ao sair: apaga dados e fila deste celular. */
export async function apagarTudo(): Promise<void> {
  await transacao('dados', 'readwrite', (s) => s.clear())
  await transacao('fila', 'readwrite', (s) => s.clear())
  avisarMudanca()
}

/** SHA-256 (hex) do token lido, normalizado como no servidor. */
export async function hashDoToken(tokenNormalizado: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tokenNormalizado))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}
