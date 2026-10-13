import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { ehIcone } from '@/components/icones-ferramenta'
import { buscarAvaria } from '@/lib/dados/avaria'
import { textoMensagemAvaria } from '@/lib/dominio/avaria'
import { rotuloMotivo } from '@/lib/dominio/devolucao'
import { formatarData, formatarDataHora, formatarHora } from '@/lib/formatos/datas'
import { formatarBRL } from '@/lib/formatos/moeda'
import { obterSessao } from '@/lib/sessao'
import { BotaoEnviar } from './BotaoEnviar'
import { FormIndenizacao } from './FormIndenizacao'

export const metadata: Metadata = { title: 'Avaria · Almox' }

/**
 * Avaria (Lista › Avarias): foto, data e hora, quem devolveu, motivo, detalhes e o valor da
 * indenização (decisão de 13/10/2026); o engenheiro ajusta o valor; qualquer um que vê a avaria
 * pode enviar foto e dados pelo compartilhar do celular.
 */
export default async function PaginaAvaria({ params }: PageProps<'/avaria/[id]'>) {
  const { id } = await params
  const { obraAtual } = await obterSessao()
  const avaria = await buscarAvaria(obraAtual.id, id)
  if (!avaria) notFound()

  const texto = textoMensagemAvaria({
    obra: obraAtual.nome,
    tipo: avaria.tipo,
    codigo: avaria.codigo,
    pessoa: avaria.pessoa?.nome ?? null,
    empresa: avaria.pessoa?.empresa ?? null,
    quando: avaria.quando,
    motivo: avaria.motivo,
    detalhes: avaria.detalhes,
    centavos: avaria.valor,
  })

  return (
    <>
      <Cabecalho
        titulo={`${avaria.tipo} ${avaria.codigo}`}
        subtitulo={`Avaria · ${formatarData(avaria.quando)} às ${formatarHora(avaria.quando)}`}
        voltarPara="/lista?aba=avarias"
      />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-8">
        {avaria.foto ? (
          <a
            href={avaria.foto}
            target="_blank"
            rel="noreferrer"
            className="relative block overflow-hidden rounded-cartao bg-escuro"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage privado */}
            <img
              src={avaria.foto}
              alt={`Foto da avaria de ${avaria.tipo} ${avaria.codigo}`}
              className="max-h-[60vh] w-full object-contain"
            />
            <span className="absolute right-2 bottom-2 rounded-full bg-[rgba(16,23,32,0.75)] px-3 py-1.5 text-[13px] font-bold text-white">
              Abrir foto inteira
            </span>
          </a>
        ) : (
          <Cartao className="py-6 text-center text-[15px] text-texto-2">
            Foto apagada pela política de retenção.
          </Cartao>
        )}

        <Cartao className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {ehIcone(avaria.icone) && (
              <IconeFerramenta icone={avaria.icone} nome={avaria.codigo} tamanho="p" />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[13px] font-bold tracking-[1.2px] text-aviso uppercase">
                {rotuloMotivo(avaria.motivo)}
              </span>
              {avaria.detalhes && <span className="text-[15px]">“{avaria.detalhes}”</span>}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="text-texto-2">Devolvida por</dt>
            <dd className="font-semibold">
              {avaria.pessoa ? (
                <Link href={`/pessoa/${avaria.pessoa.id}`} className="underline">
                  {avaria.pessoa.nome}
                </Link>
              ) : (
                '—'
              )}
              {avaria.pessoa?.empresa && (
                <span className="font-normal text-texto-2"> · {avaria.pessoa.empresa}</span>
              )}
            </dd>
            <dt className="text-texto-2">Data</dt>
            <dd className="font-semibold">
              {formatarData(avaria.quando)} às {formatarHora(avaria.quando)}
            </dd>
            <dt className="text-texto-2">Lançamento</dt>
            <dd>
              <Link href={`/lancamento/${avaria.movimentoId}`} className="font-semibold underline">
                Ver devolução
              </Link>
            </dd>
          </dl>
        </Cartao>

        <Cartao className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-texto-2">Valor da indenização</span>
          <span className="text-[30px] leading-tight font-extrabold tabular-nums">
            {formatarBRL(avaria.valor)}
          </span>
          <span className="text-[13px] text-texto-2">
            {avaria.ajustado
              ? `Ajustado${avaria.ajuste?.por ? ` por ${avaria.ajuste.por}` : ''}${
                  avaria.ajuste ? ` em ${formatarDataHora(avaria.ajuste.quando)}` : ''
                } · reposição ${formatarBRL(avaria.valorReposicao)}`
              : 'Valor de reposição da ferramenta'}
          </span>
          {obraAtual.perfil === 'engenheiro' && (
            <FormIndenizacao
              key={avaria.valor}
              id={avaria.id}
              valor={avaria.valor}
              valorReposicao={avaria.valorReposicao}
              ajustado={avaria.ajustado}
            />
          )}
        </Cartao>

        <BotaoEnviar texto={texto} foto={avaria.foto} arquivo={`avaria-${avaria.codigo}.jpg`} />
      </main>
    </>
  )
}
