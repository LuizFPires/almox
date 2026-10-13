'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { LeitorQr } from '@/components/LeitorQr'
import { mensagemLeitura, primeiroNome, type SituacaoLeitura } from '@/lib/dominio/leitura'
import { confirmarPessoa, lerCapacete, naoEhEle, type PessoaLida } from './acoes'

type Etapa =
  | { tipo: 'lendo' }
  | { tipo: 'buscando' }
  | { tipo: 'aviso'; situacao: Exclude<SituacaoLeitura, 'ok'> | 'falhou' }
  | { tipo: 'conferir'; token: string; pessoa: PessoaLida }
  | { tipo: 'bloqueado'; pessoa: PessoaLida; anotada: boolean }

/**
 * Redirecionamento de Server Action (ex.: abrir a ficha) chega como erro especial do Next:
 * precisa seguir adiante. Qualquer outro erro é falha de rede e vira mensagem na tela.
 */
function repassarNavegacao(erro: unknown) {
  const digest = (erro as { digest?: unknown } | null)?.digest
  if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw erro
}

const CLASSE_BOTAO_GRANDE =
  'flex min-h-14 w-full items-center justify-center rounded-cartao px-5 text-lg font-bold'

/**
 * Ler capacete (F-02) → Conferência (F-03, RN-03) → ficha, ou Bloqueio (RN-04).
 * O token lido fica só na memória desta tela (nunca na URL).
 */
export function FluxoLeitura({ lanca }: { lanca: boolean }) {
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'lendo' })
  const [leitura, setLeitura] = useState(0)
  const [enviando, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  // Quando o QR foi lido (relógio monotônico do celular): o tempo até a retirada é métrica do piloto.
  const lidoEm = useRef<number | null>(null)

  function lerDeNovo() {
    setErro(null)
    setLeitura((n) => n + 1)
    setEtapa({ tipo: 'lendo' })
  }

  function aoLer(token: string) {
    lidoEm.current = performance.now()
    setEtapa({ tipo: 'buscando' })
    iniciar(async () => {
      try {
        const r = await lerCapacete(token)
        if (r.situacao === 'ok') setEtapa({ tipo: 'conferir', token, pessoa: r.pessoa })
        else setEtapa({ tipo: 'aviso', situacao: r.situacao })
      } catch (e) {
        repassarNavegacao(e)
        setEtapa({ tipo: 'aviso', situacao: 'falhou' })
      }
    })
  }

  if (etapa.tipo === 'conferir') {
    const { pessoa, token } = etapa
    const primeiro = primeiroNome(pessoa.nome)
    return (
      <>
        <Cabecalho
          titulo="Conferir pessoa"
          subtitulo="Compare com quem está na sua frente"
          aoVoltar={lerDeNovo}
        />
        <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-sucesso">
            <span aria-hidden="true">✓</span> QR lido · capacete cadastrado
          </p>
          <section
            aria-label="Pessoa do capacete"
            className="flex flex-col items-center gap-1 rounded-cartao border-2 border-escuro bg-cartao px-4 py-5 text-center"
          >
            <span className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
              O SISTEMA DIZ QUE É
            </span>
            <span className="text-[44px] leading-none font-extrabold break-words">
              {pessoa.nomeCapacete}
            </span>
            <span className="text-xl font-semibold">{pessoa.nome}</span>
            <span className="flex items-center gap-1.5 text-[15px] text-texto-2">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ background: pessoa.empresaCor }}
              />
              {pessoa.funcao} · {pessoa.empresa}
            </span>
          </section>
          <div className="rounded-cartao bg-aviso-claro px-4 py-3.5">
            <p className="text-[17px] font-bold">É o {primeiro} que está na sua frente?</p>
            <p className="text-[15px]">
              Olhe para a pessoa, não para o capacete. Se tiver dúvida, pergunte o nome dela antes
              de confirmar.
            </p>
          </div>
          {erro && (
            <p role="alert" className="text-[15px] font-semibold text-erro">
              {erro}
            </p>
          )}
          <div className="mt-auto flex flex-col gap-2.5">
            <Botao
              type="button"
              variante="sucesso"
              tamanho="g"
              larguraTotal
              disabled={enviando}
              onClick={() =>
                iniciar(async () => {
                  try {
                    const r = await confirmarPessoa(
                      token,
                      lidoEm.current === null
                        ? undefined
                        : (performance.now() - lidoEm.current) / 1000,
                    )
                    setErro(r.erro)
                  } catch (e) {
                    repassarNavegacao(e)
                    setErro('Sem conexão com o Almox. Tente de novo.')
                  }
                })
              }
            >
              {enviando ? 'Conferindo…' : `Sim, é o ${primeiro}`}
            </Botao>
            <button
              type="button"
              disabled={enviando}
              onClick={() =>
                iniciar(async () => {
                  let anotada = false
                  try {
                    anotada = (await naoEhEle(token)).ok
                  } catch (e) {
                    repassarNavegacao(e)
                  }
                  setEtapa({ tipo: 'bloqueado', pessoa, anotada })
                })
              }
              className={`${CLASSE_BOTAO_GRANDE} border-2 border-erro bg-cartao text-erro disabled:opacity-40`}
            >
              Não é ele
            </button>
          </div>
        </main>
      </>
    )
  }

  if (etapa.tipo === 'bloqueado') {
    const { pessoa, anotada } = etapa
    return (
      <>
        <Cabecalho titulo="Conferência" subtitulo="Pessoa não confere" voltarPara="/inicio" />
        <main className="flex flex-1 flex-col items-center gap-4 px-5 pt-6 pb-6 text-center">
          <span
            aria-hidden="true"
            className="flex size-24 items-center justify-center rounded-full bg-erro-claro text-erro"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M5.6 5.6l12.8 12.8" />
            </svg>
          </span>
          <h2 className="text-[26px] font-bold">Nada foi registrado</h2>
          <p className="text-[17px]">
            O capacete de {pessoa.nome} está com outra pessoa.{' '}
            {anotada
              ? 'A ocorrência ficou anotada no histórico.'
              : 'Não foi possível anotar a ocorrência agora (sem conexão?). Avise o engenheiro.'}
          </p>
          <div className="mt-auto flex w-full flex-col gap-2.5">
            <button
              type="button"
              onClick={lerDeNovo}
              className={`${CLASSE_BOTAO_GRANDE} bg-escuro text-white`}
            >
              Ler o capacete certo
            </button>
            <Link
              href="/pessoas"
              className={`${CLASSE_BOTAO_GRANDE} border border-borda bg-cartao text-texto`}
            >
              Escolher na lista (manual)
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Cabecalho
        titulo={lanca ? 'Ler capacete' : 'Consultar'}
        subtitulo={lanca ? 'Retirada ou devolução' : 'Ver o que está com a pessoa'}
        voltarPara="/inicio"
      />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
        {etapa.tipo === 'aviso' ? (
          <div role="alert" className="flex flex-col gap-1 rounded-cartao bg-erro-claro px-4 py-4">
            <p className="text-lg font-bold text-erro">
              {etapa.situacao === 'falhou'
                ? 'Não foi possível consultar'
                : mensagemLeitura(etapa.situacao).titulo}
            </p>
            <p className="text-[15px]">
              {etapa.situacao === 'falhou'
                ? 'Sem conexão com o Almox. Tente de novo.'
                : mensagemLeitura(etapa.situacao).texto}
            </p>
          </div>
        ) : (
          <LeitorQr key={leitura} aoLer={aoLer} />
        )}
        {etapa.tipo === 'buscando' && (
          <p role="status" className="text-center font-semibold">
            Conferindo o capacete…
          </p>
        )}
        {etapa.tipo === 'aviso' && (
          <button
            type="button"
            onClick={lerDeNovo}
            className={`${CLASSE_BOTAO_GRANDE} bg-escuro text-white`}
          >
            Ler de novo
          </button>
        )}
        {lanca && (
          <Link
            href="/pessoas"
            className="flex min-h-toque items-center justify-center text-sm font-semibold text-texto-2 underline"
          >
            Sem capacete ou QR ilegível? Escolher na lista
          </Link>
        )}
      </main>
    </>
  )
}
