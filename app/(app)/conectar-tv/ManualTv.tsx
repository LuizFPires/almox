import type { ReactNode } from 'react'

/** Endereço que vai no navegador da TV. */
const ENDERECO_TV = 'almox-controle.vercel.app/tv'

type Passo = { titulo: string; tempo: string; itens: ReactNode[] }

const PASSOS: Passo[] = [
  {
    titulo: 'Ligar a caixinha',
    tempo: '5 min',
    itens: [
      <>
        Cabo <b>HDMI</b> da caixinha até a TV. Anote o número da entrada (HDMI 1, 2…).
      </>,
      <>
        Fonte da caixinha na <b>tomada</b>.
      </>,
      <>
        No controle <b>da TV</b>: botão <b>Source/Input</b> até achar esse HDMI.
      </>,
      <>
        Pilhas no controle <b>da caixinha</b> e siga a tela para parear.
      </>,
    ],
  },
  {
    titulo: 'Configurar o Google TV',
    tempo: '10 min',
    itens: [
      <>
        Idioma: <b>Português (Brasil)</b>.
      </>,
      <>
        <b>Wi-Fi da obra</b> e a senha.
      </>,
      <>
        Entrar com uma <b>conta Google do almoxarifado</b> (não a pessoal).
      </>,
      <>
        Pular assinaturas e apps sugeridos. Deixar <b>atualizar</b> até o fim.
      </>,
    ],
  },
  {
    titulo: 'Instalar o navegador',
    tempo: '3 min',
    itens: [
      <>
        Na <b>lupa</b> da tela inicial, digite <b>Fully Kiosk Browser</b> e instale.
      </>,
      <>
        Abra e, em <b>Start URL</b>, digite:{' '}
        <span className="font-mono font-bold break-all select-all">{ENDERECO_TV}</span>
      </>,
      <>
        Não achou? Instale o <b>TV Bro</b> (grátis) e digite o mesmo endereço na barra.
      </>,
    ],
  },
  {
    titulo: 'Conectar ao Almox',
    tempo: '1 min',
    itens: [
      <>
        A TV mostra <b>6 números</b> e um <b>QR Code</b>.
      </>,
      <>
        Aponte a <b>câmera do celular</b> para o QR e toque em <b>Conectar</b>.
      </>,
      <>Sem câmera: digite os 6 números no campo acima, nesta tela.</>,
    ],
  },
  {
    titulo: 'Voltar sozinha depois de faltar luz',
    tempo: '5 min · uma vez só',
    itens: [
      <>
        <b>Fully Kiosk</b> (configurações: deslize da borda esquerda): ligar <b>Start on Boot</b> e{' '}
        <b>Keep Screen On</b>. Pede a licença Plus (~€ 8), paga no próprio app.
      </>,
      <>
        <b>Google TV › Configurações › Sistema › Energia e luz</b>: protetor de tela e desligar a
        tela em <b>Nunca</b>.
      </>,
      <>
        Na <b>TV</b>, se existir: ligar <b>HDMI-CEC</b> (Anynet+, Bravia Sync, SimpLink) para ligar
        junto com a caixinha.
      </>,
    ],
  },
]

const PROBLEMAS = [
  {
    titulo: 'Faltou luz',
    texto: 'Volta sozinha e já lembra que está conectada. Não precisa fazer nada.',
  },
  {
    titulo: 'Apareceram os 6 números',
    texto: 'Alguém desconectou a TV no app. Repita o passo 4.',
  },
  {
    titulo: '"Sem conexão" na tela',
    texto: 'É o Wi-Fi da obra. Quando a internet voltar, atualiza sozinha.',
  },
]

/**
 * Passo a passo para ligar a TV do almoxarifado (mesmo conteúdo da folha impressa
 * docs/impressao/tv-passo-a-passo). Aberto quando a obra ainda não tem TV conectada.
 */
export function ManualTv({ aberto }: { aberto: boolean }) {
  return (
    <details open={aberto} className="rounded-cartao bg-cartao px-4 py-2">
      <summary className="flex min-h-toque cursor-pointer items-center font-semibold">
        Primeira vez? Passo a passo para ligar a TV
      </summary>
      <div className="flex flex-col gap-4 pt-1 pb-3">
        <p className="text-[15px] text-texto-2">
          Separe <b className="text-texto">20 minutos</b>, a{' '}
          <b className="text-texto">senha do Wi-Fi</b> da obra e este celular. Caixinha recomendada:{' '}
          <b className="text-texto">Xiaomi TV Box S 2ª geração</b>. Funciona em qualquer TV com
          entrada HDMI.
        </p>
        <ol className="flex flex-col gap-4">
          {PASSOS.map((passo, i) => (
            <li key={passo.titulo} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amarelo font-bold text-escuro"
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-bold">
                  <span className="sr-only">Passo {i + 1}: </span>
                  {passo.titulo}{' '}
                  <span className="text-sm font-normal text-texto-2">· {passo.tempo}</span>
                </h3>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px]">
                  {passo.itens.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-bold tracking-[1.2px] text-texto-2">SE ACONTECER</h3>
          {PROBLEMAS.map((p) => (
            <p key={p.titulo} className="rounded-botao bg-sutil px-3 py-2 text-[15px]">
              <b className="block">{p.titulo}</b>
              {p.texto}
            </p>
          ))}
        </div>
      </div>
    </details>
  )
}
