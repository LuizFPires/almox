import type { Metadata } from 'next'
import Link from 'next/link'
import { AdesivoA4 } from '@/components/AdesivoA4'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { dadosAdesivos } from '@/lib/dados/adesivo'
import {
  LIMITE_ADESIVOS,
  TAMANHO_PADRAO,
  TAMANHOS_ADESIVO,
  distribuirFolhas,
  ehTamanho,
  lerPuladas,
  medidaCm,
} from '@/lib/dominio/folha-adesivos'
import { podeCadastrar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { BotaoImprimirA4 } from './BotaoImprimirA4'
import { FolhasA4 } from './FolhasA4'

export const metadata: Metadata = { title: 'Adesivos em A4 · Almox' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Folhas A4 prontas para a impressora comum da obra, montadas em "Imprimir adesivos":
 * `?pessoas=id,id` (na ordem escolhida), `?tamanho=grande|medio|pequeno` e `?pular=0,1,2`
 * (espaços já usados da primeira folha). Na tela, a prévia e o botão; no papel, só as folhas,
 * em tamanho real.
 */
export default async function PaginaAdesivosA4({
  searchParams,
}: PageProps<'/cadastros/adesivos/a4'>) {
  const p = (await searchParams) as Record<string, string | undefined>
  const { obraAtual } = await obterSessao()
  // O layout de Cadastros já mostra o aviso para quem não é engenheiro: nem busca os tokens.
  if (!podeCadastrar(obraAtual.perfil)) return null
  const volta = p.volta?.startsWith('/cadastros/') ? p.volta : '/cadastros/adesivos'
  const tamanho = ehTamanho(p.tamanho) ? p.tamanho : TAMANHO_PADRAO
  const t = TAMANHOS_ADESIVO[tamanho]
  const ids = [...new Set((p.pessoas ?? '').split(',').filter((id) => UUID.test(id)))].slice(
    0,
    LIMITE_ADESIVOS,
  )
  const puladas = lerPuladas(p.pular, tamanho)
  // O banco devolve por nome: volta à ordem escolhida na montagem.
  const porId = new Map((await dadosAdesivos(obraAtual.id, ids)).map((a) => [a.pessoaId, a]))
  const adesivos = ids.flatMap((id) => {
    const a = porId.get(id)
    return a ? [a] : []
  })
  const folhas = adesivos.length ? distribuirFolhas(adesivos, tamanho, puladas) : []

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm; }
        .folha-a4 { width: 190mm; display: grid; justify-content: center;
          grid-template-columns: repeat(${t.colunas}, ${t.larguraMm}mm);
          grid-auto-rows: ${t.alturaMm}mm; gap: ${t.vaoMm}mm; }
        @media print {
          body { background: #fff !important; }
          /* Só as folhas no papel (elas ficam direto no body, fora da coluna do app). */
          body > :not(#folhas-a4) { display: none !important; }
          .folha-a4 { break-after: page; }
          .folha-a4:last-child { break-after: auto; }
        }
      `}</style>
      <Cabecalho
        titulo="Adesivos em A4"
        subtitulo={`${adesivos.length} ${adesivos.length === 1 ? 'adesivo' : 'adesivos'} · ${folhas.length} ${folhas.length === 1 ? 'folha' : 'folhas'} · ${t.rotulo}`}
        voltarPara={volta}
      />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-8">
        {adesivos.length === 0 ? (
          <Cartao className="flex flex-col items-center gap-2 py-6 text-center text-[15px] text-texto-2">
            Ninguém escolhido para imprimir.
            <Link href="/cadastros/adesivos" className="min-h-toque font-bold text-texto underline">
              Montar a folha
            </Link>
          </Cartao>
        ) : (
          <>
            <ol className="flex flex-col gap-1.5 rounded-cartao bg-sutil px-4 py-3 text-[15px]">
              <li>
                1. Folha <b>A4</b>, de preferência <b>adesiva</b> (vinil ou papel, de papelaria).
                {puladas.length > 0 && (
                  <>
                    {' '}
                    Use a folha que já tem {puladas.length}{' '}
                    {puladas.length === 1 ? 'espaço usado' : 'espaços usados'}, na mesma posição.
                  </>
                )}
              </li>
              <li>
                2. Na janela de impressão: escala <b>100%</b> (ou “tamanho real”), sem “ajustar à
                página”.
              </li>
              <li>
                3. Recorte na linha tracejada e cole no capacete limpo e seco. Cada adesivo mede{' '}
                {medidaCm(tamanho)}.
              </li>
            </ol>
            <BotaoImprimirA4
              pessoas={adesivos.map((a) => a.pessoaId)}
              folhas={folhas.length}
              medida={medidaCm(tamanho)}
            />
            <span className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
              PRÉVIA DO PRIMEIRO
            </span>
            <div className="flex justify-center">
              <AdesivoA4 {...adesivos[0]!} tamanho={tamanho} />
            </div>
            <ul
              aria-label="Adesivos"
              className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao"
            >
              {adesivos.map((a) => (
                <li
                  key={a.pessoaId}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="font-semibold">{a.nomeCompleto}</span>
                  <span className="text-[13px] text-texto-2">{a.nomeCapacete}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      {/* Só no papel: as folhas em tamanho real (espaço usado ou sobra fica em branco). */}
      <FolhasA4>
        {folhas.map((folha, i) => (
          <section key={i} className="folha-a4" aria-label={`Folha ${i + 1}`}>
            {folha.map((e, j) =>
              e.tipo === 'item' ? (
                <AdesivoA4 key={e.item.pessoaId} {...e.item} tamanho={tamanho} />
              ) : (
                <span key={`${e.tipo}-${j}`} aria-hidden="true" />
              ),
            )}
          </section>
        ))}
      </FolhasA4>
    </>
  )
}
