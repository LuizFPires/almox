import { normalizarTexto } from '@/lib/formatos/texto'
import {
  lerValorReposicao,
  normalizarNomeCapacete,
  sugerirNomeCapacete,
  sugerirPrefixo,
  validarEmail,
  validarNomeCompleto,
  validarPrefixo,
} from './cadastros'

/**
 * Cadastro inicial do piloto por planilha (M11): valida as abas Empresas, Pessoas e Ferramentas
 * linha a linha contra o que a obra já tem. Nada é gravado com erro; repetidos são pulados.
 */

export const ABAS = {
  empresas: {
    nome: 'Empresas',
    colunas: [
      'Nome da empresa',
      'Tipo (Empreiteira ou Própria)',
      'Dono',
      'E-mail do dono',
      'E-mail do encarregado',
    ],
  },
  pessoas: {
    nome: 'Pessoas',
    colunas: ['Nome completo', 'Nome no capacete (opcional)', 'Função', 'Empresa'],
  },
  ferramentas: {
    nome: 'Ferramentas',
    colunas: [
      'Nome',
      'Ícone',
      'Prefixo do código (opcional)',
      'Valor de reposição (R$)',
      'Quantidade',
      'Alto valor (sim/não)',
    ],
  },
} as const

export type EmpresaImportada = {
  linha: number
  nome: string
  tipo: 'empreiteira' | 'propria'
  donoNome: string | null
  donoEmail: string | null
  encarregadoEmail: string | null
}
export type PessoaImportada = {
  linha: number
  nome: string
  nomeCapacete: string
  funcao: string
  empresa: string
}
export type FerramentaImportada = {
  linha: number
  nome: string
  icone: string
  prefixo: string
  valor: number
  quantidade: number
  altoValor: boolean
}
export type Ocorrencia = { aba: string; linha: number; texto: string }

export type ResultadoImportacao = {
  empresas: EmpresaImportada[]
  pessoas: PessoaImportada[]
  ferramentas: FerramentaImportada[]
  erros: Ocorrencia[]
  /** Linhas puladas (já cadastradas) — não impedem a importação. */
  avisos: Ocorrencia[]
}

export type Existentes = {
  empresas: string[]
  pessoas: { nome: string; empresa: string }[]
  capacetes: string[]
  ferramentas: string[]
  prefixos: string[]
}

/** Linhas das abas (sem o cabeçalho), cada célula já como texto. */
export type Planilha = Record<keyof typeof ABAS, string[][]>

const vazia = (l: string[]) => l.every((c) => !c.trim())
const limpo = (t: string | undefined) => (t ?? '').replace(/\s+/g, ' ').trim()
const chave = (t: string) => normalizarTexto(limpo(t))

export function validarImportacao(
  p: Planilha,
  existentes: Existentes,
  icones: readonly { chave: string; nome: string }[],
): ResultadoImportacao {
  const r: ResultadoImportacao = {
    empresas: [],
    pessoas: [],
    ferramentas: [],
    erros: [],
    avisos: [],
  }
  const erro = (aba: string, linha: number, texto: string) => r.erros.push({ aba, linha, texto })

  // Empresas ---------------------------------------------------------------------------------
  const empresasConhecidas = new Set(existentes.empresas.map(chave))
  const noArquivo = new Set<string>()
  p.empresas.forEach((l, i) => {
    const linha = i + 2
    if (vazia(l)) return
    const aba = ABAS.empresas.nome
    const nome = limpo(l[0])
    if (!nome) return erro(aba, linha, 'Falta o nome da empresa.')
    if (noArquivo.has(chave(nome))) return erro(aba, linha, `"${nome}" aparece duas vezes.`)
    noArquivo.add(chave(nome))
    if (empresasConhecidas.has(chave(nome))) {
      r.avisos.push({ aba, linha, texto: `"${nome}" já está cadastrada: pulada.` })
      return
    }
    const tipoTexto = chave(l[1] ?? '')
    const tipo =
      !tipoTexto || tipoTexto.startsWith('empreit')
        ? 'empreiteira'
        : tipoTexto.startsWith('propr')
          ? 'propria'
          : null
    if (!tipo) return erro(aba, linha, 'Tipo: use Empreiteira ou Própria.')
    const donoEmail = limpo(l[3]).toLowerCase()
    const encEmail = limpo(l[4]).toLowerCase()
    const e1 = validarEmail(donoEmail)
    const e2 = validarEmail(encEmail)
    if (e1) return erro(aba, linha, `E-mail do dono: ${e1}`)
    if (e2) return erro(aba, linha, `E-mail do encarregado: ${e2}`)
    r.empresas.push({
      linha,
      nome,
      tipo,
      donoNome: limpo(l[2]) || null,
      donoEmail: donoEmail || null,
      encarregadoEmail: encEmail || null,
    })
  })
  const empresasValidas = new Map<string, string>()
  for (const n of existentes.empresas) empresasValidas.set(chave(n), n)
  for (const e of r.empresas) empresasValidas.set(chave(e.nome), e.nome)

  // Pessoas ----------------------------------------------------------------------------------
  const capacetes = [...existentes.capacetes]
  const pessoasConhecidas = new Set(
    existentes.pessoas.map((x) => `${chave(x.nome)}|${chave(x.empresa)}`),
  )
  const pessoasNoArquivo = new Set<string>()
  p.pessoas.forEach((l, i) => {
    const linha = i + 2
    if (vazia(l)) return
    const aba = ABAS.pessoas.nome
    const nome = limpo(l[0])
    const e = validarNomeCompleto(nome)
    if (e) return erro(aba, linha, e)
    const empresa = empresasValidas.get(chave(l[3] ?? ''))
    if (!empresa)
      return erro(aba, linha, `Empresa "${limpo(l[3])}" não está na aba Empresas nem na obra.`)
    const funcao = limpo(l[2])
    if (!funcao) return erro(aba, linha, 'Falta a função.')
    const id = `${chave(nome)}|${chave(empresa)}`
    if (pessoasNoArquivo.has(id))
      return erro(aba, linha, `"${nome}" aparece duas vezes na mesma empresa.`)
    pessoasNoArquivo.add(id)
    if (pessoasConhecidas.has(id)) {
      r.avisos.push({ aba, linha, texto: `"${nome}" já está cadastrada em ${empresa}: pulada.` })
      return
    }
    const informado = normalizarNomeCapacete(l[1] ?? '')
    const nomeCapacete = informado || sugerirNomeCapacete(nome, capacetes)
    capacetes.push(nomeCapacete)
    r.pessoas.push({ linha, nome, nomeCapacete, funcao, empresa })
  })

  // Ferramentas ------------------------------------------------------------------------------
  const ferramentasConhecidas = new Set(existentes.ferramentas.map(chave))
  const prefixos = [...existentes.prefixos]
  const ferramentasNoArquivo = new Set<string>()
  p.ferramentas.forEach((l, i) => {
    const linha = i + 2
    if (vazia(l)) return
    const aba = ABAS.ferramentas.nome
    const nome = limpo(l[0])
    if (!nome) return erro(aba, linha, 'Falta o nome da ferramenta.')
    if (ferramentasNoArquivo.has(chave(nome)))
      return erro(aba, linha, `"${nome}" aparece duas vezes.`)
    ferramentasNoArquivo.add(chave(nome))
    if (ferramentasConhecidas.has(chave(nome))) {
      return erro(
        aba,
        linha,
        `"${nome}" já existe: para mais unidades, use Cadastros › Ferramentas.`,
      )
    }
    const iconeTexto = chave(l[1] ?? '')
    const icone = icones.find((c) => chave(c.chave) === iconeTexto || chave(c.nome) === iconeTexto)
    if (!icone)
      return erro(aba, linha, `Ícone inválido. Use: ${icones.map((c) => c.nome).join(', ')}.`)
    const prefixoInformado = limpo(l[2]).toUpperCase()
    const prefixo = prefixoInformado || sugerirPrefixo(nome, prefixos)
    const ep = validarPrefixo(prefixo)
    if (ep) return erro(aba, linha, `Prefixo: ${ep}`)
    if (prefixos.includes(prefixo)) return erro(aba, linha, `Prefixo ${prefixo} já usado.`)
    const valor = lerValorReposicao(limpo(l[3]))
    if ('erro' in valor) return erro(aba, linha, `Valor: ${valor.erro}`)
    const quantidade = Number(limpo(l[4]))
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 200) {
      return erro(aba, linha, 'Quantidade: um número inteiro de 1 a 200.')
    }
    const alto = chave(l[5] ?? '')
    if (alto && !['sim', 'nao', 's', 'n'].includes(alto))
      return erro(aba, linha, 'Alto valor: sim ou não.')
    prefixos.push(prefixo)
    r.ferramentas.push({
      linha,
      nome,
      icone: icone.chave,
      prefixo,
      valor: valor.centavos,
      quantidade,
      altoValor: alto === 'sim' || alto === 's',
    })
  })
  return r
}
