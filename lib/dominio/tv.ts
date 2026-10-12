import { formatarHora, inicioDoDiaDaObra } from '@/lib/formatos/datas'
import { ehPendencia, textoDesde } from './ficha'

/** O que a função `painel_tv` devolve (só leitura, pelo token do dispositivo). */
export type PainelTv = {
  agora: string
  obra: string
  config: ConfigTv
  empresas: EmpresaTv[]
  pessoas: PessoaTv[]
}

export type ConfigTv = {
  tempoPaginaS: number
  velocidadePxS: number
  pausaAntesMs: number
  pausaDepoisMs: number
  cartoesPorPagina: number
}

export type EmpresaTv = { id: string; nome: string; cor: string; propria: boolean }

export type ItemTv = { codigo: string; tipo: string; icone: string; desde: string }

export type PessoaTv = {
  id: string
  nome: string
  apelido: string
  funcao: string
  empresaId: string
  itens: ItemTv[]
}

/** Uma ferramenta no cartão: tipo com ×N quando a pessoa tem mais de uma. */
export type FerramentaTv = { tipo: string; icone: string; quantidade: number }

export type CartaoTv = {
  id: string
  nome: string
  funcao: string
  empresa: { nome: string; cor: string }
  /** Até `MAX_FERRAMENTAS_CARTAO` tipos; o que sobra vira "+N" (peças). */
  ferramentas: FerramentaTv[]
  mais: number
  /** Todas, para as colunas por empresa (lá a linha quebra). */
  todas: FerramentaTv[]
  /** "Retirou às 07:05" (primeira retirada de hoje) ou null quando é pendência. */
  retirouAs: string | null
  /** "desde ontem 16:40": a peça mais antiga, quando é de antes de hoje. */
  pendencia: string | null
}

export type ColunaEmpresa = {
  id: string
  nome: string
  cor: string
  /** Mais de 6 pessoas: coluna dupla (PRD F-13). */
  dupla: boolean
  larguraPx: number
  pessoas: CartaoTv[]
}

/** No cartão de 448 px cabem 3 ferramentas (104 px cada); a terceira vira "+N" se sobrar. */
export const MAX_FERRAMENTAS_CARTAO = 3
export const LARGURA_COLUNA = 480
export const LARGURA_COLUNA_DUPLA = 980
export const ESPACO_COLUNAS = 24
/** Largura útil da área de conteúdo a 1920 px (protótipo). */
export const LARGURA_UTIL = 1840
/** Esmaecimento de 0,6 s; o conteúdo troca 650 ms depois de começar a sumir. */
export const TROCA_MS = 650

/** Agrupa as peças por tipo (×N), na ordem em que foram retiradas. */
export function agruparFerramentas(itens: ItemTv[]): FerramentaTv[] {
  const porTipo = new Map<string, FerramentaTv>()
  for (const i of [...itens].sort((a, b) => a.desde.localeCompare(b.desde))) {
    const atual = porTipo.get(i.tipo)
    if (atual) atual.quantidade++
    else porTipo.set(i.tipo, { tipo: i.tipo, icone: i.icone, quantidade: 1 })
  }
  return [...porTipo.values()]
}

/** Cabe tudo: mostra tudo. Senão, os primeiros tipos e "+N" com as peças que sobraram. */
export function limitarFerramentas(
  grupos: FerramentaTv[],
  max = MAX_FERRAMENTAS_CARTAO,
): { visiveis: FerramentaTv[]; mais: number } {
  if (grupos.length <= max) return { visiveis: grupos, mais: 0 }
  const visiveis = grupos.slice(0, max - 1)
  const mais = grupos.slice(max - 1).reduce((s, g) => s + g.quantidade, 0)
  return { visiveis, mais }
}

/** Cartões por pessoa (só quem está com ferramenta), em ordem alfabética (pt-BR). */
export function montarCartoes(painel: PainelTv, agora: Date): CartaoTv[] {
  const empresas = new Map(painel.empresas.map((e) => [e.id, e]))
  return painel.pessoas
    .filter((p) => p.itens.length > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((p) => {
      const todas = agruparFerramentas(p.itens)
      const { visiveis, mais } = limitarFerramentas(todas)
      const desdes = p.itens.map((i) => i.desde).sort()
      const maisAntiga = desdes[0]!
      const pendente = ehPendencia(maisAntiga, agora)
      const empresa = empresas.get(p.empresaId)
      return {
        id: p.id,
        nome: p.nome,
        funcao: p.funcao,
        empresa: { nome: empresa?.nome ?? '', cor: empresa?.cor ?? '#9CA3AF' },
        ferramentas: visiveis,
        mais,
        todas,
        retirouAs: pendente ? null : `Retirou às ${formatarHora(maisAntiga)}`,
        pendencia: pendente ? textoDesde(maisAntiga, agora) : null,
      }
    })
}

/** Páginas de cartões (12 por padrão). */
export function paginar<T>(itens: T[], porPagina: number): T[][] {
  const paginas: T[][] = []
  for (let i = 0; i < itens.length; i += porPagina) paginas.push(itens.slice(i, i + porPagina))
  return paginas
}

/** "Pessoas 13–24 de 30 · ordem alfabética". */
export function subtituloPagina(indice: number, porPagina: number, total: number): string {
  const ini = indice * porPagina + 1
  const fim = Math.min((indice + 1) * porPagina, total)
  return `Pessoas ${ini}–${fim} de ${total} · ordem alfabética`
}

/** Colunas por empresa, na ordem do cadastro (própria primeiro); só empresas com alguém. */
export function montarColunas(cartoes: CartaoTv[], painel: PainelTv): ColunaEmpresa[] {
  const porEmpresa = new Map<string, CartaoTv[]>()
  for (const p of painel.pessoas) {
    const cartao = cartoes.find((c) => c.id === p.id)
    if (!cartao) continue
    porEmpresa.set(p.empresaId, [...(porEmpresa.get(p.empresaId) ?? []), cartao])
  }
  return painel.empresas
    .filter((e) => porEmpresa.has(e.id))
    .map((e) => {
      const pessoas = (porEmpresa.get(e.id) ?? []).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR'),
      )
      const dupla = pessoas.length > 6
      return {
        id: e.id,
        nome: e.nome,
        cor: e.cor,
        dupla,
        larguraPx: dupla ? LARGURA_COLUNA_DUPLA : LARGURA_COLUNA,
        pessoas,
      }
    })
}

/** Quanto o trilho rola até a última coluna encostar na borda direita. */
export function deslocamentoMaximo(colunas: ColunaEmpresa[], larguraUtil = LARGURA_UTIL): number {
  if (colunas.length === 0) return 0
  const total = colunas.reduce((s, c) => s + c.larguraPx, 0) + (colunas.length - 1) * ESPACO_COLUNAS
  return Math.max(0, total - larguraUtil)
}

/** Duração da fase de colunas: pausa antes + rolagem + pausa depois. */
export function duracaoColunasMs(maxOff: number, config: ConfigTv): number {
  return config.pausaAntesMs + (maxOff / config.velocidadePxS) * 1000 + config.pausaDepoisMs
}

/**
 * Posição da rolagem num instante da fase de colunas: parada na pausa antes, linear na
 * velocidade configurada, parada no fim. `progresso` vai de 0 a 1 só durante a rolagem.
 */
export function posicaoRolagem(
  tMs: number,
  maxOff: number,
  config: ConfigTv,
): { deslocamento: number; progresso: number; terminou: boolean } {
  const rolando = Math.max(0, tMs - config.pausaAntesMs)
  const deslocamento = Math.min(maxOff, (rolando * config.velocidadePxS) / 1000)
  return {
    deslocamento,
    progresso: maxOff === 0 ? (tMs >= config.pausaAntesMs ? 1 : 0) : deslocamento / maxOff,
    terminou: tMs >= duracaoColunasMs(maxOff, config),
  }
}

export type Fase = { tipo: 'pagina'; indice: number } | { tipo: 'empresas' }

/** Páginas 1…N → colunas por empresa → volta à página 1 (loop infinito). */
export function proximaFase(fase: Fase, nPaginas: number): Fase {
  if (nPaginas === 0) return { tipo: 'pagina', indice: 0 }
  if (fase.tipo === 'empresas') return { tipo: 'pagina', indice: 0 }
  if (fase.indice + 1 < nPaginas) return { tipo: 'pagina', indice: fase.indice + 1 }
  return { tipo: 'empresas' }
}

/** Recarga diária da TV às 04:00 no fuso da obra (decisão do M8): quanto falta. */
export function msAteRecarga(agora: Date, hora = 4): number {
  const hoje = inicioDoDiaDaObra(agora).getTime() + hora * 60 * 60 * 1000
  const alvo = hoje > agora.getTime() ? hoje : hoje + 24 * 60 * 60 * 1000
  return alvo - agora.getTime()
}
