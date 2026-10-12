import type { Metadata } from 'next'
import Link from 'next/link'
import { AoVivo } from '@/components/AoVivo'
import { BarraInferior } from '@/components/BarraInferior'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { IconeInterface } from '@/components/IconeInterface'
import { SeloFimDoDia } from '@/components/SeloFimDoDia'
import { TelaEmBreve } from '@/components/TelaEmBreve'
import { dadosFechamento } from '@/lib/dados/fechamento'
import { montarFechamento, resumoFechamento } from '@/lib/dominio/fechamento'
import { textoDesde } from '@/lib/dominio/ficha'
import { podeLancar } from '@/lib/dominio/permissoes'
import { formatarDiaCurto, formatarHora } from '@/lib/formatos/datas'
import { formatarBRL } from '@/lib/formatos/moeda'
import { obterSessao } from '@/lib/sessao'
import { BotaoEncerrar } from './BotaoEncerrar'

export const metadata: Metadata = { title: 'Fechamento do dia · Almox' }

function Titulo({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
      {children}
    </h2>
  )
}

/** Fechamento do dia (F-10): quem ainda está com ferramenta, quem devolveu tudo e o encerramento. */
export default async function PaginaFechamento() {
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) {
    return (
      <TelaEmBreve
        titulo="Fechamento"
        aba="fechamento"
        permitido={podeLancar}
        semAcesso="O fechamento do dia é feito pelo almoxarife ou pelo engenheiro."
      />
    )
  }
  const agora = new Date()
  const { pecas, devolucoes, fechamentoHoje } = await dadosFechamento(obraAtual.id, agora)
  const f = montarFechamento(pecas, devolucoes, agora)
  const deEmpreiteira = f.pendentes.filter((p) => !p.empresa.propria)
  const empreiteiras = new Set(deEmpreiteira.map((p) => p.empresa.nome)).size
  const totalEmpreiteiras = deEmpreiteira.reduce((s, p) => s + p.valor, 0)

  return (
    <>
      <AoVivo obraId={obraAtual.id} tabelas={['movimento']} />
      <Cabecalho
        titulo="Fechamento do dia"
        subtitulo={`${formatarDiaCurto(agora)} · fim do expediente`}
        voltarPara="/inicio"
        selo={<SeloFimDoDia />}
      />
      <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-5">
        <div className="flex items-center gap-4 rounded-cartao bg-escuro px-5 py-4 text-white">
          <span className="text-[44px] leading-none font-bold text-amarelo tabular-nums">
            {f.unidadesFora}
          </span>
          <span className="text-[15px] leading-snug">
            ferramentas ainda no canteiro. Só baixa quem pegou, devolvendo com o próprio capacete.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Cartao className="flex flex-col">
            <span className="text-4xl leading-none font-bold text-erro tabular-nums">
              {f.pendentes.length}
            </span>
            <span className="text-[13px] text-texto-2">ainda com ferramenta</span>
          </Cartao>
          <Cartao className="flex flex-col">
            <span className="text-4xl leading-none font-bold text-sucesso tabular-nums">
              {f.devolveramTudo.length}
            </span>
            <span className="text-[13px] text-texto-2">devolveram tudo hoje</span>
          </Cartao>
        </div>

        <section aria-labelledby="t-pendentes" className="flex flex-col gap-2">
          <Titulo id="t-pendentes">AINDA COM FERRAMENTA</Titulo>
          {f.pendentes.length === 0 && (
            <p className="rounded-cartao bg-sucesso-claro px-4 py-3 text-[15px] font-semibold text-sucesso">
              Ninguém está com ferramenta. Tudo voltou.
            </p>
          )}
          {f.pendentes.map((p) => (
            <Cartao key={p.pessoaId} className="flex flex-col gap-2.5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-3 shrink-0 rounded-full"
                  style={{ background: p.empresa.cor }}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-bold">
                    {p.nome}
                    {p.pendenteDesde && (
                      <span className="font-semibold text-erro">
                        {' '}
                        · {textoDesde(p.pendenteDesde, agora)}
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] text-texto-2">{p.empresa.nome}</span>
                  <span className="text-[15px]">{p.itens}</span>
                  <span
                    className={`text-sm font-bold ${p.empresa.propria ? 'text-texto-2' : 'text-erro'}`}
                  >
                    {formatarBRL(p.valor)} ·{' '}
                    {p.empresa.propria
                      ? 'funcionário próprio'
                      : 'se não voltar, aviso ao dono e ao encarregado'}
                  </span>
                </div>
              </div>
              {/* Devolução exige o QR de quem pegou (RN-02): vai para a leitura do capacete. */}
              <Link
                href="/leitura"
                className="flex min-h-11 items-center justify-center gap-2 rounded-botao border-[1.5px] border-escuro bg-cartao text-sm font-bold"
              >
                <IconeInterface nome="qr-code" tamanho={18} />
                {p.nome.split(/\s+/)[0]} chegou: ler capacete e devolver
              </Link>
            </Cartao>
          ))}
        </section>

        {f.devolveramTudo.length > 0 && (
          <section aria-labelledby="t-devolveram" className="flex flex-col gap-2">
            <Titulo id="t-devolveram">DEVOLVERAM TUDO HOJE</Titulo>
            <ul className="rounded-cartao bg-cartao px-4 py-1">
              {f.devolveramTudo.map((d) => (
                <li
                  key={d.pessoaId}
                  className="flex items-center gap-3 border-b border-borda py-2.5 last:border-b-0"
                >
                  <IconeInterface nome="check" tamanho={20} className="text-sucesso" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-bold">{d.nome}</span>
                    <span className="text-[13px] text-texto-2">{d.empresa}</span>
                  </span>
                  <span className="font-mono text-[13px] text-texto-2">
                    {formatarHora(d.quando)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="rounded-cartao bg-sutil px-4 py-3 text-sm">
          Ninguém dá baixa por outra pessoa. Se o trabalhador deixou a ferramenta com o encarregado,
          ela continua no nome do trabalhador até ele mesmo devolver.
        </p>
      </main>
      <div className="sticky bottom-0 z-10 flex flex-col gap-2.5 border-t border-borda bg-cartao px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between text-[15px]">
          <span className="text-texto-2">Situação</span>
          <span className="font-bold">{resumoFechamento(f.pendentes.length)}</span>
        </div>
        {fechamentoHoje ? (
          <Link
            href={`/fechamento/${fechamentoHoje.id}`}
            className="flex min-h-14 items-center justify-center rounded-cartao bg-escuro text-lg font-bold text-white"
          >
            Dia encerrado às {formatarHora(fechamentoHoje.encerrado_em)} · ver resultado
          </Link>
        ) : (
          <BotaoEncerrar empreiteiras={empreiteiras} total={totalEmpreiteiras} />
        )}
      </div>
      <BarraInferior ativa="fechamento" podeLancar />
    </>
  )
}
