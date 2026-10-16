import type { Metadata } from 'next'
import Link from 'next/link'
import { Cabecalho } from '@/components/Cabecalho'
import { exigirAdministrador } from '@/lib/administracao'
import { situacaoObra } from './situacao'

export const metadata: Metadata = { title: 'Administração · Almox' }

export default async function PaginaAdministracao() {
  const { supabase } = await exigirAdministrador()
  const { data: obras, error } = await supabase.rpc('admin_listar_obras')
  if (error) throw new Error('Não foi possível carregar as obras. Tente de novo.')

  return (
    <>
      <Cabecalho titulo="Administração" subtitulo="Obras e engenheiros" voltarPara="/inicio" />
      <main className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-6">
        <Link
          href="/administracao/nova"
          className="flex min-h-14 items-center justify-center rounded-cartao bg-escuro text-lg font-bold text-white"
        >
          Nova obra
        </Link>
        <ul className="flex flex-col gap-2">
          {(obras ?? []).map((obra) => {
            const situacao = situacaoObra(obra)
            return (
              <li key={obra.id}>
                <Link
                  href={`/administracao/obra/${obra.id}`}
                  className="flex min-h-16 flex-col justify-center gap-0.5 rounded-cartao border border-borda bg-cartao px-4 py-3"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-bold">{obra.nome}</span>
                    <span className={`text-sm font-semibold ${situacao.classe}`}>
                      {situacao.rotulo}
                    </span>
                  </span>
                  <span className="text-sm text-texto-2">
                    {obra.engenheiros === 0
                      ? 'Sem engenheiro'
                      : `${obra.engenheiros} engenheiro${obra.engenheiros > 1 ? 's' : ''}`}
                    {' · '}
                    {obra.acessos} acesso{obra.acessos === 1 ? '' : 's'}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </main>
    </>
  )
}
