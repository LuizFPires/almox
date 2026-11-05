'use client'

import { useRef, useState } from 'react'
import { GavetaQuantidade } from '@/components/GavetaQuantidade'
import type { SaldoMaterial, TipoLancamento } from '@/lib/dominio/materiais'
import { saldoComFila, type ItemFila, type MaterialOffline } from '@/lib/dominio/offline'
import { formatarQuantidade, type UnidadeMaterial } from '@/lib/formatos/quantidade'
import { contemTexto } from '@/lib/formatos/texto'
import { guardarNaFila } from '@/lib/offline/banco'

type Props = {
  obra: string
  usuario: string
  /** Materiais ativos baixados com os dados da obra (`dados_offline.materiais`). */
  materiais: MaterialOffline[]
  fila: ItemFila[]
  /** Guardou na fila: a tela mostra a confirmação (título e linha "−100 sc · Cimento"). */
  aoGuardar(titulo: string, linha: string): void
}

/** O material baixado, com o saldo de agora contando a fila do celular. */
function comSaldoLocal(m: MaterialOffline, fila: ItemFila[]): SaldoMaterial {
  return {
    id: m.id,
    nome: m.nome,
    unidade: m.unidade as UnidadeMaterial,
    saldo: saldoComFila(Number(m.saldo), fila, m.id),
    estoqueCheio: Number(m.estoque_cheio),
    aviso:
      m.aviso_tipo && m.aviso_valor !== null
        ? { tipo: m.aviso_tipo, valor: Number(m.aviso_valor) }
        : null,
  }
}

/**
 * Entrada e saída de material sem internet (na tela /campo, a única guardada no celular). Nada
 * vai ao servidor daqui: o lançamento entra na fila e o servidor confere as regras ao receber.
 */
export function MateriaisCampo({ obra, usuario, materiais, fila, aoGuardar }: Props) {
  const [busca, setBusca] = useState('')
  const [escolha, setEscolha] = useState<{ id: string; tipo: TipoLancamento } | null>(null)
  const [aberta, setAberta] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Toque duplo em confirmar não vira dois lançamentos.
  const gravandoRef = useRef(false)

  const daObra = fila.filter((i) => i.obra === obra)
  const lista = materiais
    .map((m) => comSaldoLocal(m, daObra))
    .filter((m) => !busca.trim() || contemTexto(m.nome, busca))
  const naGaveta = escolha ? (materiais.find((m) => m.id === escolha.id) ?? null) : null

  function abrir(id: string, tipo: TipoLancamento) {
    setEscolha({ id, tipo })
    setErro(null)
    setAberta(true)
  }

  async function confirmar(quantidade: number) {
    if (!escolha || !naGaveta || gravandoRef.current) return
    const saida = escolha.tipo === 'saida'
    gravandoRef.current = true
    setGravando(true)
    try {
      await guardarNaFila({
        chave: crypto.randomUUID(),
        obra,
        usuario,
        tipo: saida ? 'material_saida' : 'material_entrada',
        material: naGaveta.id,
        materialNome: naGaveta.nome,
        quantidade,
        quando: new Date().toISOString(),
        situacao: 'aguardando',
      })
    } catch {
      setErro('Não foi possível guardar no celular. Nada foi registrado: tente de novo.')
      return
    } finally {
      gravandoRef.current = false
      setGravando(false)
    }
    setAberta(false)
    aoGuardar(
      saida ? 'Saída guardada' : 'Entrada guardada',
      `${saida ? '−' : '+'}${formatarQuantidade(quantidade)} ${naGaveta.unidade} · ${naGaveta.nome}`,
    )
  }

  return (
    <section aria-labelledby="titulo-materiais-campo" className="flex flex-col gap-2">
      <h2
        id="titulo-materiais-campo"
        className="text-[13px] font-bold tracking-[1.2px] text-texto-2"
      >
        MATERIAIS
      </h2>
      <p className="text-[13px] text-texto-2">Contagem precisa de sinal para abrir.</p>
      {materiais.length === 0 ? (
        <p className="rounded-cartao bg-cartao px-4 py-3 text-[15px] text-texto-2">
          Nenhum material guardado no celular.
        </p>
      ) : (
        <>
          <label className="sr-only" htmlFor="busca-material-campo">
            Buscar material
          </label>
          <input
            id="busca-material-campo"
            type="search"
            autoComplete="off"
            placeholder="Buscar material"
            value={busca}
            onChange={(e) => setBusca(e.currentTarget.value)}
            className="min-h-toque rounded-botao border border-borda bg-cartao px-4 text-base"
          />
          {lista.length === 0 ? (
            <p className="py-3 text-center text-sm text-texto-2">Nenhum material encontrado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lista.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-cartao bg-cartao px-3.5 py-2.5"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{m.nome}</span>
                    <span className="text-[13px] text-texto-2">
                      {m.saldo <= 0
                        ? 'sem saldo'
                        : `saldo ${formatarQuantidade(m.saldo)} ${m.unidade}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Entrada de ${m.nome}`}
                    onClick={() => abrir(m.id, 'entrada')}
                    className="min-h-toque shrink-0 rounded-botao bg-sucesso px-3 text-sm font-bold text-white"
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    aria-label={`Saída de ${m.nome}`}
                    disabled={m.saldo <= 0}
                    onClick={() => abrir(m.id, 'saida')}
                    className="min-h-toque shrink-0 rounded-botao bg-escuro px-3 text-sm font-bold text-white disabled:opacity-45"
                  >
                    Saída
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {escolha && naGaveta && (
        <GavetaQuantidade
          tipo={escolha.tipo}
          material={comSaldoLocal(naGaveta, daObra)}
          aberta={aberta}
          ocupado={gravando}
          onFechar={() => setAberta(false)}
          onConfirmar={(q) => void confirmar(q)}
          erro={erro}
          onAlterar={() => setErro(null)}
        />
      )}
    </section>
  )
}
