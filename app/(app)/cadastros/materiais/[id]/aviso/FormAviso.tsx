'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition, type ReactNode } from 'react'
import { salvarAviso } from '@/app/(app)/materiais/acoes'
import { Botao } from '@/components/Botao'
import { CLASSE_CAMPO, ErroFormulario } from '@/components/Formulario'
import { RodapeAcao } from '@/components/RodapeAcao'
import { limiteDoAviso, type Aviso } from '@/lib/dominio/materiais'
import {
  formatarQuantidade,
  lerQuantidade,
  quantidadeValida,
  type UnidadeMaterial,
} from '@/lib/formatos/quantidade'

type Tipo = 'quantidade' | 'percentual'

type Props = {
  materialId: string
  unidade: UnidadeMaterial
  /** Saldo logo depois da última entrada (base da %). */
  estoqueCheio: number
  aviso: Aviso
  obraNome: string
  /**
   * Dentro da gaveta (tela Saldos): botões no fim do conteúdo, sem rodapé fixo, e ao salvar
   * chama `onConcluido` em vez de voltar para o cadastro.
   */
  onConcluido?(): void
  /** Avisa quem abriu que o salvamento está a caminho (a gaveta não fecha no meio). */
  onOcupado?(ocupado: boolean): void
}

const OPCOES: { tipo: Tipo; rotulo: string }[] = [
  { tipo: 'quantidade', rotulo: 'Chegar a uma quantidade' },
  { tipo: 'percentual', rotulo: 'Chegar a um %' },
]

export function FormAviso({
  materialId,
  unidade,
  estoqueCheio,
  aviso,
  obraNome,
  onConcluido,
  onOcupado,
}: Props) {
  const router = useRouter()
  const nomeRadio = useId()
  const naGaveta = onConcluido !== undefined
  const [tipo, setTipo] = useState<Tipo>(aviso?.tipo ?? 'quantidade')
  const [texto, setTexto] = useState(aviso ? formatarQuantidade(aviso.valor) : '')
  const [erro, setErro] = useState('')
  const [pendente, iniciar] = useTransition()

  const passo = tipo === 'percentual' ? 5 : 1
  const valor = lerQuantidade(texto)

  function mover(delta: number) {
    const base = valor ?? 0
    let novo = Math.round((base + delta) * 100) / 100
    if (novo < 0) novo = 0
    if (tipo === 'percentual' && novo > 100) novo = 100
    setTexto(formatarQuantidade(novo))
  }

  function validar(): number | null {
    if (valor === null || valor <= 0) {
      setErro('Informe um valor maior que zero.')
      return null
    }
    if (tipo === 'percentual' && valor > 100) {
      setErro('A porcentagem vai de 1 a 100.')
      return null
    }
    if (tipo === 'quantidade' && !quantidadeValida(valor, unidade)) {
      setErro('Quantidade inválida para esta unidade.')
      return null
    }
    return valor
  }

  function enviar(tipoSalvo: Tipo | null, valorSalvo: number | null) {
    setErro('')
    onOcupado?.(true)
    iniciar(async () => {
      let r: Awaited<ReturnType<typeof salvarAviso>>
      try {
        r = await salvarAviso({ materialId, tipo: tipoSalvo, valor: valorSalvo })
      } catch {
        r = { ok: false, erro: 'Sem conexão. Tente de novo.' }
      }
      onOcupado?.(false)
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      router.refresh()
      if (onConcluido) onConcluido()
      else router.push(`/cadastros/materiais/${materialId}`)
    })
  }

  function salvar() {
    const v = validar()
    if (v !== null) enviar(tipo, v)
  }

  const limite =
    valor !== null && valor > 0 ? limiteDoAviso({ aviso: { tipo, valor }, estoqueCheio }) : null

  return (
    <div className="flex flex-1 flex-col">
      <div className={`flex flex-1 flex-col ${naGaveta ? 'gap-4' : 'gap-5 px-5 pt-2 pb-6'}`}>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-bold tracking-[1.2px] text-texto-2 uppercase">
            Avisar quando
          </legend>
          <div className="grid grid-cols-2 gap-2.5">
            {OPCOES.map((o) => (
              <label
                key={o.tipo}
                className={`flex min-h-[104px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-cartao border-[1.5px] bg-white px-2 pt-3.5 pb-3 text-center text-[14px] leading-tight font-extrabold transition-colors ${
                  tipo === o.tipo
                    ? 'border-escuro text-escuro shadow-[inset_0_0_0_1px_var(--color-escuro)]'
                    : 'border-[#D1D5DB] text-texto-2'
                } has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-foco`}
              >
                <input
                  type="radio"
                  name={nomeRadio}
                  value={o.tipo}
                  checked={tipo === o.tipo}
                  onChange={() => setTipo(o.tipo)}
                  className="sr-only"
                />
                <span aria-hidden="true" className="text-[30px] leading-none font-black">
                  {o.tipo === 'percentual' ? '%' : unidade}
                </span>
                {o.rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center gap-2">
          <Botao
            variante="secundaria"
            aria-label="Menos"
            className="size-14 shrink-0 text-2xl"
            onClick={() => mover(-passo)}
          >
            −
          </Botao>
          <input
            aria-label={
              tipo === 'percentual' ? 'Porcentagem do estoque cheio' : `Quantidade em ${unidade}`
            }
            inputMode="decimal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="0"
            className={`${CLASSE_CAMPO} h-14 min-w-0 flex-1 text-center text-2xl font-bold tabular-nums`}
          />
          <span className="w-10 shrink-0 text-center font-semibold text-texto-2">
            {tipo === 'percentual' ? '%' : unidade}
          </span>
          <Botao
            variante="secundaria"
            aria-label="Mais"
            className="size-14 shrink-0 text-2xl"
            onClick={() => mover(passo)}
          >
            +
          </Botao>
        </div>

        {tipo === 'percentual' && (
          <p aria-live="polite" className="rounded-cartao bg-sutil px-3.5 py-3 text-[15px]">
            {estoqueCheio <= 0 ? (
              'O aviso passa a valer depois da primeira entrada.'
            ) : limite === null ? (
              'Informe a porcentagem para ver quando o aviso dispara.'
            ) : (
              <>
                {formatarQuantidade(valor ?? 0)}% de {formatarQuantidade(estoqueCheio)} {unidade} →{' '}
                <b>
                  avisa ao chegar em {formatarQuantidade(limite)} {unidade}
                </b>
              </>
            )}
          </p>
        )}

        <p className="rounded-cartao bg-engenheiro-claro px-3.5 py-3 text-sm text-engenheiro">
          <b>Quem recebe:</b> todos da obra {obraNome} (engenheiro, almoxarifes e consulta), com
          notificação no celular. Avisa uma vez ao cruzar o limite e volta a valer depois de uma
          nova entrada.
        </p>

        <ErroFormulario mensagem={erro} />
      </div>

      <Rodape naGaveta={naGaveta}>
        <Botao variante="engenheiro" tamanho="g" larguraTotal disabled={pendente} onClick={salvar}>
          {pendente ? 'Salvando…' : 'Salvar aviso'}
        </Botao>
        {aviso && (
          <Botao
            variante="secundaria"
            larguraTotal
            disabled={pendente}
            onClick={() => enviar(null, null)}
          >
            Remover aviso
          </Botao>
        )}
      </Rodape>
    </div>
  )
}

/** Página: rodapé fixo. Gaveta: botões logo abaixo do conteúdo. */
function Rodape({ naGaveta, children }: { naGaveta: boolean; children: ReactNode }) {
  if (naGaveta) return <div className="mt-4 flex flex-col gap-2">{children}</div>
  return <RodapeAcao>{children}</RodapeAcao>
}
