import { ICONES_FERRAMENTA, type ChaveIcone } from './icones-ferramenta'

const TAMANHOS = {
  p: { circulo: 'size-[34px]', svg: 20, texto: 'text-[13px]' },
  m: { circulo: 'size-[52px]', svg: 30, texto: 'text-[15px]' },
  g: { circulo: 'size-[76px]', svg: 44, texto: 'text-lg' },
} as const

type Props = {
  icone: ChaveIcone
  /** Nome escrito embaixo; padrão = nome do ícone. O nome sempre aparece. */
  nome?: string
  tamanho?: keyof typeof TAMANHOS
  /** Círculo branco (ex.: ferramenta escolhida na grade da retirada). */
  destaque?: boolean
}

/** Ícone de ferramenta sempre acompanhado do nome escrito embaixo. */
export function IconeFerramenta({ icone, nome, tamanho = 'm', destaque = false }: Props) {
  const { d, nome: nomePadrao } = ICONES_FERRAMENTA[icone]
  const t = TAMANHOS[tamanho]
  return (
    <span className="inline-flex flex-col items-center gap-1.5">
      <span
        className={`${t.circulo} flex items-center justify-center rounded-full ${destaque ? 'bg-white' : 'bg-sutil'}`}
      >
        <svg
          width={t.svg}
          height={t.svg}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-texto"
        >
          <path d={d} />
        </svg>
      </span>
      <span className={`${t.texto} text-center leading-tight font-bold`}>{nome ?? nomePadrao}</span>
    </span>
  )
}
