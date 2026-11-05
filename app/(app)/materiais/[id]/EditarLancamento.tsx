'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { GavetaQuantidade, type ExtraEdicao } from '@/components/GavetaQuantidade'
import { LinhaExtrato } from '@/components/LinhaExtrato'
import type { LinhaExtrato as Linha } from '@/lib/dados/materiais'
import type { SaldoMaterial } from '@/lib/dominio/materiais'
import { editarMovimento } from '../acoes'

type Props = {
  linhas: Linha[]
  materiais: SaldoMaterial[]
  /** Mostra o nome do material em cada linha (extrato geral). */
  comNome: boolean
  /** Só o engenheiro edita e apaga. */
  podeEditar: boolean
  vazio: string
}

/** Material da linha para a gaveta (se saiu da lista de ativos, um substituto só com nome e unidade). */
function materialDaLinha(l: Linha, materiais: SaldoMaterial[]): SaldoMaterial {
  return (
    materiais.find((m) => m.id === l.materialId) ?? {
      id: l.materialId,
      nome: l.materialNome,
      unidade: l.unidade,
      saldo: 0,
      estoqueCheio: 0,
      aviso: null,
    }
  )
}

/**
 * Gaveta de edição de um lançamento (engenheiro): `abrir(linha)` e o elemento `gaveta` para
 * pôr na tela. Usada pela lista do extrato e pela linha do tempo.
 */
export function useEdicaoLancamento(materiais: SaldoMaterial[]) {
  const router = useRouter()
  const [aberta, setAberta] = useState<Linha | null>(null)
  const [visivel, setVisivel] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, iniciar] = useTransition()

  function abrir(l: Linha) {
    setErro(null)
    setAberta(l)
    setVisivel(true)
  }

  function enviar(l: Linha, quantidade: number, motivo?: string) {
    iniciar(async () => {
      let r: Awaited<ReturnType<typeof editarMovimento>>
      try {
        r = await editarMovimento({ movimentoId: l.id, quantidade, motivo })
      } catch {
        setErro('Sem sinal. Tente de novo.')
        return
      }
      if (!r.ok) {
        setErro(r.erro)
        router.refresh()
        return
      }
      setVisivel(false)
      router.refresh()
    })
  }

  function salvar(l: Linha, q: number, extra?: ExtraEdicao) {
    const negativo =
      l.tipo === 'saida' ? true : l.tipo === 'entrada' ? false : (extra?.negativo ?? false)
    enviar(l, negativo ? -q : q, extra?.motivo)
  }

  const gaveta = aberta && (
    <GavetaQuantidade
      tipo="edicao"
      material={materialDaLinha(aberta, materiais)}
      aberta={visivel}
      ocupado={ocupado}
      erro={erro}
      quantidadeInicial={Math.abs(aberta.quantidade)}
      escolheSinal={aberta.tipo === 'ajuste'}
      negativoInicial={aberta.quantidade < 0}
      onAlterar={() => setErro(null)}
      onFechar={() => setVisivel(false)}
      onConfirmar={(q, extra) => salvar(aberta, q, extra)}
      onApagar={(motivo) => enviar(aberta, 0, motivo)}
    />
  )

  return { abrir, gaveta }
}

/** Lista o extrato; para o engenheiro, abre a gaveta de edição nas linhas que não são conferência. */
export function EditarLancamento({ linhas, materiais, comNome, podeEditar, vazio }: Props) {
  const { abrir, gaveta } = useEdicaoLancamento(materiais)

  if (linhas.length === 0) {
    return <p className="py-6 text-center text-[15px] text-texto-2">{vazio}</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {linhas.map((l) => (
          <li key={l.id}>
            <LinhaExtrato
              linha={l}
              comNome={comNome}
              editavel={podeEditar && l.tipo !== 'conferencia'}
              onEditar={() => abrir(l)}
            />
          </li>
        ))}
      </ul>
      {gaveta}
    </>
  )
}
