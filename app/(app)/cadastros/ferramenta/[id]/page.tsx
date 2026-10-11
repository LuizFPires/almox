import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { buscarTipo, historicoDoTipo, listarTipos } from '@/lib/dados/ferramentas'
import { formatarDataHora } from '@/lib/formatos/datas'
import { formatarBRL } from '@/lib/formatos/moeda'
import { obterSessao } from '@/lib/sessao'
import { FormFerramenta } from '../FormFerramenta'

export const metadata: Metadata = { title: 'Editar ferramenta · Almox' }

const STATUS = { livre: 'livre', em_uso: 'em uso', manutencao: 'manutenção', baixada: 'baixada' }

function descreverMudanca(campo: string, de: string | null, para: string | null) {
  if (campo === 'valor_reposicao') {
    const para$ = para ? formatarBRL(Number(para)) : '—'
    return de ? `Valor: ${formatarBRL(Number(de))} → ${para$}` : `Valor inicial: ${para$}`
  }
  const sim = (x: string | null) => (x === 'true' ? 'sim' : 'não')
  return de ? `Alto valor: ${sim(de)} → ${sim(para)}` : `Alto valor: ${sim(para)}`
}

export default async function PaginaEditarFerramenta({
  params,
}: PageProps<'/cadastros/ferramenta/[id]'>) {
  const { id } = await params
  const { obraAtual } = await obterSessao()
  const [tipo, tipos, historico] = await Promise.all([
    buscarTipo(obraAtual.id, id),
    listarTipos(obraAtual.id),
    historicoDoTipo(obraAtual.id, id),
  ])
  if (!tipo) notFound()

  return (
    <>
      <Cabecalho
        titulo={tipo.nome}
        subtitulo={`${tipo.unidades.length} unidades · ${formatarBRL(tipo.valor_reposicao)} cada`}
        voltarPara="/cadastros/ferramentas"
      />
      <FormFerramenta
        tipo={{ ...tipo, codigos: tipo.unidades.map((u) => u.codigo) }}
        prefixosUsados={tipos.map((t) => t.prefixo)}
      />

      <section className="flex flex-col gap-2 px-5 pb-4" aria-labelledby="titulo-unidades">
        <h2 id="titulo-unidades" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
          UNIDADES
        </h2>
        <Cartao className="flex flex-wrap gap-2">
          {tipo.unidades.map((u) => (
            <span
              key={u.codigo}
              className={`rounded-full px-2.5 py-1 font-mono text-[13px] ${
                u.status === 'livre'
                  ? 'bg-sucesso-claro text-sucesso'
                  : u.status === 'em_uso'
                    ? 'bg-aviso-claro text-aviso'
                    : 'bg-erro-claro text-erro'
              }`}
            >
              {u.codigo} · {STATUS[u.status]}
            </span>
          ))}
        </Cartao>
      </section>

      <section className="flex flex-col gap-2 px-5 pb-8" aria-labelledby="titulo-historico">
        <h2 id="titulo-historico" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
          HISTÓRICO DE VALOR
        </h2>
        <Cartao className="flex flex-col divide-y divide-borda py-1">
          {historico.length === 0 && <p className="py-2 text-sm text-texto-2">Sem alterações.</p>}
          {historico.map((h) => (
            <div key={h.id} className="flex flex-col py-2">
              <span className="text-[15px] font-semibold">
                {descreverMudanca(h.campo, h.de, h.para)}
              </span>
              <span className="text-[13px] text-texto-2">
                {formatarDataHora(h.criado_em)} · {h.usuario_nome ?? 'carga inicial'}
              </span>
            </div>
          ))}
        </Cartao>
      </section>
    </>
  )
}
