import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { SeloPerfil } from '@/components/SeloPerfil'
import { buscarMetricas } from '@/lib/dados/metricas'
import { lerFiltros, periodoValido } from '@/lib/dominio/historico'
import {
  metaAvisos,
  metaPerdas,
  metaRastreabilidade,
  metaSemQr,
  metaTempo,
  type Meta,
} from '@/lib/dominio/metricas'
import { diaDaObra, formatarData } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Métricas do piloto · Almox' }

const CLASSE_CAMPO =
  'min-h-toque w-full rounded-botao border border-borda bg-cartao px-3 text-[15px]'

function Indicador({ titulo, meta, alvo }: { titulo: string; meta: Meta; alvo: string }) {
  const tom =
    meta.ok === null
      ? 'bg-sutil text-texto-2'
      : meta.ok
        ? 'bg-sucesso-claro text-sucesso'
        : 'bg-erro-claro text-erro'
  return (
    <div className={`flex flex-col gap-0.5 rounded-cartao px-4 py-3 ${tom}`}>
      <span className="text-[13px] font-semibold">{titulo}</span>
      <span className="text-2xl font-bold tabular-nums">{meta.texto}</span>
      <span className="text-[13px]">meta: {alvo}</span>
    </div>
  )
}

/** Métricas do piloto (PRD §3), só para o engenheiro: as metas e a tabela por semana. */
export default async function PaginaMetricas({ searchParams }: PageProps<'/metricas'>) {
  const { obraAtual } = await obterSessao()
  if (obraAtual.perfil !== 'engenheiro') redirect('/inicio')
  const agora = new Date()
  const filtros = lerFiltros(
    { de: diaDaObra(new Date(agora.getTime() - 55 * 86_400_000)), ...(await searchParams) },
    agora,
  )
  const valido = periodoValido(filtros)
  const semanas = valido ? await buscarMetricas(obraAtual.id, filtros.de, filtros.ate) : []
  const tempo = metaTempo(semanas)

  return (
    <>
      <Cabecalho
        titulo="Métricas do piloto"
        subtitulo="Metas do PRD, por semana"
        voltarPara="/inicio"
        selo={<SeloPerfil perfil={obraAtual.perfil} />}
      />
      <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-6">
        <form
          method="get"
          aria-label="Período"
          className="grid grid-cols-2 gap-2 rounded-cartao bg-cartao p-3"
        >
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-texto-2">
            De
            <input type="date" name="de" defaultValue={filtros.de} className={CLASSE_CAMPO} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-texto-2">
            Até
            <input type="date" name="ate" defaultValue={filtros.ate} className={CLASSE_CAMPO} />
          </label>
          <button
            type="submit"
            className="col-span-2 min-h-toque rounded-botao bg-escuro font-bold text-white"
          >
            Ver período
          </button>
        </form>
        {!valido && (
          <p role="alert" className="rounded-cartao bg-erro-claro px-4 py-3 text-erro">
            Escolha um período de até um ano.
          </p>
        )}

        <section aria-label="Metas" className="grid grid-cols-2 gap-2">
          <Indicador titulo="QR lido → retirada" meta={tempo} alvo="até 15 s (mediana)" />
          <Indicador titulo="Retiradas sem QR" meta={metaSemQr(semanas)} alvo="menos de 10%" />
          <Indicador titulo="Não devolvidas" meta={metaPerdas(semanas)} alvo="queda de 50%" />
          <Indicador titulo="Pendências com aviso" meta={metaAvisos(semanas)} alvo="100%" />
          <Indicador titulo="Rastreabilidade" meta={metaRastreabilidade(semanas)} alvo="100%" />
          <div className="flex flex-col gap-0.5 rounded-cartao bg-sutil px-4 py-3 text-texto-2">
            <span className="text-[13px] font-semibold">Retiradas em até 15 s</span>
            <span className="text-2xl font-bold tabular-nums">
              {tempo.ate15 === null ? '—' : `${tempo.ate15.toLocaleString('pt-BR')}%`}
            </span>
            <span className="text-[13px]">das medidas com QR</span>
          </div>
        </section>
        <p className="text-[13px] text-texto-2">
          O atraso do lançamento até a TV (meta: até 3 s) é medido na obra, com cronômetro: a TV
          consulta o Almox a cada 2 s.
        </p>

        {valido && (
          <a
            href={`/api/planilhas/metricas?de=${filtros.de}&ate=${filtros.ate}`}
            download
            className="flex min-h-toque items-center justify-center rounded-botao border border-borda bg-cartao font-bold"
          >
            Baixar relatório do piloto (.xlsx)
          </a>
        )}

        <section aria-label="Por semana" className="overflow-x-auto rounded-cartao bg-cartao">
          <table className="w-full text-left text-[13px] tabular-nums">
            <thead className="text-texto-2">
              <tr>
                <th className="px-3 py-2">Semana</th>
                <th className="px-2 py-2">Retiradas</th>
                <th className="px-2 py-2">Sem QR</th>
                <th className="px-2 py-2">Mediana</th>
                <th className="px-2 py-2">Pendências</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {semanas.map((s) => (
                <tr key={s.semana}>
                  <td className="px-3 py-2">
                    {formatarData(`${s.semana}T12:00:00-03:00`).slice(0, 5)}
                  </td>
                  <td className="px-2 py-2">{s.retiradas}</td>
                  <td className="px-2 py-2">{s.semQr}</td>
                  <td className="px-2 py-2">
                    {s.tempoMedianaS === null
                      ? '—'
                      : `${s.tempoMedianaS.toLocaleString('pt-BR')} s`}
                  </td>
                  <td className="px-2 py-2">
                    {s.pendencias}
                    {s.pendencias > 0 && ` (${s.pendenciasComAviso} c/ aviso)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  )
}
