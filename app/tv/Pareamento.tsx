'use client'

import { useEffect, useState } from 'react'
import { caminhoQr } from '@/lib/qr'

const INTERVALO = 2000

type Props = {
  /** Linha acima do título (ex.: endereço antigo vencido, TV desconectada). */
  aviso?: string
}

/**
 * TV sem credencial: mostra um código de 6 dígitos e um QR com o endereço para aprovar no
 * celular. Pergunta ao servidor a cada 2 s; aprovado, recarrega e o painel aparece. Código
 * vencido (10 min): pede outro sozinha. Roda dias seguidos: limpa o timer ao sair.
 */
export function Pareamento({ aviso }: Props) {
  const [codigo, setCodigo] = useState<string | null>(null)
  const [semRede, setSemRede] = useState(false)
  // O QR só aparece depois do código (pós-hidratação): ler a origem aqui não diverge do servidor.
  const [origem] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin))

  useEffect(() => {
    let vivo = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let atual: string | null = null

    const agendar = (passo: () => Promise<void>, ms = INTERVALO) => {
      if (vivo) timer = setTimeout(() => void passo(), ms)
    }

    async function pedir() {
      try {
        const r = await fetch('/tv/pareamento', { method: 'POST', cache: 'no-store' })
        const dados = (await r.json()) as { codigo?: string; estado?: string }
        if (!vivo) return
        if (dados.estado === 'aprovado') {
          window.location.replace('/tv')
          return
        }
        if (!r.ok || !dados.codigo) throw new Error('sem código')
        atual = dados.codigo
        setCodigo(dados.codigo)
        setSemRede(false)
        agendar(consultar)
      } catch {
        if (!vivo) return
        setSemRede(true)
        agendar(pedir, 10_000)
      }
    }

    async function consultar() {
      try {
        const r = await fetch('/tv/pareamento', { cache: 'no-store' })
        const dados = (await r.json()) as { estado?: string; codigo?: string }
        if (!vivo) return
        if (dados.estado === 'aprovado') {
          window.location.replace('/tv')
          return
        }
        if (dados.estado === 'vencido') {
          agendar(pedir, 0)
          return
        }
        if (dados.codigo && dados.codigo !== atual) {
          atual = dados.codigo
          setCodigo(dados.codigo)
        }
        setSemRede(!r.ok)
        agendar(consultar)
      } catch {
        if (!vivo) return
        setSemRede(true)
        agendar(consultar, 5000)
      }
    }

    void pedir()
    return () => {
      vivo = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  const endereco = codigo && origem ? `${origem}/conectar-tv/${codigo}` : null
  const qr = endereco ? caminhoQr(endereco) : null

  return (
    <div className="flex h-full w-full items-center justify-center gap-16 px-16">
      <div className="flex max-w-[720px] flex-col gap-6">
        {aviso && <span className="text-2xl font-semibold text-tv-texto-2">{aviso}</span>}
        <span className="text-4xl font-bold text-tv-texto">Conectar esta TV ao Almox</span>
        <span className="text-2xl leading-snug text-tv-texto-2">
          No celular do engenheiro ou do almoxarife: aponte a câmera para o QR ao lado, ou abra o
          Almox › <b className="text-tv-texto">Conectar TV</b> e digite o código.
        </span>
        <span
          aria-label={codigo ? `Código ${codigo.split('').join(' ')}` : 'Gerando código'}
          className="font-mono text-[120px] leading-none font-bold tracking-[0.12em] text-amarelo tabular-nums"
        >
          {codigo ? `${codigo.slice(0, 3)} ${codigo.slice(3)}` : '··· ···'}
        </span>
        <span className="text-xl text-tv-texto-2">
          {semRede
            ? 'Sem conexão com o servidor. Tentando de novo…'
            : 'O código vale 10 minutos; depois aparece outro sozinho.'}
        </span>
      </div>
      {qr && (
        <div className="shrink-0 rounded-cartao bg-white p-6">
          <svg
            viewBox={`0 0 ${qr.tamanho} ${qr.tamanho}`}
            width={320}
            height={320}
            role="img"
            aria-label="QR para conectar esta TV pelo celular"
            shapeRendering="crispEdges"
          >
            <path d={qr.d} fill="#101720" />
          </svg>
        </div>
      )}
    </div>
  )
}
