import type { Metadata } from 'next'
import Link from 'next/link'
import { Cartao } from '@/components/Cartao'
import { BotaoNovoMaterial } from '@/components/GavetaNovoMaterial'
import { IconeInterface } from '@/components/IconeInterface'
import { listarSaldos, pedidosAbertos } from '@/lib/dados/materiais'
import { textoAviso } from '@/lib/dominio/materiais'
import { obterSessao } from '@/lib/sessao'
import { PedidosCadastro } from './PedidosCadastro'

export const metadata: Metadata = { title: 'Materiais · Cadastros · Almox' }

export default async function PaginaMateriais() {
  const { obraAtual } = await obterSessao()
  const [materiais, pedidos] = await Promise.all([
    listarSaldos(obraAtual.id),
    pedidosAbertos(obraAtual.id),
  ])

  return (
    <>
      {pedidos.length > 0 && <PedidosCadastro pedidos={pedidos} />}
      <p className="text-[13px] text-texto-2">
        {materiais.length} {materiais.length === 1 ? 'material' : 'materiais'}
      </p>
      {materiais.length === 0 && (
        <Cartao className="py-6 text-center text-[15px] text-texto-2">
          Nenhum material cadastrado ainda.
        </Cartao>
      )}
      {materiais.map((m) => (
        <Link
          key={m.id}
          href={`/cadastros/materiais/${m.id}`}
          className="flex min-h-14 items-center gap-3 rounded-cartao bg-cartao px-3.5 py-3"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-bold">{m.nome}</span>
            <span className="truncate text-[13px] text-texto-2">
              {m.unidade} · {textoAviso(m)}
            </span>
          </span>
          <IconeInterface nome="chevron-right" tamanho={18} className="shrink-0 text-texto-2" />
        </Link>
      ))}
      <BotaoNovoMaterial className="mt-1 inline-flex min-h-toque items-center justify-center rounded-botao bg-engenheiro px-4 text-[15px] font-bold text-white">
        ＋ Novo material
      </BotaoNovoMaterial>
    </>
  )
}
