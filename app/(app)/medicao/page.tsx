import type { Metadata } from 'next'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { SeloPerfil } from '@/components/SeloPerfil'
import { dadosMedicao } from '@/lib/dados/avisos'
import { podeCadastrar } from '@/lib/dominio/permissoes'
import { formatarData } from '@/lib/formatos/datas'
import { formatarBRL } from '@/lib/formatos/moeda'
import { obterSessao } from '@/lib/sessao'
import { FormMedicao } from './FormMedicao'

export const metadata: Metadata = { title: 'Valores a descontar · Almox' }

/** Valores a descontar por empreiteira (PRD F-12) e fechamento da medição (só o engenheiro). */
export default async function PaginaMedicao() {
  const { obraAtual } = await obterSessao()
  if (!podeCadastrar(obraAtual.perfil)) {
    return (
      <>
        <Cabecalho titulo="Valores a descontar" voltarPara="/inicio" />
        <main className="flex flex-1 flex-col px-4 pt-2">
          <Cartao className="py-6 text-center text-[15px] text-texto-2">
            Só o engenheiro vê os valores a descontar e fecha a medição.
          </Cartao>
        </main>
      </>
    )
  }
  const { empresas, descontos, medicoes } = await dadosMedicao(obraAtual.id)

  return (
    <>
      <Cabecalho
        titulo="Valores a descontar"
        subtitulo="Por empreiteira, na próxima medição"
        voltarPara="/inicio"
        selo={<SeloPerfil perfil={obraAtual.perfil} />}
      />
      <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-6">
        <p className="rounded-cartao bg-engenheiro-claro px-4 py-3 text-[15px] text-engenheiro">
          Cada ferramenta não devolvida conta uma vez, com o valor do dia em que virou pendência. Se
          voltar antes de você fechar a medição, sai do desconto sozinha.
        </p>
        {empresas.map((e) => {
          const daEmpresa = descontos.filter((d) => d.empresa_id === e.id)
          const total = daEmpresa.reduce((s, d) => s + d.valor, 0)
          const ultima = medicoes.find((m) => m.empresa_id === e.id)
          return (
            <section
              key={e.id}
              aria-label={e.nome}
              className="flex flex-col gap-2 rounded-cartao bg-cartao px-4 py-3.5"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: e.cor }}
                />
                <h2 className="flex-1 font-bold">{e.nome}</h2>
                <span className={`font-bold ${total ? 'text-erro' : 'text-texto-2'}`}>
                  {formatarBRL(total)}
                </span>
              </div>
              <p className="text-[13px] text-texto-2">
                {e.proxima_medicao
                  ? `Próxima medição: ${formatarData(`${e.proxima_medicao}T12:00:00Z`)}`
                  : 'Próxima medição sem data'}
                {ultima && ` · última fechada em ${formatarData(ultima.fechada_em)}`}
              </p>
              {daEmpresa.length > 0 && (
                <ul className="flex flex-col">
                  {daEmpresa.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 border-b border-borda py-1.5 text-sm last:border-b-0"
                    >
                      <span>
                        {d.tipo_nome}{' '}
                        <span className="font-mono text-[12px] text-texto-2">{d.codigo}</span>
                        <span className="text-texto-2"> · {d.pessoa?.nome}</span>
                      </span>
                      <span className="whitespace-nowrap">{formatarBRL(d.valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <FormMedicao empresa={e.id} total={total} proximaAtual={e.proxima_medicao} />
            </section>
          )
        })}
      </main>
      <BarraInferior ativa="inicio" podeLancar />
    </>
  )
}
