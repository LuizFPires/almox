'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { Botao } from '@/components/Botao'
import { analisarPlanilha, importarPlanilha, type RespostaImportacao } from './acoes'

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`
}

/** Envia a planilha, mostra a prévia (o que entra, erros e linhas puladas) e importa. */
export function FormImportar() {
  const arquivo = useRef<HTMLInputElement>(null)
  const [resposta, setResposta] = useState<RespostaImportacao | null>(null)
  const [enviando, iniciar] = useTransition()

  function enviar(acao: typeof analisarPlanilha) {
    const f = arquivo.current?.files?.[0]
    if (!f) {
      setResposta({ tipo: 'erro', texto: 'Escolha a planilha.' })
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setResposta({ tipo: 'erro', texto: 'Planilha grande demais (máximo 5 MB).' })
      return
    }
    const form = new FormData()
    form.set('arquivo', f)
    iniciar(async () => {
      try {
        setResposta(await acao(form))
      } catch {
        setResposta({ tipo: 'erro', texto: 'Sem conexão com o Almox. Tente de novo.' })
      }
    })
  }

  const previa = resposta && resposta.tipo !== 'erro' ? resposta.previa : null

  if (resposta?.tipo === 'importado' && previa) {
    return (
      <section
        aria-label="Importado"
        className="flex flex-col gap-3 rounded-cartao bg-sucesso-claro px-4 py-4 text-sucesso"
      >
        <h2 className="text-xl font-bold">Cadastro importado</h2>
        <p className="text-[15px]">
          {plural(previa.empresas, 'empresa', 'empresas')},{' '}
          {plural(previa.pessoas, 'pessoa', 'pessoas')} e{' '}
          {plural(previa.ferramentas, 'ferramenta', 'ferramentas')} (
          {plural(previa.unidades, 'unidade', 'unidades')}).
        </p>
        {resposta.pessoas.length > 0 && (
          <Link
            href="/cadastros/adesivos"
            className="flex min-h-toque items-center justify-center rounded-botao bg-escuro font-bold text-white"
          >
            Imprimir os adesivos ({plural(resposta.pessoas.length, 'pessoa nova', 'pessoas novas')})
          </Link>
        )}
        <Link href="/cadastros/pessoas" className="text-center font-bold underline">
          Ver as pessoas
        </Link>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-[15px] font-semibold">
        Planilha preenchida
        <input
          ref={arquivo}
          type="file"
          name="arquivo"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={() => setResposta(null)}
          className="min-h-toque rounded-botao border border-borda bg-cartao px-3 py-2 text-[15px]"
        />
      </label>
      <Botao
        variante="escura"
        tamanho="g"
        larguraTotal
        disabled={enviando}
        onClick={() => enviar(analisarPlanilha)}
      >
        {enviando && !previa ? 'Lendo…' : 'Ver prévia'}
      </Botao>

      {resposta?.tipo === 'erro' && (
        <p
          role="alert"
          className="rounded-cartao bg-erro-claro px-4 py-3 text-[15px] font-semibold text-erro"
        >
          {resposta.texto}
        </p>
      )}

      {previa && (
        <section aria-label="Prévia" className="flex flex-col gap-2.5">
          <p role="status" className="rounded-cartao bg-cartao px-4 py-3 text-[15px]">
            Vai entrar: <b>{plural(previa.empresas, 'empresa', 'empresas')}</b>,{' '}
            <b>{plural(previa.pessoas, 'pessoa', 'pessoas')}</b> e{' '}
            <b>{plural(previa.ferramentas, 'ferramenta', 'ferramentas')}</b> (
            {plural(previa.unidades, 'unidade', 'unidades')}).
          </p>
          {previa.erros.length > 0 && (
            <div className="flex flex-col gap-1 rounded-cartao bg-erro-claro px-4 py-3 text-erro">
              <p className="font-bold">
                {plural(previa.erros.length, 'erro', 'erros')}: corrija na planilha e envie de novo.
              </p>
              <ul className="flex flex-col gap-0.5 text-[15px]">
                {previa.erros.map((e) => (
                  <li key={`${e.aba}-${e.linha}-${e.texto}`}>
                    {e.aba}, linha {e.linha}: {e.texto}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {previa.avisos.length > 0 && (
            <div className="flex flex-col gap-1 rounded-cartao bg-aviso-claro px-4 py-3 text-aviso">
              <p className="font-bold">Já cadastradas (puladas):</p>
              <ul className="flex flex-col gap-0.5 text-[15px]">
                {previa.avisos.map((a) => (
                  <li key={`${a.aba}-${a.linha}`}>
                    {a.aba}, linha {a.linha}: {a.texto}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {previa.erros.length === 0 &&
            previa.empresas + previa.pessoas + previa.ferramentas > 0 && (
              <Botao
                tamanho="g"
                larguraTotal
                disabled={enviando}
                onClick={() => enviar(importarPlanilha)}
              >
                {enviando ? 'Importando…' : 'Importar tudo'}
              </Botao>
            )}
        </section>
      )}
    </div>
  )
}
