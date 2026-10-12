import 'server-only'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { emailConfigurado, enviarEmail } from './email'
import {
  emailAviso,
  emailCancelamento,
  notificacaoAviso,
  notificacaoCancelamento,
  notificacaoReaberto,
  emailReaberto,
  notificacaoOcorrencia,
  notificacaoResumoProprios,
  type Email,
  type ItemAviso,
  type Notificacao,
} from './mensagens'
import { enviarPush, type Inscricao } from './push'

type Dados = {
  tipo: 'aviso' | 'desconto_cancelado' | 'desconto_reaberto' | 'resumo_proprios' | 'ocorrencia'
  canal: 'email' | 'push'
  destino: string
  obra: string
  inscricoes?: Inscricao[]
  // aviso
  aviso?: string
  empresa?: string
  dono?: string | null
  encarregado?: string | null
  data?: string
  itens?: ItemAviso[]
  total?: number
  // cancelamento
  quando?: string
  motivo?: 'devolucao' | 'corrigido'
  devolvidas?: { pessoa: string; tipo: string; codigo: string; valor: number }[]
  emAberto?: number
  // resumo / ocorrência
  pessoas?: number
  pessoa?: string
}

/** Monta o e-mail ou a notificação do envio. */
export function montar(d: Dados): { email?: Email; notificacao?: Notificacao } {
  switch (d.tipo) {
    case 'aviso':
      return d.canal === 'email'
        ? {
            email: emailAviso({
              obra: d.obra,
              empresa: d.empresa ?? '',
              dono: d.dono ?? null,
              encarregado: d.encarregado ?? null,
              data: d.data ?? new Date().toISOString(),
              itens: d.itens ?? [],
              total: d.total ?? 0,
            }),
          }
        : { notificacao: notificacaoAviso(d.empresa ?? '', d.total ?? 0, d.aviso ?? '') }
    case 'desconto_cancelado': {
      const devolvidas = d.devolvidas ?? []
      return d.canal === 'email'
        ? {
            email: emailCancelamento({
              obra: d.obra,
              empresa: d.empresa ?? '',
              dono: d.dono ?? null,
              encarregado: d.encarregado ?? null,
              quando: d.quando ?? new Date().toISOString(),
              devolvidas,
              emAberto: d.emAberto ?? 0,
              motivo: d.motivo,
            }),
          }
        : {
            notificacao: notificacaoCancelamento(
              d.empresa ?? '',
              devolvidas.length,
              devolvidas.reduce((s, x) => s + x.valor, 0),
            ),
          }
    }
    case 'desconto_reaberto': {
      const devolvidas = d.devolvidas ?? []
      const dados = {
        obra: d.obra,
        empresa: d.empresa ?? '',
        dono: d.dono ?? null,
        encarregado: d.encarregado ?? null,
        quando: d.quando ?? new Date().toISOString(),
        devolvidas,
        emAberto: d.emAberto ?? 0,
      }
      return d.canal === 'email'
        ? { email: emailReaberto(dados) }
        : {
            notificacao: notificacaoReaberto(
              dados.empresa,
              devolvidas.reduce((s, x) => s + x.valor, 0),
            ),
          }
    }
    case 'resumo_proprios':
      return { notificacao: notificacaoResumoProprios(d.pessoas ?? 0) }
    case 'ocorrencia':
      return {
        notificacao: notificacaoOcorrencia(d.pessoa ?? '', d.quando ?? new Date().toISOString()),
      }
  }
}

/**
 * Processa a fila de envios: pega um lote (sem pegar o que outro processador pegou), manda e
 * marca. Falha fica na fila para nova tentativa (até 5). Sem provedor de e-mail, só as
 * notificações saem; os e-mails esperam. Nada de e-mail ou token em log.
 */
export async function processarEnvios(limite = 50): Promise<{ enviados: number; erros: number }> {
  const admin = criarClienteAdmin()
  const { data: lote, error } = await admin.rpc('pegar_envios', {
    p_limite: limite,
    ...(emailConfigurado() ? {} : { p_canais: ['push' as const] }),
  })
  if (error) throw new Error('Não foi possível ler a fila de envios.')
  let enviados = 0
  let erros = 0
  for (const envio of lote ?? []) {
    try {
      const { data } = await admin.rpc('dados_envio', { p_envio: envio.id })
      if (!data) throw new Error('dados do envio não encontrados')
      const d = data as unknown as Dados
      const { email, notificacao } = montar(d)
      let semDestino = false
      if (d.canal === 'email' && email) {
        // A mesma chave em nova tentativa: o Resend não manda duas vezes.
        await enviarEmail(d.destino, email, `envio-${envio.id}`)
      } else if (d.canal === 'push' && notificacao) {
        // Ninguém ativou notificação neste login: fica registrado como "sem destino".
        semDestino = (d.inscricoes ?? []).length === 0
        const { removidas } = await enviarPush(d.inscricoes ?? [], notificacao)
        for (const endpoint of removidas) {
          await admin.rpc('remover_inscricao_push', { p_endpoint: endpoint })
        }
      }
      const { error: erroConcluir } = await admin.rpc('concluir_envio', {
        p_envio: envio.id,
        p_ok: true,
        p_sem_destino: semDestino,
      })
      if (erroConcluir) throw new Error('não foi possível marcar o envio')
      enviados++
    } catch (e) {
      erros++
      await admin.rpc('concluir_envio', {
        p_envio: envio.id,
        p_ok: false,
        p_erro: e instanceof Error ? e.message : 'falha no envio',
      })
    }
  }
  return { enviados, erros }
}

/** Apaga fotos de avaria com mais de 24 h que nenhuma avaria usa (pendência do M6). */
export async function limparFotosOrfas(): Promise<number> {
  const admin = criarClienteAdmin()
  const { data: nomes, error } = await admin.rpc('fotos_orfas', { p_limite: 100 })
  if (error || !nomes?.length) return 0
  const { error: erroRemover } = await admin.storage.from('avarias').remove(nomes)
  return erroRemover ? 0 : nomes.length
}
