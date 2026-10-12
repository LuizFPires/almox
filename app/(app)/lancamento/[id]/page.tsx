import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { buscarLancamento } from '@/lib/dados/lancamento'
import { compararCodigos } from '@/lib/dominio/cadastros'
import { rotuloMotivo } from '@/lib/dominio/devolucao'
import { podeCadastrar } from '@/lib/dominio/permissoes'
import { formatarDataHora } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'
import { FormEstorno } from './FormEstorno'

export const metadata: Metadata = { title: 'Lançamento · Almox' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TITULOS = { retirada: 'Retirada', devolucao: 'Devolução', estorno: 'Estorno' } as const

/** Um lançamento (RN-18: nada se edita) e o estorno do engenheiro, com motivo. */
export default async function PaginaLancamento({ params }: PageProps<'/lancamento/[id]'>) {
  const { id } = await params
  const { obraAtual } = await obterSessao()
  const dados = UUID.test(id) ? await buscarLancamento(obraAtual.id, id) : null
  if (!dados) notFound()
  const { lancamento: l, estorno, fotos } = dados

  const porTipo = new Map<string, { codigos: string[]; avariadas: number }>()
  for (const item of l.itens) {
    const nome = item.unidade?.tipo?.nome ?? ''
    const g = porTipo.get(nome) ?? { codigos: [], avariadas: 0 }
    g.codigos.push(item.unidade?.codigo ?? '')
    if (item.avariada) g.avariadas++
    porTipo.set(nome, g)
  }
  const codigoDe = new Map(l.itens.map((i) => [i.unidade_id, i.unidade?.codigo ?? '']))
  const podeEstornar = podeCadastrar(obraAtual.perfil) && l.tipo !== 'estorno' && !estorno

  return (
    <>
      <Cabecalho
        titulo={TITULOS[l.tipo]}
        subtitulo={formatarDataHora(l.criado_em)}
        voltarPara="/inicio"
      />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
        <Cartao className="flex flex-col gap-1">
          {l.pessoa && (
            <Link href={`/pessoa/${l.pessoa.id}`} className="text-lg font-bold underline">
              {l.pessoa.nome}
            </Link>
          )}
          <span
            className={`text-sm font-semibold ${l.via === 'qr' ? 'text-sucesso' : 'text-erro'}`}
          >
            {l.via === 'qr' ? 'QR do capacete conferido' : 'Manual, sem QR'}
          </span>
          <span className="text-sm text-texto-2">Lançado por {l.usuario?.nome ?? '—'}</span>
          {l.tipo === 'estorno' && l.obs && <span className="text-sm">Motivo: {l.obs}</span>}
        </Cartao>

        <ul className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao px-4 py-1">
          {[...porTipo.entries()].map(([tipo, g]) => (
            <li key={tipo} className="flex flex-col py-3">
              <span className="font-bold">
                {tipo} ×{g.codigos.length}{' '}
                <span className="font-mono text-sm font-normal">
                  {[...g.codigos].sort(compararCodigos).join(', ')}
                </span>
              </span>
              {g.avariadas > 0 && (
                <span className="text-[13px] font-semibold text-erro">
                  {g.avariadas} avariada{g.avariadas > 1 ? 's' : ''} · manutenção
                </span>
              )}
            </li>
          ))}
        </ul>

        {fotos.length > 0 && (
          <section aria-labelledby="t-avarias" className="flex flex-col gap-2">
            <h2 id="t-avarias" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
              AVARIAS
            </h2>
            {fotos.map((f) => (
              <Cartao key={f.unidade_id} className="flex items-center gap-3">
                {f.url && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage privado
                  <img
                    src={f.url}
                    alt={`Foto da avaria de ${codigoDe.get(f.unidade_id)}`}
                    className="size-20 rounded-botao object-cover"
                  />
                )}
                <span className="flex flex-col">
                  <span className="font-mono font-semibold">{codigoDe.get(f.unidade_id)}</span>
                  <span className="text-sm text-erro">{rotuloMotivo(f.motivo)}</span>
                  {f.detalhes && <span className="text-sm">{f.detalhes}</span>}
                  {f.apagada && (
                    <span className="text-[13px] text-texto-2">
                      Foto apagada pela política de dados (12 meses após o conserto)
                    </span>
                  )}
                </span>
              </Cartao>
            ))}
          </section>
        )}

        {estorno && (
          <p
            role="status"
            className="rounded-cartao bg-aviso-claro px-4 py-3 text-[15px] text-aviso"
          >
            <b>Estornado</b> em {formatarDataHora(estorno.criado_em)} por{' '}
            {estorno.usuario?.nome ?? '—'}
            {estorno.obs ? `: ${estorno.obs}` : ''}
          </p>
        )}
        {podeEstornar && (
          <FormEstorno
            id={l.id}
            oQueFaz={
              l.tipo === 'retirada'
                ? 'As peças saem do nome da pessoa e voltam ao estoque.'
                : 'As peças voltam ao nome da pessoa, como estavam antes da devolução.'
            }
          />
        )}
      </main>
    </>
  )
}
