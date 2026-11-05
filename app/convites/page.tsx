import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { responder } from './acoes'
import { sair } from '../login/acoes'
async function Lista({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const supabase = await criarClienteServidor()
  const { data: usuario } = await supabase.auth.getUser()
  if (!usuario.user) redirect('/login')
  const { data, error } = await supabase.rpc('meus_convites')
  const params = await searchParams
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-5 p-5">
      <h1 className="text-2xl font-bold">Convites</h1>
      <p>Você terá acesso é obra depois de aceitar o convite do responsável.</p>
      {params.erro && (
        <p role="alert">Não foi possível responder ao convite. Atualize e tente novamente.</p>
      )}
      {error ? (
        <p role="alert">Não foi possível carregar os convites.</p>
      ) : !data?.length ? (
        <p>Nenhum convite pendente. Peça ao dono da obra um convite para {usuario.user.email}.</p>
      ) : (
        data.map((c) => (
          <form key={c.id} action={responder} className="rounded border p-4">
            <h2 className="font-bold">{c.obra}</h2>
            <p>Perfil: {c.perfil}</p>
            <input type="hidden" name="id" value={c.id} />
            <button className="min-h-12 px-4" name="resposta" value="aceitar">
              Aceitar
            </button>
            <button className="min-h-12 px-4" name="resposta" value="recusar">
              Recusar
            </button>
          </form>
        ))
      )}
      <Link href="/inicio">Minhas obras</Link>
      <form action={sair}>
        <button>Sair</button>
      </form>
    </main>
  )
}
export default function Pagina({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <Lista searchParams={searchParams} />
    </Suspense>
  )
}
