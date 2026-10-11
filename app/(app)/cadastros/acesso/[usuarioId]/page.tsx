import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { listarAcessos } from '@/lib/dados/acessos'
import { listarEmpresas } from '@/lib/dados/empresas'
import { obterSessao } from '@/lib/sessao'
import { alterarAcesso, removerAcesso } from '../acoes'
import { CamposPerfil } from '../CamposPerfil'

export const metadata: Metadata = { title: 'Acesso · Almox' }

export default async function PaginaAcesso({ params }: PageProps<'/cadastros/acesso/[usuarioId]'>) {
  const { usuarioId } = await params
  const { obraAtual, usuario } = await obterSessao()
  const [acessos, empresas] = await Promise.all([
    listarAcessos(obraAtual.id),
    listarEmpresas(obraAtual.id),
  ])
  const acesso = acessos.find((a) => a.usuario_id === usuarioId)
  // O próprio vínculo não se altera por aqui (evita deixar a obra sem engenheiro).
  if (!acesso || acesso.usuario_id === usuario.id) notFound()

  return (
    <>
      <Cabecalho
        titulo={acesso.nome || acesso.email}
        subtitulo={acesso.email}
        voltarPara="/cadastros/usuarios"
      />
      <form action={alterarAcesso} className="flex flex-col gap-5 px-5 pt-2 pb-4">
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
