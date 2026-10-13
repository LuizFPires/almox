import { ICONES_FERRAMENTA, ehChaveIcone, urlIconeArquivo, type Icone } from './icones-ferramenta'

const TAMANHOS = {
  p: { circulo: 'size-[34px]', svg: 20, texto: 'text-[13px]' },
  m: { circulo: 'size-[52px]', svg: 30, texto: 'text-[15px]' },
  g: { circulo: 'size-[76px]', svg: 44, texto: 'text-lg' },
} as const

type Props = {
  icone: Icone
  /** Nome escrito embaixo; padrão = nome do ícone. O nome sempre aparece. */
  nome?: string
  tamanho?: keyof typeof TAMANHOS
  /** Círculo branco (ex.: ferramenta escolhida na grade da retirada). */
  destaque?: boolean
}

/** Ícone de ferramenta sempre acompanhado do nome escrito embaixo. */
export function IconeFerramenta({ icone, nome, tamanho = 'm', destaque = false }: Props) {
  const nomePadrao = ehChaveIcone(icone) ? ICONES_FERRAMENTA[icone].nome : 'Ferramenta'
  const t = TAMANHOS[tamanho]
  return (
    <span className="inline-flex flex-col items-center gap-1.5">
      <CirculoFerramenta icone={icone} circulo={t.circulo} svg={t.svg} destaque={destaque} />
      <span className={`${t.texto} text-center leading-tight font-bold`}>{nome ?? nomePadrao}</span>
    </span>
  )
}

type PropsCirculo = {
  icone: Icone
  /** Classe de tamanho do círculo (ex.: `size-[26px]`). */
  circulo: string
  svg: number
  destaque?: boolean
}

/**
 * Só o círculo com o traço, para onde o nome já está escrito ao lado (chip da lista, linha do
 * estoque — decisão do M7). Decorativo: quem usa escreve o nome. Ícone próprio (enviado pelo
 * engenheiro) aparece como imagem no mesmo círculo claro, inclusive na TV.
 */
export function CirculoFerramenta({ icone, circulo, svg, destaque = false }: PropsCirculo) {
  return (
    <span
      aria-hidden="true"
      className={`${circulo} flex shrink-0 items-center justify-center rounded-full ${destaque ? 'bg-white' : 'bg-sutil'}`}
    >
      {ehChaveIcone(icone) ? (
        <svg
          width={svg}
          height={svg}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-texto"
        >
          <path d={ICONES_FERRAMENTA[icone].d} />
        </svg>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- imagem pequena do Storage público
        <img
          src={urlIconeArquivo(icone)}
          alt=""
          width={svg}
          height={svg}
          loading="lazy"
          className="object-contain"
          style={{ width: svg, height: svg }}
        />
      )}
    </span>
  )
}
