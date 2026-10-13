import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Cabecalho } from '@/components/Cabecalho'

export const metadata: Metadata = { title: 'Passo a passo: TV e adesivos · Almox' }

const AGENTE = 'https://github.com/LuizFPires/almox/tree/main/agente-impressao'

function Passo({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-escuro text-sm font-bold text-amarelo"
      >
        {n}
      </span>
      <span className="flex min-w-0 flex-col gap-1 pt-0.5 text-[15px]">{children}</span>
    </li>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3 rounded-cartao bg-cartao px-4 py-4">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <ol className="flex flex-col gap-3">{children}</ol>
    </section>
  )
}

/**
 * Passo a passo para deixar o painel na TV e os adesivos funcionando, sem mini PC (decisão
 * de 13/10/2026): aparelho Google TV com navegador de quiosque e adesivos em folha A4.
 * A impressora de etiquetas com mini PC fica como opção no fim.
 */
export default function PaginaAjuda() {
  return (
    <>
      <Cabecalho
        titulo="TV e adesivos"
        subtitulo="Passo a passo para deixar funcionando"
        voltarPara="/cadastros/pessoas"
      />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-8">
        <p className="rounded-cartao bg-sutil px-4 py-3 text-[15px]">
          No almoxarifado basta uma <b>TV com Google TV</b> (ou um aparelho Google TV ligado na TV,
          como o Xiaomi TV Box S) e o Wi-Fi da obra. Os adesivos dos capacetes saem na{' '}
          <b>impressora comum da obra</b>, em folha A4.
        </p>

        <Secao titulo="1. Painel na TV">
          <Passo n={1}>
            Ligue o aparelho Google TV na TV pelo HDMI e conecte no Wi-Fi da obra. Na TV, ative o
            HDMI-CEC (Anynet+ na Samsung, SimpLink na LG) para ligarem juntos.
          </Passo>
          <Passo n={2}>
            Na loja da TV (Google Play), instale o <b>Fully Kiosk Browser</b>. Nas configurações
            dele, ponha o endereço inicial:
            <span className="rounded-botao bg-sutil px-3 py-2 font-mono text-[13px] break-all">
              almox-chi.vercel.app/tv
            </span>
            e ligue “abrir ao iniciar” e “manter a tela ligada”. Dica: o app <b>Google TV</b> no
            celular vira teclado da TV.
          </Passo>
          <Passo n={3}>
            A TV mostra um <b>código de 6 números</b> e um QR. No celular do engenheiro ou do
            almoxarife, leia o QR com a câmera (ou abra Início › ícone de grade › <b>Conectar TV</b>{' '}
            e digite o código) e toque em <b>Conectar TV</b>.
          </Passo>
          <Passo n={4}>
            Em poucos segundos o painel aparece. Depois disso a TV fica lembrada: se faltar luz,
            volta sozinha. O tempo das páginas e a rolagem ficam em{' '}
            <b>Cadastros › ⚙ › Painel da TV</b>.
          </Passo>
        </Secao>

        <Secao titulo="2. Adesivos dos capacetes">
          <Passo n={1}>
            Compre folha <b>A4 adesiva</b> (vinil ou papel, de papelaria) para a impressora da obra.
            Dura bem mais no capacete do que papel comum com fita.
          </Passo>
          <Passo n={2}>
            Em <b>Imprimir adesivos</b> (ou na ficha da pessoa › Imprimir em folha A4), escolha o
            tamanho (Médio: 12 por folha), toque nos espaços já usados da folha, se for aproveitar
            uma, e escolha: todos sem adesivo, todos da obra ou um por um.
          </Passo>
          <Passo n={3}>
            Na janela de impressão, escala <b>100%</b> (“tamanho real”), sem “ajustar à página”.
            Recorte na linha tracejada e cole no capacete limpo e seco.
          </Passo>
          <Passo n={4}>
            Teste: leia o adesivo com o celular em <b>Ler QR do capacete</b>. Tem que abrir a pessoa
            certa.
          </Passo>
        </Secao>

        <section
          aria-label="Se algo não funcionar"
          className="flex flex-col gap-2 rounded-cartao bg-aviso-claro px-4 py-4 text-[15px]"
        >
          <h2 className="text-lg font-bold text-aviso">Se algo não funcionar</h2>
          <p>
            <b>TV mostra o código de novo:</b> ela foi desconectada (ou trocada). Conecte de novo
            pelo código.
          </p>
          <p>
            <b>Código não encontrado:</b> confira os 6 números; o código vale 10 minutos e depois a
            TV mostra outro sozinha.
          </p>
          <p>
            <b>Adesivo saiu pequeno ou grande:</b> imprima de novo com escala 100%; o adesivo mede 5
            × 6,5 cm no Médio (6 × 8 no Grande, 4,5 × 6 no Pequeno).
          </p>
          <p>
            <b>Trocar ou tirar uma TV:</b> Início › ícone de grade › Conectar TV ›{' '}
            <b>Desconectar</b>.
          </p>
        </section>

        <Link href="/conectar-tv" className="text-center font-bold underline">
          Conectar uma TV agora
        </Link>

        <details className="rounded-cartao bg-cartao px-4 py-3 text-[15px]">
          <summary className="min-h-toque cursor-pointer content-center font-bold">
            Opcional: impressora de etiquetas com mini PC
          </summary>
          <div className="flex flex-col gap-2 pt-2 text-texto-2">
            <p>
              Para obras grandes, que cadastram muita gente: impressora térmica de etiquetas (ZPL ou
              TSPL) ligada num mini PC com o{' '}
              <a href={AGENTE} target="_blank" rel="noreferrer" className="font-semibold underline">
                agente de impressão
              </a>
              , na rede da obra.
            </p>
            <p>
              Configure em <b>Cadastros › ⚙ › Impressora</b>: IP, porta (quase sempre 9100),
              linguagem e “Cadastrar mini PC”. Com ela configurada, a ficha da pessoa e o lote
              mostram também “Imprimir etiqueta”.
            </p>
          </div>
        </details>
      </main>
    </>
  )
}
