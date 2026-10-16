import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { ErroFormulario } from '@/components/Formulario'
import { exigirAdministrador } from '@/lib/administracao'
import { rotuloPerfil } from '@/lib/dominio/permissoes'
import { mudarSituacao } from '../../acoes'
import { FormObra } from '../../FormObra'
import { situacaoObra } from '../../situacao'
import { FormEngenheiro } from './FormEngenheiro'
import { SenhaNovaAdmin } from './SenhaNovaAdmin'

export const metadata: Metadata = { title: 'Obra · Administração · Almox' }

const CLASSE_DETALHE = 'rounded-cartao bg-cartao px-4 py-2'
const CLASSE_RESUMO = 'flex min-h-toque cursor-pointer items-center font-semibold'

export default async function PaginaObraAdmin({
  params,
  searchParams,
}: PageProps<'/administracao/obra/[obraId]'>) {
  const { obraId } = await params
  const { nova, erro } = (await searchParams) as { nova?: string; erro?: string }
  const { supabase, usuario } = await exigirAdministrador()
  if (!/^[0-9a-f-]{36}$/i.test(obraId)) notFound()
  const [{ data: obras, error: erroObras }, { data: acessos, error: erroAcessos }] =
    await Promise.all([
      supabase.rpc('admin_listar_obras'),
      supabase.rpc('admin_listar_acessos', { p_obra: obraId }),
    ])
  if (erroObras || erroAcessos) throw new Error('Não foi possível carregar a obra. Tente de novo.')
  const obra = (obras ?? []).find((o) => o.id === obraId)
  if (!obra) notFound()
  const situacao = situacaoObra(obra)
  const semEngenheiro = obra.engenheiros === 0

  const botaoSituacao = (valor: string, rotulo: string, variante: 'secundaria' | 'perigo') => (
    <form action={mudarSituacao}>
      <input type="hidden" name="obra_id" value={obra.id} />
      <input type="hidden" name="situacao" value={valor} />
      <Botao type="submit" variante={variante} larguraTotal>
        {rotulo}
      </Botao>
    </form>
  )

  return (
    <>
      <Cabecalho titulo={obra.nome} subtitulo={situacao.rotulo} voltarPara="/administracao" />
      <main className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-8">
        <ErroFormulario
          mensagem={erro ? 'Não foi possível mudar a situação. Tente de novo.' : undefined}
        />

        <details className={CLASSE_DETALHE} open={semEngenheiro}>
          <summary className={CLASSE_RESUMO}>
            {semEngenheiro ? 'Ligar o engenheiro da obra' : 'Ligar outro engenheiro'}
          </summary>
          {nova && semEngenheiro && (
            <p className="pb-2 text-sm text-texto-2">
              Obra criada. Falta o engenheiro: ele dá os demais acessos.
            </p>
          )}
          <FormEngenheiro obraId={obra.id} />
        </details>

        <section className="flex flex-col gap-2" aria-labelledby="titulo-acessos">
          <h2 id="titulo-acessos" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
            ACESSOS ({(acessos ?? []).length})
          </h2>
          {(acessos ?? []).map((a) => (
            <details key={a.usuario_id} className={CLASSE_DETALHE}>
              <summary className="flex min-h-toque cursor-pointer flex-col justify-center py-1">
                <span className="font-semibold">{a.nome || a.email}</span>
                <span className="text-sm text-texto-2">
                  {rotuloPerfil(a.perfil, a.empresa)} · {a.email}
                </span>
              </summary>
              {a.usuario_id === usuario.id ? (
                <p className="pb-3 text-sm text-texto-2">É você: troque a sua senha em Conta.</p>
              ) : (
                <SenhaNovaAdmin obraId={obra.id} usuarioId={a.usuario_id} />
              )}
            </details>
          ))}
          <p className="text-sm text-texto-2">
            Perfil e remoção de acesso ficam com o engenheiro, em Cadastros › Acessos da obra.
          </p>
        </section>

        <details className={CLASSE_DETALHE}>
          <summary className={CLASSE_RESUMO}>Nome e endereço</summary>
          <div className="pb-3">
            <FormObra obra={obra} />
          </div>
        </details>

        <details className={CLASSE_DETALHE}>
          <summary className={CLASSE_RESUMO}>Situação da obra</summary>
          <div className="flex flex-col gap-3 pb-3">
            <p className="text-sm text-texto-2">
              Desativada ou encerrada, a obra some do app de todos e para o fechamento das 23:59.
              Nada é apagado. Encerrar também marca a data que conta o prazo de guarda dos dados
              (LGPD).
            </p>
            {obra.ativa ? (
              <>
                {botaoSituacao('desativada', 'Desativar obra', 'secundaria')}
                {botaoSituacao('encerrada', 'Encerrar obra', 'perigo')}
              </>
            ) : (
              <>
                {botaoSituacao('ativa', 'Reativar obra', 'secundaria')}
                {!obra.encerrada_em && botaoSituacao('encerrada', 'Encerrar obra', 'perigo')}
              </>
            )}
          </div>
        </details>
      </main>
    </>
  )
}
