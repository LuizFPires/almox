'use server'

import { revalidatePath } from 'next/cache'
import { CHAVES_ICONE, ICONES_FERRAMENTA } from '@/components/icones-ferramenta'
import { listarEmpresas } from '@/lib/dados/empresas'
import { listarTipos } from '@/lib/dados/ferramentas'
import { listarPessoas } from '@/lib/dados/pessoas'
import { proximaCor } from '@/lib/dominio/cadastros'
import {
  validarImportacao,
  type Ocorrencia,
  type ResultadoImportacao,
} from '@/lib/dominio/importacao'
import { lerPlanilha } from '@/lib/planilhas/importacao'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

const TAMANHO_MAX = 5 * 1024 * 1024

export type Previa = {
  empresas: number
  pessoas: number
  ferramentas: number
  unidades: number
  erros: Ocorrencia[]
  avisos: Ocorrencia[]
}
export type RespostaImportacao =
  | { tipo: 'erro'; texto: string }
  | { tipo: 'previa'; previa: Previa }
  | { tipo: 'importado'; previa: Previa; pessoas: string[] }

async function preparar(
  form: FormData,
): Promise<{ erro: string } | { obra: string; resultado: ResultadoImportacao; cores: string[] }> {
  const { obraAtual } = await obterSessao()
  if (obraAtual.perfil !== 'engenheiro') return { erro: 'Só o engenheiro importa o cadastro.' }
  const arquivo = form.get('arquivo')
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: 'Escolha a planilha.' }
  if (arquivo.size > TAMANHO_MAX) return { erro: 'Planilha grande demais (máximo 5 MB).' }
  const planilha = await lerPlanilha(await arquivo.arrayBuffer())
  if ('erro' in planilha) return planilha
  const [empresas, pessoas, tipos] = await Promise.all([
    listarEmpresas(obraAtual.id),
    listarPessoas(obraAtual.id),
    listarTipos(obraAtual.id),
  ])
  const resultado = validarImportacao(
    planilha,
    {
      empresas: empresas.map((e) => e.nome),
      pessoas: pessoas.map((p) => ({ nome: p.nome, empresa: p.empresa?.nome ?? '' })),
      capacetes: pessoas.map((p) => p.nome_capacete),
      ferramentas: tipos.map((t) => t.nome),
      prefixos: tipos.map((t) => t.prefixo),
    },
    CHAVES_ICONE.map((chave) => ({ chave, nome: ICONES_FERRAMENTA[chave].nome })),
  )
  return { obra: obraAtual.id, resultado, cores: empresas.map((e) => e.cor) }
}

function previaDe(r: ResultadoImportacao): Previa {
  return {
    empresas: r.empresas.length,
    pessoas: r.pessoas.length,
    ferramentas: r.ferramentas.length,
    unidades: r.ferramentas.reduce((s, f) => s + f.quantidade, 0),
    erros: r.erros.slice(0, 200),
    avisos: r.avisos.slice(0, 200),
  }
}

/** Lê e valida a planilha: mostra o que vai entrar e os erros, sem gravar nada. */
export async function analisarPlanilha(form: FormData): Promise<RespostaImportacao> {
  const p = await preparar(form)
  if ('erro' in p) return { tipo: 'erro', texto: p.erro }
  return { tipo: 'previa', previa: previaDe(p.resultado) }
}

/** Valida de novo no servidor e grava tudo numa transação (ou nada, se houver erro). */
export async function importarPlanilha(form: FormData): Promise<RespostaImportacao> {
  const p = await preparar(form)
  if ('erro' in p) return { tipo: 'erro', texto: p.erro }
  const previa = previaDe(p.resultado)
  if (p.resultado.erros.length > 0) return { tipo: 'previa', previa }
  if (previa.empresas + previa.pessoas + previa.ferramentas === 0) {
    return { tipo: 'erro', texto: 'Nada novo para importar.' }
  }
  const cores = [...p.cores]
  const empresas = p.resultado.empresas.map((e) => {
    const cor = proximaCor(cores)
    cores.push(cor)
    return { ...e, cor }
  })
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('importar_cadastro', {
    p_obra: p.obra,
    p_dados: { empresas, pessoas: p.resultado.pessoas, ferramentas: p.resultado.ferramentas },
  })
  if (error || !data) {
    return { tipo: 'erro', texto: 'Não foi possível importar. Nada foi gravado. Tente de novo.' }
  }
  revalidatePath('/cadastros')
  const pessoas = ((data as { pessoas?: string[] }).pessoas ?? []).filter(
    (x) => typeof x === 'string',
  )
  return { tipo: 'importado', previa, pessoas }
}
