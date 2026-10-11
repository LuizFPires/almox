import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { ErroFormulario } from '@/components/Formulario'
import { pecasEmManutencao } from '@/lib/dados/lancamento'
import { rotuloMotivo } from '@/lib/dominio/devolucao'
import { textoDesde } from '@/lib/dominio/ficha'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { concluirManutencao } from './acoes'
import { BotaoBaixa } from './BotaoBaixa'

export const metadata: Metadata = { title: 'Manutenção · Almox' }

/** Peças avariadas: "Voltou do conserto" (volta a livre) ou "Dar baixa" (só engenheiro). */
export default async function PaginaManutencao({ searchParams }: PageProps<'/manutencao'>) {
  const { erro } = (await searchParams) as { erro?: string }
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) redirect('/inicio')
  const engenheiro = podeCadastrar(obraAtual.perfil)
  const pecas = await pecasEmManutencao(obraAtual.id)
  const agora = new Date()

  return (
    <>
      <Cabecalho
        titulo="Manutenção"
        subtitulo={`${pecas.length} peça(s) avariada(s)`}
        voltarPara="/inicio"
      />
      <main className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-6">
        {erro && (
          <ErroFormulario
            mensagem={
              erro === 'baixada'
                ? 'Não foi possível dar baixa (só o engenheiro dá baixa).'
                : 'Não foi possível marcar como consertada. Tente de novo.'
            }
          />
        )}
        {pecas.length === 0 && (
          <Cartao className="py-6 text-center text-[15px] text-sucesso">
            Nenhuma peça em manutenção.
          </Cartao>
        )}
        {pecas.map((p) => (
          <Cartao key={p.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {p.foto && (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage privado
                <img
                  src={p.foto}
                  alt={`Foto da avaria de ${p.codigo}`}
                  className="size-20 rounded-botao object-cover"
                />
              )}
              <span className="flex min-w-0 flex-col">
                <span className="font-bold">
                  {p.tipo} <span className="font-mono">{p.codigo}</span>
                </span>
                {p.motivo && (
                  <span className="text-sm font-semibold text-erro">{rotuloMotivo(p.motivo)}</span>
                )}
                {p.quando && (
                  <span className="text-[13px] text-texto-2">
                    {p.devolvidaPor ? `devolvida por ${p.devolvidaPor} · ` : ''}
                    {textoDesde(p.quando, agora)}
                  </span>
                )}
              </span>
            </div>
            <form action={concluirManutencao} className="grid grid-cols-2 gap-2.5">
              <input type="hidden" name="unidade" value={p.id} />
              <Botao
                type="submit"
                name="acao"
                value="consertada"
                variante="sucesso"
                className={engenheiro ? '' : 'col-span-2'}
              >
                Voltou do conserto
              </Botao>
              {engenheiro && <BotaoBaixa codigo={p.codigo} />}
            </form>
          </Cartao>
        ))}
      </main>
    </>
  )
}
