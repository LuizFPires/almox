'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { CLASSE_CAMPO, Campo, ErroFormulario, Secao } from '@/components/Formulario'
import { RodapeAcao } from '@/components/RodapeAcao'
import { CORES_EMPRESA } from '@/lib/dominio/cadastros'
import { salvarEmpresa } from './acoes'

type Props = {
  empresa?: {
    id: string
    nome: string
    tipo: 'propria' | 'empreiteira'
    cor: string
    dono_nome: string | null
    dono_email: string | null
    encarregado_pessoa_id: string | null
    encarregado_email: string | null
    proxima_medicao: string | null
  }
  /** Pessoas ativas da empresa (candidatas a encarregado). Vazio para empresa nova. */
  pessoas: { id: string; nome: string }[]
  corSugerida: string
}

export function FormEmpresa({ empresa, pessoas, corSugerida }: Props) {
  const [estado, acao, salvando] = useActionState(salvarEmpresa, {})
  const [tipo, setTipo] = useState(empresa?.tipo ?? 'empreiteira')
  const [cor, setCor] = useState(empresa?.cor ?? corSugerida)
  const erros = estado.campos ?? {}

  return (
    <form action={acao} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-6">
        {empresa && <input type="hidden" name="id" value={empresa.id} />}
        <Campo
          rotulo="Nome da empresa"
          name="nome"
          defaultValue={empresa?.nome}
          placeholder="Ex.: Pinturas Silva"
          required
          erro={erros.nome}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">Tipo</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['empreiteira', 'Empreiteira'],
                ['propria', 'Construtora (própria)'],
              ] as const
            ).map(([valor, rotulo]) => (
              <label
                key={valor}
                className={`flex min-h-toque cursor-pointer items-center justify-center rounded-botao border px-2 text-center text-[15px] font-semibold ${
                  tipo === valor
                    ? 'border-2 border-escuro bg-cartao'
                    : 'border-borda bg-cartao text-texto-2'
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={valor}
                  checked={tipo === valor}
                  onChange={() => setTipo(valor)}
                  className="sr-only"
                />
                {rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">Cor no painel da TV</legend>
          <div className="flex flex-wrap gap-2">
            {CORES_EMPRESA.map((c) => (
              <label key={c} className="cursor-pointer">
                <input
                  type="radio"
                  name="cor"
                  value={c}
                  checked={cor === c}
                  onChange={() => setCor(c)}
                  className="peer sr-only"
                  aria-label={`Cor ${c}`}
                />
                <span
                  aria-hidden="true"
                  className="block size-toque rounded-full border-4 border-transparent peer-checked:border-escuro peer-focus-visible:outline-3 peer-focus-visible:outline-foco"
                  style={{ background: c }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {tipo === 'empreiteira' ? (
          <>
            <Secao titulo="DONO DA EMPREITEIRA">
              <Campo rotulo="Nome" name="dono_nome" defaultValue={empresa?.dono_nome ?? ''} />
              <Campo
                rotulo="E-mail"
                name="dono_email"
                type="email"
                inputMode="email"
                defaultValue={empresa?.dono_email ?? ''}
                placeholder="nome@empresa.com.br"
                ajuda="Recebe o aviso de ferramenta não devolvida."
                erro={erros.dono_email}
              />
            </Secao>
            <Secao titulo="ENCARREGADO NA OBRA">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="campo-encarregado" className="text-sm font-semibold">
                  Pessoa
                </label>
                <select
                  id="campo-encarregado"
                  name="encarregado_pessoa_id"
                  defaultValue={empresa?.encarregado_pessoa_id ?? ''}
                  disabled={pessoas.length === 0}
                  className={CLASSE_CAMPO}
                >
                  <option value="">
                    {pessoas.length === 0 ? 'Cadastre as pessoas da empresa primeiro' : 'Escolha…'}
                  </option>
                  {pessoas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <Campo
                rotulo="E-mail do encarregado"
                name="encarregado_email"
                type="email"
                inputMode="email"
                defaultValue={empresa?.encarregado_email ?? ''}
                erro={erros.encarregado_email}
              />
            </Secao>
            <Campo
              rotulo="Próxima medição"
              name="proxima_medicao"
              type="date"
              defaultValue={empresa?.proxima_medicao ?? ''}
              ajuda="O desconto é cancelado se a ferramenta voltar antes desta data."
              erro={erros.proxima_medicao}
            />
          </>
        ) : (
          <p className="rounded-cartao bg-sutil px-3.5 py-3 text-sm">
            Pendências de funcionários próprios não geram desconto: vão só para o engenheiro.
          </p>
        )}

        <ErroFormulario mensagem={estado.erro} />
      </div>

      <RodapeAcao>
        <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar empresa'}
        </Botao>
      </RodapeAcao>
    </form>
  )
}
