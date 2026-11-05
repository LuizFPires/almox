'use client'

import { quantidadeComSinal } from '@/components/LinhaExtrato'
import type { LinhaExtratoPeriodo as Linha } from '@/lib/dados/materiais'
import { agruparPorDia, resumoDoDia, rotuloDoDia } from '@/lib/dominio/extrato'
import type { SaldoMaterial } from '@/lib/dominio/materiais'
import { formatarHora } from '@/lib/formatos/datas'
import { formatarQuantidade } from '@/lib/formatos/quantidade'
import { useEdicaoLancamento } from '../[id]/EditarLancamento'

type Props = {
  linhas: Linha[]
  materiais: SaldoMaterial[]
  /** Dia de hoje na obra (`yyyy-MM-dd`). */
  hoje: string
  /** Só o engenheiro edita e apaga. */
  podeEditar: boolean
  /** O período tem mais lançamentos do que os mostrados. */
  cortado: boolean
}

type Estilo = { bola: string; rotulo: string; cor: string; valor: string }

/** Bolinha, rótulo, cor e valor de cada lançamento (protótipo: extrato-linha-do-tempo). */
function estiloDe(l: Linha): Estilo {
  const morta = l.apagado || l.desfeito
  const valor = quantidadeComSinal(morta ? l.quantidadeOriginal : l.quantidade)
  if (morta) {
    const rotulo = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste', conferencia: '' }[l.tipo]
    return {
      bola: 'bg-fundo shadow-[inset_0_0_0_2.5px_#C3C8D0]',
      rotulo,
      cor: 'text-texto-2',
      valor,
    }
  }
  switch (l.tipo) {
    case 'entrada':
      return { bola: 'bg-sucesso', rotulo: 'Entrada', cor: 'text-sucesso', valor }
    case 'saida':
      return { bola: 'bg-[#7F1D1D]', rotulo: 'Saída', cor: 'text-[#7F1D1D]', valor }
    case 'ajuste':
      return { bola: 'bg-amarelo', rotulo: 'Ajuste da contagem', cor: 'text-aviso', valor }
    case 'conferencia':
      return l.quantidade === 0
        ? {
            bola: 'bg-fundo shadow-[inset_0_0_0_2.5px_#9CA3AF]',
            rotulo: 'Contagem conferida',
            cor: 'text-sucesso',
            valor: '✓ bateu',
          }
        : {
            bola: 'bg-fundo shadow-[inset_0_0_0_2.5px_var(--color-amarelo)]',
            rotulo: 'Contagem com diferença',
            cor: 'text-aviso',
            valor,
          }
  }
}

const TAG = 'ml-1 inline-block rounded-full px-[7px] align-[1px] text-[11px] font-extrabold'

function Cartao({ l, onEditar }: { l: Linha; onEditar?: () => void }) {
  const e = estiloDe(l)
  const morta = l.apagado || l.desfeito
  const editado = !morta && l.editadoEm !== null
  const divergencia = l.tipo === 'conferencia' && l.quantidade !== 0 && !morta
  const observacoes = [
    divergencia ? 'não altera o saldo' : null,
    editado
      ? `editado por ${l.editadoPorNome ?? '—'} (era ${quantidadeComSinal(l.quantidadeOriginal)})`
      : null,
    l.apagado && !l.desfeito && l.editadoPorNome ? `apagado por ${l.editadoPorNome}` : null,
    l.registradoNoAparelhoEm
      ? `lançado sem sinal às ${formatarHora(l.registradoNoAparelhoEm)}`
      : null,
  ].filter(Boolean)

  const conteudo = (
    <>
      <span
        className={`truncate text-[15px] font-bold ${morta ? 'text-texto-2 line-through' : ''}`}
      >
        {l.materialNome}
      </span>
      <span
        className={`text-right text-[17px] font-black whitespace-nowrap tabular-nums ${e.cor} ${
          morta ? 'line-through' : ''
        }`}
      >
        {e.valor}
        {e.valor.startsWith('✓') ? '' : ` ${l.unidade}`}
      </span>
      <span className="text-[12.5px] text-texto-2">
        {formatarHora(l.criadoEm)} · {e.rotulo.toLowerCase()} · {l.usuarioNome ?? '—'}
        {l.desfeito && <span className={`${TAG} bg-erro-claro text-erro`}>desfeito</span>}
        {l.apagado && !l.desfeito && (
          <span className={`${TAG} bg-erro-claro text-erro`}>apagado</span>
        )}
        {editado && <span className={`${TAG} bg-engenheiro-claro text-engenheiro`}>editado</span>}
      </span>
      <span className="text-right text-[12.5px] whitespace-nowrap text-texto-2 tabular-nums">
        {morta ? '' : `saldo ${formatarQuantidade(l.saldoDepois)}`}
      </span>
      {observacoes.length > 0 && (
        <span className="col-span-2 text-xs font-semibold text-texto-2">
          {observacoes.join(' · ')}
        </span>
      )}
    </>
  )
  const classe =
    'grid w-full grid-cols-[1fr_auto] items-baseline gap-x-2.5 gap-y-0.5 rounded-[14px] bg-cartao px-3.5 py-2.5 text-left'

  return (
    <li className="relative pb-2.5">
      <span
        aria-hidden="true"
        className={`absolute top-3.5 -left-[30px] size-5 rounded-full border-4 border-fundo ${e.bola}`}
      />
      {onEditar ? (
        <button
          type="button"
          onClick={onEditar}
          aria-label={`Editar ${e.rotulo.toLowerCase()} de ${l.materialNome}: ${e.valor} ${l.unidade}, ${formatarHora(l.criadoEm)}`}
          className={`${classe} hover:shadow-[0_0_0_1.5px_var(--color-borda)]`}
        >
          {conteudo}
        </button>
      ) : (
        <div className={classe}>{conteudo}</div>
      )}
    </li>
  )
}

/** Lançamentos do período por dia, com uma linha à esquerda e uma bolinha em cada evento. */
export function LinhaDoTempo({ linhas, materiais, hoje, podeEditar, cortado }: Props) {
  const { abrir, gaveta } = useEdicaoLancamento(materiais)

  if (linhas.length === 0) {
    return (
      <p className="py-8 text-center text-[15px] text-texto-2">Nenhum lançamento nesse período.</p>
    )
  }

  return (
    <>
      {agruparPorDia(linhas).map((g) => (
        <section key={g.dia} aria-label={rotuloDoDia(g.dia, hoje)}>
          <h2 className="sticky top-0 z-10 flex items-baseline justify-between gap-2 bg-fundo pt-3.5 pb-2">
            <span className="text-[15px] font-extrabold">{rotuloDoDia(g.dia, hoje)}</span>
            <span className="text-xs font-semibold whitespace-nowrap text-texto-2">
              {resumoDoDia(g.linhas)}
            </span>
          </h2>
          <ol className="relative pl-[30px] before:absolute before:top-1.5 before:bottom-1.5 before:left-[9px] before:w-0.5 before:rounded-full before:bg-[#D1D5DB]">
            {g.linhas.map((l) => (
              <Cartao
                key={l.id}
                l={l}
                onEditar={
                  podeEditar && l.tipo !== 'conferencia' && !l.apagado && !l.desfeito
                    ? () => abrir(l)
                    : undefined
                }
              />
            ))}
          </ol>
        </section>
      ))}
      <p className="pt-1.5 text-center text-xs text-texto-2">
        {cortado
          ? 'Mostrando os 1.000 lançamentos mais recentes. Diminua o período para ver o resto.'
          : 'Fim do período'}
      </p>
      {gaveta}
    </>
  )
}
