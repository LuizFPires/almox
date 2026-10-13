import type { Metadata } from 'next'
import Link from 'next/link'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Cartao } from '@/components/Cartao'
import { Gaveta, type ItemGaveta } from '@/components/Gaveta'
import { IconeInterface } from '@/components/IconeInterface'
import { Marca } from '@/components/Marca'
import { Relogio } from '@/components/Relogio'
import { SeloFila } from '@/components/SeloFila'
import { SeloPerfil } from '@/components/SeloPerfil'
import { resumoDoDia, ultimosLancamentos } from '@/lib/dados/inicio'
import { resumoFechamento } from '@/lib/dominio/fechamento'
import { descreverRegistro, quandoCurto } from '@/lib/dominio/lancamentos'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Início · Almox' }

/** Número da obra que abre a tela correspondente (opção A do protótipo). */
function Bloco({
  href,
  valor,
  rotulo,
  detalhe,
  alerta = false,
}: {
  href: string
  valor: number
  rotulo: string
  detalhe?: string
  alerta?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-24 flex-col gap-1.5 rounded-cartao px-3.5 py-3 ${
        alerta ? 'bg-erro-claro text-erro' : 'bg-cartao'
      }`}
    >
      <span className="text-[30px] leading-none font-extrabold tracking-tight tabular-nums">
        {valor}
      </span>
      <span
        className={`flex items-center justify-between text-[13px] font-semibold ${
          alerta ? '' : 'text-texto-2'
        }`}
      >
        {rotulo}
        <IconeInterface nome="chevron-right" tamanho={16} />
      </span>
      {detalhe && <span className={`text-xs ${alerta ? '' : 'text-texto-2'}`}>{detalhe}</span>}
    </Link>
  )
}

export default async function PaginaInicio() {
  const { obraAtual } = await obterSessao()
  const lanca = podeLancar(obraAtual.perfil)
  const restrita = obraAtual.perfil === 'consulta' ? obraAtual.empresa : null
  const agora = new Date()
  const engenheiro = obraAtual.perfil === 'engenheiro'
  // Quem recebe aviso (PRD §5): engenheiro e a consulta da empreiteira.
  const gestao: ItemGaveta[] = [
    ...(lanca
      ? [
          {
            href: '/conectar-tv',
            icone: <IconeInterface nome="dashboard" tamanho={20} />,
            titulo: 'Conectar TV',
            detalhe: 'Código que aparece na TV do almoxarifado',
          },
        ]
      : []),
    ...(engenheiro || restrita
      ? [
          {
            href: '/avisos',
            icone: <IconeInterface nome="warning" tamanho={20} />,
            titulo: 'Avisos',
            detalhe: 'Ferramentas não devolvidas, por empreiteira',
            tom: 'erro' as const,
          },
        ]
      : []),
    ...(engenheiro
      ? [
          {
            href: '/medicao',
            icone: <span className="text-sm font-extrabold">R$</span>,
            titulo: 'A descontar na medição',
            detalhe: 'Valores por empreiteira',
            tom: 'aviso' as const,
          },
          {
            href: '/historico',
            icone: <IconeInterface nome="history" tamanho={20} />,
            titulo: 'Histórico e auditoria',
            detalhe: 'Todos os lançamentos e estornos',
          },
        ]
      : []),
  ]
  const [{ resumo }, ultimos] = await Promise.all([
    resumoDoDia(obraAtual.id, agora),
    ultimosLancamentos(obraAtual.id),
  ])

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
          className={`flex min-h-[120px] items-center gap-4 rounded-[20px] px-5 text-left ${
            lanca ? 'bg-escuro text-white' : 'border border-borda bg-cartao text-texto'
          }`}
        >
          <span
            className={`flex size-[68px] shrink-0 items-center justify-center rounded-cartao text-texto ${
              lanca ? 'bg-amarelo' : 'bg-sutil'
            }`}
          >
            <IconeInterface nome="qr-code" tamanho={38} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[23px] leading-tight font-bold">Ler QR do capacete</span>
            <span className={`text-sm ${lanca ? 'text-[#D1D5DB]' : 'text-texto-2'}`}>
              {lanca ? 'Retirada ou devolução' : 'Ver o que está com a pessoa'}
            </span>
          </span>
        </Link>
        {lanca && (
          <Link
            href="/pessoas"
            className="-mt-1 flex min-h-toque items-center justify-center self-center text-sm font-semibold text-texto-2 underline"
          >
            Sem capacete ou QR ilegível? Escolher na lista
          </Link>
        )}

        {/* Números que abrem a tela de cada um. Consulta de empreiteira: só a própria empresa. */}
        <div className="grid grid-cols-2 gap-2.5">
          <Bloco
            href="/lista"
            valor={resumo.noCanteiro}
            rotulo={restrita ? `com a ${restrita.nome}` : 'no canteiro'}
            detalhe={`com ${resumo.pessoasComFerramenta} ${
              resumo.pessoasComFerramenta === 1 ? 'pessoa' : 'pessoas'
            }`}
          />
          {!restrita && <Bloco href="/estoque" valor={resumo.noAlmox} rotulo="livres no almox" />}
          {!restrita && (
            <Bloco
              href={lanca ? '/manutencao' : '/lista?aba=avarias'}
              valor={resumo.manutencao}
              rotulo="em manutenção"
            />
          )}
          <Bloco
            href="/lista?aba=nao-devolvidas"
            valor={resumo.pendencias}
            rotulo={resumo.pendencias === 1 ? 'pendência' : 'pendências'}
            detalhe="de outro dia"
            alerta={resumo.pendencias > 0}
          />
        </div>

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

        <section className="flex flex-col gap-2" aria-labelledby="titulo-ultimos">
          <h2 id="titulo-ultimos" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
            REGISTRO DE MOVIMENTAÇÕES
          </h2>
          {ultimos.length === 0 ? (
            <Cartao className="py-6 text-center text-[15px] text-texto-2">
              Nenhum lançamento ainda.
            </Cartao>
          ) : (
            <Cartao className="flex flex-col divide-y divide-borda py-1">
              {ultimos.map((l, i) => {
                const r = descreverRegistro(l)
                const conteudo = (
                  <>
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
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
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold">{l.pessoa}</span>
                        <span className="shrink-0 font-mono text-[12px] text-texto-2">
                          {quandoCurto(l.quando, agora)}
                        </span>
                      </span>
                      <span
                        className={`line-clamp-2 text-[13px] ${
                          l.tipo === 'ocorrencia' ? 'text-erro' : 'text-texto'
                        }`}
                      >
                        <b className="font-semibold">{r.acao}</b> {r.detalhe}
                      </span>
                      <span className="text-[12px] text-texto-2">
                        {r.quem} ·{' '}
                        <span className={r.alerta ? 'font-semibold text-erro' : ''}>
                          {r.origem}
                        </span>
                      </span>
                    </span>
                  </>
                )
                const classe = 'flex min-h-toque items-start gap-3 py-2.5'
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
          {obraAtual.perfil === 'engenheiro' && (
            <Link
              href="/historico"
              className="flex min-h-toque items-center justify-center gap-1 text-sm font-bold underline"
            >
              Ver histórico completo
            </Link>
          )}
        </section>
      </main>

      <BarraInferior ativa="inicio" podeLancar={lanca} />
    </>
  )
}
