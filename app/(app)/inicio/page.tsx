import type { Metadata } from 'next'
import Link from 'next/link'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Cartao } from '@/components/Cartao'
import { IconeInterface } from '@/components/IconeInterface'
import { Indicador } from '@/components/Indicador'
import { Marca } from '@/components/Marca'
import { Relogio } from '@/components/Relogio'
import { SeloFila } from '@/components/SeloFila'
import { SeloPerfil } from '@/components/SeloPerfil'
import { resumoDoDia, ultimosLancamentos } from '@/lib/dados/inicio'
import { textoDesde } from '@/lib/dominio/ficha'
import { resumoFechamento } from '@/lib/dominio/fechamento'
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
  const restrita = obraAtual.perfil === 'consulta' ? obraAtual.empresa : null
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
          <span className="text-sm leading-snug text-texto-2">
            {obraAtual.nome} · <Relogio formato="dia" /> · <Relogio formato="hora" />
          </span>
        </div>
        <SeloPerfil perfil={obraAtual.perfil} empresa={obraAtual.empresa?.nome} />
      </header>

      <AoVivo obraId={obraAtual.id} tabelas={['movimento', 'ocorrencia']} />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-3.5 pb-5">
        <SeloFila lanca={lanca} />
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

        {/* Consulta de empreiteira: só números da própria empresa (PLAN › Decisões). */}
        <Cartao className={`grid gap-1.5 ${restrita ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <Indicador
            valor={resumo.noCanteiro}
            rotulo={restrita ? `com a ${restrita.nome}` : 'no canteiro'}
          />
          {!restrita && <Indicador valor={resumo.noAlmox} rotulo="no almox" />}
          {!restrita &&
            (lanca ? (
              <Link href="/manutencao" className="rounded-botao underline-offset-4 hover:underline">
                <Indicador valor={resumo.manutencao} rotulo="manutenção" />
              </Link>
            ) : (
              <Indicador valor={resumo.manutencao} rotulo="manutenção" />
            ))}
          <Indicador
            valor={resumo.pendencias}
            rotulo={resumo.pendencias === 1 ? 'pendência' : 'pendências'}
            tom="erro"
          />
        </Cartao>

        {lanca && (
          <Link
            href="/fechamento"
            className="flex min-h-toque items-center gap-3 rounded-cartao bg-cartao px-4 py-3"
          >
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sutil"
            >
              <IconeInterface nome="clock" tamanho={22} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-bold">Fechamento do dia</span>
              <span className="text-sm text-texto-2">
                {resumoFechamento(resumo.pessoasComFerramenta)}
              </span>
            </span>
            <IconeInterface nome="chevron-right" tamanho={20} className="text-texto-2" />
          </Link>
        )}

        {/* Quem recebe aviso (PRD §5): engenheiro e a consulta da empreiteira. */}
        {(obraAtual.perfil === 'engenheiro' || restrita) && (
          <div className={`grid gap-2 ${obraAtual.perfil === 'engenheiro' ? 'grid-cols-2' : ''}`}>
            <Link href="/avisos" className={CLASSE_ATALHO}>
              <IconeInterface nome="warning" tamanho={20} />
              Avisos
            </Link>
            {obraAtual.perfil === 'engenheiro' && (
              <Link href="/medicao" className={CLASSE_ATALHO}>
                <IconeInterface nome="history" tamanho={20} />A descontar
              </Link>
            )}
            {obraAtual.perfil === 'engenheiro' && (
              <Link href="/historico" className={`${CLASSE_ATALHO} col-span-2`}>
                <IconeInterface nome="history" tamanho={20} />
                Histórico e auditoria
              </Link>
            )}
          </div>
        )}

        {pendencias.length > 0 && (
          <section className="flex flex-col gap-2" aria-labelledby="titulo-pendencias">
            <h2
              id="titulo-pendencias"
              className="text-[13px] font-bold tracking-[1.2px] text-texto-2"
            >
              PENDÊNCIAS
            </h2>
            {pendencias.map((p) => (
              <Link
                key={p.unidadeId}
                href={lanca ? '/leitura' : `/pessoa/${p.pessoa.id}`}
                className="flex min-h-toque items-center gap-3 rounded-cartao border-2 border-erro bg-cartao px-4 py-3"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-erro-claro text-erro"
                >
                  <IconeInterface nome="tool" tamanho={22} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">
                    {p.ferramenta} <span className="font-mono text-sm">{p.codigo}</span>
                  </span>
                  <span className="truncate text-[13px] text-texto-2">
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
                const conteudo = (
                  <>
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
                      <IconeInterface
                        nome={
                          l.tipo === 'ocorrencia'
                            ? 'warning'
                            : l.tipo === 'retirada'
                              ? 'checkout'
                              : 'return'
                        }
                        tamanho={18}
                      />
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
                  </>
                )
                const classe = 'flex min-h-toque items-center gap-3 py-2.5'
                return l.tipo !== 'ocorrencia' && l.id ? (
                  <Link key={`${l.quando}-${i}`} href={`/lancamento/${l.id}`} className={classe}>
                    {conteudo}
                  </Link>
                ) : (
                  <div key={`${l.quando}-${i}`} className={classe}>
                    {conteudo}
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
