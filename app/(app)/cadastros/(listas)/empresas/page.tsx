import type { Metadata } from 'next'
import Link from 'next/link'
import { Cartao } from '@/components/Cartao'
import { BotaoNovo } from '@/components/Formulario'
import { IconeInterface } from '@/components/IconeInterface'
import { listarEmpresas } from '@/lib/dados/empresas'
import { faltaEmail } from '@/lib/dominio/cadastros'
import { formatarData } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Empresas · Cadastros · Almox' }

export default async function PaginaEmpresas() {
  const { obraAtual } = await obterSessao()
  const empresas = await listarEmpresas(obraAtual.id)

  return (
    <>
      <p className="text-[13px] text-texto-2">Construtora e empreiteiras no canteiro</p>
      {empresas.length === 0 && (
        <Cartao className="py-6 text-center text-[15px] text-texto-2">
          Nenhuma empresa cadastrada ainda.
        </Cartao>
      )}
      {empresas.map((e) => {
        const pessoas = e.pessoas.filter((p) => p.ativa).length
        const fora = e.pessoas.reduce((soma, p) => soma + p.posses.length, 0)
        const alerta = faltaEmail(e)
        return (
          <Cartao key={e.id} alerta={alerta} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0 rounded-full"
                style={{ background: e.cor }}
              />
              <span className="flex-1 text-base font-bold">{e.nome}</span>
              <span className="text-[13px] text-texto-2">
                {e.tipo === 'propria' ? 'própria' : 'empreiteira'} · {pessoas}{' '}
                {pessoas === 1 ? 'pessoa' : 'pessoas'} ·{' '}
                {fora === 0 ? 'nada fora' : `${fora} ${fora === 1 ? 'item fora' : 'itens fora'}`}
              </span>
            </div>
            {e.tipo === 'empreiteira' ? (
              <div className="flex flex-col gap-0.5 text-sm">
                <span>
                  <b>Dono:</b> {e.dono_nome ?? 'não definido'} ·{' '}
                  <span className={e.dono_email ? 'text-texto-2' : 'font-semibold text-erro'}>
                    {e.dono_email ?? 'sem e-mail'}
                  </span>
                </span>
                <span>
                  <b>Encarregado:</b> {e.encarregado?.nome ?? 'não definido'} ·{' '}
                  <span
                    className={e.encarregado_email ? 'text-texto-2' : 'font-semibold text-erro'}
                  >
                    {e.encarregado_email ?? 'sem e-mail'}
                  </span>
                </span>
                {e.proxima_medicao && (
                  <span className="text-texto-2">
                    Próxima medição: {formatarData(`${e.proxima_medicao}T12:00:00-03:00`)}
                  </span>
                )}
                <span
                  className={`text-[13px] ${alerta ? 'font-semibold text-erro' : 'text-sucesso'}`}
                >
                  {alerta
                    ? 'Falta e-mail: o aviso não vai chegar a todos'
                    : 'Recebem os avisos no app e por e-mail'}
                </span>
              </div>
            ) : (
              <span className="text-sm text-texto-2">
                Pendências de funcionários próprios vão para o engenheiro.
              </span>
            )}
            <Link
              href={`/cadastros/empresa/${e.id}`}
              className="flex min-h-toque items-center justify-center gap-1.5 rounded-botao border border-borda text-[15px] font-semibold"
            >
              Editar {e.nome}
              <IconeInterface nome="chevron-right" tamanho={18} />
            </Link>
          </Cartao>
        )
      })}
      <BotaoNovo href="/cadastros/empresa/nova">Nova empresa</BotaoNovo>
    </>
  )
}
