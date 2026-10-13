'use client'

import { useEffect, useState } from 'react'
import { Botao } from '@/components/Botao'

type Props = {
  texto: string
  /** URL assinada da foto; sem ela, envia só o texto. */
  foto: string | null
  /** Nome do arquivo da foto no compartilhamento (ex.: "avaria-MT-03.jpg"). */
  arquivo: string
}

/**
 * Enviar a avaria pelo compartilhar do celular (WhatsApp, e-mail…) com a foto e o texto.
 * A foto é baixada ao abrir a tela: o iPhone só abre o compartilhar se for logo após o toque.
 * Sem compartilhar no aparelho (computador), abre o WhatsApp com o texto.
 */
export function BotaoEnviar({ texto, foto, arquivo }: Props) {
  const [imagem, setImagem] = useState<File | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!foto) return
    let vivo = true
    fetch(foto)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('foto'))))
      .then((blob) => {
        if (vivo) setImagem(new File([blob], arquivo, { type: blob.type || 'image/jpeg' }))
      })
      .catch(() => {
        // Sem a foto, o envio segue só com o texto.
      })
    return () => {
      vivo = false
    }
  }, [foto, arquivo])

  async function enviar() {
    setAviso(null)
    const comFoto = imagem ? { files: [imagem], text: texto } : null
    try {
      if (comFoto && navigator.canShare?.(comFoto)) {
        await navigator.share(comFoto)
        return
      }
      if (typeof navigator.share === 'function') {
        await navigator.share({ text: texto })
        if (foto) setAviso('Este aparelho não envia a foto junto: mande a foto separada.')
        return
      }
    } catch (erro) {
      // Cancelou no compartilhar: nada a fazer.
      if (erro instanceof DOMException && erro.name === 'AbortError') return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
  }

  return (
    <div className="flex flex-col gap-2">
      <Botao variante="sucesso" tamanho="g" larguraTotal onClick={() => void enviar()}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
        </svg>
        Enviar foto e dados
      </Botao>
      <span className="text-center text-[13px] text-texto-2">
        Abre o compartilhar do celular: escolha o WhatsApp e o contato.
      </span>
      {aviso && (
        <span role="status" className="text-center text-sm font-semibold text-aviso">
          {aviso}
        </span>
      )}
    </div>
  )
}
