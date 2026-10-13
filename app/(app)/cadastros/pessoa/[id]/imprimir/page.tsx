import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdesivoCapacete } from '@/components/AdesivoCapacete'
import { Cabecalho } from '@/components/Cabecalho'
import { CartaoImpressora } from '@/components/CartaoImpressora'
import { ErroFormulario } from '@/components/Formulario'
import { RodapeAcao } from '@/components/RodapeAcao'
import { dadosAdesivo } from '@/lib/dados/adesivo'
import { situacaoImpressao, ultimosTrabalhos } from '@/lib/dados/impressao'
import { buscarPessoa } from '@/lib/dados/pessoas'
import { destinoSeguro } from '@/lib/dominio/destino'
import { descreverTrabalho, emAndamento } from '@/lib/dominio/impressao'
import { obterSessao } from '@/lib/sessao'
import { FormImprimir } from './FormImprimir'
import { AcompanharImpressao } from '../AcompanharImpressao'

export const metadata: Metadata = { title: 'Imprimir adesivo · Almox' }

/**
 * Tela Imprimir (protótipo › etq): prévia, impressora, cópias e "Imprimir N etiquetas".
 * Nada vai para a impressora antes de confirmar. Depois acompanha o trabalho até sair.
 */
export default async function PaginaImprimir({
  params,
  searchParams,
}: PageProps<'/cadastros/pessoa/[id]/imprimir'>) {
  const { id } = await params
  const { trabalho: idTrabalho, volta: voltaPedida } = (await searchParams) as {
    trabalho?: string
    volta?: string
  }
  const { obraAtual } = await obterSessao()
  const [pessoa, adesivo, { impressora, agente }, trabalhos] = await Promise.all([
    buscarPessoa(obraAtual.id, id),
    dadosAdesivo(id),
    situacaoImpressao(obraAtual.id),
    ultimosTrabalhos(obraAtual.id, id),
  ])
  // Só pessoa da obra selecionada (engenheiro de duas obras não mistura as duas).
  if (!pessoa || !adesivo) notFound()

  const volta = voltaPedida ? destinoSeguro(voltaPedida) : '/cadastros/pessoas'
  const aqui = `/cadastros/pessoa/${id}/imprimir?volta=${encodeURIComponent(volta)}`
  const telaImpressora = `/cadastros/impressora?volta=${encodeURIComponent(aqui)}`
  const trabalho = idTrabalho ? trabalhos.find((t) => t.id === idTrabalho) : undefined

  return (
    <>
      {trabalho && emAndamento(trabalho.status) && (
        <AcompanharImpressao
          trabalhos={[{ id: trabalho.id, status: trabalho.status }]}
          segundos={2}
        />
      )}
      <Cabecalho titulo="Imprimir" subtitulo="Adesivo do capacete" voltarPara={volta} />
      <main className="flex flex-1 flex-col gap-4 pt-2">
        <div className="flex flex-col items-center gap-2 px-5">
          <AdesivoCapacete {...adesivo} />
          <span className="text-[13px] text-texto-2">Adesivo do capacete · 60 × 80 mm</span>
        </div>
        {!trabalho && (
          <div className="flex flex-col gap-1.5 px-5">
            <Link
              href={`/cadastros/adesivos?pessoa=${id}&volta=${encodeURIComponent(aqui)}`}
              className={`flex min-h-14 items-center justify-center rounded-cartao px-5 text-lg font-bold ${
                impressora ? 'border border-borda bg-cartao text-texto' : 'bg-amarelo text-escuro'
              }`}
            >
              Imprimir em folha A4
            </Link>
            <span className="text-center text-[13px] text-texto-2">
              Na impressora comum da obra; recorte na linha e cole.
            </span>
          </div>
        )}
        {/* Impressora de etiquetas (mini PC): só quando a obra tem uma. */}
        {impressora && (
          <div className="px-5">
            <CartaoImpressora impressora={impressora} agente={agente} href={telaImpressora} />
          </div>
        )}

        {trabalho ? (
          <>
            <div className="px-5">
              {trabalho.status === 'enviado' ? (
                <p
                  role="status"
                  className="rounded-botao bg-sucesso-claro px-3 py-2.5 font-semibold text-sucesso"
                >
                  Impresso no almoxarifado. Cole na frente do capacete.
                </p>
              ) : trabalho.status === 'erro' ? (
                <ErroFormulario
                  mensagem={descreverTrabalho('erro', trabalho.erro, agente.online)}
                />
              ) : (
                <p role="status" className="rounded-botao bg-sutil px-3 py-2.5 font-semibold">
                  {descreverTrabalho(trabalho.status, null, agente.online)}
                </p>
              )}
            </div>
            <div className="mt-auto">
              <RodapeAcao>
                {trabalho.status === 'erro' ? (
                  <Link
                    href={aqui}
                    className="flex min-h-14 items-center justify-center rounded-cartao bg-engenheiro px-5 text-lg font-bold text-white"
                  >
                    Tentar de novo
                  </Link>
                ) : emAndamento(trabalho.status) ? (
                  <span className="flex min-h-14 items-center justify-center rounded-cartao border border-borda px-5 text-lg font-bold text-texto-2">
                    Enviando para a impressora…
                  </span>
                ) : (
                  <Link
                    href={volta}
                    className="flex min-h-14 items-center justify-center rounded-cartao bg-engenheiro px-5 text-lg font-bold text-white"
                  >
                    Concluir
                  </Link>
                )}
              </RodapeAcao>
            </div>
          </>
        ) : (
          impressora && (
            <div className="mt-auto">
              <FormImprimir pessoaId={id} volta={volta} escolherImpressora={null} />
            </div>
          )
        )}
      </main>
    </>
  )
}
