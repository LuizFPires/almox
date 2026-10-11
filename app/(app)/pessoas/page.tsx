import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { listarPessoas } from '@/lib/dados/pessoas'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { BuscaPessoas } from './BuscaPessoas'

export const metadata: Metadata = { title: 'Sem QR · Almox' }

/** Lista manual (F-08): sem capacete ou QR ilegível. Só para quem lança (RN-05). */
export default async function PaginaListaManual() {
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) redirect('/lista')
  const pessoas = await listarPessoas(obraAtual.id)

  return (
    <>
      <Cabecalho titulo="Sem QR" subtitulo="Escolha a pessoa" voltarPara="/inicio" />
      <main className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-6">
        <p className="rounded-cartao bg-erro-claro px-4 py-3 text-[15px]">
          Sem o QR o lançamento fica marcado como <b>manual</b>. O que saiu sem QR pode voltar sem
          QR; o que saiu com QR só volta com o capacete.
        </p>
        <BuscaPessoas
          pessoas={pessoas
            .filter((p) => p.ativa)
            .map((p) => ({
              id: p.id,
              nome: p.nome,
              nome_capacete: p.nome_capacete,
              funcao: p.funcao,
              empresa: p.empresa?.nome ?? '',
              itens: p.posses.length,
            }))}
        />
      </main>
    </>
  )
}
