'use client'

import { useId, useState } from 'react'
import { CLASSE_CAMPO } from '@/components/Formulario'

const OPCOES = [
  {
    valor: 'almoxarife',
    rotulo: 'Almoxarife',
    ajuda: 'Lança retiradas, devoluções e o fechamento.',
  },
  {
    valor: 'consulta',
    rotulo: 'Consulta',
    ajuda: 'Só vê. Encarregados, mestres, donos de empreiteira.',
  },
  { valor: 'engenheiro', rotulo: 'Engenheiro', ajuda: 'Tudo, inclusive cadastros e acessos.' },
] as const

type Props = {
  perfil?: string
  empresaId?: string | null
  empreiteiras: { id: string; nome: string }[]
  erros?: { perfil?: string; empresa_id?: string }
}

/** Perfil + empresa (só para consulta de empreiteira: vê apenas a própria empresa). */
export function CamposPerfil({ perfil: inicial, empresaId, empreiteiras, erros = {} }: Props) {
  const [perfil, setPerfil] = useState(inicial ?? '')
  const idEmpresa = useId()
  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Perfil</legend>
        {OPCOES.map((o) => (
          <label
            key={o.valor}
            className={`flex min-h-toque cursor-pointer flex-col rounded-cartao border-2 bg-cartao px-4 py-2.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-foco ${
              perfil === o.valor ? 'border-escuro' : 'border-transparent'
            }`}
          >
            <input
              type="radio"
              name="perfil"
              value={o.valor}
              checked={perfil === o.valor}
              onChange={() => setPerfil(o.valor)}
              className="sr-only"
            />
            <span className="font-semibold">{o.rotulo}</span>
            <span className="text-sm text-texto-2">{o.ajuda}</span>
          </label>
        ))}
        {erros.perfil && <span className="text-sm font-semibold text-erro">{erros.perfil}</span>}
      </fieldset>
      {perfil === 'consulta' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idEmpresa} className="text-sm font-semibold">
            Restringir a uma empreiteira
          </label>
          <select
            id={idEmpresa}
            name="empresa_id"
            defaultValue={empresaId ?? ''}
            className={CLASSE_CAMPO}
          >
            <option value="">Não: vê a obra inteira</option>
            {empreiteiras.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <span className="text-sm text-texto-2">
            Dono ou encarregado de empreiteira: vê só a própria empresa e recebe os avisos dela.
          </span>
          {erros.empresa_id && (
            <span className="text-sm font-semibold text-erro">{erros.empresa_id}</span>
          )}
        </div>
      )}
    </>
  )
}
