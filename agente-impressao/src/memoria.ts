import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * "Impresso, falta confirmar" gravado em arquivo: se o agente cair entre mandar para a
 * impressora e confirmar ao Almox, ao voltar ele só confirma o trabalho que retornar da fila,
 * sem imprimir de novo (ponto 11 do plano de correção). Só ids, sem nome de ninguém.
 */
export class ImpressosGravados extends Set<string> {
  readonly #arquivo: string
  #carregado = false

  constructor(arquivo: string) {
    super()
    this.#arquivo = arquivo
    try {
      const lidos: unknown = JSON.parse(readFileSync(arquivo, 'utf8'))
      if (Array.isArray(lidos)) {
        for (const id of lidos) if (typeof id === 'string' && ID.test(id)) super.add(id)
      }
    } catch {
      // Sem arquivo ou arquivo estragado: começa vazio.
    }
    this.#carregado = true
  }

  override add(id: string): this {
    super.add(id)
    if (this.#carregado) this.#gravar()
    return this
  }

  override delete(id: string): boolean {
    const tinha = super.delete(id)
    if (tinha) this.#gravar()
    return tinha
  }

  /** Grava num temporário e troca de nome: queda no meio não estraga o arquivo. */
  #gravar() {
    try {
      mkdirSync(dirname(this.#arquivo), { recursive: true })
      const temporario = `${this.#arquivo}.tmp`
      writeFileSync(temporario, JSON.stringify([...this]))
      renameSync(temporario, this.#arquivo)
    } catch {
      // Disco cheio ou sem permissão: segue só com a memória (como antes).
    }
  }
}
