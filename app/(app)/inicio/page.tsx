import type { Metadata } from 'next'
import Link from 'next/link'
import { BarraInferior } from '@/components/BarraInferior'
import { Cartao } from '@/components/Cartao'
import { IconeInterface } from '@/components/IconeInterface'
import { Indicador } from '@/components/Indicador'
import { Marca } from '@/components/Marca'
import { Relogio } from '@/components/Relogio'
import { SeloPerfil } from '@/components/SeloPerfil'
import { resumoDoDia, ultimosLancamentos } from '@/lib/dados/inicio'
import { textoDesde } from '@/lib/dominio/ficha'
import { descreverLancamento } from '@/lib/dominio/lancamentos'
import { podeLancar } from '@/lib/dominio/permissoes'
import { formatarHora } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Início · Almox' }

const CLASSE_ATALHO =
  'flex h-[52px] items-center justify-center gap-2.5 rounded-botao border border-borda bg-cartao text-base font-bold'

export default async function PaginaInicio() {
  const { obraAtual } = await obterSessao()
  const lanca = podeLancar(obraAtual.perfil)
  const agora = new Date()
  const [{ resumo, pendencias }, ultimos] = await Promise.all([
    resumoDoDia(obraAtual.id, agora),
    ultimosLancamentos(obraAtual.id),
  ])

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-5 pt-[18px] pb-2">
        <div className="flex min-w-0 flex-col">
          <h1>
            <Marca altura={34} />
          </h1>
          <span className="truncate text-sm text-texto-2">
            {obraAtual.nome} · <Relogio formato="dia" />
          </span>
        </div>
        <SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />
      </header>

      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-3.5 pb-5">
        {!lanca && (
          <p className="rounded-cartao bg-sutil px-3.5 py-3 text-sm leading-snug">
            <b>Perfil de consulta.</b> Você vê quem está com o quê. Retirada e devolução só pelo
            login do almoxarife ou do engenheiro.
          </p>
        )}

        <Link
          href="/leitura"
          className={`flex min-h-28 items-center gap-4 rounded-cartao px-5 text-left ${
            lanca ? 'bg-escuro text-white' : 'border border-borda bg-cartao text-texto'
          }`}
        >
          <span
            className={`flex size-16 shrink-0 items-center justify-center rounded-botao text-texto ${
              lanca ? 'bg-amarelo' : 'bg-sutil'
            }`}
          >
            <IconeInterface nome="qr-code" tamanho={36} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[22px] leading-tight font-bold">Ler QR do capacete</span>
            <span className="text-sm opacity-80">
              {lanca ? 'Para registrar retirada ou devolução' : 'Ver o que está com a pessoa'}
            </span>
          </span>
        </Link>

        <Link href="/lista" className={CLASSE_ATALHO}>
          <IconeInterface nome="users" tamanho={20} />
          Ver quem está com o quê
        </Link>
        <Link href="/estoque" className={CLASSE_ATALHO}>
          <IconeInterface nome="box" tamanho={20} />
          Ferramentas na obra · total e livres
        </Link>
        {lanca && (
          <Link
            href="/pessoas"
            className="flex min-h-toque items-center justify-center text-sm font-semibold text-texto-3 underline"
          >
            Sem capacete ou QR ilegível? Escolher na lista
          </Link>
        )}

        <Cartao className="grid grid-cols-4 gap-1.5">
          <Indicador valor={resumo.noCanteiro} rotulo="no canteiro" />
          <Indicador valor={resumo.noAlmox} rotulo="no almox" />
          <Indicador valor={resumo.manutencao} rotulo="manutenção" />
          <Indicador
            valor={resumo.pendencias}
            rotulo={resumo.pendencias === 1 ? 'pendência' : 'pendências'}
            tom="erro"
          />
        </Cartao>

        {lanca && (
          <Link
            href="/fechamento"
            className="flex min-h-toque items-center justify-between gap-3 rounded-cartao border border-borda bg-cartao px-4 py-3"
          >
            <span className="flex flex-col">
              <span className="font-bold">Fechamento do dia</span>
              <span className="text-[13px] text-texto-2">
                {resumo.pessoasComFerramenta === 0
                  ? 'Todos devolveram'
                  : `${resumo.pessoasComFerramenta} ${resumo.pessoasComFerramenta === 1 ? 'pessoa ainda' : 'pessoas ainda'} com ferramenta`}
              </span>
            </span>
            <IconeInterface nome="chevron-right" tamanho={20} className="text-texto-2" />
          </Link>
        )}

        {pendencias.length > 0 && (
          <section className="flex flex-col gap-2" aria-labelledby="titulo-pendencias">
            <h2 id="titulo-pendencias" className="text-[13px] font-bold tracking-[1.2px] text-erro">
              PENDÊNCIAS
            </h2>
            {pendencias.map((p) => (
              <Link
                key={p.unidadeId}
                href={lanca ? '/leitura' : `/pessoa/${p.pessoa.id}`}
                className="flex min-h-toque items-center justify-between gap-3 rounded-cartao border-2 border-erro bg-cartao px-4 py-3"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">
                    {p.ferramenta} <span className="font-mono text-sm">{p.codigo}</span>
                  </span>
                  <span className="truncate text-[13px] text-erro">
                    {p.pessoa.nome} · {textoDesde(p.desde, agora)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold underline">
                  {lanca ? 'Receber' : 'Ver'}
                </span>
              </Link>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-2" aria-labelledby="titulo-ultimos">
          <h2 id="titulo-ultimos" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
            ÚLTIMOS LANÇAMENTOS
          </h2>
          {ultimos.length === 0 ? (
            <Cartao className="py-6 text-center text-[15px] text-texto-2">
              Nenhum lançamento ainda.
            </Cartao>
          ) : (
            <Cartao className="flex flex-col divide-y divide-borda py-1">
              {ultimos.map((l, i) => {
                const { texto, alerta } = descreverLancamento(l)
                return (
                  <div key={`${l.quando}-${i}`} className="flex items-center gap-3 py-2.5">
                    <span
                      aria-hidden="true"
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        l.tipo === 'ocorrencia'
                          ? 'bg-erro-claro text-erro'
                          : l.tipo === 'retirada'
                            ? 'bg-aviso-claro text-texto'
                            : 'bg-escuro text-white'
                      }`}
                    >
                      {l.tipo === 'ocorrencia' ? '!' : l.tipo === 'retirada' ? '↑' : '↓'}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold">{l.pessoa}</span>
                      <span
                        className={`truncate text-[13px] ${alerta ? 'text-erro' : 'text-texto-2'}`}
                      >
                        {texto}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[13px] text-texto-2">
                      {formatarHora(l.quando)}
                    </span>
                  </div>
                )
              })}
            </Cartao>
          )}
        </section>
      </main>

      <BarraInferior ativa="inicio" podeLancar={lanca} />
    </>
  )
}
