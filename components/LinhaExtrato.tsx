import type { LinhaExtrato as Linha } from '@/lib/dados/materiais'
import { diaDaObra, formatarDataHora, formatarHora } from '@/lib/formatos/datas'
import { formatarQuantidade } from '@/lib/formatos/quantidade'

const ROTULO = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' } as const

/** `+10`, `−100` (sinal de menos de verdade) ou `0`. */
export function quantidadeComSinal(n: number): string {
  if (n === 0) return '0'
  return `${n > 0 ? '+' : '−'}${formatarQuantidade(Math.abs(n))}`
}

/** "hoje HH:mm" se for do dia de hoje na obra; senão "dd/MM/yyyy HH:mm". */
function quando(iso: string): string {
  return diaDaObra(iso) === diaDaObra(new Date())
    ? `hoje ${formatarHora(iso)}`
    : formatarDataHora(iso)
}

type Props = {
  linha: Linha
  /** Mostra o nome do material (extrato geral). */
  comNome: boolean
  /** Mostra o botão Editar (só engenheiro, linhas que não são conferência). */
  editavel: boolean
  onEditar?: () => void
}

/** Uma linha do extrato de materiais (protótipo: movHtml). */
export function LinhaExtrato({ linha, comNome, editavel, onEditar }: Props) {
  const conferencia = linha.tipo === 'conferencia'
  const ok = conferencia && linha.quantidade === 0
  const divergencia = conferencia && !ok
  const morta = linha.apagado || linha.desfeito
  const nome = linha.usuarioNome ?? '—'
  const rotulo = ok
    ? 'Conferência ok'
    : divergencia
      ? 'Conferência · divergência'
      : ROTULO[linha.tipo as keyof typeof ROTULO]

  const hora = linha.registradoNoAparelhoEm
    ? `${diaDaObra(linha.registradoNoAparelhoEm) === diaDaObra(new Date()) ? '' : `${formatarDataHora(linha.criadoEm).slice(0, 10)} `}lançado às ${formatarHora(linha.registradoNoAparelhoEm)}, sincronizado às ${formatarHora(linha.criadoEm)}`
    : quando(linha.criadoEm)

  const valor = morta ? linha.quantidadeOriginal : linha.quantidade
  const editado = !morta && linha.editadoEm !== null
  const quemMexeu = `${linha.editadoPorNome ?? '—'}${linha.editadoEm ? ` às ${formatarHora(linha.editadoEm)}` : ''}`
  const observacao = linha.desfeito
    ? 'desfeito'
    : linha.apagado
      ? `apagado por ${quemMexeu}`
      : editado
        ? `editado por ${quemMexeu} (era ${quantidadeComSinal(linha.quantidadeOriginal)})`
        : null
  const corValor = morta
    ? 'text-texto-2'
    : divergencia
      ? 'text-aviso'
      : valor > 0
        ? 'text-sucesso'
        : ''

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm ${
        divergencia ? 'bg-aviso-claro' : 'bg-cartao'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className={morta ? 'line-through' : ''}>
          {comNome && <b className="block truncate text-sm">{linha.materialNome}</b>}
          <span>{rotulo}</span>
          <small className="block text-xs text-texto-2">
            {hora} · {nome}
            {divergencia && ' · não altera o saldo'}
          </small>
        </div>
        {observacao && (
          <small className="block text-xs font-semibold text-texto-2">{observacao}</small>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        {ok ? (
          <b className="text-sucesso" aria-label="sem diferença">
            ✓
          </b>
        ) : (
          <b className={`${corValor} ${morta ? 'line-through' : ''} tabular-nums`}>
            {quantidadeComSinal(valor)}
          </b>
        )}
        {editavel && !morta && onEditar && (
          <button
            type="button"
            onClick={onEditar}
            aria-label={`Editar lançamento de ${linha.materialNome}`}
            className="mt-1 min-h-toque rounded-botao px-2 text-xs font-bold text-engenheiro"
          >
            Editar
          </button>
        )}
      </div>
    </div>
  )
}
