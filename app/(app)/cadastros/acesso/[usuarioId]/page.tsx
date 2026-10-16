import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { ErroFormulario } from '@/components/Formulario'
import { listarAcessos } from '@/lib/dados/acessos'
import { listarEmpresas } from '@/lib/dados/empresas'
import { obterSessao } from '@/lib/sessao'
import { podeGerarNovaSenha } from '@/lib/dominio/nova-senha'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { alterarAcesso, removerAcesso } from '../acoes'
import { CamposPerfil } from '../CamposPerfil'
import { NovaSenhaProvisoria } from './NovaSenhaProvisoria'

export const metadata: Metadata = { title: 'Acesso · Almox' }

const ERROS = {
  perfil: 'Escolha um perfil válido.',
  empresa: 'Consulta restrita só pode ser de empreiteira.',
  salvar: 'Não foi possível alterar o acesso. Tente de novo.',
  remover: 'Não foi possível remover o acesso. Tente de novo.',
  ultimo: 'A obra precisa de pelo menos um engenheiro. Dê o perfil a outra pessoa antes.',
} as const

export default async function PaginaAcesso({
  params,
  searchParams,
}: PageProps<'/cadastros/acesso/[usuarioId]'>) {
  const { usuarioId } = await params
  const { erro } = (await searchParams) as { erro?: keyof typeof ERROS }
  const { obraAtual, usuario } = await obterSessao()
  const [acessos, empresas] = await Promise.all([
    listarAcessos(obraAtual.id),
    listarEmpresas(obraAtual.id),
  ])
  const acesso = acessos.find((a) => a.usuario_id === usuarioId)
  // O próprio vínculo não se altera por aqui (evita deixar a obra sem engenheiro).
  if (!acesso || acesso.usuario_id === usuario.id) notFound()
  // Senha nova pelo engenheiro (primeiro acesso perdido ou senha esquecida): mesma regra da ação.
  const admin = criarClienteAdmin()
  const [{ data: login }, { data: vinculos }] = await Promise.all([
    admin.auth.admin.getUserById(acesso.usuario_id),
    admin.from('usuario_obra').select('obra_id').eq('usuario_id', acesso.usuario_id),
  ])
  const senhaPendente = Boolean(login.user?.app_metadata?.trocar_senha)
  const novaSenha = podeGerarNovaSenha(
    {
      senhaPendente,
      perfil: acesso.perfil,
      obras: (vinculos ?? []).map((v) => v.obra_id),
    },
    obraAtual.id,
  )

  return (
    <>
      <Cabecalho
        titulo={acesso.nome || acesso.email}
        subtitulo={acesso.email}
        voltarPara="/cadastros/usuarios"
      />
      <form action={alterarAcesso} className="flex flex-col gap-5 px-5 pt-2 pb-4">
        <ErroFormulario mensagem={erro ? ERROS[erro] : undefined} />
        <input type="hidden" name="usuario_id" value={acesso.usuario_id} />
        <CamposPerfil
          perfil={acesso.perfil}
          empresaId={acesso.empresa_id}
          empreiteiras={empresas
            .filter((e) => e.tipo === 'empreiteira')
            .map(({ id, nome }) => ({ id, nome }))}
        />
        <Botao type="submit" tamanho="g" larguraTotal>
          Salvar perfil
        </Botao>
      </form>
      {novaSenha.pode ? (
        <details className="mx-5 mb-3 rounded-cartao bg-cartao px-4 py-2">
          <summary className="flex min-h-toque cursor-pointer items-center font-semibold">
            {senhaPendente
              ? 'Ainda não entrou: gerar nova senha do primeiro acesso'
              : 'Esqueceu a senha: gerar uma senha nova'}
          </summary>
          <NovaSenhaProvisoria usuarioId={acesso.usuario_id} />
        </details>
      ) : (
        <p className="mx-5 mb-3 text-sm text-texto-2">{novaSenha.motivo}</p>
      )}
      <details className="mx-5 mb-8 rounded-cartao bg-cartao px-4 py-2">
        <summary className="flex min-h-toque cursor-pointer items-center font-semibold text-erro">
          Remover acesso a esta obra
        </summary>
        <form action={removerAcesso} className="flex flex-col gap-3 pb-3">
          <input type="hidden" name="usuario_id" value={acesso.usuario_id} />
          <p className="text-sm text-texto-2">
            A pessoa deixa de entrar nesta obra. O que ela lançou continua no histórico.
          </p>
          <Botao type="submit" variante="perigo" larguraTotal>
            Remover acesso
          </Botao>
        </form>
      </details>
    </>
  )
}
