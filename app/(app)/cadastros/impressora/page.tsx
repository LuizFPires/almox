import type { Metadata } from 'next'
import Link from 'next/link'
import { AtualizarSozinho } from '@/components/AtualizarSozinho'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { ErroFormulario } from '@/components/Formulario'
import { NovaVisita } from '@/components/NovaVisita'
import { impressoraAtiva, listarDispositivos, ultimosTrabalhos } from '@/lib/dados/impressao'
import { destinoSeguro } from '@/lib/dominio/destino'
import { agenteOnline, descreverTrabalho, situacaoAgente } from '@/lib/dominio/impressao'
import { formatarDataHora } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'
import { lerAmbientePublico } from '@/lib/supabase/ambiente'
import { revogarDispositivo } from './acoes'
import { BotaoConectarTv, BotaoTeste, FormDispositivo, FormImpressora } from './FormsImpressora'

export const metadata: Metadata = { title: 'Impressora · Almox' }

function Titulo({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
      {children}
    </h2>
  )
}

export default async function PaginaImpressora({
  searchParams,
}: PageProps<'/cadastros/impressora'>) {
  const { erro, volta: voltaPedida } = (await searchParams) as { erro?: string; volta?: string }
  const volta = voltaPedida ? destinoSeguro(voltaPedida) : '/cadastros/pessoas'
  const { obraAtual } = await obterSessao()
  const [impressora, dispositivos, trabalhos] = await Promise.all([
    impressoraAtiva(obraAtual.id),
    listarDispositivos(obraAtual.id),
    ultimosTrabalhos(obraAtual.id),
  ])
  const agora = new Date()
  const ativos = dispositivos.filter((d) => !d.revogado_em)
  const agente = situacaoAgente(
    ativos.map((d) => d.ultimo_ping),
    agora,
  )
  const { url, chavePublica } = lerAmbientePublico()

  return (
    <>
      <AtualizarSozinho segundos={5} />
      <Cabecalho titulo="Impressora" subtitulo="Na rede Wi-Fi da obra" voltarPara={volta} />
      <main className="flex flex-1 flex-col gap-6 px-5 pt-2 pb-8">
        <p className="rounded-cartao bg-engenheiro-claro px-4 py-3 text-[15px] text-engenheiro">
          A impressora fica ligada no Wi-Fi da obra. O app manda a etiqueta pelo servidor e o mini
          PC da TV entrega para ela, então dá para imprimir do celular ou do computador do
          escritório, sem parear nada.
        </p>
        <section aria-labelledby="t-impressora" className="flex flex-col gap-3">
          <Titulo id="t-impressora">IMPRESSORA DE ETIQUETAS</Titulo>
          <Cartao className="flex flex-col gap-4">
            <NovaVisita>
              <FormImpressora impressora={impressora} />
            </NovaVisita>
          </Cartao>
          <BotaoTeste habilitado={Boolean(impressora)} />
        </section>

        <section aria-labelledby="t-agente" className="flex flex-col gap-3">
          <Titulo id="t-agente">AGENTE DE IMPRESSÃO (MINI PC DA TV)</Titulo>
          <p
            role="status"
            className={`rounded-botao px-3 py-2.5 text-[15px] font-semibold ${
              agente.online ? 'bg-sucesso-claro text-sucesso' : 'bg-erro-claro text-erro'
            }`}
          >
            {agente.texto}
          </p>
          {erro === 'revogar' && (
            <ErroFormulario mensagem="Não foi possível revogar o mini PC. Tente de novo." />
          )}
          {ativos.map((d) => (
            <Cartao key={d.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex flex-col">
                  <span className="font-semibold">{d.nome}</span>
                  <span className="text-[13px] text-texto-2">
                    Agente:{' '}
                    {agenteOnline(d.ultimo_ping, agora)
                      ? 'online'
                      : d.ultimo_ping
                        ? `último sinal ${formatarDataHora(d.ultimo_ping)}`
                        : 'nunca conectou'}
                  </span>
                  <span className="text-[13px] text-texto-2">
                    TV:{' '}
                    {d.ultimo_ping_tv
                      ? `último sinal ${formatarDataHora(d.ultimo_ping_tv)}`
                      : 'não conectada'}
                  </span>
                </span>
                <form action={revogarDispositivo}>
                  <input type="hidden" name="id" value={d.id} />
                  <Botao type="submit" variante="secundaria">
                    Revogar
                  </Botao>
                </form>
              </div>
              <BotaoConectarTv dispositivo={d.id} />
            </Cartao>
          ))}
          <Cartao>
            <NovaVisita>
              <FormDispositivo url={url} chave={chavePublica} />
            </NovaVisita>
          </Cartao>
          <p className="text-sm text-texto-2">
            O agente roda no mini PC, na rede da obra, e só faz conexões de saída: a impressora
            nunca fica exposta à internet. Instalação:{' '}
            <code className="font-mono">agente-impressao/LEIA-ME.md</code>.
          </p>
        </section>

        <section aria-labelledby="t-fila" className="flex flex-col gap-2">
          <Titulo id="t-fila">ÚLTIMAS IMPRESSÕES</Titulo>
          <Cartao className="flex flex-col divide-y divide-borda py-1">
            {trabalhos.length === 0 && (
              <p className="py-2 text-sm text-texto-2">Nada impresso ainda.</p>
            )}
            {trabalhos.map((t) => (
              <div key={t.id} className="flex flex-col py-2">
                <span className="text-[15px] font-semibold">
                  {t.descricao}
                  {t.copias > 1 && ` · ${t.copias} cópias`}
                </span>
                <span
                  className={`text-[13px] ${t.status === 'erro' ? 'font-semibold text-erro' : 'text-texto-2'}`}
                >
                  {formatarDataHora(t.criado_em)} ·{' '}
                  {descreverTrabalho(t.status, t.erro, agente.online)}
                </span>
              </div>
            ))}
          </Cartao>
        </section>
        <Link
          href={volta}
          className="flex min-h-14 items-center justify-center rounded-cartao bg-escuro px-5 text-lg font-bold text-white"
        >
          Pronto
        </Link>
      </main>
    </>
  )
}
