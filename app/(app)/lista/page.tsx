import type { Metadata } from 'next'
import Link from 'next/link'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { SeloPerfil } from '@/components/SeloPerfil'
import { pecasEmManutencao } from '@/lib/dados/lancamento'
import { empresasDaLista, pessoasComItens } from '@/lib/dados/lista'
import { avariasPorPessoa, pendenciasPorPessoa } from '@/lib/dominio/lista'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { ListaAvarias } from './ListaAvarias'
import { ListaNaoDevolvidas } from './ListaNaoDevolvidas'
import { ListaQuemEsta } from './ListaQuemEsta'

export const metadata: Metadata = { title: 'Quem está com o quê · Almox' }

const ABAS = [
  { chave: 'agora', rotulo: 'Agora', href: '/lista' },
  { chave: 'nao-devolvidas', rotulo: 'Não devolvidas', href: '/lista?aba=nao-devolvidas' },
  { chave: 'avarias', rotulo: 'Avarias', href: '/lista?aba=avarias' },
] as const

/**
 * Lista (F-07) com três abas: "Agora" (quem está com o quê, por empresa), "Não devolvidas"
 * (peças de outro dia, por pessoa) e "Avarias" (peças em manutenção, por quem devolveu).
 * A RLS limita a consulta de empreiteira à empresa dela.
 */
export default async function PaginaLista({ searchParams }: PageProps<'/lista'>) {
  const { aba: pedida } = (await searchParams) as { aba?: string }
  const aba = ABAS.find((a) => a.chave === pedida)?.chave ?? 'agora'
  const { obraAtual } = await obterSessao()
  const agora = new Date()
  const [pessoas, empresas, emManutencao] = await Promise.all([
    pessoasComItens(obraAtual.id),
    empresasDaLista(obraAtual.id),
    // Os links das fotos só fazem falta na aba Avarias; nas outras basta contar.
    pecasEmManutencao(obraAtual.id, { comFotos: aba === 'avarias' }),
  ])
  const pendencias = pendenciasPorPessoa(pessoas, agora)
  const avarias = avariasPorPessoa(emManutencao)
  const totalAvarias = avarias.reduce((s, g) => s + g.itens.length, 0)
  const comPessoas = new Set(pessoas.map((p) => p.empresa.id))
  const contador = { 'nao-devolvidas': pendencias.lista.length, avarias: totalAvarias }

  return (
    <>
      <AoVivo obraId={obraAtual.id} tabelas={['movimento']} />
      <Cabecalho
        titulo="Quem está com o quê"
        subtitulo={
          obraAtual.empresa ? `${obraAtual.empresa.nome} · agora` : 'Todas as empresas · agora'
        }
        voltarPara="/inicio"
        selo={<SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />}
      />
      <nav
        aria-label="Seções da lista"
        className="mx-5 mt-1 mb-3 grid grid-cols-3 gap-1 rounded-botao bg-sutil p-1"
      >
        {ABAS.map((a) => {
          const atual = a.chave === aba
          const n = a.chave === 'agora' ? null : contador[a.chave]
          return (
            <Link
              key={a.chave}
              href={a.href}
              replace
              scroll={false}
              aria-current={atual ? 'page' : undefined}
              className={`flex min-h-toque items-center justify-center gap-1.5 rounded-[8px] px-1 text-center text-[14px] leading-tight ${
                atual ? 'bg-cartao font-bold text-texto shadow-sm' : 'font-semibold text-texto-2'
              }`}
            >
              {a.rotulo}
              {n !== null && n > 0 && (
                <span
                  className={`rounded-full px-1.5 text-xs font-bold ${
                    a.chave === 'avarias' ? 'bg-aviso-claro text-aviso' : 'bg-erro text-white'
                  }`}
                >
                  {n}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <main className="flex flex-1 flex-col gap-3 px-5 pb-6">
        {aba === 'agora' && (
          <ListaQuemEsta
            pessoas={pessoas}
            empresas={empresas.filter((e) => comPessoas.has(e.id))}
            agora={agora.toISOString()}
          />
        )}
        {aba === 'nao-devolvidas' && (
          <ListaNaoDevolvidas pendencias={pendencias} agora={agora.toISOString()} />
        )}
        {aba === 'avarias' && <ListaAvarias grupos={avarias} agora={agora.toISOString()} />}
      </main>
      <BarraInferior ativa="lista" podeLancar={podeLancar(obraAtual.perfil)} />
    </>
  )
}
