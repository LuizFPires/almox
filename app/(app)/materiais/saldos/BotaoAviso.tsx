'use client'

import { useState } from 'react'
import { CabecalhoGaveta, GavetaInferior } from '@/components/GavetaInferior'
import { textoAviso, type SaldoMaterial } from '@/lib/dominio/materiais'
import { FormAviso } from '../../cadastros/materiais/[id]/aviso/FormAviso'

function Sino() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9ZM10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

/**
 * Sino ao lado do saldo (só engenheiro): abre a gaveta inferior para configurar o aviso de
 * limite do material. Preenchido quando o material já tem aviso.
 */
export function BotaoAviso({ material, obraNome }: { material: SaldoMaterial; obraNome: string }) {
  const [aberta, setAberta] = useState(false)
  // Cada abertura monta o formulário de novo, com o aviso vigente.
  const [abertura, setAbertura] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const tem = material.aviso !== null

  return (
    <>
      <button
        type="button"
        aria-label={`Aviso de limite de ${material.nome}: ${textoAviso(material)}`}
        aria-haspopup="dialog"
        aria-expanded={aberta}
        onClick={() => {
          setAbertura((n) => n + 1)
          setAberta(true)
        }}
        className={`flex size-toque shrink-0 items-center justify-center rounded-botao border-[1.5px] ${
          tem
            ? 'border-engenheiro-claro bg-engenheiro-claro text-engenheiro'
            : 'border-borda bg-cartao text-texto-2'
        }`}
      >
        <Sino />
      </button>
      <GavetaInferior
        aberta={aberta}
        bloqueada={ocupado}
        onFechar={() => setAberta(false)}
        titulo={`Aviso de limite: ${material.nome}`}
      >
        <CabecalhoGaveta
          rotulo="Aviso de limite"
          nome={material.nome}
          onFechar={() => setAberta(false)}
          desativado={ocupado}
        />
        <FormAviso
          key={abertura}
          materialId={material.id}
          unidade={material.unidade}
          estoqueCheio={material.estoqueCheio}
          aviso={material.aviso}
          obraNome={obraNome}
          onOcupado={setOcupado}
          onConcluido={() => setAberta(false)}
        />
      </GavetaInferior>
    </>
  )
}
