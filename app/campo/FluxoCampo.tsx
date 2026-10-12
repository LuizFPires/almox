'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { CartaoPessoaLancamento, iniciais } from '@/components/CartaoPessoaLancamento'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { ehIcone } from '@/components/icones-ferramenta'
import { LeitorQr } from '@/components/LeitorQr'
import { RodapeAcao } from '@/components/RodapeAcao'
import {
  livresComFila,
  normalizarToken,
  podeDevolver,
  possesComFila,
  textoFila,
  type ItemFila,
  type PessoaOffline,
} from '@/lib/dominio/offline'
import { primeiroNome } from '@/lib/dominio/leitura'
import {
  AVISO_SEM_QR,
  somarUm,
  textoConfirmacao,
  textoContinuar,
  textoDisponivel,
} from '@/lib/dominio/retirada'
import { formatarDataHora, formatarHora } from '@/lib/formatos/datas'
import { contemTexto } from '@/lib/formatos/texto'
import {
  CANAL_FILA,
  guardarNaFila,
  hashDoToken,
  lerDados,
  listarFila,
  tirarDaFila,
  type DadosGuardados,
} from '@/lib/offline/banco'
import { usuarioDoCookie } from '@/lib/offline/sessao'
import { enviarFila } from '@/lib/offline/sincronizar'

type Escolhida = { pessoa: PessoaOffline; token: string | null }

type Etapa =
  | { tipo: 'inicio' }
  | { tipo: 'lendo'; n: number }
  | { tipo: 'desconhecido' }
  | { tipo: 'lista' }
  | { tipo: 'conferir'; escolhida: Escolhida }
  | { tipo: 'bloqueado'; pessoa: PessoaOffline }
  | { tipo: 'acao'; escolhida: Escolhida }
  | { tipo: 'retirada'; escolhida: Escolhida }
  | { tipo: 'devolucao'; escolhida: Escolhida }
  | { tipo: 'feito'; texto: string }

const SELO_FILA = 'rounded-full bg-aviso-claro px-2.5 py-0.5 text-xs font-bold text-aviso'

/** Lançar sem internet: ler QR (ou lista) → conferir → retirada/devolução → fila. */
export function FluxoCampo() {
  const [dados, setDados] = useState<DadosGuardados | null | undefined>(undefined)
  const [fila, setFila] = useState<ItemFila[]>([])
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'inicio' })
  const [online, setOnline] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [semLogin, setSemLogin] = useState(false)

  // Só os dados e a fila de quem está logado neste celular (sem sessão, a tela não abre).
  const recarregar = useCallback(() => {
    const usuario = usuarioDoCookie(document.cookie)
    if (!usuario) {
      setSemLogin(true)
      setDados(null)
      setFila([])
      return Promise.resolve()
    }
    return Promise.all([lerDados(usuario), listarFila()]).then(
      ([d, f]) => {
        setSemLogin(false)
        setDados(d)
        setFila(f.filter((i) => i.usuario === usuario))
      },
      () => setDados(null),
    )
  }, [])

  useEffect(() => {
    const rede = () => setOnline(navigator.onLine)
    void Promise.resolve().then(() => {
      rede()
      return recarregar()
    })
    const aoVoltar = () => {
      rede()
      void enviarFila()
        .catch(() => 0)
        .then(recarregar)
    }
    window.addEventListener('online', aoVoltar)
    window.addEventListener('offline', rede)
    let canal: BroadcastChannel | null = null
    try {
      canal = new BroadcastChannel(CANAL_FILA)
      canal.onmessage = () => void recarregar()
    } catch {
      canal = null
    }
    // Quem abre esta tela com internet já manda o que estiver na fila.
    if (navigator.onLine) aoVoltar()
    const t = window.setInterval(() => {
      if (navigator.onLine) aoVoltar()
    }, 30_000)
    return () => {
      window.removeEventListener('online', aoVoltar)
      window.removeEventListener('offline', rede)
      canal?.close()
      window.clearInterval(t)
    }
  }, [recarregar])

  async function enviarAgora() {
    setEnviando(true)
    try {
      await enviarFila()
    } catch {
      // sem rede: fica na fila
    }
    await recarregar()
    setEnviando(false)
  }

  async function lancar(
    item: Omit<ItemFila, 'chave' | 'obra' | 'usuario' | 'quando' | 'situacao'>,
    texto: string,
  ) {
    if (!dados) return
    await guardarNaFila({
      ...item,
      chave: crypto.randomUUID(),
      obra: dados.obra,
      usuario: dados.usuario,
      quando: new Date().toISOString(),
      situacao: 'aguardando',
    })
    await recarregar()
    setEtapa({ tipo: 'feito', texto })
    if (navigator.onLine)
      void enviarFila()
        .catch(() => 0)
        .then(recarregar)
  }

  async function aoLer(texto: string) {
    if (!dados) return
    const token = normalizarToken(texto)
    const hash = await hashDoToken(token)
    const pessoa = dados.pessoas.find((p) => p.hash === hash)
    setEtapa(pessoa ? { tipo: 'conferir', escolhida: { pessoa, token } } : { tipo: 'desconhecido' })
  }

  if (dados === undefined) {
    return (
      <p role="status" className="flex flex-1 items-center justify-center text-texto-2">
        Carregando…
      </p>
    )
  }

  if (semLogin) {
    return (
      <>
        <Cabecalho titulo="Lançar sem internet" />
        <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
          <p className="rounded-cartao bg-aviso-claro px-4 py-3.5 text-[15px] text-aviso">
            Ninguém está logado neste celular. Entre no Almox com internet, com o login do
            almoxarife, para lançar sem internet depois.
          </p>
          <Link href="/login" className="text-center font-bold underline">
            Entrar
          </Link>
        </main>
      </>
    )
  }

  if (dados === null) {
    return (
      <>
        <Cabecalho titulo="Lançar sem internet" />
        <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
          <p className="rounded-cartao bg-aviso-claro px-4 py-3.5 text-[15px] text-aviso">
            Este celular ainda não guardou as pessoas e ferramentas da obra. Abra o Almox com
            internet uma vez, com o login do almoxarife, e depois esta tela funciona sem sinal.
          </p>
          <Link href="/inicio" className="text-center font-bold underline">
            Abrir o Almox
          </Link>
        </main>
      </>
    )
  }

  const voltarAoInicio = () => setEtapa({ tipo: 'inicio' })

  switch (etapa.tipo) {
    case 'lendo':
      return (
        <>
          <Cabecalho titulo="Ler capacete" subtitulo="Sem internet" aoVoltar={voltarAoInicio} />
          <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
            <LeitorQr key={etapa.n} aoLer={(t) => void aoLer(t)} />
            <button
              type="button"
              onClick={() => setEtapa({ tipo: 'lista' })}
              className="flex min-h-toque items-center justify-center text-sm font-semibold text-texto-2 underline"
            >
              Sem capacete ou QR ilegível? Escolher na lista
            </button>
          </main>
        </>
      )
    case 'desconhecido':
      return (
        <>
          <Cabecalho titulo="Ler capacete" subtitulo="Sem internet" aoVoltar={voltarAoInicio} />
          <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-cartao bg-erro-claro px-4 py-4"
            >
              <p className="text-lg font-bold text-erro">Capacete não encontrado neste celular</p>
              <p className="text-[15px]">
                Pode ser de outra obra, de pessoa inativa ou cadastrada depois que a internet caiu.
                Nada foi registrado.
              </p>
            </div>
            <Botao
              variante="escura"
              tamanho="g"
              larguraTotal
              onClick={() => setEtapa({ tipo: 'lendo', n: Date.now() })}
            >
              Ler de novo
            </Botao>
          </main>
        </>
      )
    case 'lista':
      return (
        <ListaPessoas
          dados={dados}
          aoVoltar={voltarAoInicio}
          aoEscolher={(pessoa) => setEtapa({ tipo: 'acao', escolhida: { pessoa, token: null } })}
        />
      )
    case 'conferir': {
      const { pessoa, token } = etapa.escolhida
      const primeiro = primeiroNome(pessoa.nome)
      return (
        <>
          <Cabecalho
            titulo="Conferir pessoa"
            subtitulo="Compare com quem está na sua frente"
            aoVoltar={voltarAoInicio}
          />
          <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
            <section
              aria-label="Pessoa do capacete"
              className="flex flex-col items-center gap-1 rounded-cartao border-2 border-escuro bg-cartao px-4 py-5 text-center"
            >
              <span className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
                O CELULAR DIZ QUE É
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
              <p className="text-[15px]">Olhe para a pessoa, não para o capacete.</p>
            </div>
            <div className="mt-auto flex flex-col gap-2.5">
              <Botao
                variante="sucesso"
                tamanho="g"
                larguraTotal
                onClick={() => setEtapa({ tipo: 'acao', escolhida: { pessoa, token } })}
              >
                Sim, é o {primeiro}
              </Botao>
              <button
                type="button"
                onClick={() =>
                  void guardarNaFila({
                    chave: crypto.randomUUID(),
                    obra: dados.obra,
                    usuario: dados.usuario,
                    tipo: 'ocorrencia',
                    pessoa: pessoa.id,
                    pessoaNome: pessoa.nome,
                    token,
                    itens: [],
                    quando: new Date().toISOString(),
                    situacao: 'aguardando',
                  }).then(() => {
                    void recarregar()
                    setEtapa({ tipo: 'bloqueado', pessoa })
                  })
                }
                className="flex min-h-14 w-full items-center justify-center rounded-cartao border-2 border-erro bg-cartao px-5 text-lg font-bold text-erro"
              >
                Não é ele
              </button>
            </div>
          </main>
        </>
      )
    }
    case 'bloqueado':
      return (
        <>
          <Cabecalho
            titulo="Conferência"
            subtitulo="Pessoa não confere"
            aoVoltar={voltarAoInicio}
          />
          <main className="flex flex-1 flex-col items-center gap-4 px-5 pt-6 pb-6 text-center">
            <h2 className="text-[26px] font-bold">Nada foi registrado</h2>
            <p className="text-[17px]">
              O capacete de {etapa.pessoa.nome} está com outra pessoa. A ocorrência vai para o
              histórico quando a internet voltar.
            </p>
            <Botao variante="escura" tamanho="g" larguraTotal onClick={voltarAoInicio}>
              Voltar
            </Botao>
          </main>
        </>
      )
    case 'acao': {
      const { pessoa, token } = etapa.escolhida
      const comEla = possesComFila(dados, fila, pessoa.id)
      const total = Object.values(comEla).reduce((s, p) => s + p.total, 0)
      return (
        <>
          <Cabecalho
            titulo={primeiroNome(pessoa.nome)}
            subtitulo="Sem internet"
            aoVoltar={voltarAoInicio}
          />
          <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-6">
            <CartaoPessoaLancamento
              pessoa={{ nome: pessoa.nome, iniciais: iniciais(pessoa.nome) }}
              identificacao={
                token
                  ? { texto: 'QR do capacete · pessoa conferida', tom: 'sucesso' }
                  : { texto: 'Escolhido na lista · sem QR', tom: 'erro' }
              }
            />
            <p className="text-[15px] text-texto-2">
              {total === 0
                ? 'Não está com nenhuma ferramenta.'
                : `Está com ${total} ${total === 1 ? 'ferramenta' : 'ferramentas'} (contando a fila).`}
            </p>
            <Botao
              variante="primaria"
              tamanho="g"
              larguraTotal
              onClick={() => setEtapa({ tipo: 'retirada', escolhida: etapa.escolhida })}
            >
              Retirada
            </Botao>
            <Botao
              variante="escura"
              tamanho="g"
              larguraTotal
              disabled={total === 0}
              onClick={() => setEtapa({ tipo: 'devolucao', escolhida: etapa.escolhida })}
            >
              Devolução
            </Botao>
          </main>
        </>
      )
    }
    case 'retirada':
      return (
        <RetiradaOffline
          dados={dados}
          fila={fila}
          escolhida={etapa.escolhida}
          aoVoltar={() => setEtapa({ tipo: 'acao', escolhida: etapa.escolhida })}
          aoConcluir={(itens) =>
            void lancar(
              {
                tipo: 'retirada',
                pessoa: etapa.escolhida.pessoa.id,
                pessoaNome: etapa.escolhida.pessoa.nome,
                token: etapa.escolhida.token,
                itens,
              },
              'Retirada guardada no celular',
            )
          }
        />
      )
    case 'devolucao':
      return (
        <DevolucaoOffline
          dados={dados}
          fila={fila}
          escolhida={etapa.escolhida}
          aoVoltar={() => setEtapa({ tipo: 'acao', escolhida: etapa.escolhida })}
          aoConcluir={(itens) =>
            void lancar(
              {
                tipo: 'devolucao',
                pessoa: etapa.escolhida.pessoa.id,
                pessoaNome: etapa.escolhida.pessoa.nome,
                token: etapa.escolhida.token,
                itens,
              },
              'Devolução guardada no celular',
            )
          }
        />
      )
    case 'feito':
      return (
        <>
          <Cabecalho titulo="Lançar sem internet" />
          <main className="flex flex-1 flex-col items-center gap-4 px-5 pt-6 pb-6 text-center">
            <h2 className="text-[26px] font-bold">{etapa.texto}</h2>
            <span className={SELO_FILA}>aguardando envio</span>
            <p className="text-[17px] text-texto-2">
              Vai para o Almox sozinho quando a internet voltar.
            </p>
            <Botao variante="escura" tamanho="g" larguraTotal onClick={voltarAoInicio}>
              Lançar outro
            </Botao>
          </main>
        </>
      )
  }

  const aguardando = fila.filter((i) => i.situacao === 'aguardando').length
  const recusados = fila.filter((i) => i.situacao === 'recusado').length
  const nomeTipo = (id: string) => dados.tipos.find((t) => t.id === id)?.nome ?? 'Ferramenta'
  return (
    <>
      <Cabecalho
        titulo="Lançar sem internet"
        subtitulo={`Dados de ${formatarDataHora(dados.geradoEm)}`}
      />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-6">
        <p
          role="status"
          className={`rounded-cartao px-4 py-3 text-[15px] font-semibold ${online ? 'bg-sucesso-claro text-sucesso' : 'bg-aviso-claro text-aviso'}`}
        >
          {online
            ? 'Internet de volta: a fila vai sozinha.'
            : 'Sem internet. Os lançamentos ficam guardados neste celular.'}
        </p>
        <button
          type="button"
          onClick={() => setEtapa({ tipo: 'lendo', n: Date.now() })}
          className="flex min-h-28 items-center gap-4 rounded-cartao bg-escuro px-5 text-left text-white"
        >
          <span className="flex flex-col">
            <span className="text-xl font-bold">Ler QR do capacete</span>
            <span className="text-sm text-white/80">Retirada ou devolução, sem internet</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setEtapa({ tipo: 'lista' })}
          className="flex min-h-toque items-center justify-center text-sm font-semibold text-texto-2 underline"
        >
          Sem capacete? Escolher na lista
        </button>

        <section aria-label="Fila do celular" className="flex flex-col gap-2">
          <h2 className="flex items-center justify-between text-[13px] font-bold tracking-[1.2px] text-texto-2">
            FILA DO CELULAR
            <span className="font-semibold tracking-normal">
              {textoFila(aguardando, recusados) ?? 'vazia'}
            </span>
          </h2>
          {fila.map((item) => (
            <div
              key={item.chave}
              className="flex flex-col gap-1 rounded-cartao bg-cartao px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  {item.tipo === 'retirada'
                    ? 'Retirada'
                    : item.tipo === 'devolucao'
                      ? 'Devolução'
                      : 'Não é ele'}{' '}
                  · {item.pessoaNome}
                </span>
                <span className="text-sm text-texto-2">{formatarHora(item.quando)}</span>
              </div>
              {item.itens.length > 0 && (
                <span className="text-[15px]">
                  {item.itens.map((i) => `${nomeTipo(i.tipo)} ×${i.quantidade}`).join(', ')}
                </span>
              )}
              {item.situacao === 'aguardando' ? (
                <span className={`${SELO_FILA} self-start`}>aguardando envio</span>
              ) : (
                <>
                  <p role="alert" className="text-[15px] font-semibold text-erro">
                    {item.erro}
                  </p>
                  <Botao
                    variante="secundaria"
                    onClick={() => void tirarDaFila(item.chave).then(recarregar)}
                  >
                    Descartar
                  </Botao>
                </>
              )}
            </div>
          ))}
        </section>
        {online && aguardando > 0 && (
          <Botao
            variante="escura"
            tamanho="g"
            larguraTotal
            disabled={enviando}
            onClick={() => void enviarAgora()}
          >
            {enviando ? 'Enviando…' : 'Enviar agora'}
          </Botao>
        )}
        {online && (
          <Link
            href="/inicio"
            className="flex min-h-toque items-center justify-center font-bold underline"
          >
            Voltar ao Almox
          </Link>
        )}
      </main>
    </>
  )
}

function ListaPessoas({
  dados,
  aoVoltar,
  aoEscolher,
}: {
  dados: DadosGuardados
  aoVoltar: () => void
  aoEscolher: (p: PessoaOffline) => void
}) {
  const [busca, setBusca] = useState('')
  const pessoas = useMemo(
    () =>
      dados.pessoas.filter(
        (p) => !busca || contemTexto(`${p.nome} ${p.nomeCapacete} ${p.empresa}`, busca),
      ),
    [dados.pessoas, busca],
  )
  return (
    <>
      <Cabecalho titulo="Escolher na lista" subtitulo="Sem QR · manual" aoVoltar={aoVoltar} />
      <main className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-6">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pessoa"
          aria-label="Buscar pessoa"
          className="min-h-toque rounded-botao border border-borda bg-cartao px-4 text-base"
        />
        <ul className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao">
          {pessoas.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => aoEscolher(p)}
                className="flex min-h-14 w-full flex-col px-4 py-2.5 text-left"
              >
                <span className="font-bold">{p.nome}</span>
                <span className="text-[13px] text-texto-2">
                  {p.nomeCapacete} · {p.empresa}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}

type PropsLancamento = {
  dados: DadosGuardados
  fila: ItemFila[]
  escolhida: Escolhida
  aoVoltar: () => void
  aoConcluir: (itens: { tipo: string; quantidade: number }[]) => void
}

function RetiradaOffline({ dados, fila, escolhida, aoVoltar, aoConcluir }: PropsLancamento) {
  const [qtd, setQtd] = useState<Record<string, number>>({})
  const [revisao, setRevisao] = useState(false)
  const [conferido, setConferido] = useState(false)
  const livres = livresComFila(dados.tipos, fila)
  const marcadas = dados.tipos.filter((t) => (qtd[t.id] ?? 0) > 0)
  const total = marcadas.reduce((s, t) => s + (qtd[t.id] ?? 0), 0)
  const primeiro = primeiroNome(escolhida.pessoa.nome)
  const temAlto = marcadas.some((t) => t.altoValor)

  if (revisao) {
    return (
      <>
        <Cabecalho
          titulo="Retirada"
          subtitulo="Revisar · sem internet"
          aoVoltar={() => setRevisao(false)}
        />
        <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-4">
          <div className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao px-4 py-1">
            {marcadas.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <span className="font-semibold">{t.nome}</span>
                <span className="text-2xl font-bold tabular-nums">×{qtd[t.id]}</span>
              </div>
            ))}
          </div>
          <p className="text-[15px] text-texto-2">
            As peças são escolhidas pelo Almox quando a internet voltar (as livres de menor código).
          </p>
          {!escolhida.token && (
            <p className="rounded-cartao bg-erro-claro px-4 py-3 text-[15px] text-erro">
              <b>Lançamento sem QR.</b> {AVISO_SEM_QR}
            </p>
          )}
          <button
            type="button"
            role="checkbox"
            aria-checked={conferido}
            onClick={() => setConferido((c) => !c)}
            className={`flex min-h-16 items-center gap-3 rounded-cartao border-2 bg-cartao px-4 py-3 text-left text-[15px] font-semibold ${conferido ? 'border-escuro' : 'border-borda'}`}
          >
            <span
              aria-hidden="true"
              className={`flex size-8 shrink-0 items-center justify-center rounded-botao border-2 text-lg font-bold ${conferido ? 'border-escuro bg-escuro text-amarelo' : 'border-borda'}`}
            >
              {conferido ? '✓' : ''}
            </span>
            {textoConfirmacao(primeiro, temAlto)}
          </button>
        </main>
        <RodapeAcao resumo={<span className="text-sm">Fica na fila · aguardando envio</span>}>
          <Botao
            tamanho="g"
            larguraTotal
            disabled={!conferido}
            onClick={() =>
              aoConcluir(marcadas.map((t) => ({ tipo: t.id, quantidade: qtd[t.id] ?? 0 })))
            }
          >
            {conferido ? 'Guardar retirada' : 'Marque a conferência acima'}
          </Botao>
        </RodapeAcao>
      </>
    )
  }

  return (
    <>
      <Cabecalho titulo="Retirada" subtitulo="Sem internet" aoVoltar={aoVoltar} />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-4">
        <h2 className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
          CADA TOQUE NO ÍCONE SOMA 1
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {dados.tipos.map((t) => {
            const q = qtd[t.id] ?? 0
            const l = livres[t.id] ?? 0
            return (
              <div key={t.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label={`${t.nome}: ${q > 0 ? `${q} escolhida(s), ` : ''}${textoDisponivel(l, q)}`}
                  onClick={() => setQtd((m) => ({ ...m, [t.id]: somarUm(q, l) }))}
                  disabled={l === 0}
                  className={`relative flex min-h-32 flex-col items-center justify-center gap-1 rounded-cartao border-2 px-1 py-3 disabled:opacity-40 ${q > 0 ? 'border-amarelo bg-aviso-claro' : 'border-transparent bg-cartao'}`}
                >
                  {q > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-escuro text-sm font-bold text-amarelo">
                      {q}
                    </span>
                  )}
                  {ehIcone(t.icone) ? (
                    <IconeFerramenta icone={t.icone} nome={t.nome} destaque={q > 0} />
                  ) : (
                    <span className="font-bold">{t.nome}</span>
                  )}
                  <span className="text-xs text-texto-2">{textoDisponivel(l, q)}</span>
                </button>
                {q > 0 && (
                  <button
                    type="button"
                    aria-label={`Tirar uma ${t.nome}`}
                    onClick={() => setQtd((m) => ({ ...m, [t.id]: q - 1 }))}
                    className="min-h-toque w-11 rounded-botao border border-borda bg-cartao text-xl font-bold"
                  >
                    −
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </main>
      <RodapeAcao resumo={<span className="text-sm">Livres pelo que o celular sabe</span>}>
        <Botao
          tamanho="g"
          larguraTotal
          disabled={total === 0}
          onClick={() => {
            setConferido(false)
            setRevisao(true)
          }}
        >
          {textoContinuar(total)}
        </Botao>
      </RodapeAcao>
    </>
  )
}

function DevolucaoOffline({ dados, fila, escolhida, aoVoltar, aoConcluir }: PropsLancamento) {
  const [qtd, setQtd] = useState<Record<string, number>>({})
  const comQr = escolhida.token !== null
  const posses = possesComFila(dados, fila, escolhida.pessoa.id)
  const tipos = dados.tipos.filter((t) => (posses[t.id]?.total ?? 0) > 0)
  const total = Object.values(qtd).reduce((s, n) => s + n, 0)
  return (
    <>
      <Cabecalho titulo="Devolução" subtitulo="Sem internet" aoVoltar={aoVoltar} />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-4">
        <h2 className="text-[13px] font-bold tracking-[1.2px] text-texto-2">MARQUE O QUE VOLTOU</h2>
        {tipos.map((t) => {
          const max = podeDevolver(posses[t.id], comQr)
          const q = qtd[t.id] ?? 0
          return (
            <section
              key={t.id}
              aria-label={t.nome}
              className="flex items-center gap-3 rounded-cartao bg-cartao px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-bold">{t.nome}</span>
                <span className="text-[13px] text-texto-2">
                  {max === 0
                    ? 'saiu com o capacete: só volta com o QR'
                    : `com ele: ${posses[t.id]?.total ?? 0}`}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Devolver uma a menos ${t.nome}`}
                disabled={q === 0}
                onClick={() => setQtd((m) => ({ ...m, [t.id]: q - 1 }))}
                className="size-toque rounded-botao border border-borda text-xl font-bold disabled:opacity-40"
              >
                −
              </button>
              <span className="w-6 text-center text-xl font-bold tabular-nums">{q}</span>
              <button
                type="button"
                aria-label={`Devolver mais uma ${t.nome}`}
                disabled={q >= max}
                onClick={() => setQtd((m) => ({ ...m, [t.id]: q + 1 }))}
                className="size-toque rounded-botao border border-borda text-xl font-bold disabled:opacity-40"
              >
                +
              </button>
            </section>
          )
        })}
        <p className="rounded-cartao bg-aviso-claro px-4 py-3 text-[15px] text-aviso">
          Voltou avariada? A avaria precisa de foto: separe a peça e registre a devolução dela
          quando a internet voltar.
        </p>
      </main>
      <RodapeAcao resumo={<span className="text-sm">Fica na fila · aguardando envio</span>}>
        <Botao
          tamanho="g"
          larguraTotal
          disabled={total === 0}
          onClick={() =>
            aoConcluir(
              Object.entries(qtd)
                .filter(([, n]) => n > 0)
                .map(([tipo, quantidade]) => ({ tipo, quantidade })),
            )
          }
        >
          {total === 0
            ? 'Marque o que voltou'
            : `Guardar devolução (${total} ${total === 1 ? 'item' : 'itens'})`}
        </Botao>
      </RodapeAcao>
    </>
  )
}
