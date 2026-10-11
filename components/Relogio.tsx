'use client'

import { useEffect, useState } from 'react'
import { formatarDiaCurto, formatarHora } from '@/lib/formatos/datas'

type Props = {
  formato: 'hora' | 'dia'
  className?: string
}

const FORMATOS = { hora: formatarHora, dia: formatarDiaCurto }

/** Hora ou dia atual no fuso da obra, atualizado a cada 15 s. Só renderiza no cliente. */
export function Relogio({ formato, className }: Props) {
  const [texto, setTexto] = useState('')

  useEffect(() => {
    const atualizar = () => setTexto(FORMATOS[formato](new Date()))
    atualizar()
    const intervalo = setInterval(atualizar, 15_000)
    return () => clearInterval(intervalo)
  }, [formato])

  return (
    <span className={className} suppressHydrationWarning>
      {texto}
    </span>
  )
}
