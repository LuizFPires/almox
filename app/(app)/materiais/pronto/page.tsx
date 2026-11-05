import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconeInterface } from '@/components/IconeInterface'
import { lancamentoFeito, listarSaldos } from '@/lib/dados/materiais'
import { estadoSaldo } from '@/lib/dominio/materiais'
import { formatarQuantidade } from '@/lib/formatos/quantidade'
import { obterSessao } from '@/lib/sessao'
import { GuardadoNoCelular } from '../GuardadoNoCelular'
import { BotaoDesfazer } from './BotaoDesfazer'

export const metadata: Metadata = { title: 'Lançamento registrado · Almox' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Pronto da entrada ou saída (protótipo › ok). Quantidade, saldo e prazo de desfazer vêm do
 * banco; da URL vêm o id do movimento, se o aviso de limite disparou e a quantidade pedida.
 * `?fila=1`: o lançamento ficou na fila do celular e ainda não existe movimento no servidor
 * (vêm `tipo`, `m` = material e `q` = quantidade).
 */
export default async function PaginaLancamentoPronto({
  searchParams,
}: PageProps<'/materiais/pronto'>) {
  const {
    id,
    aviso,
    q,
    fila,
    tipo: tipoUrl,
    m: materialUrl,
  } = (await searchParams) as {
    id?: string
    aviso?: string
    q?: string
    fila?: string
    tipo?: string
    m?: string
  }
  const { obraAtual } = await obterSessao()

  if (fila === '1') {
    const saidaNaFila = tipoUrl === 'saida'
    const material = materialUrl
      ? (await listarSaldos(obraAtual.id)).find((x) => x.id === materialUrl)
      : undefined
    const qtd = q === undefined ? Number.NaN : Number(q)
    const linha =
      material && Number.isFinite(qtd) && qtd > 0
        ? `${saidaNaFila ? '−' : '+'}${formatarQuantidade(qtd)} ${material.unidade} · ${material.nome}`
        : undefined
    return (
      <GuardadoNoCelular
        titulo={saidaNaFila ? 'Saída guardada' : 'Entrada guardada'}
        linha={linha}
        acoes={
          <Link
            href={saidaNaFila ? '/materiais/saida' : '/materiais/entrada'}
            className={`flex min-h-14 items-center justify-center rounded-cartao px-5 text-lg font-bold text-white ${
              saidaNaFila ? 'bg-escuro' : 'bg-sucesso'
            }`}
          >
            {saidaNaFila ? 'Outra saída' : 'Outra entrada'}
          </Link>
        }
      />
    )
  }

  const feito = id && UUID.test(id) ? await lancamentoFeito(obraAtual.id, id) : null
  if (!feito) notFound()

  const { material: m, tipo } = feito
  const entrada = tipo === 'entrada'
  const abaixo = estadoSaldo(m) === 'abaixo'
  // Repetição depois de falha de rede devolve o lançamento original: avisa se o número era outro.
  const pedida = q === undefined ? Number.NaN : Number(q)
  const outraQuantidade = Number.isFinite(pedida) && Math.abs(pedida - feito.quantidade) > 0.001

  return (
    <main className="flex flex-1 flex-col px-5 pb-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-8 text-center">
        <span
          aria-hidden="true"
          className="flex size-[76px] items-center justify-center rounded-full bg-sucesso-claro text-sucesso"
        >
          <IconeInterface nome="check" tamanho={40} />
        </span>
        <h1 className="text-xl font-bold">{entrada ? 'Entrada registrada' : 'Saída registrada'}</h1>
        <p className="text-[15px]">
          {`${entrada ? '+' : '−'}${formatarQuantidade(feito.quantidade)} ${m.unidade} · ${m.nome}`}
        </p>
        <p className="text-[15px]">
          Saldo:{' '}
          <b
            className={abaixo ? 'text-erro' : ''}
          >{`${formatarQuantidade(m.saldo)} ${m.unidade}`}</b>
        </p>
        {outraQuantidade && (
          <p
            role="alert"
            className="rounded-xl bg-aviso-claro px-3.5 py-2.5 text-sm font-semibold text-aviso"
          >
            {`Já estava registrada com ${formatarQuantidade(feito.quantidade)}. A quantidade nova não foi lançada.`}
          </p>
        )}
        {!entrada && aviso === '1' && (
          <span className="rounded-lg bg-erro-claro px-2.5 py-1 text-xs font-bold text-erro">
            Aviso enviado a todos da obra
          </span>
        )}
        {entrada && m.aviso && (
          <p className="text-[13px] text-texto-2">
            O aviso de limite deste material volta a valer.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        <Link
          href={entrada ? '/materiais/entrada' : '/materiais/saida'}
          className={`flex min-h-14 items-center justify-center rounded-cartao px-5 text-lg font-bold text-white ${
            entrada ? 'bg-sucesso' : 'bg-escuro'
          }`}
        >
          {entrada ? 'Outra entrada' : 'Outra saída'}
        </Link>
        {!entrada &&
          (feito.desfeito ? (
            <p className="rounded-xl bg-sutil px-3.5 py-3 text-center text-sm font-semibold">
              Saída desfeita. Fica no extrato como estorno.
            </p>
          ) : (
            <BotaoDesfazer movimentoId={feito.id} restanteMs={feito.restanteDesfazerMs} />
          ))}
        <Link
          href="/materiais"
          className="flex min-h-14 items-center justify-center rounded-cartao border border-borda bg-cartao px-5 text-lg font-bold"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
