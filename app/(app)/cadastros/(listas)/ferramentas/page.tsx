import type { Metadata } from 'next'
import Link from 'next/link'
import { Cartao } from '@/components/Cartao'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { IconeInterface } from '@/components/IconeInterface'
import { listarTipos } from '@/lib/dados/ferramentas'
import { formatarBRL } from '@/lib/formatos/moeda'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Ferramentas · Cadastros · Almox' }

export default async function PaginaFerramentas() {
  const { obraAtual } = await obterSessao()
  const tipos = await listarTipos(obraAtual.id)
  const totalUnidades = tipos.reduce((soma, t) => soma + t.unidades.length, 0)

  return (
    <>
      <p className="text-[13px] text-texto-2">
        {tipos.length} {tipos.length === 1 ? 'tipo' : 'tipos'} · {totalUnidades} unidades
      </p>
      {tipos.length === 0 && (
        <Cartao className="py-6 text-center text-[15px] text-texto-2">
          Nenhuma ferramenta cadastrada ainda.
        </Cartao>
      )}
      {tipos.map((t) => {
        const conta = (status: string) => t.unidades.filter((u) => u.status === status).length
        const livres = conta('livre')
        const emUso = conta('em_uso')
        const manutencao = conta('manutencao')
        return (
          <Link
            key={t.id}
            href={`/cadastros/ferramenta/${t.id}`}
            className="flex items-center gap-3 rounded-cartao bg-cartao px-3.5 py-3"
          >
            <IconeFerramenta icone={t.icone} tamanho="p" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base font-bold">
                {t.nome}
                {t.alto_valor && (
                  <span className="ml-2 rounded-full bg-aviso-claro px-2 py-0.5 align-middle text-[11px] font-bold text-aviso">
                    ALTO VALOR
                  </span>
                )}
              </span>
              <span className="truncate text-[13px] text-texto-2">
                {t.unidades.length} un. · {livres} livres · {emUso} em uso
                {manutencao > 0 && ` · ${manutencao} manutenção`}
              </span>
            </span>
            <span className="shrink-0 text-right text-sm font-bold tabular-nums">
              {formatarBRL(t.valor_reposicao)}
              <span className="block text-[11px] font-medium text-texto-2">por unidade</span>
            </span>
            <IconeInterface nome="chevron-right" tamanho={18} className="shrink-0 text-texto-2" />
          </Link>
        )
      })}
    </>
  )
}
