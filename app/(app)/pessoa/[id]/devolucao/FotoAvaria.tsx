'use client'

import { useEffect, useRef, useState } from 'react'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { RodapeAcao } from '@/components/RodapeAcao'
import { MOTIVOS, rotuloMotivo, textoCarimbo, type Motivo } from '@/lib/dominio/devolucao'
import { comprimirFoto } from '@/lib/imagem'
import { criarClienteNavegador } from '@/lib/supabase/navegador'

export type FotoFeita = {
  motivo: Motivo
  foto: string
  previa: string
  hora: string
  /** Texto livre opcional (até 300 caracteres). */
  detalhes?: string
}

type Props = {
  obraId: string
  tipo: string
  /** Quem fotografa, para o carimbo ("Ana (almoxarife)"). */
  autor: string
  /** "1 de 2" quando há mais de uma peça avariada do tipo. */
  qual: string
  aoVoltar: () => void
  aoUsar: (f: FotoFeita) => void
  selo: React.ReactNode
}

/**
 * Foto da avaria (RN-09): câmera traseira do celular, compressão aqui mesmo e envio ao Storage
 * privado; depois o motivo. Uma foto por peça avariada (decisão do M6).
 */
export function FotoAvaria({ obraId, tipo, autor, qual, aoVoltar, aoUsar, selo }: Props) {
  const entrada = useRef<HTMLInputElement>(null)
  const [foto, setFoto] = useState<{ blob: Blob; previa: string; hora: string } | null>(null)
  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [detalhes, setDetalhes] = useState('')
  const [enviando, setEnviando] = useState(false)
  // Comprimir uma foto de câmera leva alguns segundos num celular simples: avisa enquanto isso.
  const [preparando, setPreparando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => () => void (foto && URL.revokeObjectURL(foto.previa)), [foto])

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return
    setErro(null)
    setPreparando(true)
    try {
      const agora = new Date()
      // Carimbo gravado na imagem (decisão do M6): ferramenta · data e hora · quem fotografou.
      const blob = await comprimirFoto(arquivo, textoCarimbo(tipo, agora, autor))
      setFoto({ blob, previa: URL.createObjectURL(blob), hora: agora.toISOString() })
    } catch {
      setErro('Não foi possível ler a foto. Tente de novo.')
    } finally {
      setPreparando(false)
    }
  }

  async function usar() {
    if (!foto || !motivo) return
    setEnviando(true)
    setErro(null)
    const caminho = `${obraId}/${crypto.randomUUID()}.jpg`
    const { error } = await criarClienteNavegador()
      .storage.from('avarias')
      .upload(caminho, foto.blob, { contentType: 'image/jpeg', upsert: false })
    setEnviando(false)
    if (error) {
      setErro('Não foi possível enviar a foto (sem conexão?). Tente de novo.')
      return
    }
    // A prévia segue viva com a tela de devolução (que a libera ao refazer, ao tirar a peça das
    // avariadas ou ao sair da tela).
    aoUsar({
      motivo,
      foto: caminho,
      previa: URL.createObjectURL(foto.blob),
      hora: foto.hora,
      detalhes: detalhes.trim() || undefined,
    })
  }

  const textoBotao = !foto ? 'Tire a foto' : !motivo ? 'Escolha o problema' : 'Usar esta foto'

  return (
    <>
      <Cabecalho
        titulo="Foto da avaria"
        subtitulo="Fica anexada ao histórico da ferramenta"
        aoVoltar={aoVoltar}
        selo={selo}
      />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-4">
        <p className="text-[15px] font-semibold">
          {tipo} {qual}
        </p>
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label={`Fotografar a avaria da ${tipo.toLowerCase()}`}
          onChange={(e) => void escolher(e.target.files?.[0])}
        />
        {preparando ? (
          <p
            role="status"
            className="flex min-h-56 items-center justify-center rounded-cartao bg-[#101720] px-6 text-center font-semibold text-white"
          >
            Preparando a foto…
          </p>
        ) : foto ? (
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
            <img
              src={foto.previa}
              alt={`Foto da avaria da ${tipo.toLowerCase()}`}
              className="max-h-80 w-full rounded-cartao bg-[#101720] object-contain"
            />
            <button
              type="button"
              onClick={() => entrada.current?.click()}
              className="min-h-toque self-start text-sm font-bold underline"
            >
              Refazer a foto
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-cartao bg-[#101720] px-6 text-center text-white"
          >
            <span className="flex size-[72px] items-center justify-center rounded-full border-4 border-white">
              <span className="size-14 rounded-full bg-white" />
            </span>
            Enquadre o defeito da {tipo.toLowerCase()} e toque para fotografar
          </button>
        )}
        {foto && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-bold tracking-[1.2px] text-texto-2">
              QUAL O PROBLEMA?
            </legend>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS.map((m) => (
                <label
                  key={m.valor}
                  className={`flex min-h-toque cursor-pointer items-center rounded-full border-2 px-4 text-[15px] font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-foco ${
                    motivo === m.valor
                      ? 'border-erro bg-erro-claro text-texto'
                      : 'border-borda bg-cartao'
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m.valor}
                    checked={motivo === m.valor}
                    onChange={() => setMotivo(m.valor)}
                    className="sr-only"
                  />
                  {m.rotulo}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {foto && (
          <label className="flex flex-col gap-1.5 text-[13px] font-bold tracking-[1.2px] text-texto-2">
            DETALHES (OPCIONAL)
            <textarea
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={3}
              placeholder="Ex.: disco trincado perto do eixo"
              className="rounded-botao border border-borda bg-cartao px-3 py-2.5 text-base font-normal tracking-normal text-texto"
            />
            <span className="self-end text-xs font-normal tracking-normal">
              {detalhes.length}/300
            </span>
          </label>
        )}
        {erro && (
          <p role="alert" className="rounded-cartao bg-erro-claro px-4 py-3 text-erro">
            {erro}
          </p>
        )}
      </main>
      <RodapeAcao
        resumo={
          <span className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 font-normal text-texto-2">Problema</span>
            <span>{motivo ? rotuloMotivo(motivo) : 'escolha um'}</span>
          </span>
        }
      >
        <Botao
          type="button"
          variante="escura"
          tamanho="g"
          larguraTotal
          disabled={!foto || !motivo || enviando || preparando}
          onClick={() => void usar()}
        >
          {preparando ? 'Preparando a foto…' : enviando ? 'Enviando a foto…' : textoBotao}
        </Botao>
      </RodapeAcao>
    </>
  )
}

/** Foto que não vai mais ser usada ("Refazer", menos avariadas): libera a prévia e apaga do Storage. */
export function descartarFoto(f: FotoFeita | null | undefined) {
  if (!f) return
  URL.revokeObjectURL(f.previa)
  void criarClienteNavegador().storage.from('avarias').remove([f.foto])
}
