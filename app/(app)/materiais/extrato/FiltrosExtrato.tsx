'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import {
  ATALHOS_PERIODO,
  periodoDoAtalho,
  TIPOS_FILTRO,
  urlDoFiltro,
  type AtalhoPeriodo,
  type FiltroExtrato,
  type TipoFiltro,
} from '@/lib/dominio/extrato'

type Props = {
  filtro: FiltroExtrato
  /** Dia de hoje na obra (`yyyy-MM-dd`). */
  hoje: string
  materiais: { id: string; nome: string }[]
}

const ROTULO = 'text-[11px] font-extrabold tracking-[0.5px] text-texto-2 uppercase'
const CAMPO =
  'min-h-12 w-full min-w-0 rounded-botao border-[1.5px] border-borda bg-cartao px-3 text-[15px] font-semibold'

/** Período (atalhos ou de/até), material e tipo. Tudo fica na URL. */
export function FiltrosExtrato({ filtro, hoje, materiais }: Props) {
  const router = useRouter()
  const [carregando, iniciar] = useTransition()

  function ir(novo: FiltroExtrato) {
    iniciar(() => router.replace(`/materiais/extrato${urlDoFiltro(novo)}`, { scroll: false }))
  }

  function escolherAtalho(atalho: AtalhoPeriodo) {
    if (atalho === 'livre') ir({ ...filtro, atalho })
    else ir({ ...filtro, atalho, ...periodoDoAtalho(atalho, hoje) })
  }

  function mudarData(campo: 'de' | 'ate', valor: string) {
    if (!valor) return
    let de = campo === 'de' ? valor : filtro.de
    let ate = campo === 'ate' ? valor : filtro.ate
    if (de > ate) [de, ate] = [ate, de]
    ir({ ...filtro, atalho: 'livre', de, ate })
  }

  return (
    <div className="flex flex-col gap-2.5 px-5 pt-3.5" aria-busy={carregando}>
      <div
        role="group"
        aria-label="Período"
        className="-mx-5 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-5"
      >
        {ATALHOS_PERIODO.map((a) => (
          <button
            key={a.valor}
            type="button"
            aria-pressed={filtro.atalho === a.valor}
            onClick={() => escolherAtalho(a.valor)}
            className={`min-h-toque shrink-0 rounded-full border-[1.5px] px-3.5 text-sm font-bold ${
              filtro.atalho === a.valor
                ? 'border-escuro bg-escuro text-white'
                : 'border-borda bg-cartao'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className={ROTULO}>De</span>
          <input
            type="date"
            value={filtro.de}
            max={hoje}
            onChange={(e) => mudarData('de', e.currentTarget.value)}
            className={CAMPO}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={ROTULO}>Até</span>
          <input
            type="date"
            value={filtro.ate}
            max={hoje}
            onChange={(e) => mudarData('ate', e.currentTarget.value)}
            className={CAMPO}
          />
        </label>
      </div>
      <div className="grid grid-cols-[1.3fr_1fr] gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className={ROTULO}>Material</span>
          <select
            value={filtro.material ?? ''}
            onChange={(e) => ir({ ...filtro, material: e.currentTarget.value || null })}
            className={CAMPO}
          >
            <option value="">Todos</option>
            {materiais.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={ROTULO}>Mostrar</span>
          <select
            value={filtro.tipo}
            onChange={(e) => ir({ ...filtro, tipo: e.currentTarget.value as TipoFiltro })}
            className={CAMPO}
          >
            {TIPOS_FILTRO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p aria-live="polite" className="sr-only">
        {carregando ? 'Atualizando o extrato…' : ''}
      </p>
    </div>
  )
}
