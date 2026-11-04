'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { IconeInterface } from '@/components/IconeInterface'
import { RodapeAcao } from '@/components/RodapeAcao'
import {
  chaveRascunhoContagem,
  diferencasContagem,
  itensDoRascunho,
  type ItemContagem,
  type RascunhoContagem,
  type SaldoMaterial,
} from '@/lib/dominio/materiais'
import { formatarQuantidade, lerQuantidade, quantidadeValida } from '@/lib/formatos/quantidade'
import { registrarContagem } from '../acoes'

type Props = { obraId: string; dia: string; materiais: SaldoMaterial[] }
type Modo = 'ajustar' | 'conferir'
type Etapa = 'contar' | 'revisar' | 'pronto'
/** Itens e chave congelados ao entrar na revisão: repetir o envio devolve o mesmo lançamento. */
type Envio = { itens: ItemContagem[]; chave: string }

function ehErroDoNext(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest
  return typeof digest === 'string' && digest.startsWith('NEXT_')
}

function lerRascunho(chave: string): RascunhoContagem {
  try {
    const bruto = window.localStorage.getItem(chave)
    if (!bruto) return {}
    const dados: unknown = JSON.parse(bruto)
    if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) return {}
    const r: RascunhoContagem = {}
    for (const [id, v] of Object.entries(dados)) {
      const c = v as { valor?: unknown; saldoVisto?: unknown } | null
      if (c && typeof c.valor === 'string' && typeof c.saldoVisto === 'number') {
        r[id] = { valor: c.valor, saldoVisto: c.saldoVisto }
      }
    }
    return r
  } catch {
    return {}
  }
}

function gravarRascunho(chave: string, r: RascunhoContagem) {
  try {
    if (Object.keys(r).length === 0) window.localStorage.removeItem(chave)
    else window.localStorage.setItem(chave, JSON.stringify(r))
  } catch {
    // Modo privado ou armazenamento cheio: a contagem segue sem rascunho.
  }
}

const sinal = (n: number): string => (n > 0 ? `+${formatarQuantidade(n)}` : formatarQuantidade(n))

/** Contagem do dia: contar, revisar (ajustar ou só conferir) e pronto. */
export function FluxoContagem({ obraId, dia, materiais }: Props) {
  const chaveLocal = chaveRascunhoContagem(obraId, dia)
  const [rascunho, setRascunho] = useState<RascunhoContagem>({})
  const [carregado, setCarregado] = useState(false)
  const [etapa, setEtapa] = useState<Etapa>('contar')
  const [modo, setModo] = useState<Modo | null>(null)
  const [envio, setEnvio] = useState<Envio | null>(null)
  const [semResposta, setSemResposta] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ comDiferenca: number; modo: Modo } | null>(null)
  const [enviando, iniciar] = useTransition()

  useEffect(() => {
    // Rascunho só existe no navegador: lê depois da hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRascunho(lerRascunho(chaveLocal))
    setCarregado(true)
  }, [chaveLocal])

  const [anoDia, mesDia, diaDia] = dia.split('-')
  const dataTitulo = `${diaDia}/${mesDia}/${anoDia}`
  const porId = new Map(materiais.map((m) => [m.id, m]))

  function digitar(m: SaldoMaterial, valor: string) {
    setRascunho((atual) => {
      const novo = { ...atual }
      if (valor.trim() === '') delete novo[m.id]
      else novo[m.id] = { valor, saldoVisto: atual[m.id]?.saldoVisto ?? m.saldo }
      gravarRascunho(chaveLocal, novo)
      return novo
    })
  }

  function revisar() {
    setErro(null)
    setSemResposta(false)
    setEnvio({ itens: itensDoRascunho(rascunho, materiais), chave: crypto.randomUUID() })
    setEtapa('revisar')
  }

  function voltarParaContar() {
    setEtapa('contar')
    setEnvio(null)
    setSemResposta(false)
    setErro(null)
  }

  function confirmar() {
    if (!envio) return
    const dif = diferencasContagem(envio.itens)
    const comDiferenca = dif.menos.length + dif.mais.length
    if (comDiferenca > 0 && !modo) return
    // Sem diferença nada muda no saldo: grava só como conferência.
    const modoEnvio: Modo = comDiferenca > 0 && modo ? modo : 'conferir'
    setErro(null)
    iniciar(async () => {
      try {
        const r = await registrarContagem({ modo: modoEnvio, itens: envio.itens, chave: envio.chave })
        setSemResposta(false)
        if (!r.ok) {
          // Nada foi gravado (a contagem inteira volta atrás): conta de novo, com outra chave.
          setErro(r.erro)
          setEtapa('contar')
          setEnvio(null)
          return
        }
        gravarRascunho(chaveLocal, {})
        setRascunho({})
        setResultado({ comDiferenca, modo: modoEnvio })
        setEtapa('pronto')
      } catch (e) {
        if (ehErroDoNext(e)) throw e
        // Pode ter gravado antes de a rede cair: mantém chave e itens para repetir igual.
        setSemResposta(true)
      }
    })
  }

  if (etapa === 'pronto' && resultado) {
    return (
      <>
        <main className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-sucesso-claro text-sucesso">
            <IconeInterface nome="check" tamanho={34} />
          </span>
          <p role="status" className="text-xl font-extrabold">
            Contagem salva
          </p>
          <p className="text-[15px]">
            {resultado.comDiferenca} {resultado.comDiferenca === 1 ? 'material' : 'materiais'} com diferença
          </p>
          <p className="max-w-xs text-sm leading-snug text-texto-2">
            {resultado.modo === 'ajustar'
              ? 'Saldos ajustados. No extrato aparece como "Contagem · ajuste".'
              : 'Saldos mantidos. No extrato aparece como "Conferência · divergência".'}
          </p>
        </main>
        <div className="flex flex-col gap-2.5 px-5 pb-5">
          <Link
            href="/materiais/extrato"
            className="inline-flex min-h-toque items-center justify-center rounded-botao border border-borda bg-cartao px-4 text-[15px] font-bold"
          >
            Ver extrato
          </Link>
          <Link
            href="/materiais"
            className="inline-flex min-h-toque items-center justify-center rounded-botao bg-escuro px-4 text-[15px] font-bold text-white"
          >
            Voltar ao início
          </Link>
        </div>
      </>
    )
  }

  if (etapa === 'revisar' && envio) {
    const dif = diferencasContagem(envio.itens)
    const temDiferenca = dif.menos.length + dif.mais.length > 0
    const nomeDe = (id: string) => porId.get(id)?.nome ?? 'Material'
    const unidadeDe = (id: string) => porId.get(id)?.unidade ?? ''
    const travado = enviando || semResposta

    return (
      <>
        <Cabecalho titulo="Revisar contagem" aoVoltar={travado ? undefined : voltarParaContar} />
        <main className="flex flex-1 flex-col gap-2.5 px-5 pt-2 pb-5">
          {envio.itens.length === 0 ? (
            <>
              <p className="py-5 text-center text-sm text-texto-2">Nenhum material contado ainda.</p>
              <Botao variante="secundaria" larguraTotal onClick={voltarParaContar}>
                Voltar e contar
              </Botao>
            </>
          ) : (
            <>
              {temDiferenca && (
                <h2 className="text-[11px] font-extrabold tracking-[0.5px] text-texto-2 uppercase">
                  Diferenças encontradas
                </h2>
              )}
              <ul className="flex flex-col gap-2">
                {[...dif.menos, ...dif.mais].map((d) => (
                  <li
                    key={d.materialId}
                    className="flex items-center justify-between gap-3 rounded-[14px] bg-cartao px-3.5 py-2.5"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold">{nomeDe(d.materialId)}</span>
                      <span className="text-xs text-texto-2">
                        sistema {formatarQuantidade(d.saldoVisto)} · contei {formatarQuantidade(d.contado)}
                      </span>
                    </span>
                    <b className={`shrink-0 text-lg ${d.diferenca < 0 ? 'text-erro' : 'text-aviso'}`}>
                      {sinal(d.diferenca)} {unidadeDe(d.materialId)}
                    </b>
                  </li>
                ))}
              </ul>
              {dif.bateu.length > 0 && (
                <p className="text-[13px] leading-snug text-texto-2">
                  ✓ Bateu certo: {dif.bateu.map((d) => nomeDe(d.materialId)).join(', ')}
                </p>
              )}
              {temDiferenca && (
                <div role="radiogroup" aria-labelledby="titulo-modo" className="mt-1 flex flex-col gap-2">
                  <h2
                    id="titulo-modo"
                    className="mb-1 text-[11px] font-extrabold tracking-[0.5px] text-texto-2 uppercase"
                  >
                    O que fazer com a diferença?
                  </h2>
                  <OpcaoModo
                    marcado={modo === 'ajustar'}
                    onEscolher={() => setModo('ajustar')}
                    titulo="Ajustar o saldo pela contagem"
                    texto="O que contei passa a valer. A diferença entra no extrato como consumo do dia."
                    desabilitado={travado}
                  />
                  <OpcaoModo
                    marcado={modo === 'conferir'}
                    onEscolher={() => setModo('conferir')}
                    titulo="Só conferir"
                    texto="O saldo continua o das entradas e saídas. A diferença fica registrada para o engenheiro ver."
                    desabilitado={travado}
                  />
                </div>
              )}
            </>
          )}
          {semResposta && (
            <p role="alert" className="text-sm font-semibold text-erro">
              Sem conexão. Toque em Confirmar contagem de novo: não duplica.
            </p>
          )}
        </main>
        {envio.itens.length > 0 && (
          <RodapeAcao>
            <Botao
              tamanho="g"
              larguraTotal
              disabled={enviando || (temDiferenca && modo === null)}
              onClick={confirmar}
            >
              {enviando ? 'Salvando…' : 'Confirmar contagem'}
            </Botao>
          </RodapeAcao>
        )}
      </>
    )
  }

  const algumItem = itensDoRascunho(rascunho, materiais).length > 0

  return (
    <>
      <Cabecalho titulo={`Contagem · ${dataTitulo}`} voltarPara="/materiais" />
      <main className="flex flex-1 flex-col gap-2.5 px-5 pt-2 pb-5">
        <p className="text-sm leading-snug text-texto-2">
          Conte o que tem no almox e digite. Em branco = não contei hoje.
        </p>
        {erro && (
          <p role="alert" className="rounded-xl bg-erro-claro px-3.5 py-3 text-sm font-semibold text-erro">
            {erro} Nada foi salvo. Confira e conte de novo.
          </p>
        )}
        <div className="grid grid-cols-[1fr_64px_76px] gap-1.5 px-2.5 text-[10px] font-extrabold text-texto-2 uppercase">
          <span>Material</span>
          <span className="text-center">Sistema</span>
          <span className="text-center">Contei</span>
        </div>
        {materiais.length === 0 ? (
          <p className="py-5 text-center text-sm text-texto-2">Nenhum material cadastrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {materiais.map((m) => {
              const valor = rascunho[m.id]?.valor ?? ''
              const lido = valor.trim() === '' ? null : lerQuantidade(valor)
              const invalido =
                valor.trim() !== '' && (lido === null || (lido !== 0 && !quantidadeValida(lido, m.unidade)))
              return (
                <li
                  key={m.id}
                  className="grid grid-cols-[1fr_64px_76px] items-center gap-1.5 rounded-xl bg-cartao px-2.5 py-2 text-[13px]"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{m.nome}</span>
                    <span className="text-[11px] text-texto-2">{m.unidade}</span>
                  </span>
                  <span className="text-center font-semibold text-texto-2">{formatarQuantidade(m.saldo)}</span>
                  <input
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="—"
                    aria-label={`Contei de ${m.nome}`}
                    aria-invalid={invalido}
                    disabled={!carregado}
                    value={valor}
                    onChange={(e) => digitar(m, e.currentTarget.value)}
                    className={`min-h-toque w-full rounded-[9px] border-[1.5px] bg-cartao px-1 text-center text-base font-extrabold ${
                      invalido ? 'border-erro' : valor === '' ? 'border-borda' : 'border-foco'
                    }`}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <RodapeAcao>
        <Botao tamanho="g" larguraTotal disabled={!algumItem} onClick={revisar}>
          Revisar contagem
        </Botao>
      </RodapeAcao>
    </>
  )
}

function OpcaoModo(p: {
  marcado: boolean
  onEscolher: () => void
  titulo: string
  texto: string
  desabilitado: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={p.marcado}
      disabled={p.desabilitado}
      onClick={p.onEscolher}
      className={`flex min-h-toque w-full gap-2.5 rounded-[14px] bg-cartao p-3 text-left ${
        p.marcado ? 'border-[2.5px] border-foco' : 'border-[1.5px] border-borda'
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-px size-5 shrink-0 rounded-full ${
          p.marcado ? 'border-[6px] border-foco' : 'border-2 border-[#9CA3AF]'
        }`}
      />
      <span className="flex flex-col gap-0.5">
        <b className="text-sm">{p.titulo}</b>
        <span className="text-xs leading-snug text-texto-2">{p.texto}</span>
      </span>
    </button>
  )
}
