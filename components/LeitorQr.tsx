'use client'

import { useEffect, useRef, useState } from 'react'
import { mensagemCamera } from '@/lib/dominio/leitura'

type Props = {
  /** Texto lido no QR (o token). Chamado uma vez; para ler de novo, remonte o componente. */
  aoLer: (texto: string) => void
}

/** Intervalo entre leituras de quadro e largura máxima analisada (velocidade no celular). */
const INTERVALO_MS = 120
const LARGURA_MAX = 720

/**
 * Câmera traseira com leitura automática do QR (sem botão), moldura amarela e lanterna
 * quando o aparelho permite. Para a câmera ao ler, ao sair da tela e ao desmontar.
 * Decodifica com o jsQR (M10): o zxing-js deixava de ler cerca de 7% dos códigos.
 */
export function LeitorQr({ aoLer }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const trilha = useRef<MediaStreamTrack | null>(null)
  const aoLerRef = useRef(aoLer)
  const [erro, setErro] = useState<string | null>(null)
  const [temLanterna, setTemLanterna] = useState(false)
  const [lanterna, setLanterna] = useState(false)

  useEffect(() => {
    aoLerRef.current = aoLer
  }, [aoLer])

  useEffect(() => {
    let cancelado = false
    let lido = false
    let relogio = 0
    let fluxo: MediaStream | null = null
    const parar = () => {
      window.clearTimeout(relogio)
      fluxo?.getTracks().forEach((t) => t.stop())
      fluxo = null
      trilha.current = null
    }

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErro('Este navegador não abre a câmera aqui. Use o app instalado (HTTPS).')
        return
      }
      try {
        const [{ default: jsQR }, s] = await Promise.all([
          import('jsqr'),
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          }),
        ])
        // StrictMode (dev) monta, desmonta e monta de novo: não deixa a câmera aberta.
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        fluxo = s
        const v = video.current
        if (!v) return parar()
        v.srcObject = s
        await v.play().catch(() => undefined)
        const t = s.getVideoTracks()[0] ?? null
        trilha.current = t
        const capacidades = (t?.getCapabilities?.() ?? {}) as Record<string, unknown>
        setTemLanterna('torch' in capacidades)

        const tela = document.createElement('canvas')
        const ctx = tela.getContext('2d', { willReadFrequently: true })
        const ler = () => {
          if (cancelado || lido) return
          if (ctx && v.readyState >= 2 && v.videoWidth > 0) {
            const escala = Math.min(1, LARGURA_MAX / v.videoWidth)
            const w = Math.round(v.videoWidth * escala)
            const h = Math.round(v.videoHeight * escala)
            if (tela.width !== w) tela.width = w
            if (tela.height !== h) tela.height = h
            ctx.drawImage(v, 0, 0, w, h)
            const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, {
              inversionAttempts: 'dontInvert',
            })
            if (r?.data) {
              lido = true
              parar()
              aoLerRef.current(r.data)
              return
            }
          }
          relogio = window.setTimeout(ler, INTERVALO_MS)
        }
        ler()
      } catch (e) {
        if (!cancelado) setErro(mensagemCamera(e))
        parar()
      }
    }
    void iniciar()
    return () => {
      cancelado = true
      parar()
    }
  }, [])

  async function alternarLanterna() {
    const ligar = !lanterna
    try {
      await trilha.current?.applyConstraints({
        advanced: [{ torch: ligar } as MediaTrackConstraintSet],
      })
      setLanterna(ligar)
    } catch {
      setTemLanterna(false)
    }
  }

  if (erro) {
    return (
      <p role="alert" className="rounded-cartao bg-erro-claro px-4 py-3.5 text-[15px] text-erro">
        {erro}
      </p>
    )
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-cartao bg-[#101720]">
      <video
        ref={video}
        muted
        playsInline
        aria-label="Câmera para ler o QR do capacete"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-[18%] rounded-2xl border-[3px] border-amarelo shadow-[0_0_0_2000px_rgba(16,23,32,0.45)]"
      />
      <p className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-white">
        Aponte para o adesivo na frente do capacete
      </p>
      {temLanterna && (
        <button
          type="button"
          onClick={alternarLanterna}
          aria-pressed={lanterna}
          className="absolute top-3 right-3 min-h-toque rounded-botao bg-white/90 px-3.5 text-sm font-bold text-texto"
        >
          {lanterna ? 'Apagar lanterna' : 'Lanterna'}
        </button>
      )}
    </div>
  )
}
