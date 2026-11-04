import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { quantidadeComSinal } from '@/components/LinhaExtrato'
import { fichaMaterial } from '@/lib/dados/materiais'
import { estadoSaldo, limiteDoAviso } from '@/lib/dominio/materiais'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { formatarQuantidade } from '@/lib/formatos/quantidade'
import { obterSessao } from '@/lib/sessao'
import { EditarLancamento } from './EditarLancamento'

export const metadata: Metadata = { title: 'Material · Almox' }

/** Ficha do material: saldo, aviso de limite e extrato. */
export default async function PaginaFichaMaterial({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { obraAtual } = await obterSessao()
  const ficha = await fichaMaterial(obraAtual.id, id)
  if (!ficha) notFound()

  const { material: m, ultimaDivergencia, extrato } = ficha
  const engenheiro = podeCadastrar(obraAtual.perfil)
  const limite = limiteDoAviso(m)
  const abaixo = estadoSaldo(m) === 'abaixo'
  const un = m.unidade
  const ref = Math.max(m.estoqueCheio, m.saldo, 1)
  const larguraSaldo = Math.min(100, (m.saldo / ref) * 100)
  const posLimite = limite === null ? null : Math.min(100, (limite / ref) * 100)
  const textoAviso =
    limite === null
      ? 'sem aviso de limite'
      : `aviso em ${formatarQuantidade(limite)} ${un}${
          m.aviso?.tipo === 'percentual'
            ? ` (${formatarQuantidade(m.aviso.valor)}% do estoque cheio)`
            : ''
        }`

  return (
    <>
      <Cabecalho titulo={m.nome} voltarPara="/materiais/saldos" />
      <AoVivo obraId={obraAtual.id} tabelas={['material', 'movimento_material']} />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-5">
        <section aria-label="Saldo" className="rounded-cartao bg-cartao p-4 text-center">
          <div className="text-[13px] text-texto-2">Saldo agora</div>
          <div
            className={`text-[44px] leading-none font-black tabular-nums ${abaixo ? 'text-erro' : ''}`}
          >
            {formatarQuantidade(m.saldo)} {un}
          </div>
          <div className="mt-1.5 text-[13px] text-texto-2">{textoAviso}</div>
          <div className="relative mt-3 h-2.5 rounded-[5px] bg-sutil" aria-hidden="true">
            <i
              className={`absolute inset-y-0 left-0 rounded-[5px] ${abaixo ? 'bg-erro' : 'bg-sucesso'}`}
              style={{ width: `${larguraSaldo}%` }}
            />
            {posLimite !== null && (
              <u
                className="absolute -inset-y-1 w-0.5 bg-texto no-underline"
                style={{ left: `${posLimite}%` }}
              />
            )}
          </div>
          {ultimaDivergencia && (
            <div className="mt-2.5 inline-block rounded-lg bg-aviso-claro px-2.5 py-1 text-xs font-bold text-aviso">
              {`última conferência: ${quantidadeComSinal(ultimaDivergencia.quantidade)} ${un} de diferença`}
            </div>
          )}
        </section>
        {engenheiro && (
          <Link
            href={`/cadastros/materiais/${m.id}/aviso`}
            className="inline-flex min-h-toque items-center justify-center rounded-botao border border-borda bg-cartao px-4 text-[15px] font-bold"
          >
            Configurar aviso de limite
          </Link>
        )}
        <h2 className="text-[13px] font-bold tracking-[1.2px] text-texto-2 uppercase">Extrato</h2>
        <EditarLancamento
          linhas={extrato}
          materiais={[m]}
          comNome={false}
          podeEditar={engenheiro}
          vazio="Sem movimentos."
        />
      </main>
      <BarraInferior modo="materiais" ativa="saldos" podeLancar={podeLancar(obraAtual.perfil)} />
    </>
  )
}
