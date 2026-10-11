'use client'

import { useState } from 'react'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { ehChaveIcone } from '@/components/icones-ferramenta'
import { subtituloTipo, type ResumoTipo } from '@/lib/dominio/estoque'
import { textoDesde } from '@/lib/dominio/ficha'

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
    return <p className="py-6 text-center text-[15px] text-texto-2">Nenhuma ferramenta cadastrada.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {tipos.map((t) => {
        const estaAberto = aberto === t.id
        const pct = (n: number) => (t.total ? `${(n / t.total) * 100}%` : '0%')
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
                {ehChaveIcone(t.icone) && (
                  <IconeFerramenta icone={t.icone} nome={t.nome} tamanho="p" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-bold">{t.nome}</span>
                  <span className="text-[13px] text-texto-2">{subtituloTipo(t)}</span>
                </span>
                <span className="flex flex-col items-end">
                  <span
                    className={`text-[22px] leading-none font-bold tabular-nums ${t.livres === 0 ? 'text-erro' : ''}`}
                  >
                    {t.livres}
                    <span className="text-[15px] font-normal text-texto-2"> /{t.total}</span>
                  </span>
                  <span className="text-[12px] text-texto-2">livres</span>
                </span>
              </span>
              <span aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-sutil">
                <span className="bg-sucesso" style={{ width: pct(t.livres) }} />
                <span className="bg-amarelo" style={{ width: pct(t.noCanteiro) }} />
                <span className="bg-erro" style={{ width: pct(t.manutencao) }} />
              </span>
            </button>
            {estaAberto && (
              <div
                id={`com-quem-${t.id}`}
                className="flex flex-col gap-1.5 border-t border-borda px-4 py-3 text-[14px]"
              >
                {t.linhas.length === 0 && t.comOutrasEmpresas === 0 && (
                  <p className="font-bold text-sucesso">Todas no almoxarifado</p>
                )}
                {t.linhas.map((l) =>
                  l.tipo === 'pessoa' ? (
                    <p key={l.codigo} className={l.pendente ? 'text-erro' : ''}>
                      <span className="font-mono text-[13px]">{l.codigo}</span> · {l.pessoa} ·{' '}
                      {textoDesde(l.desde, momento)}
                    </p>
                  ) : (
                    <p key={l.codigo} className="text-texto-2">
                      <span className="font-mono text-[13px]">{l.codigo}</span> · em manutenção
                    </p>
                  ),
                )}
                {t.comOutrasEmpresas > 0 && (
                  <p className="text-texto-2">
                    {t.comOutrasEmpresas} com outras empresas
                  </p>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
