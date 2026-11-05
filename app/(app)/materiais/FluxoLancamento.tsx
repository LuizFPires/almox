'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Botao } from '@/components/Botao'
import { BotaoNovoMaterial } from '@/components/GavetaNovoMaterial'
import { GavetaQuantidade } from '@/components/GavetaQuantidade'
import { IconeInterface } from '@/components/IconeInterface'
import {
  filtrarMateriais,
  ordenarParaLancamento,
  type SaldoMaterial,
  type TipoLancamento,
} from '@/lib/dominio/materiais'
import { saldoComFila, type ItemFila } from '@/lib/dominio/offline'
import { formatarQuantidade } from '@/lib/formatos/quantidade'
import { CANAL_FILA, guardarNaFila, listarFila } from '@/lib/offline/banco'
import { pedirCadastro, registrarEntrada, registrarSaida } from './acoes'
import { GuardadoNoCelular } from './GuardadoNoCelular'

type Props = {
  tipo: TipoLancamento
  materiais: SaldoMaterial[]
  /** Ids dos materiais por uso nos últimos 30 dias (saída). */
  ordemMaisUsados: string[]
  /** Engenheiro: cadastra material novo; almoxarife: só pede o cadastro. */
  podeCadastrar: boolean
  /** Nome de quem lança (conferência da entrada). */
  quem: string
  /** Obra e login de quem lança: sem sinal, o lançamento vai para a fila do celular. */
  obraId: string
  usuarioId: string
}

/** Envio sem resposta (rede caiu): mesma chave e mesma quantidade até o servidor responder. */
type Pendente = { chave: string; quantidade: number }
/** Lançamento que ficou na fila do celular. */
type Guardado = { quantidade: number; nome: string; unidade: string }

/** Fila do celular desta obra, relida quando muda (envio, outra tela). */
function useFilaDaObra(obraId: string): ItemFila[] {
  const [fila, setFila] = useState<ItemFila[]>([])
  useEffect(() => {
    let vivo = true
    const ler = () =>
      void listarFila()
        .then((f) => {
          if (vivo) setFila(f.filter((i) => i.obra === obraId))
        })
        .catch(() => undefined)
    ler()
    let canal: BroadcastChannel | null = null
    try {
      canal = new BroadcastChannel(CANAL_FILA)
      canal.onmessage = ler
    } catch {
      canal = null
    }
    return () => {
      vivo = false
      canal?.close()
    }
  }, [obraId])
  return fila
}

function ehErroDoNext(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest
  return typeof digest === 'string' && digest.startsWith('NEXT_')
}

/** Entrada e saída de material: busca, lista e gaveta de quantidade (protótipo › escolher). */
export function FluxoLancamento({
  tipo,
  materiais: doServidor,
  ordemMaisUsados,
  podeCadastrar,
  quem,
  obraId,
  usuarioId,
}: Props) {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [escolhido, setEscolhido] = useState<SaldoMaterial | null>(null)
  const [aberta, setAberta] = useState(false)
  const [chave, setChave] = useState('')
  // Por material: fechar e reabrir a gaveta não troca a chave nem a quantidade pendentes.
  const [pendentes, setPendentes] = useState<ReadonlyMap<string, Pendente>>(new Map())
  const [erro, setErro] = useState<string | null>(null)
  const [guardado, setGuardado] = useState<Guardado | null>(null)
  // Material recém-cadastrado: abre a gaveta de entrada assim que a lista o trouxer.
  const [recemCadastrado, setRecemCadastrado] = useState<string | null>(null)
  const [enviando, iniciar] = useTransition()
  const saida = tipo === 'saida'
  // Prévia: o saldo do servidor com as entradas e saídas que ainda estão na fila do celular.
  const fila = useFilaDaObra(obraId)
  const materiais = fila.some((i) => i.situacao === 'aguardando')
    ? doServidor.map((m) => ({ ...m, saldo: saldoComFila(m.saldo, fila, m.id) }))
    : doServidor

  if (recemCadastrado) {
    const novo = doServidor.find((m) => m.id === recemCadastrado)
    if (novo) {
      setRecemCadastrado(null)
      abrir(novo)
    }
  }

  const lista = filtrarMateriais(ordenarParaLancamento(tipo, materiais, ordemMaisUsados), busca)

  function marcarPendente(materialId: string, p: Pendente | null) {
    setPendentes((atual) => {
      const novo = new Map(atual)
      if (p) novo.set(materialId, p)
      else novo.delete(materialId)
      return novo
    })
  }

  function abrir(m: SaldoMaterial) {
    setEscolhido(m)
    setErro(null)
    setChave(pendentes.get(m.id)?.chave ?? crypto.randomUUID())
    setAberta(true)
  }

  function confirmar(digitada: number) {
    if (!escolhido) return
    const material = escolhido
    const pendente = pendentes.get(material.id)
    // Com envio pendente, repete exatamente o que foi: a chave devolve o mesmo lançamento.
    const quantidade = pendente?.quantidade ?? digitada
    const chaveEnvio = pendente?.chave ?? chave
    setErro(null)

    /** Sem sinal: guarda com a mesma chave (se a 1ª chamada chegou ao servidor, não duplica). */
    async function guardarSemSinal() {
      try {
        await guardarNaFila({
          chave: chaveEnvio,
          obra: obraId,
          usuario: usuarioId,
          tipo: saida ? 'material_saida' : 'material_entrada',
          material: material.id,
          materialNome: material.nome,
          quantidade,
          quando: new Date().toISOString(),
          situacao: 'aguardando',
        })
      } catch {
        // Nem o celular guardou: trava a quantidade e guarda a chave para tentar de novo.
        marcarPendente(material.id, { chave: chaveEnvio, quantidade })
        return
      }
      marcarPendente(material.id, null)
      setAberta(false)
      setGuardado({ quantidade, nome: material.nome, unidade: material.unidade })
    }

    iniciar(async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await guardarSemSinal()
        return
      }
      try {
        const p = { materialId: material.id, quantidade, chave: chaveEnvio }
        const r = saida ? await registrarSaida(p) : await registrarEntrada(p)
        // Resposta de verdade do servidor: libera a quantidade.
        marcarPendente(material.id, null)
        if (!r.ok) {
          setErro(r.erro)
          // Nada foi gravado: a próxima tentativa é outro lançamento.
          setChave(crypto.randomUUID())
          // Saldo pode ter mudado (outra saída antes desta): atualiza a lista e a gaveta.
          router.refresh()
          return
        }
        const aviso = 'aviso' in r && r.aviso ? 1 : 0
        const params = new URLSearchParams({
          tipo,
          id: r.id,
          q: String(quantidade),
          aviso: String(aviso),
        })
        router.push(`/materiais/pronto?${params.toString()}`)
      } catch (e) {
        if (ehErroDoNext(e)) throw e
        // Pode ter gravado antes de a rede cair: vai para a fila com a mesma chave.
        await guardarSemSinal()
      }
    })
  }

  if (guardado) {
    return (
      <GuardadoNoCelular
        titulo={saida ? 'Saída guardada' : 'Entrada guardada'}
        linha={`${saida ? '−' : '+'}${formatarQuantidade(guardado.quantidade)} ${guardado.unidade} · ${guardado.nome}`}
        acoes={
          <button
            type="button"
            onClick={() => {
              setGuardado(null)
              setEscolhido(null)
              setBusca('')
            }}
            className={`flex min-h-14 items-center justify-center rounded-cartao px-5 text-lg font-bold text-white ${
              saida ? 'bg-escuro' : 'bg-sucesso'
            }`}
          >
            {saida ? 'Outra saída' : 'Outra entrada'}
          </button>
        }
      />
    )
  }

  // A gaveta usa o saldo mais novo que a página trouxer.
  const naGaveta = escolhido ? (materiais.find((m) => m.id === escolhido.id) ?? escolhido) : null

  return (
    <main className="flex flex-1 flex-col gap-2.5 px-5 pt-2 pb-5">
      <label className="sr-only" htmlFor="busca-material">
        Buscar material
      </label>
      <input
        id="busca-material"
        type="search"
        autoComplete="off"
        placeholder="Buscar material"
        value={busca}
        onChange={(e) => setBusca(e.currentTarget.value)}
        className="min-h-12 w-full rounded-xl border-[1.5px] border-borda bg-cartao px-3.5 py-3 text-[15px]"
      />
      {saida && busca.trim() === '' && (
        <h2 className="mt-1 text-[11px] font-extrabold tracking-[0.5px] text-texto-2 uppercase">
          Mais usados primeiro
        </h2>
      )}
      {lista.length === 0 ? (
        <p className="py-5 text-center text-sm text-texto-2">Nenhum material encontrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((m) => {
            const sem = saida && m.saldo <= 0
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={sem}
                  onClick={() => abrir(m)}
                  className="flex min-h-14 w-full items-center justify-between gap-2 rounded-[14px] bg-cartao px-3.5 py-2.5 text-left disabled:opacity-45"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">{m.nome}</span>
                    <span className="text-xs text-texto-2">
                      {sem ? 'sem saldo' : `saldo ${formatarQuantidade(m.saldo)} ${m.unidade}`}
                    </span>
                  </span>
                  <IconeInterface
                    nome="chevron-right"
                    tamanho={20}
                    className="shrink-0 text-texto-2"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!saida &&
        (podeCadastrar ? (
          <BotaoNovoMaterial
            onSalvo={setRecemCadastrado}
            className="flex min-h-[52px] items-center justify-center rounded-botao border border-borda bg-cartao px-4 font-extrabold"
          >
            ＋ Cadastrar material novo
          </BotaoNovoMaterial>
        ) : (
          <PedirCadastro />
        ))}
      {naGaveta && (
        <GavetaQuantidade
          tipo={tipo}
          material={naGaveta}
          aberta={aberta}
          ocupado={enviando}
          onFechar={() => setAberta(false)}
          onConfirmar={confirmar}
          quem={quem}
          erro={erro}
          quantidadeTravada={pendentes.get(naGaveta.id)?.quantidade ?? null}
          onAlterar={() => setErro(null)}
        />
      )}
    </main>
  )
}

/** Almoxarife não cadastra: pede ao engenheiro pelo nome. */
function PedirCadastro() {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null)
  const [enviando, iniciar] = useTransition()

  function enviar() {
    const limpo = nome.trim()
    if (!limpo) return
    setResultado(null)
    iniciar(async () => {
      try {
        const r = await pedirCadastro(limpo)
        if (r.ok) {
          setResultado({ ok: true, texto: 'Pedido enviado ao engenheiro da obra.' })
          setNome('')
          setAberto(false)
        } else setResultado({ ok: false, texto: r.erro })
      } catch (e) {
        if (ehErroDoNext(e)) throw e
        setResultado({ ok: false, texto: 'Sem conexão. Tente de novo.' })
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-sutil px-3.5 py-3 text-[13px] leading-snug">
      <p>
        Não achou? Só o engenheiro cadastra material novo.{' '}
        {!aberto && (
          <button
            type="button"
            onClick={() => {
              setResultado(null)
              setAberto(true)
            }}
            className="inline-flex min-h-toque items-center font-bold underline"
          >
            Pedir cadastro
          </button>
        )}
      </p>
      {aberto && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            enviar()
          }}
        >
          <label htmlFor="nome-pedido" className="font-bold">
            Nome do material
          </label>
          <input
            id="nome-pedido"
            autoFocus
            autoComplete="off"
            maxLength={80}
            value={nome}
            onChange={(e) => setNome(e.currentTarget.value)}
            className="min-h-12 rounded-xl border-[1.5px] border-borda bg-cartao px-3.5 text-[15px]"
          />
          <div className="flex gap-2">
            <Botao
              type="button"
              variante="secundaria"
              className="flex-1"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="escura"
              className="flex-1"
              disabled={enviando || nome.trim() === ''}
            >
              {enviando ? 'Enviando…' : 'Enviar pedido'}
            </Botao>
          </div>
        </form>
      )}
      {resultado && (
        <p
          role={resultado.ok ? 'status' : 'alert'}
          className={`font-semibold ${resultado.ok ? 'text-sucesso' : 'text-erro'}`}
        >
          {resultado.texto}
        </p>
      )}
    </div>
  )
}
