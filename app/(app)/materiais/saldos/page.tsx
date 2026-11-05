import type { Metadata } from 'next'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { ChaveModo } from '@/components/ChaveModo'
import { ListaSaldos } from '@/components/ListaSaldos'
import { listarSaldos } from '@/lib/dados/materiais'
import { estadoSaldo } from '@/lib/dominio/materiais'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Saldos · Almox' }

const TITULO = 'text-[13px] font-bold tracking-[1.2px] text-texto-2 uppercase'

/** Saldo de todos os materiais, com os abaixo do limite em cima. */
export default async function PaginaSaldos() {
  const { obraAtual } = await obterSessao()
  const materiais = await listarSaldos(obraAtual.id)
  const abaixo = materiais.filter((m) => estadoSaldo(m) === 'abaixo')
  const normais = materiais.filter((m) => estadoSaldo(m) !== 'abaixo')

  return (
    <>
      <header className="px-5 pt-[18px] pb-2">
        <h1 className="text-[22px] leading-tight font-bold">Saldos</h1>
      </header>
      <ChaveModo modo="materiais" />
      <AoVivo obraId={obraAtual.id} tabelas={['material', 'movimento_material']} />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-3.5 pb-5">
        {abaixo.length > 0 && (
          <section className="flex flex-col gap-2" aria-labelledby="titulo-abaixo">
            <h2 id="titulo-abaixo" className={TITULO}>
              Abaixo do limite
            </h2>
            <ListaSaldos materiais={abaixo} />
          </section>
        )}
        <section className="flex flex-col gap-2" aria-labelledby="titulo-normais">
          <h2 id="titulo-normais" className={TITULO}>
            {abaixo.length > 0 ? 'Normais' : 'Todos os materiais'}
          </h2>
          <ListaSaldos materiais={normais} />
        </section>
      </main>
      <BarraInferior modo="materiais" ativa="saldos"
        podeLancar={podeLancar(obraAtual.perfil)}
        podeCadastrar={podeCadastrar(obraAtual.perfil)}
      />
    </>
  )
}
