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
