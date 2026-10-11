import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdesivoCapacete } from '@/components/AdesivoCapacete'
import { AtualizarSozinho } from '@/components/AtualizarSozinho'
import { Botao } from '@/components/Botao'
import { Cabecalho } from '@/components/Cabecalho'
import { ErroFormulario } from '@/components/Formulario'
import { dadosAdesivo } from '@/lib/dados/adesivo'
import { listarEmpresas } from '@/lib/dados/empresas'
import { situacaoImpressao, ultimosTrabalhos } from '@/lib/dados/impressao'
import { buscarPessoa, listarPessoas } from '@/lib/dados/pessoas'
import { descreverTrabalho, emAndamento } from '@/lib/dominio/impressao'
import { formatarDataHora } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'
import { alternarAtiva } from '../acoes'
import { FormPessoa } from '../FormPessoa'

export const metadata: Metadata = { title: 'Editar pessoa · Almox' }

export default async function PaginaEditarPessoa({
  params,
  searchParams,
}: PageProps<'/cadastros/pessoa/[id]'>) {
  const { id } = await params
  const { erro } = (await searchParams) as { erro?: string }
  const { obraAtual } = await obterSessao()
  const [pessoa, empresas, pessoas, adesivo, trabalhos, { agente }] = await Promise.all([
    buscarPessoa(obraAtual.id, id),
    listarEmpresas(obraAtual.id),
    listarPessoas(obraAtual.id),
    dadosAdesivo(id),
    ultimosTrabalhos(obraAtual.id, id),
    situacaoImpressao(obraAtual.id),
  ])
  if (!pessoa) notFound()
  const itens = pessoa.posses.length

  return (
    <>
      <Cabecalho
        titulo={pessoa.nome}
        subtitulo={`${pessoa.matricula}${pessoa.ativa ? '' : ' · inativa'}`}
        voltarPara="/cadastros/pessoas"
      />
      <FormPessoa
        pessoa={{
          id: pessoa.id,
          nome: pessoa.nome,
          nome_capacete: pessoa.nome_capacete,
          funcao: pessoa.funcao,
          empresa_id: pessoa.empresa?.id ?? '',
        }}
        empresas={empresas.map(({ id: idEmpresa, nome, cor }) => ({ id: idEmpresa, nome, cor }))}
        capacetesUsados={pessoas
          .filter((p) => p.ativa && p.id !== pessoa.id)
          .map((p) => p.nome_capacete)}
      />
      {adesivo && (
        <section aria-labelledby="t-adesivo" className="flex flex-col gap-3 px-5 pt-2 pb-6">
          {trabalhos.some((t) => emAndamento(t.status)) && <AtualizarSozinho segundos={3} />}
          <h2 id="t-adesivo" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
            ADESIVO DO CAPACETE
          </h2>
          <AdesivoCapacete
            token={adesivo.token}
            nomeCapacete={adesivo.nomeCapacete}
            nomeCompleto={adesivo.nomeCompleto}
            funcao={adesivo.funcao}
            empresa={adesivo.empresa}
            obra={adesivo.obra}
            matricula={adesivo.matricula}
          />
          {trabalhos.length > 0 && (
            <ul aria-label="Impressões do adesivo" className="flex flex-col gap-1">
              {trabalhos.map((t) => (
                <li
                  key={t.id}
                  className={`text-sm ${t.status === 'erro' ? 'font-semibold text-erro' : 'text-texto-2'}`}
                >
                  {formatarDataHora(t.criado_em)}
                  {t.copias > 1 && ` · ${t.copias} cópias`} ·{' '}
                  {descreverTrabalho(t.status, t.erro, agente.online)}
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/cadastros/pessoa/${pessoa.id}/imprimir?volta=${encodeURIComponent(`/cadastros/pessoa/${pessoa.id}`)}`}
            className="flex min-h-toque items-center justify-center rounded-botao bg-escuro px-4 font-bold text-white"
          >
            Reimprimir adesivo
          </Link>
        </section>
      )}
      <form action={alternarAtiva} className="px-5 pb-6">
        {erro === 'situacao' && (
          <div className="mb-2">
            <ErroFormulario mensagem="Não foi possível alterar a situação. Tente de novo." />
          </div>
        )}
        <input type="hidden" name="id" value={pessoa.id} />
        <input type="hidden" name="ativa" value={String(!pessoa.ativa)} />
        {pessoa.ativa && itens > 0 && (
          <p className="mb-2 text-sm text-aviso">
            Está com {itens} {itens === 1 ? 'item' : 'itens'}. Inativar não devolve nada: a
            ferramenta continua no nome dela até a devolução.
          </p>
        )}
        <Botao type="submit" variante="secundaria" tamanho="g" larguraTotal>
          {pessoa.ativa ? 'Inativar pessoa' : 'Reativar pessoa'}
        </Botao>
      </form>
    </>
  )
}
