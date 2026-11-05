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
import { formatarData, formatarDiaCurto } from '@/lib/formatos/datas'

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
      <div
        role="group"
        aria-label="Datas do período"
        className="flex items-stretch rounded-cartao border-[1.5px] border-borda bg-cartao"
      >
        <CampoData rotulo="De" valor={filtro.de} hoje={hoje} onMudar={(v) => mudarData('de', v)} />
        <span
          aria-hidden="true"
          className="flex w-8 shrink-0 items-center justify-center border-x border-borda text-lg font-bold text-texto-2"
        >
          →
        </span>
        <CampoData
          rotulo="Até"
          valor={filtro.ate}
          hoje={hoje}
          onMudar={(v) => mudarData('ate', v)}
        />
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

/**
 * Uma ponta do período: rótulo, data grande e dia da semana. O campo de data nativo fica por
 * cima, invisível, e abre o calendário do celular ao toque.
 */
function CampoData({
  rotulo,
  valor,
  hoje,
  onMudar,
}: {
  rotulo: string
  valor: string
  hoje: string
  onMudar(valor: string): void
}) {
  const meioDia = `${valor}T12:00:00-03:00`
  const semana = valor === hoje ? 'hoje' : formatarDiaCurto(meioDia).split(' ')[0]
  return (
    <label className="relative flex min-h-16 min-w-0 flex-1 cursor-pointer flex-col justify-center px-3.5 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-foco">
      <span className={ROTULO}>{rotulo}</span>
      <span className="text-[17px] leading-tight font-extrabold tabular-nums">
        {formatarData(meioDia)}
      </span>
      <span className="text-xs font-semibold text-texto-2">{semana}</span>
      <input
        type="date"
        aria-label={`${rotulo}: ${formatarData(meioDia)}`}
        value={valor}
        max={hoje}
        onChange={(e) => onMudar(e.currentTarget.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker()
          } catch {
            // Navegador sem showPicker: o toque no campo já abre o calendário.
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  )
}
