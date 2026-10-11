'use client'

import { useActionState, useId, useState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { RodapeAcao } from '@/components/RodapeAcao'
import {
  capaceteRepetido,
  FUNCOES_SUGERIDAS,
  digitarNomeCapacete,
  sugerirNomeCapacete,
} from '@/lib/dominio/cadastros'
import { salvarPessoa } from './acoes'

type Props = {
  pessoa?: { id: string; nome: string; nome_capacete: string; funcao: string; empresa_id: string }
  empresas: { id: string; nome: string; cor: string }[]
  /** Nomes de capacete já usados na obra (sem o da própria pessoa). */
  capacetesUsados: string[]
}

const CLASSE_CHIP =
  'flex min-h-toque cursor-pointer items-center rounded-full border px-3.5 text-[15px] font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-foco'

export function FormPessoa({ pessoa, empresas, capacetesUsados }: Props) {
  const [estado, acao, salvando] = useActionState(salvarPessoa, {})
  const idErroFuncao = useId()
  const idErroEmpresa = useId()
  const erros = estado.campos ?? {}
  const funcaoInicial = pessoa?.funcao ?? ''
  const ehSugerida = (FUNCOES_SUGERIDAS as readonly string[]).includes(funcaoInicial)

  const [capacete, setCapacete] = useState(pessoa?.nome_capacete ?? '')
  const [capaceteEditado, setCapaceteEditado] = useState(Boolean(pessoa))
  const [funcao, setFuncao] = useState(funcaoInicial ? (ehSugerida ? funcaoInicial : 'Outra') : '')
  const [empresa, setEmpresa] = useState(pessoa?.empresa_id ?? '')
  const repetido = capaceteRepetido(capacete, capacetesUsados)

  return (
    <form action={acao} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-6">
        {pessoa && <input type="hidden" name="id" value={pessoa.id} />}
        <Campo
          rotulo="Nome completo"
          name="nome"
          defaultValue={estado.valores?.nome ?? pessoa?.nome}
          placeholder="Ex.: Pedro Henrique Costa"
          autoComplete="off"
          required
          erro={erros.nome}
          onChange={(e) => {
            if (!capaceteEditado) setCapacete(sugerirNomeCapacete(e.target.value, capacetesUsados))
          }}
        />
        <Campo
          rotulo="Nome no capacete"
          name="nome_capacete"
          value={capacete}
          onChange={(e) => {
            setCapaceteEditado(true)
            setCapacete(digitarNomeCapacete(e.target.value))
          }}
          placeholder="Como ele é chamado na obra"
          className="min-h-14! text-2xl! font-bold tracking-wide"
          autoComplete="off"
          erro={erros.nome_capacete}
          ajuda={
            repetido ? (
              <span className="font-semibold text-aviso">
                Já existe outro {capacete} nesta obra. Pode salvar, mas na conferência confira o
                nome completo.
              </span>
            ) : (
              'Vai impresso grande no adesivo do capacete.'
            )
          }
        />

        <fieldset
          className="flex flex-col gap-2"
          aria-describedby={erros.funcao ? idErroFuncao : undefined}
        >
          <legend className="mb-1.5 text-sm font-semibold">Função</legend>
          <div className="flex flex-wrap gap-2">
            {[...FUNCOES_SUGERIDAS, 'Outra'].map((f) => (
              <label
                key={f}
                className={`${CLASSE_CHIP} ${funcao === f ? 'border-escuro bg-escuro text-white' : 'border-borda bg-cartao'}`}
              >
                <input
                  type="radio"
                  name="funcao"
                  value={f}
                  checked={funcao === f}
                  onChange={() => setFuncao(f)}
                  className="sr-only"
                />
                {f}
              </label>
            ))}
          </div>
          {funcao === 'Outra' && (
            <Campo
              rotulo="Qual função?"
              name="funcao_outra"
              defaultValue={estado.valores?.funcao_outra ?? (ehSugerida ? '' : funcaoInicial)}
              required
            />
          )}
          {erros.funcao && (
            <span id={idErroFuncao} className="text-sm font-semibold text-erro">
              {erros.funcao}
            </span>
          )}
        </fieldset>

        <fieldset
          className="flex flex-col gap-2"
          aria-describedby={erros.empresa_id ? idErroEmpresa : undefined}
        >
          <legend className="mb-1.5 text-sm font-semibold">Empresa</legend>
          <div className="flex flex-wrap gap-2">
            {empresas.map((e) => (
              <label
                key={e.id}
                className={`${CLASSE_CHIP} gap-2 ${empresa === e.id ? 'border-escuro bg-escuro text-white' : 'border-borda bg-cartao'}`}
              >
                <input
                  type="radio"
                  name="empresa_id"
                  value={e.id}
                  checked={empresa === e.id}
                  onChange={() => setEmpresa(e.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="size-3 rounded-full"
                  style={{ background: e.cor }}
                />
                {e.nome}
              </label>
            ))}
          </div>
          {erros.empresa_id && (
            <span id={idErroEmpresa} className="text-sm font-semibold text-erro">
              {erros.empresa_id}
            </span>
          )}
        </fieldset>

        {!pessoa && (
          <p className="rounded-cartao bg-sutil px-3.5 py-3 text-sm">
            A matrícula e o código do QR são gerados ao salvar. O QR leva só um código, nunca o
            nome.
          </p>
        )}

        <ErroFormulario mensagem={estado.erro} />
      </div>

      <RodapeAcao>
        {pessoa ? (
          <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Botao>
        ) : (
          <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar e imprimir adesivo'}
          </Botao>
        )}
      </RodapeAcao>
    </form>
  )
}
