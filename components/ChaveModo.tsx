'use client'

import { useRouter } from 'next/navigation'

type Modo = 'ferramentas' | 'materiais'

const OPCOES: { modo: Modo; rotulo: string; href: string }[] = [
  { modo: 'ferramentas', rotulo: 'Ferramentas', href: '/inicio' },
  { modo: 'materiais', rotulo: 'Materiais', href: '/materiais' },
]

const UM_ANO = 60 * 60 * 24 * 365

function gravarModo(modo: Modo) {
  document.cookie = `almox_modo=${modo}; max-age=${UM_ANO}; path=/; samesite=lax`
}

/** Chave Ferramentas | Materiais. Grava o modo escolhido (a raiz abre nele) e troca de Início. */
export function ChaveModo({ modo }: { modo: Modo }) {
  const router = useRouter()

  function escolher(destino: { modo: Modo; href: string }) {
    if (destino.modo === modo) return
    gravarModo(destino.modo)
    router.push(destino.href)
  }

  return (
    <div role="group" aria-label="Modo" className="mx-5 mt-1 flex rounded-cartao bg-sutil p-1">
      {OPCOES.map((o) => {
        const ativo = o.modo === modo
        return (
          <button
            key={o.modo}
            type="button"
            aria-pressed={ativo}
            onClick={() => escolher(o)}
            className={`min-h-toque flex-1 rounded-botao px-3 text-[15px] font-bold ${
              ativo ? 'bg-cartao text-texto shadow-sm' : 'text-texto-2'
            }`}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
