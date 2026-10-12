import { describe, expect, it } from 'vitest'
import {
  agruparFerramentas,
  deslocamentoMaximo,
  limitarFerramentas,
  montarCartoes,
  montarColunas,
  msAteRecarga,
  paginar,
  posicaoRolagem,
  proximaFase,
  subtituloPagina,
  type ConfigTv,
  type Fase,
  type PainelTv,
  type PessoaTv,
} from './tv'

const agora = new Date('2026-10-11T15:00:00Z') // 12:00 em São Paulo
const config: ConfigTv = {
  tempoPaginaS: 8,
  velocidadePxS: 45,
  pausaAntesMs: 2500,
  pausaDepoisMs: 3000,
  cartoesPorPagina: 12,
}
const empresas = [
  { id: 'c', nome: 'Construtora', cor: '#F4B400', propria: true },
  { id: 'a', nome: 'Armação Teixeira', cor: '#E86FA8', propria: false },
  { id: 'v', nome: 'Vazia', cor: '#000000', propria: false },
]
const item = (tipo: string, desde = '2026-10-11T10:05:00Z', codigo = 'X-01') => ({
  codigo,
  tipo,
  icone: tipo.toLowerCase(),
  desde,
})
const pessoa = (nome: string, empresaId: string, itens = [item('Pá')]): PessoaTv => ({
  id: nome,
  nome,
  apelido: nome.toUpperCase(),
  funcao: 'Servente',
  empresaId,
  itens,
})
const painel = (pessoas: PessoaTv[]): PainelTv => ({
  agora: agora.toISOString(),
  obra: 'Obra',
  config,
  empresas,
  pessoas,
})

describe('cartão da pessoa', () => {
  it('agrupa por tipo com ×N, na ordem de retirada', () => {
    expect(
      agruparFerramentas([
        item('Pá', '2026-10-11T10:00:00Z', 'PA-01'),
        item('Martelo', '2026-10-11T09:00:00Z', 'MAR-01'),
        item('Pá', '2026-10-11T11:00:00Z', 'PA-02'),
      ]),
    ).toEqual([
      { tipo: 'Martelo', icone: 'martelo', quantidade: 1 },
      { tipo: 'Pá', icone: 'pá', quantidade: 2 },
    ])
  })

  it('até 3 tipos aparecem; acima disso, 2 tipos e "+N" com as peças que sobraram', () => {
    const g = (tipo: string, quantidade = 1) => ({ tipo, icone: 'pa', quantidade })
    expect(limitarFerramentas([g('A'), g('B'), g('C')])).toEqual({
      visiveis: [g('A'), g('B'), g('C')],
      mais: 0,
    })
    expect(limitarFerramentas([g('A'), g('B'), g('C', 2), g('D')])).toEqual({
      visiveis: [g('A'), g('B')],
      mais: 3,
    })
  })

  it('"Retirou às" a primeira retirada de hoje; pendência mostra o desde da mais antiga', () => {
    const [hoje, ontem] = montarCartoes(
      painel([
        pessoa('Ana', 'c', [
          item('Pá', '2026-10-11T10:05:00Z'),
          item('Pá', '2026-10-11T12:00:00Z'),
        ]),
        pessoa('Raimundo', 'c', [item('Martelete', '2026-10-10T19:40:00Z')]),
      ]),
      agora,
    )
    expect(hoje?.retirouAs).toBe('Retirou às 07:05')
    expect(hoje?.pendencia).toBeNull()
    expect(ontem?.retirouAs).toBeNull()
    expect(ontem?.pendencia).toBe('desde ontem 16:40')
  })

  it('ordem alfabética pt-BR e empresa com a cor do cadastro', () => {
    const cartoes = montarCartoes(
      painel([pessoa('Zeca', 'c'), pessoa('Ângelo', 'a'), pessoa('Bruno', 'c')]),
      agora,
    )
    expect(cartoes.map((c) => c.nome)).toEqual(['Ângelo', 'Bruno', 'Zeca'])
    expect(cartoes[0]?.empresa).toEqual({ nome: 'Armação Teixeira', cor: '#E86FA8' })
  })
})

describe('loop', () => {
  const trinta = Array.from({ length: 30 }, (_, i) =>
    pessoa(`Pessoa ${String(i + 1).padStart(2, '0')}`, i < 11 ? 'c' : 'a'),
  )

  it('30 pessoas: 3 páginas (12, 12, 6) → colunas por empresa → volta à página 1', () => {
    const paginas = paginar(montarCartoes(painel(trinta), agora), 12)
    expect(paginas.map((p) => p.length)).toEqual([12, 12, 6])
    let fase: Fase = { tipo: 'pagina', indice: 0 }
    const sequencia: string[] = []
    for (let i = 0; i < 5; i++) {
      sequencia.push(fase.tipo === 'pagina' ? `p${fase.indice + 1}` : 'empresas')
      fase = proximaFase(fase, paginas.length)
    }
    expect(sequencia).toEqual(['p1', 'p2', 'p3', 'empresas', 'p1'])
  })

  it('subtítulo da página', () => {
    expect(subtituloPagina(1, 12, 30)).toBe('Pessoas 13–24 de 30 · ordem alfabética')
    expect(subtituloPagina(2, 12, 30)).toBe('Pessoas 25–30 de 30 · ordem alfabética')
  })

  it('colunas: só empresas com alguém, dupla com mais de 6 pessoas', () => {
    const cartoes = montarCartoes(painel(trinta), agora)
    const colunas = montarColunas(cartoes, painel(trinta))
    expect(colunas.map((c) => [c.nome, c.pessoas.length, c.dupla, c.larguraPx])).toEqual([
      ['Construtora', 11, true, 980],
      ['Armação Teixeira', 19, true, 980],
    ])
    // 980 + 24 + 980 = 1984 → rola 144 px até a última coluna encostar na borda
    expect(deslocamentoMaximo(colunas)).toBe(144)
  })

  it('rolagem: parada 2,5 s, 45 px/s, parada 3 s no fim', () => {
    expect(posicaoRolagem(1000, 450, config)).toEqual({
      deslocamento: 0,
      progresso: 0,
      terminou: false,
    })
    expect(posicaoRolagem(2500 + 5000, 450, config).deslocamento).toBe(225)
    expect(posicaoRolagem(2500 + 10000, 450, config)).toEqual({
      deslocamento: 450,
      progresso: 1,
      terminou: false,
    })
    expect(posicaoRolagem(2500 + 10000 + 3000, 450, config).terminou).toBe(true)
  })

  it('tudo cabe na tela: fica parado só as duas pausas', () => {
    expect(posicaoRolagem(5499, 0, config).terminou).toBe(false)
    expect(posicaoRolagem(5500, 0, config).terminou).toBe(true)
  })

  it('ninguém com ferramenta: fica na página vazia', () => {
    expect(proximaFase({ tipo: 'pagina', indice: 0 }, 0)).toEqual({ tipo: 'pagina', indice: 0 })
  })
})

describe('recarga diária', () => {
  it('às 04:00 de São Paulo', () => {
    // 12:00 em SP → próximas 04:00 = 07:00Z do dia seguinte
    expect(msAteRecarga(agora)).toBe(16 * 60 * 60 * 1000)
    // 03:30 em SP → falta meia hora
    expect(msAteRecarga(new Date('2026-10-11T06:30:00Z'))).toBe(30 * 60 * 1000)
  })
})
