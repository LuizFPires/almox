import type { Metadata } from 'next'
import { Cabecalho } from '@/components/Cabecalho'
import { FormImportar } from './FormImportar'

export const metadata: Metadata = { title: 'Importar planilha · Almox' }

/** Cadastro inicial por planilha (M11): modelo → prévia com erros → importar tudo de uma vez. */
export default function PaginaImportar() {
  return (
    <>
      <Cabecalho
        titulo="Importar planilha"
        subtitulo="Cadastro inicial da obra"
        voltarPara="/cadastros/pessoas"
      />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-6">
        <ol className="flex list-decimal flex-col gap-1 rounded-cartao bg-cartao py-3 pr-4 pl-9 text-[15px]">
          <li>Baixe a planilha modelo e preencha as abas Empresas, Pessoas e Ferramentas.</li>
          <li>Envie o arquivo: o Almox mostra o que vai entrar e os erros, linha a linha.</li>
          <li>Sem erros, importe. Tudo entra de uma vez (ou nada, se algo falhar).</li>
        </ol>
        <a
          href="/api/planilhas/modelo"
          download
          className="flex min-h-toque items-center justify-center rounded-botao border border-borda bg-cartao font-bold"
        >
          Baixar planilha modelo (.xlsx)
        </a>
        <FormImportar />
      </main>
    </>
  )
}
