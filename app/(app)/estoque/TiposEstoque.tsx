'use client'

import { useState } from 'react'
import { CirculoFerramenta } from '@/components/IconeFerramenta'
import { ehIcone } from '@/components/icones-ferramenta'
import { subtituloTipo, type ResumoTipo } from '@/lib/dominio/estoque'
import { textoDesde } from '@/lib/dominio/ficha'

/** Até aqui a barra tem um bloco por peça (dá para contar); acima, vira proporcional. */
const MAX_BLOCOS = 40

type Props = {
  tipos: ResumoTipo[]
  /** Momento do servidor (ISO), para "desde" bater com o resto do app. */
  agora: string
}

/** Estoque por tipo (F-09): barra livre / no canteiro / manutenção e, ao tocar, com quem está. */
export function TiposEstoque({ tipos, agora }: Props) {
  const [aberto, setAberto] = useState<string | null>(null)
  const momento = new Date(agora)

  if (tipos.length === 0) {
    return (
      <p className="py-6 text-center text-[15px] text-texto-2">Nenhuma ferramenta cadastrada.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {tipos.map((t) => {
        const estaAberto = aberto === t.id
        const blocos = [
          ...Array<string>(t.livres).fill('bg-sucesso'),
          ...Array<string>(t.noCanteiro).fill('bg-amarelo'),
          ...Array<string>(t.manutencao).fill('bg-erro'),
        ]
        const pct = (n: number) => `${(n / t.total) * 100}%`
        return (
          <li key={t.id} className="rounded-cartao bg-cartao">
            <button
              type="button"
              aria-expanded={estaAberto}
              aria-controls={`com-quem-${t.id}`}
              onClick={() => setAberto(estaAberto ? null : t.id)}
              className="flex min-h-11 w-full flex-col gap-2.5 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-3">
                {ehIcone(t.icone) && (
                  <CirculoFerramenta icone={t.icone} circulo="size-11" svg={26} />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-bold">{t.nome}</span>
                  <span className="text-[13px] text-texto-2">
                    {t.total === 0 ? 'sem peças cadastradas' : subtituloTipo(t)}
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span
                    className={`text-[28px] leading-none font-bold tabular-nums ${t.total === 0 ? 'text-texto-2' : t.livres === 0 ? 'text-erro' : 'text-sucesso'}`}
                  >
                    {t.livres}
                    <span className="text-base font-normal text-texto-2"> /{t.total}</span>
                  </span>
                  <span className="text-[12px] text-texto-2">livres</span>
                </span>
              </span>
              {t.total > 0 && t.total <= MAX_BLOCOS && (
                <span aria-hidden="true" className="flex h-2.5 gap-[3px]">
                  {blocos.map((cor, i) => (
                    <span key={i} className={`flex-1 rounded-[3px] ${cor}`} />
                  ))}
                </span>
              )}
              {t.total > MAX_BLOCOS && (
                <span aria-hidden="true" className="flex h-2.5 gap-[3px]">
                  <span className="rounded-[3px] bg-sucesso" style={{ width: pct(t.livres) }} />
                  <span className="rounded-[3px] bg-amarelo" style={{ width: pct(t.noCanteiro) }} />
                  <span className="rounded-[3px] bg-erro" style={{ width: pct(t.manutencao) }} />
                </span>
              )}
            </button>
            <div
              id={`com-quem-${t.id}`}
              hidden={!estaAberto}
              className="flex flex-col gap-1.5 border-t border-borda px-4 py-3 text-[14px]"
            >
              {t.total === 0 && <p className="text-texto-2">Nenhuma peça cadastrada.</p>}
              {t.total > 0 && t.linhas.length === 0 && t.comOutrasEmpresas === 0 && (
                <p className="text-sucesso">Todas no almoxarifado</p>
              )}
              {t.linhas.map((l) =>
                l.tipo === 'pessoa' ? (
                  <p key={l.codigo} className={l.pendente ? 'text-erro' : ''}>
                    <span className="font-mono text-[13px]">{l.codigo}</span> · {l.pessoa} ·{' '}
                    {textoDesde(l.desde, momento)}
                  </p>
                ) : (
                  <p key={l.codigo} className="text-erro">
                    <span className="font-mono text-[13px]">{l.codigo}</span> · em manutenção
                  </p>
                ),
              )}
              {t.comOutrasEmpresas > 0 && (
                <p className="text-texto-2">{t.comOutrasEmpresas} com outras empresas</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
