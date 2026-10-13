import type { Metadata } from 'next'
import Link from 'next/link'
import { Cartao } from '@/components/Cartao'
import { IconeImpressora } from '@/components/IconeImpressora'
import { listarPessoas, type PessoaCadastro } from '@/lib/dados/pessoas'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Pessoas · Cadastros · Almox' }

function iniciais(nome: string) {
  const partes = nome.split(' ').filter(Boolean)
  return (
    (partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '')
  ).toUpperCase()
}

function LinhaPessoa({ p }: { p: PessoaCadastro }) {
  const itens = p.posses.length
  return (
    <div className="flex min-h-16 items-center rounded-cartao bg-cartao">
      <Link
        href={`/cadastros/pessoa/${p.id}`}
        className={`flex min-w-0 flex-1 items-center gap-3 self-stretch py-3 pl-3.5 ${p.ativa ? '' : 'pr-3.5'}`}
      >
        <span
          aria-hidden="true"
          className={`flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
            p.ativa ? 'bg-escuro text-amarelo' : 'bg-sutil text-texto-2'
          }`}
        >
          {iniciais(p.nome)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-bold">
            {p.nome}{' '}
            <span className="font-mono text-xs font-medium text-texto-2">{p.matricula}</span>
          </span>
          <span className="truncate text-[13px] text-texto-2">
            {p.nome_capacete} · {p.funcao} · {p.empresa?.nome}
          </span>
        </span>
        {p.ativa ? (
          <span className="shrink-0 rounded-full bg-sutil px-2.5 py-1 text-[13px] font-semibold">
            {itens === 0 ? 'nada' : `${itens} ${itens === 1 ? 'item' : 'itens'}`}
          </span>
        ) : (
          <span className="shrink-0 text-[13px] font-semibold text-texto-2">inativa</span>
        )}
      </Link>
      {p.ativa && (
        // Atalho do protótipo: reimprimir o adesivo direto da lista (abre a tela Imprimir).
        <Link
          href={`/cadastros/pessoa/${p.id}/imprimir`}
          aria-label={`Reimprimir adesivo de ${p.nome}`}
          className="mx-1.5 flex size-toque shrink-0 items-center justify-center rounded-botao text-texto-2"
        >
          <IconeImpressora tamanho={20} />
        </Link>
      )}
    </div>
  )
}

export default async function PaginaPessoas() {
  const { obraAtual } = await obterSessao()
  const pessoas = await listarPessoas(obraAtual.id)
  const ativas = pessoas.filter((p) => p.ativa)
  const inativas = pessoas.filter((p) => !p.ativa)

  return (
    <>
      <p className="text-[13px] text-texto-2">
        {ativas.length} {ativas.length === 1 ? 'pessoa ativa' : 'pessoas ativas'} nesta obra
      </p>
      {ativas.length === 0 && (
        <Cartao className="py-6 text-center text-[15px] text-texto-2">
          Nenhuma pessoa cadastrada ainda. Cadastre as empresas primeiro.
        </Cartao>
      )}
      {ativas.map((p) => (
        <LinhaPessoa key={p.id} p={p} />
      ))}
      {inativas.length > 0 && (
        <details className="mt-2">
          <summary className="flex min-h-toque cursor-pointer items-center text-sm font-semibold text-texto-2">
            Inativas ({inativas.length})
          </summary>
          <div className="flex flex-col gap-2">
            {inativas.map((p) => (
              <LinhaPessoa key={p.id} p={p} />
            ))}
          </div>
        </details>
      )}
    </>
  )
}
