import { estadoSaldo, type SaldoMaterial } from '@/lib/dominio/materiais'
import { barraMaterial, linhaEstadoMaterial } from '@/lib/dominio/tv'
import { formatarQuantidade } from '@/lib/formatos/quantidade'

/**
 * Cartão da terceira tela: nome, saldo grande com a unidade, barra até o estoque cheio (última
 * entrada) com o traço no limite, e a linha de estado. Abaixo do limite: fundo vermelho escuro
 * e borda pulsando por `box-shadow` (só CSS; parada e forte com movimento reduzido).
 */
export function CartaoMaterial({ material: m }: { material: SaldoMaterial }) {
  const estado = estadoSaldo(m)
  const abaixo = estado === 'abaixo'
  const { preenchido, traco } = barraMaterial(m)
  return (
    <article
      aria-label={m.nome}
      className={`flex min-h-0 min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-[18px] px-6 py-5 ${
        abaixo
          ? 'animate-alerta-borda bg-tv-perigo-cartao motion-reduce:animate-none motion-reduce:shadow-[inset_0_0_0_6px_var(--color-tv-perigo-claro)]'
          : 'bg-tv-cartao'
      }`}
    >
      <span className="line-clamp-2 text-[32px] leading-[1.15] font-bold break-words">
        {m.nome}
      </span>
      <div>
        <p className="text-[80px] leading-none font-black tracking-tight tabular-nums">
          {formatarQuantidade(m.saldo)}
          <small
            className={`ml-2 text-[36px] font-bold tracking-normal ${abaixo ? 'text-tv-perigo-texto' : 'text-tv-texto-2'}`}
          >
            {m.unidade}
          </small>
        </p>
        <div
          aria-hidden="true"
          className={`relative mt-4 h-3 rounded-md ${abaixo ? 'bg-tv-perigo-trilho' : 'bg-tv-linha'}`}
        >
          <div
            className={`absolute inset-y-0 left-0 rounded-md ${
              abaixo ? 'bg-tv-perigo-claro' : estado === 'perto' ? 'bg-amarelo' : 'bg-tv-ok'
            }`}
            style={{ width: `${preenchido}%` }}
          />
          {traco !== null && (
            <div
              className="absolute -top-1.5 -bottom-1.5 w-1.5 -translate-x-1/2 rounded bg-tv-texto"
              style={{ left: `${traco}%` }}
            />
          )}
        </div>
        <p
          className={`mt-3 truncate text-[24px] ${abaixo ? 'font-bold text-tv-perigo-texto' : 'text-tv-texto-2'}`}
        >
          {linhaEstadoMaterial(m)}
        </p>
      </div>
    </article>
  )
}
