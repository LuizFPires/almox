import 'server-only'
import type { ItemBusca } from '@/lib/dominio/busca-cadastros'
import { listarEmpresas } from './empresas'
import { listarTipos } from './ferramentas'
import { listarPessoas } from './pessoas'

function livres(unidades: { status: string }[]) {
  const n = unidades.filter((u) => u.status === 'livre').length
  return `${n} ${n === 1 ? 'livre' : 'livres'}`
}

/**
 * Índice da busca de Cadastros: pessoas, ferramentas e empresas da obra em linhas curtas.
 * Vai inteiro para o celular, que filtra enquanto se digita (sem ida ao servidor por letra).
 * Não leva token de QR nem e-mail: só o que já aparece nas listas.
 */
export async function indiceCadastros(obraId: string): Promise<ItemBusca[]> {
  const [pessoas, tipos, empresas] = await Promise.all([
    listarPessoas(obraId),
    listarTipos(obraId),
    listarEmpresas(obraId),
  ])
  return [
    ...pessoas.map((p): ItemBusca => ({
      tipo: 'pessoa',
      id: p.id,
      nome: p.nome,
      detalhe: [p.nome_capacete, p.funcao, p.empresa?.nome].filter(Boolean).join(' · '),
      termos: [p.matricula],
      inativo: !p.ativa,
      cor: p.empresa?.cor,
    })),
    ...tipos.map((t): ItemBusca => ({
      tipo: 'ferramenta',
      id: t.id,
      nome: t.nome,
      detalhe: `${t.unidades.length} un. · ${livres(t.unidades)}`,
      termos: t.unidades.map((u) => u.codigo),
      icone: t.icone,
    })),
    ...empresas.map((e): ItemBusca => ({
      tipo: 'empresa',
      id: e.id,
      nome: e.nome,
      detalhe: `${e.tipo === 'propria' ? 'Própria' : 'Empreiteira'} · ${
        e.pessoas.filter((p) => p.ativa).length
      } pessoas`,
      termos: [],
      cor: e.cor,
    })),
  ]
}
