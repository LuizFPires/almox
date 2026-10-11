import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import type { ChaveIcone } from '@/components/icones-ferramenta'
import { SeloPerfil } from '@/components/SeloPerfil'
import { buscarFicha, equipeDaEmpresa, identificacaoValida } from '@/lib/dados/ficha'
import {
  contarItens,
  ehPendencia,
  regraDevolucao,
  textoDesde,
  textoIdentificacao,
  type ComoIdentificada,
} from '@/lib/dominio/ficha'
import { primeiroNome } from '@/lib/dominio/leitura'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Ficha · Almox' }

const TONS = { sucesso: 'text-sucesso', erro: 'text-erro', neutro: 'text-texto-2' } as const

/** `ident` = id da conferência (quem lança); `via=qr` = consulta que leu o capacete. */
function comoFoiAberta(via: string | undefined, ident: string | undefined): ComoIdentificada {
  if (ident || via === 'qr') return 'qr'
  return via === 'manual' ? 'manual' : 'lista'
}

/** Ficha da pessoa (F-04): o que está com ela, como foi identificada e a equipe. */
export default async function PaginaFicha({ params, searchParams }: PageProps<'/pessoa/[id]'>) {
  const { id } = await params
  const { via, ident } = (await searchParams) as { via?: string; ident?: string }
  const { obraAtual } = await obterSessao()
  const lanca = podeLancar(obraAtual.perfil)
  const [pessoa, conferidaAte] = await Promise.all([
    buscarFicha(obraAtual.id, id),
    lanca ? identificacaoValida(obraAtual.id, ident, id) : Promise.resolve(null),
  ])
  if (!pessoa) notFound()
  const equipe = pessoa.empresa ? await equipeDaEmpresa(obraAtual.id, pessoa.empresa.id, id) : []

  const agora = new Date()
  const como = comoFoiAberta(via, ident)
  const conferida = como === 'qr' && Boolean(conferidaAte)
  const identificacao = textoIdentificacao(como, lanca, conferida)
  const primeiro = primeiroNome(pessoa.nome)
  const devolucao = regraDevolucao(
    pessoa.posses.map((p) => p.via),
    conferida,
    pessoa.nome,
  )
  const nomeEmpresa = pessoa.empresa?.nome ?? ''

  return (
    <>
      <Cabecalho
        titulo={primeiro}
        subtitulo={nomeEmpresa}
        voltarPara={como === 'manual' ? '/pessoas' : '/inicio'}
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
        <Cartao className="flex flex-col gap-0.5">
          <span className="text-[40px] leading-none font-extrabold break-words">
            {pessoa.nome_capacete}
          </span>
          <span className="text-lg font-semibold">{pessoa.nome}</span>
          <span className="flex items-center gap-1.5 text-[15px] text-texto-2">
            {pessoa.empresa && (
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ background: pessoa.empresa.cor }}
              />
            )}
            {pessoa.funcao} · {nomeEmpresa}
          </span>
          <span className={`mt-1.5 text-sm font-semibold ${TONS[identificacao.tom]}`}>
            {identificacao.texto}
          </span>
        </Cartao>

        <section aria-labelledby="t-com-ele" className="flex flex-col gap-2">
          <h2 id="t-com-ele" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
            COM ELE AGORA ({pessoa.posses.length})
          </h2>
          {pessoa.posses.length === 0 ? (
            <Cartao className="text-[15px] font-semibold text-sucesso">Nada com ele agora</Cartao>
          ) : (
            <Cartao className="flex flex-col divide-y divide-borda py-1">
              {pessoa.posses.map((p) => {
                const pendente = ehPendencia(p.desde, agora)
                return (
                  <div key={p.unidade_id} className="flex items-center gap-3 py-2.5">
                    {p.unidade?.tipo && (
                      <IconeFerramenta
                        icone={p.unidade.tipo.icone as ChaveIcone}
                        nome={p.unidade.tipo.nome}
                        tamanho="p"
                      />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col text-sm">
                      <span className="font-mono font-semibold">{p.unidade?.codigo}</span>
                      <span className={pendente ? 'font-semibold text-erro' : 'text-texto-2'}>
                        {textoDesde(p.desde, agora)}
                        {p.via === 'manual' && <span className="text-erro"> · sem QR</span>}
                      </span>
                    </span>
                    {p.unidade?.tipo?.alto_valor && (
                      <span className="rounded-full bg-aviso-claro px-2 py-0.5 text-xs font-bold text-aviso">
                        ALTO VALOR
                      </span>
                    )}
                  </div>
                )
              })}
            </Cartao>
          )}
        </section>

        {lanca ? (
          <section aria-label="Lançar" className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled
                className="flex min-h-16 flex-col items-center justify-center rounded-cartao bg-amarelo text-lg font-bold text-texto disabled:opacity-50"
              >
                Retirada
              </button>
              <button
                type="button"
                disabled
                className={`flex min-h-16 flex-col items-center justify-center rounded-cartao text-lg font-bold disabled:opacity-50 ${
                  devolucao.permitida ? 'bg-escuro text-white' : 'bg-borda text-texto-2'
                }`}
              >
                Devolução
              </button>
            </div>
            <p className="text-center text-[13px] text-texto-2">
              Retirada e devolução entram nas próximas versões do app.
            </p>
            {devolucao.aviso && (
              <div className="flex flex-col gap-2.5 rounded-cartao bg-aviso-claro px-4 py-3.5">
                <p className="text-[15px]">{devolucao.aviso}</p>
                {devolucao.pedirCapacete && (
                  <Link
                    href="/leitura"
                    className="flex min-h-toque items-center justify-center rounded-botao bg-escuro px-4 font-bold text-white"
                  >
                    Ler capacete do {primeiro}
                  </Link>
                )}
              </div>
            )}
          </section>
        ) : (
          <p className="rounded-cartao bg-sutil px-4 py-3 text-[15px]">
            Só consulta. Para retirar ou devolver, procure o almoxarifado.
          </p>
        )}

        {pessoa.empresa && (
          <section aria-labelledby="t-equipe" className="flex flex-col gap-2">
            <h2 id="t-equipe" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
              EQUIPE · {pessoa.empresa.nome.toLocaleUpperCase('pt-BR')}
            </h2>
            {equipe.length === 0 ? (
              <Cartao className="text-[15px] text-texto-2">Só ele nesta empresa.</Cartao>
            ) : (
              <Cartao className="flex flex-col divide-y divide-borda py-1">
                {equipe.map((c) => (
                  <Link
                    key={c.id}
                    href={`/pessoa/${c.id}`}
                    className="flex min-h-toque items-center justify-between gap-3 py-2"
                  >
                    <span className="truncate font-semibold">{c.nome}</span>
                    <span className="shrink-0 rounded-full bg-sutil px-2.5 py-0.5 text-[13px] font-semibold">
                      {contarItens(c.itens)}
                    </span>
                  </Link>
                ))}
              </Cartao>
            )}
          </section>
        )}
      </main>
      <BarraInferior ativa="lista" podeLancar={lanca} />
    </>
  )
}
