import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type Lancamento = {
  id: string
  tipo: 'retirada' | 'devolucao' | 'estorno'
  via: 'qr' | 'manual'
  criado_em: string
  obs: string | null
  estorno_de: string | null
  pessoa: { id: string; nome: string } | null
  usuario: { nome: string } | null
  itens: {
    unidade_id: string
    avariada: boolean
    unidade: { codigo: string; tipo: { nome: string } | null } | null
  }[]
}

export type Estorno = {
  id: string
  criado_em: string
  obs: string | null
  usuario: { nome: string } | null
}

export type FotoAvaria = {
  unidade_id: string
  motivo: string
  /** Texto livre da avaria (opcional). */
  detalhes: string | null
  url: string | null
  /** Foto apagada pela retenção de dados (LGPD, M10). */
  apagada: boolean
}

/** Um lançamento com itens, quem lançou, estorno (se houver) e as fotos das avarias. */
export async function buscarLancamento(obraId: string, id: string) {
  const supabase = await criarClienteServidor()
  const [mov, estornos, avarias] = await Promise.all([
    supabase
      .from('movimento')
      .select(
        'id, tipo, via, criado_em, obs, estorno_de, pessoa:pessoa!movimento_pessoa_id_obra_id_fkey (id, nome), ' +
          'usuario:usuario!movimento_usuario_id_fkey (nome), ' +
          'itens:movimento_item!movimento_item_movimento_id_obra_id_fkey (unidade_id, avariada, ' +
          'unidade:unidade!movimento_item_unidade_id_obra_id_fkey (codigo, tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome)))',
      )
      .eq('obra_id', obraId)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<Lancamento, { merge: false }>(),
    supabase
      .from('movimento')
      .select('id, criado_em, obs, usuario:usuario!movimento_usuario_id_fkey (nome)')
      .eq('obra_id', obraId)
      .eq('estorno_de', id)
      .overrideTypes<Estorno[], { merge: false }>(),
    supabase
      .from('avaria')
      .select('unidade_id, motivo, detalhes, foto_path, foto_apagada_em')
      .eq('obra_id', obraId)
      .eq('movimento_id', id),
  ])
  if (mov.error || estornos.error || avarias.error) {
    throw new Error('Não foi possível carregar o lançamento.')
  }
  if (!mov.data) return null
  // Fotos privadas: URL assinada por 10 minutos (a política do Storage só deixa quem lança).
  let fotos: FotoAvaria[] = []
  if (avarias.data.length > 0) {
    const existentes = avarias.data.filter((a) => !a.foto_apagada_em).map((a) => a.foto_path)
    const { data: urls } = existentes.length
      ? await supabase.storage.from('avarias').createSignedUrls(existentes, 600)
      : { data: [] }
    const porCaminho = new Map((urls ?? []).map((x) => [x.path, x.signedUrl]))
    fotos = avarias.data.map((a) => ({
      unidade_id: a.unidade_id,
      motivo: a.motivo,
      detalhes: a.detalhes,
      url: porCaminho.get(a.foto_path) ?? null,
      apagada: Boolean(a.foto_apagada_em),
    }))
  }
  return { lancamento: mov.data, estorno: estornos.data[0] ?? null, fotos }
}

export type PecaEmManutencao = {
  id: string
  codigo: string
  tipo: string
  motivo: string | null
  detalhes: string | null
  quando: string | null
  devolvidaPor: string | null
  foto: string | null
}

type UnidadeManut = {
  id: string
  codigo: string
  tipo: { nome: string } | null
  avarias: {
    motivo: string
    detalhes: string | null
    foto_path: string
    criado_em: string
    movimento: { pessoa: { nome: string } | null } | null
  }[]
}

/** Peças em manutenção, com a avaria mais recente de cada uma (foto, motivo, quem devolveu). */
export async function pecasEmManutencao(obraId: string): Promise<PecaEmManutencao[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('unidade')
    .select(
      'id, codigo, tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome), ' +
        'avarias:avaria!avaria_unidade_id_obra_id_fkey (motivo, detalhes, foto_path, criado_em, ' +
        'movimento:movimento!avaria_movimento_id_obra_id_fkey (pessoa:pessoa!movimento_pessoa_id_obra_id_fkey (nome)))',
    )
    .eq('obra_id', obraId)
    .eq('status', 'manutencao')
    .order('codigo')
    .overrideTypes<UnidadeManut[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar a manutenção.')
  const ultimas = data.map((u) => ({
    u,
    a: [...u.avarias].sort((x, y) => y.criado_em.localeCompare(x.criado_em))[0] ?? null,
  }))
  const caminhos = ultimas.flatMap(({ a }) => (a ? [a.foto_path] : []))
  const { data: urls } = caminhos.length
    ? await supabase.storage.from('avarias').createSignedUrls(caminhos, 600)
    : { data: [] }
  const porCaminho = new Map((urls ?? []).map((x) => [x.path, x.signedUrl]))
  return ultimas.map(({ u, a }) => ({
    id: u.id,
    codigo: u.codigo,
    tipo: u.tipo?.nome ?? '',
    motivo: a?.motivo ?? null,
    detalhes: a?.detalhes ?? null,
    quando: a?.criado_em ?? null,
    devolvidaPor: a?.movimento?.pessoa?.nome ?? null,
    foto: a ? (porCaminho.get(a.foto_path) ?? null) : null,
  }))
}
