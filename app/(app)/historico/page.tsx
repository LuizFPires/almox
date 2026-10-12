import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { SeloPerfil } from '@/components/SeloPerfil'
import { listarEmpresas } from '@/lib/dados/empresas'
import { listarTipos } from '@/lib/dados/ferramentas'
import { buscarHistorico } from '@/lib/dados/historico'
import { listarPessoas } from '@/lib/dados/pessoas'
import {
  lerFiltros,
  paraQuery,
  periodoValido,
  resumoItens,
  ROTULO_CATEGORIA,
  textoVia,
  type LinhaHistorico,
} from '@/lib/dominio/historico'
import { diaDaObra, formatarDiaCurto, formatarHora } from '@/lib/formatos/datas'
import { obterSessao } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Histórico · Almox' }

const CLASSE_CAMPO =
  'min-h-toque w-full rounded-botao border border-borda bg-cartao px-3 text-[15px]'
const TONS: Record<LinhaHistorico['tipo'], string> = {
  retirada: 'bg-aviso-claro text-aviso',
  devolucao: 'bg-sucesso-claro text-sucesso',
  estorno: 'bg-engenheiro-claro text-engenheiro',
  ocorrencia: 'bg-erro-claro text-erro',
}

/** Histórico e auditoria (engenheiro): tudo o que foi lançado, com filtros. */
export default async function PaginaHistorico({ searchParams }: PageProps<'/historico'>) {
  const { obraAtual } = await obterSessao()
  if (obraAtual.perfil !== 'engenheiro') redirect('/inicio')
  const filtros = lerFiltros(await searchParams, new Date())
  const valido = periodoValido(filtros)
  const [linhas, pessoas, empresas, tipos] = await Promise.all([
    valido ? buscarHistorico(obraAtual.id, filtros) : Promise.resolve([]),
    listarPessoas(obraAtual.id),
    listarEmpresas(obraAtual.id),
    listarTipos(obraAtual.id),
  ])

  const dias = new Map<string, LinhaHistorico[]>()
  for (const l of linhas) {
    const dia = diaDaObra(l.quando)
    dias.set(dia, [...(dias.get(dia) ?? []), l])
  }

  return (
    <>
      <Cabecalho
        titulo="Histórico"
        subtitulo="Lançamentos e ocorrências"
        voltarPara="/inicio"
        selo={<SeloPerfil perfil={obraAtual.perfil} />}
      />
      <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-6">
        <form
          method="get"
          aria-label="Filtros"
          className="grid grid-cols-2 gap-2 rounded-cartao bg-cartao p-3"
        >
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-texto-2">
            De
            <input type="date" name="de" defaultValue={filtros.de} className={CLASSE_CAMPO} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-texto-2">
            Até
            <input type="date" name="ate" defaultValue={filtros.ate} className={CLASSE_CAMPO} />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-[13px] font-semibold text-texto-2">
            Pessoa
            <select name="pessoa" defaultValue={filtros.pessoa ?? ''} className={CLASSE_CAMPO}>
              <option value="">Todas</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                  {p.ativa ? '' : ' (inativa)'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-texto-2">
            Empresa
            <select name="empresa" defaultValue={filtros.empresa ?? ''} className={CLASSE_CAMPO}>
              <option value="">Todas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-texto-2">
            Ferramenta
            <select name="tipo" defaultValue={filtros.tipo ?? ''} className={CLASSE_CAMPO}>
              <option value="">Todas</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-texto-2">
            Lançamento
            <select
              name="categoria"
              defaultValue={filtros.categoria ?? ''}
              className={CLASSE_CAMPO}
            >
              <option value="">Todos</option>
              <option value="retirada">Retiradas</option>
              <option value="devolucao">Devoluções</option>
              <option value="estorno">Estornos</option>
              <option value="ocorrencia">Ocorrências</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-texto-2">
            Via
            <select name="via" defaultValue={filtros.via ?? ''} className={CLASSE_CAMPO}>
              <option value="">QR e manual</option>
              <option value="qr">QR do capacete</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <button
            type="submit"
            className="col-span-2 min-h-toque rounded-botao bg-escuro font-bold text-white"
          >
            Filtrar
          </button>
        </form>

        {!valido && (
          <p role="alert" className="rounded-cartao bg-erro-claro px-4 py-3 text-erro">
            Escolha um período de até um ano.
          </p>
        )}
        {valido && (
          <p role="status" className="text-sm text-texto-2">
            {linhas.length === 0
              ? 'Nada lançado com esses filtros.'
              : `${linhas.length} ${linhas.length === 1 ? 'lançamento' : 'lançamentos'}${linhas.length >= 2000 ? ' (mostrando os 2000 mais recentes)' : ''}`}
          </p>
        )}
        {valido && linhas.length > 0 && (
          <a
            href={`/api/planilhas/historico?${paraQuery(filtros)}`}
            download
            className="flex min-h-toque items-center justify-center rounded-botao border border-borda bg-cartao font-bold"
          >
            Baixar planilha (.xlsx)
          </a>
        )}

        {[...dias].map(([dia, doDia]) => (
          <section
            key={dia}
            aria-label={formatarDiaCurto(`${dia}T12:00:00-03:00`)}
            className="flex flex-col gap-1.5"
          >
            <h2 className="pt-1 text-[13px] font-bold tracking-[1.2px] text-texto-2 uppercase">
              {formatarDiaCurto(`${dia}T12:00:00-03:00`)}
            </h2>
            <ul className="flex flex-col divide-y divide-borda rounded-cartao bg-cartao">
              {doDia.map((l) => {
                const conteudo = (
                  <>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONS[l.tipo]}`}
                        >
                          {ROTULO_CATEGORIA[l.tipo]}
                        </span>
                        <span className="font-bold">{l.pessoa}</span>
                      </span>
                      <span className="text-sm text-texto-2 tabular-nums">
                        {formatarHora(l.quando)}
                      </span>
                    </span>
                    {l.itens.length > 0 && (
                      <span className="text-[15px]">{resumoItens(l.itens)}</span>
                    )}
                    {l.obs && <span className="text-[15px] italic">“{l.obs}”</span>}
                    <span className="text-[13px] text-texto-2">
                      {l.empresa} · {textoVia(l)} · por {l.usuario}
                      {l.recebidoEm && ` · sem internet, chegou ${formatarHora(l.recebidoEm)}`}
                    </span>
                  </>
                )
                return (
                  <li key={l.id}>
                    {l.tipo === 'ocorrencia' ? (
                      <div className="flex flex-col gap-0.5 px-4 py-3">{conteudo}</div>
                    ) : (
                      <Link
                        href={`/lancamento/${l.id}`}
                        className="flex flex-col gap-0.5 px-4 py-3"
                      >
                        {conteudo}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </main>
    </>
  )
}
