import 'server-only'
import { valorIndenizacao } from '@/lib/dominio/avaria'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type DetalheAvaria = {
  id: string
  motivo: string
  detalhes: string | null
  /** Quando a avaria foi registrada (na devolução). */
  quando: string
  movimentoId: string
  codigo: string
  tipo: string
  icone: string
  pessoa: { id: string; nome: string; empresa: string | null } | null
  /** URL assinada da foto (Storage privado), válida por 1 hora; null se apagada pela retenção. */
  foto: string | null
  /** Indenização em centavos: ajustada pelo engenheiro ou, sem ajuste, a reposição. */
  valor: number
  valorReposicao: number
  ajustado: boolean
  /** Último ajuste (só o engenheiro lê `alteracao`). */
  ajuste: { quando: string; por: string | null } | null
}

type Linha = {
  id: string
  motivo: string
  detalhes: string | null
  criado_em: string
  foto_path: string
  foto_apagada_em: string | null
  valor_indenizacao: number | null
  movimento_id: string
  unidade: {
    codigo: string
    tipo: { nome: string; icone: string; valor_reposicao: number } | null
  } | null
  movimento: {
    pessoa: { id: string; nome: string; empresa: { nome: string } | null } | null
  } | null
}

/** Uma avaria da obra com foto, quem devolveu e a indenização (RLS: quem vê a pessoa vê a avaria). */
export async function buscarAvaria(obraId: string, id: string): Promise<DetalheAvaria | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('avaria')
    .select(
      'id, motivo, detalhes, criado_em, foto_path, foto_apagada_em, valor_indenizacao, movimento_id, ' +
        'unidade:unidade!avaria_unidade_id_obra_id_fkey (codigo, ' +
        'tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome, icone, valor_reposicao)), ' +
        'movimento:movimento!avaria_movimento_id_obra_id_fkey (pessoa:pessoa!movimento_pessoa_id_obra_id_fkey (id, nome, ' +
        'empresa:empresa!pessoa_empresa_id_obra_id_fkey (nome)))',
    )
    .eq('obra_id', obraId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<Linha, { merge: false }>()
  if (error) throw new Error('Não foi possível carregar a avaria.')
  if (!data || !data.unidade?.tipo) return null

  const [foto, ajuste] = await Promise.all([
    data.foto_apagada_em
      ? Promise.resolve(null)
      : supabase.storage
          .from('avarias')
          .createSignedUrl(data.foto_path, 3600)
          .then((r) => r.data?.signedUrl ?? null),
    supabase
      .from('alteracao')
      .select('criado_em, usuario:usuario!alteracao_usuario_id_fkey (nome)')
      .eq('registro_id', id)
      .eq('campo', 'valor_indenizacao')
      .order('criado_em', { ascending: false })
      .limit(1)
      .overrideTypes<{ criado_em: string; usuario: { nome: string } | null }[], { merge: false }>()
      .then((r) => r.data?.[0] ?? null),
  ])
  const { centavos, ajustado } = valorIndenizacao({
    valorReposicao: data.unidade.tipo.valor_reposicao,
    valorIndenizacao: data.valor_indenizacao,
  })
  const pessoa = data.movimento?.pessoa ?? null
  return {
    id: data.id,
    motivo: data.motivo,
    detalhes: data.detalhes,
    quando: data.criado_em,
    movimentoId: data.movimento_id,
    codigo: data.unidade.codigo,
    tipo: data.unidade.tipo.nome,
    icone: data.unidade.tipo.icone,
    pessoa: pessoa
      ? { id: pessoa.id, nome: pessoa.nome, empresa: pessoa.empresa?.nome ?? null }
      : null,
    foto,
    valor: centavos,
    valorReposicao: data.unidade.tipo.valor_reposicao,
    ajustado,
    ajuste: ajuste ? { quando: ajuste.criado_em, por: ajuste.usuario?.nome ?? null } : null,
  }
}
