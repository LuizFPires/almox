import type { Metadata } from 'next'
import { AdesivoCapacete } from '@/components/AdesivoCapacete'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { dadosAdesivos } from '@/lib/dados/adesivo'
import { pessoasSemAdesivo } from '@/lib/dados/pessoas'
import { podeCadastrar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { BotaoImprimirA4 } from './BotaoImprimirA4'

export const metadata: Metadata = { title: 'Adesivos em A4 · Almox' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** 3 × 3 adesivos de 60 × 80 mm numa folha A4 (margem de 10 mm). */
const POR_FOLHA = 9
/** Até 11 folhas por vez (99 adesivos). */
const LIMITE = 99

/**
 * Adesivos dos capacetes em folha A4, para a impressora comum da obra (sem mini PC nem
 * impressora de etiquetas): `?pessoas=id,id` (da ficha) ou `?empresa=` / sem nada (quem ainda
 * não tem adesivo). Na tela, a prévia e o botão; no papel, só as folhas, em tamanho real.
 */
export default async function PaginaAdesivosA4({
  searchParams,
}: PageProps<'/cadastros/adesivos/a4'>) {
  const p = (await searchParams) as Record<string, string | undefined>
  const { obraAtual } = await obterSessao()
  // O layout de Cadastros já mostra o aviso para quem não é engenheiro: nem busca os tokens.
  if (!podeCadastrar(obraAtual.perfil)) return null
  const volta = p.volta?.startsWith('/cadastros/') ? p.volta : '/cadastros/adesivos'
  const escolhidas = (p.pessoas ?? '')
    .split(',')
    .filter((id) => UUID.test(id))
    .slice(0, LIMITE)
  const empresa = p.empresa && UUID.test(p.empresa) ? p.empresa : null
  const ids =
    escolhidas.length > 0
      ? escolhidas
      : (await pessoasSemAdesivo(obraAtual.id, empresa)).slice(0, LIMITE).map((x) => x.id)
  const adesivos = await dadosAdesivos(obraAtual.id, ids)
  const folhas: (typeof adesivos)[] = []
  for (let i = 0; i < adesivos.length; i += POR_FOLHA) folhas.push(adesivos.slice(i, i + POR_FOLHA))

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm; }
        .folha-a4 { width: 190mm; display: grid; grid-template-columns: repeat(3, 60mm);
          grid-auto-rows: 80mm; gap: 5mm; justify-content: center; }
        @media print {
          body { background: #fff !important; }
          /* Só as folhas no papel, no fluxo normal (assim a quebra de página funciona):
             some tudo que não é as folhas nem está em volta delas; o que está em volta perde a
             largura de celular. */
          body *:not(:has(#folhas-a4)):not(#folhas-a4):not(#folhas-a4 *) { display: none !important; }
          body *:has(#folhas-a4) { display: block !important; max-width: none !important;
            margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
          .folha-a4 { break-after: page; }
          .folha-a4:last-child { break-after: auto; }
        }
      `}</style>
      <Cabecalho
        titulo="Adesivos em A4"
        subtitulo={`${adesivos.length} ${adesivos.length === 1 ? 'adesivo' : 'adesivos'} · ${folhas.length} ${folhas.length === 1 ? 'folha' : 'folhas'}`}
        voltarPara={volta}
      />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-8">
        {adesivos.length === 0 ? (
          <Cartao className="py-6 text-center text-[15px] text-texto-2">
            Ninguém sem adesivo. Para reimprimir, use a ficha da pessoa.
          </Cartao>
        ) : (
          <>
            <ol className="flex flex-col gap-1.5 rounded-cartao bg-sutil px-4 py-3 text-[15px]">
              <li>
                1. Folha <b>A4</b>, de preferência <b>adesiva</b> (vinil ou papel, de papelaria).
              </li>
              <li>
                2. Na janela de impressão: escala <b>100%</b> (ou “tamanho real”), sem “ajustar à
                página”.
              </li>
              <li>3. Recorte na linha tracejada e cole no capacete limpo e seco.</li>
            </ol>
            <BotaoImprimirA4 pessoas={adesivos.map((a) => a.pessoaId)} folhas={folhas.length} />
            {adesivos.length === LIMITE && (
              <p className="text-center text-[13px] text-texto-2">
                Vão {LIMITE} por vez. Depois de imprimir, volte para os próximos.
              </p>
            )}
            <span className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
              PRÉVIA DO PRIMEIRO
            </span>
            <AdesivoCapacete {...adesivos[0]!} />
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
      {/* Só no papel: as folhas em tamanho real. */}
      <div id="folhas-a4" className="hidden print:block">
        {folhas.map((folha, i) => (
          <section key={i} className="folha-a4" aria-label={`Folha ${i + 1}`}>
            {folha.map((a) => (
              <AdesivoCapacete key={a.pessoaId} {...a} impressao />
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
