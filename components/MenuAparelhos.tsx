import { Gaveta } from './Gaveta'
import { IconeImpressora } from './IconeImpressora'
import { IconeInterface } from './IconeInterface'

type Props = {
  /** Impressora escolhida e agente do mini PC online. */
  pronta: boolean
  /** Linha de situação da impressora (ex.: "Zebra ZD421 · agente online"). */
  situacao: string
}

/** Engrenagem no traço dos ícones do DS (grade 24, traço 1,75). Decorativo. */
function Engrenagem() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

/**
 * Engrenagem do cabeçalho de Cadastros (opção A): impressora, painel da TV, importar planilha e
 * o passo a passo numa gaveta, liberando a tela para as listas. A bolinha mostra se a
 * impressora está pronta.
 */
export function MenuAparelhos({ pronta, situacao }: Props) {
  return (
    <Gaveta
      rotulo={`Impressora, TV e planilha${pronta ? '' : ' (impressora com problema)'}`}
      icone={<Engrenagem />}
      marca={pronta ? 'ok' : 'erro'}
      titulo="Impressora, TV e planilha"
      itens={[
        {
          href: '/cadastros/impressora',
          icone: <IconeImpressora tamanho={20} />,
          titulo: 'Impressora',
          detalhe: situacao,
          tom: pronta ? 'ok' : 'erro',
        },
        {
          href: '/conectar-tv',
          icone: <IconeInterface nome="dashboard" tamanho={20} />,
          titulo: 'Conectar TV',
          detalhe: 'Código que aparece na TV',
        },
        {
          href: '/cadastros/painel-tv',
          icone: <IconeInterface nome="clock" tamanho={20} />,
          titulo: 'Painel da TV',
          detalhe: 'Tempo por página e rolagem',
        },
        {
          href: '/cadastros/importar',
          icone: <IconeInterface nome="history" tamanho={20} />,
          titulo: 'Importar planilha',
          detalhe: 'Empresas, pessoas e ferramentas de uma vez',
        },
        {
          href: '/cadastros/ajuda',
          icone: <IconeInterface nome="info" tamanho={20} />,
          titulo: 'Passo a passo: TV e adesivos',
          tom: 'info',
        },
      ]}
    />
  )
}
