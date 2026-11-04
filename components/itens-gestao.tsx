import type { Perfil } from '@/lib/dominio/permissoes'
import { podeLancar } from '@/lib/dominio/permissoes'
import type { ItemGaveta } from './Gaveta'
import { IconeInterface } from './IconeInterface'

/**
 * Itens da gaveta "Gestão da obra", iguais no Início de ferramentas e no de materiais.
 * Quem recebe aviso (PRD §5): engenheiro e a consulta da empreiteira (`restrita`).
 */
export function itensGestao(perfil: Perfil, restrita: unknown): ItemGaveta[] {
  const engenheiro = perfil === 'engenheiro'
  return [
    ...(podeLancar(perfil)
      ? [
          {
            href: '/conectar-tv',
            icone: <IconeInterface nome="dashboard" tamanho={20} />,
            titulo: 'Conectar TV',
            detalhe: 'Código que aparece na TV do almoxarifado',
          },
        ]
      : []),
    ...(engenheiro || restrita
      ? [
          {
            href: '/avisos',
            icone: <IconeInterface nome="warning" tamanho={20} />,
            titulo: 'Avisos',
            detalhe: 'Ferramentas não devolvidas, por empreiteira',
            tom: 'erro' as const,
          },
        ]
      : []),
    ...(engenheiro
      ? [
          {
            href: '/medicao',
            icone: <span className="text-sm font-extrabold">R$</span>,
            titulo: 'A descontar na medição',
            detalhe: 'Valores por empreiteira',
            tom: 'aviso' as const,
          },
          {
            href: '/historico',
            icone: <IconeInterface nome="history" tamanho={20} />,
            titulo: 'Histórico e auditoria',
            detalhe: 'Todos os lançamentos e estornos',
          },
        ]
      : []),
  ]
}
