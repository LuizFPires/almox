'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { posicaoRolagem, proximaFase, TROCA_MS, type ConfigTv, type Fase } from '@/lib/dominio/tv'

type Entrada = { nPaginas: number; temColunas: boolean; maxOff: number; config: ConfigTv }

/**
 * Motor do loop (F-13): um único `requestAnimationFrame` mede o tempo da fase, move o trilho
 * das colunas e a barra de progresso direto no DOM (`transform`/`width`, sem estado por
 * quadro). O React só muda na troca de fase. Dados novos chegam por `entrada` e entram no
 * próximo quadro, sem reiniciar a fase nem a rolagem em curso.
 */
export function useLoopTv(entrada: Entrada) {
  const [fase, setFase] = useState<Fase>({ tipo: 'pagina', indice: 0 })
  const [visivel, setVisivel] = useState(true)
  const trilho = useRef<HTMLDivElement>(null)
  const progresso = useRef<HTMLDivElement>(null)
  const atual = useRef(entrada)
  useLayoutEffect(() => {
    atual.current = entrada
  })

  useEffect(() => {
    let quadro = 0
    let faseAtual: Fase = { tipo: 'pagina', indice: 0 }
    let inicio = performance.now()
    let trocandoDesde: number | null = null

    const passo = (agora: number) => {
      const { nPaginas, temColunas, maxOff, config } = atual.current
      // Menos páginas do que antes (alguém devolveu tudo): fica na última que existe.
      if (faseAtual.tipo === 'pagina' && faseAtual.indice > Math.max(0, nPaginas - 1)) {
        faseAtual = { tipo: 'pagina', indice: Math.max(0, nPaginas - 1) }
        setFase(faseAtual)
      }

      if (trocandoDesde !== null) {
        // Esmaecendo: o conteúdo troca 650 ms depois e o cronômetro da nova fase começa.
        if (agora - trocandoDesde >= TROCA_MS) {
          faseAtual = proximaFase(faseAtual, nPaginas, temColunas)
          setFase(faseAtual)
          setVisivel(true)
          inicio = agora
          trocandoDesde = null
          if (trilho.current) trilho.current.style.transform = 'translateX(0px)'
        }
      } else if (nPaginas > 0) {
        const t = agora - inicio
        let fracao: number
        let terminou: boolean
        if (faseAtual.tipo === 'pagina') {
          const duracao = config.tempoPaginaS * 1000
          fracao = Math.min(1, t / duracao)
          terminou = t >= duracao
        } else {
          const r = posicaoRolagem(t, maxOff, config)
          fracao = r.progresso
          terminou = r.terminou
          if (trilho.current) {
            trilho.current.style.transform = `translateX(${-Math.round(r.deslocamento)}px)`
          }
        }
        if (progresso.current) progresso.current.style.width = `${fracao * 100}%`
        if (terminou) {
          trocandoDesde = agora
          setVisivel(false)
        }
      } else {
        // Painel vazio: fica na página 1 com o cronômetro parado, para a primeira retirada
        // do dia entrar e ficar o tempo inteiro da página (não sumir na hora).
        inicio = agora
        if (faseAtual.tipo !== 'pagina' || faseAtual.indice !== 0) {
          faseAtual = { tipo: 'pagina', indice: 0 }
          setFase(faseAtual)
        }
        if (progresso.current) progresso.current.style.width = '0%'
      }
      quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [])

  return { fase, visivel, trilho, progresso }
}
