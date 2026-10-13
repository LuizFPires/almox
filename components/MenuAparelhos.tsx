'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconeImpressora } from './IconeImpressora'
import { IconeInterface } from './IconeInterface'

type Props = {
  /** Impressora escolhida e agente do mini PC online. */
  pronta: boolean
  /** Linha de situação da impressora (ex.: "Zebra ZD421 · agente online"). */
  situacao: string
}

/** Engrenagem no traço dos ícones do DS (grade 24, traço 1,75). Decorativo. */
function Engrenagem() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

function Linha({
  href,
  icone,
  titulo,
  detalhe,
  tom = 'neutro',
  aoAbrir,
}: {
  href: string
  icone: ReactNode
  titulo: string
  detalhe?: string
  tom?: 'neutro' | 'ok' | 'erro' | 'info'
  aoAbrir: () => void
}) {
  const bola = {
    neutro: 'bg-sutil text-texto',
    ok: 'bg-sucesso-claro text-sucesso',
    erro: 'bg-erro-claro text-erro',
    info: 'bg-engenheiro-claro text-engenheiro',
  }[tom]
  return (
    <Link
      href={href}
      onClick={aoAbrir}
      className="flex min-h-15 items-center gap-3 border-b border-borda py-2 last:border-b-0"
    >
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${bola}`}
      >
        {icone}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`text-[15px] font-bold ${tom === 'info' ? 'text-engenheiro' : ''}`}>
          {titulo}
        </span>
        {detalhe && (
          <span
            className={`truncate text-[13px] ${
              tom === 'ok' ? 'text-sucesso' : tom === 'erro' ? 'text-erro' : 'text-texto-2'
            }`}
          >
            {detalhe}
          </span>
        )}
      </span>
      <IconeInterface nome="chevron-right" tamanho={18} className="shrink-0 text-texto-2" />
    </Link>
  )
}

/**
 * Engrenagem do cabeçalho de Cadastros (opção A): impressora, painel da TV, importar planilha e
 * o passo a passo ficam numa gaveta, liberando a tela para as listas. A bolinha mostra se a
 * impressora está pronta.
 */
export function MenuAparelhos({ pronta, situacao }: Props) {
  const [aberto, setAberto] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const gaveta = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    gaveta.current?.querySelector('a')?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false)
        botao.current?.focus()
      }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [aberto])

  const fechar = () => setAberto(false)

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto(true)}
        aria-label={`Impressora, TV e planilha${pronta ? '' : ' (impressora com problema)'}`}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className="relative flex size-toque shrink-0 items-center justify-center rounded-botao border border-borda bg-cartao"
      >
        <Engrenagem />
        <span
          aria-hidden="true"
          className={`absolute top-2 right-2 size-2.5 rounded-full border-2 border-cartao ${
            pronta ? 'bg-sucesso' : 'bg-erro'
          }`}
        />
      </button>
      {aberto && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="absolute inset-0 bg-[rgba(16,23,32,0.55)]"
          />
          <div
            ref={gaveta}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-aparelhos"
            className="relative mx-auto w-full max-w-[520px] rounded-t-[20px] bg-cartao px-5 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-3 block h-1 w-10 rounded-full bg-borda"
            />
            <h2 id="titulo-aparelhos" className="mb-1 text-lg font-bold">
              Impressora, TV e planilha
            </h2>
            <Linha
              href="/cadastros/impressora"
              icone={<IconeImpressora tamanho={20} />}
              titulo="Impressora"
              detalhe={situacao}
              tom={pronta ? 'ok' : 'erro'}
              aoAbrir={fechar}
            />
            <Linha
              href="/cadastros/painel-tv"
              icone={<IconeInterface nome="dashboard" tamanho={20} />}
              titulo="Painel da TV"
              detalhe="Tempo por página e rolagem"
              aoAbrir={fechar}
            />
            <Linha
              href="/cadastros/importar"
              icone={<IconeInterface nome="history" tamanho={20} />}
              titulo="Importar planilha"
              detalhe="Empresas, pessoas e ferramentas de uma vez"
              aoAbrir={fechar}
            />
            <Linha
              href="/cadastros/ajuda"
              icone={<IconeInterface nome="info" tamanho={20} />}
              titulo="Passo a passo: impressora e TV"
              tom="info"
              aoAbrir={fechar}
            />
          </div>
        </div>
      )}
    </>
  )
}
