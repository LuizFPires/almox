import type { ResumoMaterialPeriodo } from '@/lib/dados/materiais'
import { formatarData } from '@/lib/formatos/datas'
import { formatarQuantidade, type UnidadeMaterial } from '@/lib/formatos/quantidade'

type Props = {
  resumo: ResumoMaterialPeriodo[]
  /** Material escolhido no filtro (nome e unidade, mesmo sem lançamento no período). */
  material: { id: string; nome: string; unidade: UnidadeMaterial } | null
  de: string
  ate: string
}

const SAIDA = 'text-[#7F1D1D]'
const meioDia = (dia: string) => `${dia}T12:00:00-03:00`
const dataCurta = (dia: string) => formatarData(meioDia(dia)).slice(0, 5)
const comSinal = (n: number) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatarQuantidade(Math.abs(n))}`

/**
 * Resumo do período, recolhível (aberto por padrão). Um material: extrato de banco (saldo no
 * início, entradas, saídas, ajustes, saldo no fim). Todos: quanto entrou e saiu de cada um.
 */
export function ResumoExtrato({ resumo, material, de, ate }: Props) {
  const lancamentos = resumo.reduce((s, r) => s + r.lancamentos, 0)
  const titulo = material
    ? material.nome
    : `Resumo do período · ${lancamentos} ${lancamentos === 1 ? 'lançamento' : 'lançamentos'}`

  return (
    <details open className="group mx-5 mt-3 rounded-cartao bg-cartao">
      <summary className="flex min-h-toque cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="truncate text-[11px] font-extrabold tracking-[0.5px] text-texto-2 uppercase">
          {titulo}
        </span>
        <span className="shrink-0 text-xs font-bold text-texto-2">
          <span className="group-open:hidden">Mostrar</span>
          <span className="hidden group-open:inline">Esconder</span>
          <span
            aria-hidden="true"
            className="ml-1 inline-block transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="px-4 pb-4">
        {material ? (
          <ContaDoMaterial
            r={resumo.find((x) => x.materialId === material.id)}
            unidade={material.unidade}
            de={de}
            ate={ate}
          />
        ) : (
          <TabelaMateriais resumo={resumo.filter((r) => r.lancamentos > 0)} />
        )}
      </div>
    </details>
  )
}

function ContaDoMaterial({
  r,
  unidade,
  de,
  ate,
}: {
  r: ResumoMaterialPeriodo | undefined
  unidade: UnidadeMaterial
  de: string
  ate: string
}) {
  const v = r ?? { saldoInicio: 0, entradas: 0, saidas: 0, ajustes: 0, saldoFim: 0 }
  const linha = (rotulo: string, valor: string, cor = '') => (
    <div className="flex items-baseline justify-between py-1 text-[15px]">
      <dt>{rotulo}</dt>
      <dd className={`font-bold tabular-nums ${cor}`}>
        {valor} {unidade}
      </dd>
    </div>
  )
  return (
    <dl>
      {linha(`Saldo em ${dataCurta(de)}`, formatarQuantidade(v.saldoInicio))}
      {linha('Entradas', comSinal(v.entradas), 'text-sucesso')}
      {linha('Saídas', comSinal(-v.saidas), SAIDA)}
      {v.ajustes !== 0 && linha('Ajustes da contagem', comSinal(v.ajustes), 'text-aviso')}
      <div className="mt-1.5 flex items-baseline justify-between border-t-[1.5px] border-dashed border-borda pt-2.5 text-[17px] font-extrabold">
        <dt>Saldo em {dataCurta(ate)}</dt>
        <dd className="tabular-nums">
          {formatarQuantidade(v.saldoFim)} {unidade}
        </dd>
      </div>
    </dl>
  )
}

function TabelaMateriais({ resumo }: { resumo: ResumoMaterialPeriodo[] }) {
  if (resumo.length === 0) {
    return <p className="text-sm text-texto-2">Nada lançado no período.</p>
  }
  const valor = (n: number, sinal: '+' | '−', cor: string, un: string) =>
    n > 0 ? (
      <span className={cor}>
        {sinal}
        {formatarQuantidade(n)} <small>{un}</small>
      </span>
    ) : (
      <span className="text-texto-2">—</span>
    )
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="text-[11px] font-extrabold tracking-[0.5px] text-texto-2 uppercase">
          <th className="pb-1 text-left">Material</th>
          <th className="w-[72px] pb-1 text-right">Entrou</th>
          <th className="w-[72px] pb-1 text-right">Saiu</th>
        </tr>
      </thead>
      <tbody>
        {resumo.map((r) => (
          <tr key={r.materialId}>
            <td className="truncate py-0.5 pr-2 font-semibold">{r.nome}</td>
            <td className="py-0.5 text-right font-extrabold whitespace-nowrap tabular-nums">
              {valor(r.entradas, '+', 'text-sucesso', r.unidade)}
            </td>
            <td className="py-0.5 text-right font-extrabold whitespace-nowrap tabular-nums">
              {valor(r.saidas, '−', SAIDA, r.unidade)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
