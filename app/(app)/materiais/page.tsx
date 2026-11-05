import type { Metadata } from 'next'
import { AcoesMateriais } from '@/components/AcoesMateriais'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Gaveta } from '@/components/Gaveta'
import { IconeInterface } from '@/components/IconeInterface'
import { itensGestao } from '@/components/itens-gestao'
import { ChaveModo } from '@/components/ChaveModo'
import { ListaSaldos } from '@/components/ListaSaldos'
import { Marca } from '@/components/Marca'
import { Relogio } from '@/components/Relogio'
import { SeloFila } from '@/components/SeloFila'
import { SeloPerfil } from '@/components/SeloPerfil'
import { listarSaldos } from '@/lib/dados/materiais'
import { estadoSaldo } from '@/lib/dominio/materiais'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Materiais · Almox' }

export default async function PaginaMateriais() {
  const { obraAtual } = await obterSessao()
  const lanca = podeLancar(obraAtual.perfil)
  const materiais = await listarSaldos(obraAtual.id)
  const restrita = obraAtual.perfil === 'consulta' ? obraAtual.empresa : null
  const gestao = itensGestao(obraAtual.perfil, restrita)
  const abaixo = materiais.filter((m) => estadoSaldo(m) === 'abaixo').length

  return (
    <>
      <header className="flex items-center gap-2 px-5 pt-[18px] pb-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <h1>
            <Marca altura={34} />
          </h1>
          <span className="text-sm leading-snug text-texto-2">
            {obraAtual.nome} · <Relogio formato="dia" /> · <Relogio formato="hora" />
          </span>
        </div>
        <SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />
        {gestao.length > 0 && (
          <Gaveta
            rotulo="Gestão da obra: TV, avisos, a descontar e histórico"
            icone={<IconeInterface nome="dashboard" tamanho={22} />}
            titulo="Gestão da obra"
            itens={gestao}
          />
        )}
      </header>
      <ChaveModo modo="materiais" />

      <AoVivo obraId={obraAtual.id} tabelas={['material', 'movimento_material']} />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-3.5 pb-5">
        <AcoesMateriais podeLancar={lanca} />
        {/* Lançamentos guardados no celular sem sinal (materiais e ferramentas). */}
        <SeloFila lanca={lanca} />
        {abaixo > 0 && (
          <p
            role="status"
            className="rounded-cartao bg-erro-claro px-3.5 py-3 text-sm leading-snug font-semibold text-erro"
          >
            {abaixo === 1
              ? '1 material abaixo do limite.'
              : `${abaixo} materiais abaixo do limite.`}{' '}
            Todos da obra foram avisados.
          </p>
        )}
        <section className="flex flex-col gap-2" aria-labelledby="titulo-saldo">
          <h2
            id="titulo-saldo"
            className="text-[13px] font-bold tracking-[1.2px] text-texto-2 uppercase"
          >
            Saldo agora
          </h2>
          <ListaSaldos materiais={materiais} />
        </section>
      </main>

      <BarraInferior modo="materiais" ativa="inicio-materiais" podeLancar={lanca} />
    </>
  )
}
