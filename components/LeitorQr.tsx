'use client'

import type { IScannerControls } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'
import { mensagemCamera } from '@/lib/dominio/leitura'

type Props = {
  /** Texto lido no QR (o token). Chamado uma vez; para ler de novo, remonte o componente. */
  aoLer: (texto: string) => void
}

/**
 * Câmera traseira com leitura automática do QR (sem botão), moldura amarela e lanterna
 * quando o aparelho permite. Para a câmera ao ler, ao sair da tela e ao desmontar.
 */
export function LeitorQr({ aoLer }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const controles = useRef<IScannerControls | null>(null)
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
    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErro('Este navegador não abre a câmera aqui. Use o app instalado (HTTPS).')
        return
      }
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        const leitor = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 120 })
        const c = await leitor.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' } } },
          video.current ?? undefined,
          (resultado, _erro, ctrl) => {
            if (!resultado || lido) return
            lido = true
            ctrl.stop()
            aoLerRef.current(resultado.getText())
          },
        )
        if (cancelado) {
          c.stop()
          return
        }
        controles.current = c
        setTemLanterna(typeof c.switchTorch === 'function')
      } catch (e) {
        if (!cancelado) setErro(mensagemCamera(e))
      }
    }
    void iniciar()
    return () => {
      cancelado = true
      controles.current?.stop()
      controles.current = null
    }
  }, [])

  async function alternarLanterna() {
    const ligar = !lanterna
    try {
      await controles.current?.switchTorch?.(ligar)
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
