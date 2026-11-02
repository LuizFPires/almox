import type { Metadata } from 'next'
import Link from 'next/link'
import { IconeInterface } from '@/components/IconeInterface'
import { listarAcessos, listarContasSemObra } from '@/lib/dados/acessos'
import { rotuloPerfil } from '@/lib/dominio/permissoes'
import { formatarData } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Acessos · Cadastros · Almox' }

export default async function PaginaAcessos() {
  const { obraAtual, usuario } = await obterSessao()
  const [acessos, aguardando] = await Promise.all([
    listarAcessos(obraAtual.id),
    listarContasSemObra(obraAtual.id),
  ])

  return (
    <>
      {aguardando.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="titulo-aguardando">
          <h2 id="titulo-aguardando" className="text-[13px] font-bold tracking-[1.2px] text-aviso">
            CONTAS AGUARDANDO OBRA · {aguardando.length}
          </h2>
          <p className="text-[13px] text-texto-2">
            Criaram a conta no Almox e esperam que alguém as libere. Toque para dar acesso a esta
            obra.
          </p>
          {aguardando.map((c) => (
            <Link
              key={c.usuario_id}
              href={`/cadastros/acesso/novo?conta=${encodeURIComponent(c.email)}&nome=${encodeURIComponent(c.nome)}`}
              className="flex min-h-16 items-center gap-3 rounded-cartao border-[1.5px] border-aviso bg-aviso-claro px-3.5 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-bold">{c.nome || c.email}</span>
                <span className="truncate text-[13px] text-texto-2">
                  {c.email} · conta criada em {formatarData(c.criado_em)}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-escuro px-2.5 py-1 text-[13px] font-semibold text-white">
                Dar acesso
              </span>
            </Link>
          ))}
        </section>
      )}
      <p className="text-[13px] text-texto-2">Quem entra no Almox nesta obra</p>
      {acessos.map((a) => {
        const voce = a.usuario_id === usuario.id
        const conteudo = (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base font-bold">
                {a.nome || a.email}
                {voce && (
                  <span className="ml-1.5 text-[13px] font-medium text-texto-2">(você)</span>
                )}
              </span>
              <span className="truncate text-[13px] text-texto-2">{a.email}</span>
            </span>
            <span className="shrink-0 rounded-full bg-sutil px-2.5 py-1 text-[13px] font-semibold">
              {rotuloPerfil(a.perfil, a.empresa_nome)}
            </span>
          </>
        )
        return voce ? (
          <div
            key={a.usuario_id}
            className="flex min-h-16 items-center gap-3 rounded-cartao bg-cartao px-3.5 py-3"
          >
            {conteudo}
          </div>
        ) : (
          <Link
            key={a.usuario_id}
            href={`/cadastros/acesso/${a.usuario_id}`}
            className="flex min-h-16 items-center gap-3 rounded-cartao bg-cartao px-3.5 py-3"
          >
            {conteudo}
            <IconeInterface nome="chevron-right" tamanho={18} className="shrink-0 text-texto-2" />
          </Link>
        )
      })}
    </>
  )
}
