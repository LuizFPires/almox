import type { Metadata } from 'next'
import Link from 'next/link'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { IconeInterface } from '@/components/IconeInterface'
import { SeloPerfil } from '@/components/SeloPerfil'
import { enviosComProblema, listarAvisos } from '@/lib/dados/avisos'
import { rotuloStatusAviso, valorDoAviso } from '@/lib/dominio/avisos'
import { podeLancar } from '@/lib/dominio/permissoes'
import { formatarData } from '@/lib/formatos/datas'
import { formatarBRL } from '@/lib/formatos/moeda'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Avisos · Almox' }

const TONS = {
  erro: 'bg-erro-claro text-erro',
  sucesso: 'bg-sucesso-claro text-sucesso',
  aviso: 'bg-aviso-claro text-aviso',
} as const

/** Avisos de não devolução (RLS: engenheiro e a própria empreiteira; almoxarife não recebe). */
export default async function PaginaAvisos() {
  const { obraAtual } = await obterSessao()
  const [avisos, problemas] = await Promise.all([
    listarAvisos(obraAtual.id),
    obraAtual.perfil === 'engenheiro' ? enviosComProblema(obraAtual.id) : Promise.resolve(null),
  ])

  return (
    <>
      <Cabecalho
        titulo="Avisos"
        subtitulo={obraAtual.empresa ? obraAtual.empresa.nome : 'Ferramentas não devolvidas'}
        voltarPara="/inicio"
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <main className="flex flex-1 flex-col gap-2 px-4 pt-2 pb-6">
        {avisos.length > 0 && (
          <a
            href="/api/planilhas/descontos"
            download
            className="flex min-h-toque items-center justify-center rounded-botao border border-borda bg-cartao font-bold"
          >
            Baixar planilha dos descontos (.xlsx)
          </a>
        )}
        {problemas && (problemas.erro > 0 || problemas.semDestino > 0) && (
          <p className="rounded-cartao bg-aviso-claro px-4 py-3 text-[15px] text-aviso">
            {problemas.erro > 0 &&
              `${problemas.erro} ${problemas.erro === 1 ? 'e-mail não chegou' : 'e-mails não chegaram'} depois de 5 tentativas. `}
            {problemas.semDestino > 0 &&
              `${problemas.semDestino} ${problemas.semDestino === 1 ? 'notificação ficou' : 'notificações ficaram'} sem destino nos últimos 7 dias: o dono ou o encarregado ainda não ativou as notificações no celular.`}
          </p>
        )}
        {avisos.length === 0 && (
          <Cartao className="py-6 text-center text-[15px] text-texto-2">
            {obraAtual.perfil === 'almoxarife'
              ? 'Os avisos vão para o engenheiro e para o dono e o encarregado da empreiteira.'
              : 'Nenhum aviso de ferramenta não devolvida.'}
          </Cartao>
        )}
        {avisos.map((a) => {
          const status = rotuloStatusAviso(a.status)
          const { lembrete, valor } = valorDoAviso(
            a.id,
            a.status,
            a.descontos.flatMap((d) =>
              d.desconto ? [{ ...d.desconto, primeiroAvisoId: d.desconto.primeiro_aviso_id }] : [],
            ),
          )
          return (
            <Link
              key={a.id}
              href={`/avisos/${a.id}`}
              className="flex items-center gap-3 rounded-cartao bg-cartao px-4 py-3"
            >
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ background: a.empresa?.cor }}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-bold">
                  {a.empresa?.nome} · {formatarData(a.enviado_em).slice(0, 5)}
                </span>
                <span className="text-sm">
                  {a.itens.length} {a.itens.length === 1 ? 'ferramenta' : 'ferramentas'} ·{' '}
                  {lembrete ? 'lembrete, sem valor novo' : formatarBRL(valor)}
                </span>
                <span
                  className={`self-start rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TONS[status.tom]}`}
                >
                  {status.texto}
                </span>
              </span>
              <IconeInterface nome="chevron-right" tamanho={20} className="text-texto-2" />
            </Link>
          )
        })}
      </main>
      <BarraInferior ativa="inicio" podeLancar={podeLancar(obraAtual.perfil)} />
    </>
  )
}
