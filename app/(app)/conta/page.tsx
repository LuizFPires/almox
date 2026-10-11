import type { Metadata } from 'next'
import Link from 'next/link'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { rotuloPerfil } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { sair } from '../../login/acoes'
import { escolherObra } from './acoes'

export const metadata: Metadata = { title: 'Conta · Almox' }

export default async function PaginaConta() {
  const { usuario, obras, obraAtual } = await obterSessao()

  return (
    <>
      <Cabecalho titulo="Conta e obra" voltarPara="/inicio" />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
        <Cartao className="flex flex-col gap-0.5">
          <span className="text-lg font-bold">{usuario.nome || usuario.email}</span>
          <span className="text-sm text-texto-2">{usuario.email}</span>
        </Cartao>

        <section className="flex flex-col gap-2" aria-labelledby="titulo-obras">
          <h2 id="titulo-obras" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
            {obras.length > 1 ? 'ESCOLHA A OBRA' : 'OBRA'}
          </h2>
          {obras.map((obra) => {
            const atual = obra.id === obraAtual.id
            return (
              <form key={obra.id} action={escolherObra}>
                <input type="hidden" name="obra" value={obra.id} />
                <button
                  type="submit"
                  aria-pressed={atual}
                  className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-cartao border bg-cartao px-4 py-3 text-left ${
                    atual ? 'border-2 border-escuro' : 'border-borda'
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-bold">{obra.nome}</span>
                    <span className="text-sm text-texto-2">
                      {rotuloPerfil(obra.perfil, obra.empresa?.nome)}
                    </span>
                  </span>
                  {atual && <span className="text-sm font-semibold text-sucesso">Em uso</span>}
                </button>
              </form>
            )
          })}
        </section>

        <Link
          href="/trocar-senha"
          className="flex min-h-toque items-center justify-center rounded-botao border border-borda bg-cartao font-semibold"
        >
          Trocar senha
        </Link>

        <form action={sair} className="mt-auto">
          <Botao type="submit" variante="secundaria" tamanho="g" larguraTotal>
            Sair
          </Botao>
        </form>
      </main>
    </>
  )
}
