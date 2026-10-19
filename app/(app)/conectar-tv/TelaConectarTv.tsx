import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { tvsDaObra } from '@/lib/dados/tvs'
import { textoDesde } from '@/lib/dominio/ficha'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { desconectarTv } from './acoes'
import { FormConectarTv } from './FormConectarTv'
import { ManualTv } from './ManualTv'

/**
 * Conectar a TV do almoxarifado (engenheiro ou almoxarife): o código que a TV mostra é
 * aprovado aqui. Embaixo, as TVs conectadas, com "Desconectar".
 */
export async function TelaConectarTv({
  codigo,
  erroDesconectar = false,
}: {
  codigo?: string
  erroDesconectar?: boolean
}) {
  const { obraAtual } = await obterSessao()
  const lanca = podeLancar(obraAtual.perfil)
  const agora = new Date()
  const tvs = lanca ? await tvsDaObra(obraAtual.id) : []

  return (
    <>
      <Cabecalho titulo="Conectar TV" subtitulo={obraAtual.nome} voltarPara="/inicio" />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-8">
        {!lanca ? (
          <Cartao className="flex flex-col gap-1.5 py-5">
            <h2 className="text-xl font-bold">Só o engenheiro ou o almoxarife</h2>
            <p className="text-[15px] text-texto-2">
              Peça para quem lança retiradas e devoluções conectar a TV.
            </p>
          </Cartao>
        ) : (
          <>
            <p className="rounded-cartao bg-sutil px-4 py-3 text-[15px]">
              Ligue a TV no Almox: ela mostra um <b>código de 6 números</b> e um QR. Leia o QR com a
              câmera do celular ou digite o código aqui. Vale 10 minutos.
            </p>
            <FormConectarTv codigo={codigo} />
            {erroDesconectar && (
              <p role="alert" className="rounded-cartao bg-erro-claro px-4 py-3 text-erro">
                Não foi possível desconectar a TV. Tente de novo.
              </p>
            )}

            <ManualTv aberto={tvs.length === 0} />

            <section aria-labelledby="titulo-tvs" className="flex flex-col gap-2">
              <h2
                id="titulo-tvs"
                className="mt-2 text-[13px] font-bold tracking-[1.2px] text-texto-2"
              >
                TVS CONECTADAS
              </h2>
              {tvs.length === 0 ? (
                <Cartao className="py-5 text-center text-[15px] text-texto-2">
                  Nenhuma TV conectada ainda.
                </Cartao>
              ) : (
                tvs.map((tv) => (
                  <Cartao key={tv.id} className="flex items-center gap-3">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-bold">{tv.nome}</span>
                      <span className="text-[13px] text-texto-2">
                        {tv.ultimo_ping_tv
                          ? `Último sinal ${textoDesde(tv.ultimo_ping_tv, agora).replace(/^desde /, '')}`
                          : 'Ainda não mostrou o painel'}
                      </span>
                    </span>
                    <form action={desconectarTv}>
                      <input type="hidden" name="id" value={tv.id} />
                      <button
                        type="submit"
                        className="min-h-toque px-2 text-sm font-bold text-erro underline"
                      >
                        Desconectar
                      </button>
                    </form>
                  </Cartao>
                ))
              )}
            </section>
          </>
        )}
      </main>
      <BarraInferior ativa="inicio" podeLancar={lanca} />
    </>
  )
}
