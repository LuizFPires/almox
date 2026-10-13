import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { CartaoImpressora } from '@/components/CartaoImpressora'
import { situacaoImpressao } from '@/lib/dados/impressao'
import { pessoasParaAdesivo } from '@/lib/dados/pessoas'
import { ehTamanho, TAMANHO_PADRAO } from '@/lib/dominio/folha-adesivos'
import { obterSessao } from '@/lib/sessao'
import { BotaoLote } from './BotaoLote'
import { MontarFolhas } from './MontarFolhas'

export const metadata: Metadata = { title: 'Imprimir adesivos · Almox' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const POR_VEZ = 100

/**
 * Imprimir adesivos dos capacetes (opção B do protótipo): monta a folha A4 (tamanho, espaços
 * já usados, todos sem adesivo, todos da obra ou um por um). `?pessoa=` já escolhe uma (ficha);
 * `?empresa=` mostra só a empresa. A impressora de etiquetas (mini PC), quando a obra tem uma,
 * continua embaixo.
 */
export default async function PaginaAdesivos({ searchParams }: PageProps<'/cadastros/adesivos'>) {
  const p = (await searchParams) as Record<string, string | undefined>
  const { obraAtual } = await obterSessao()
  const volta = p.volta?.startsWith('/cadastros/') ? p.volta : '/cadastros/pessoas'
  const empresa = p.empresa && UUID.test(p.empresa) ? p.empresa : null
  const [todas, { impressora, agente }] = await Promise.all([
    pessoasParaAdesivo(obraAtual.id),
    situacaoImpressao(obraAtual.id),
  ])
  const pessoas = empresa ? todas.filter((x) => x.empresa?.id === empresa) : todas
  const iniciais = p.pessoa && pessoas.some((x) => x.id === p.pessoa) ? [p.pessoa] : []
  const semAdesivo = pessoas.filter((x) => !x.temAdesivo)
  const enviados = p.enviados === undefined ? null : Number(p.enviados) || 0
  const falhas = Number(p.falhas) || 0
  const aqui = `/cadastros/adesivos${empresa ? `?empresa=${empresa}` : ''}`

  return (
    <>
      <Cabecalho
        titulo="Imprimir adesivos"
        subtitulo={empresa ? (pessoas[0]?.empresa?.nome ?? 'Empresa') : 'Monte a folha A4'}
        voltarPara={volta}
      />
      {enviados !== null && (
        <p
          role="status"
          className="mx-5 mb-3 rounded-cartao bg-sucesso-claro px-4 py-3.5 text-[15px] font-semibold text-sucesso"
        >
          {enviados} {enviados === 1 ? 'adesivo foi para' : 'adesivos foram para'} a fila da
          impressora de etiquetas.
        </p>
      )}
      {falhas > 0 && (
        <p role="alert" className="mx-5 mb-3 rounded-cartao bg-erro-claro px-4 py-3.5 text-erro">
          {falhas} não {falhas === 1 ? 'foi' : 'foram'} para a fila. Imprima pela ficha da pessoa.
        </p>
      )}
      <MontarFolhas
        pessoas={pessoas}
        iniciais={iniciais}
        tamanhoInicial={ehTamanho(p.tamanho) ? p.tamanho : TAMANHO_PADRAO}
        volta={aqui}
        rodape={
          // Impressora de etiquetas (mini PC): opcional, só quando a obra tem uma.
          impressora && (
            <section
              aria-label="Impressora de etiquetas"
              className="mx-5 flex flex-col gap-2 rounded-cartao bg-sutil px-4 py-3"
            >
              <span className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
                IMPRESSORA DE ETIQUETAS
              </span>
              <CartaoImpressora
                impressora={impressora}
                agente={agente}
                href="/cadastros/impressora"
              />
              {semAdesivo.length > 0 && (
                <BotaoLote
                  quantidade={Math.min(semAdesivo.length, POR_VEZ)}
                  empresa={empresa}
                  volta={volta}
                />
              )}
            </section>
          )
        }
      />
    </>
  )
}
