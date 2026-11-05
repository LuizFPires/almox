import { textoAlertaMateriais } from '@/lib/dominio/tv'
import type { SaldoMaterial } from '@/lib/dominio/materiais'

/**
 * Alerta de materiais abaixo do limite na TV.
 * - `faixa`: no topo da terceira tela, vermelha, com o fundo pulsando (só CSS, 1,6 s).
 * - `rodape`: tira fina no pé das outras telas do loop, enquanto houver alerta.
 * Com movimento reduzido, a faixa fica parada no vermelho forte.
 */
export function AlertaMateriais({
  alertas,
  variante,
}: {
  alertas: SaldoMaterial[]
  variante: 'faixa' | 'rodape'
}) {
  if (alertas.length === 0) return null
  const { titulo, detalhe } = textoAlertaMateriais(alertas)

  if (variante === 'rodape') {
    return (
      <div
        role="status"
        className="flex min-w-0 shrink-0 items-center gap-4 rounded-[10px] bg-tv-cartao px-5 py-2 text-[22px]"
      >
        <b className="shrink-0 rounded-lg bg-tv-perigo px-3 py-1 font-extrabold text-white">
          ! {titulo}
        </b>
        <span className="truncate text-tv-texto">{alertas.map((m) => m.nome).join(' · ')}</span>
      </div>
    )
  }

  return (
    <div
      role="status"
      className="flex shrink-0 animate-alerta-faixa items-center gap-6 rounded-[14px] bg-tv-perigo px-8 py-4 text-[36px] leading-tight font-extrabold text-white motion-reduce:animate-none motion-reduce:bg-tv-perigo-forte"
    >
      <span
        aria-hidden="true"
        className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-[44px] font-black text-tv-perigo"
      >
        !
      </span>
      <p className="line-clamp-2 min-w-0">
        {titulo}
        <span className="text-[30px] font-semibold opacity-95">{detalhe}</span>
      </p>
    </div>
  )
}
