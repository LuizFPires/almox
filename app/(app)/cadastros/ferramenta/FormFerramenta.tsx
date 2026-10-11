'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { Contador } from '@/components/Contador'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { CHAVES_ICONE, ICONES_FERRAMENTA, type ChaveIcone } from '@/components/icones-ferramenta'
import { RodapeAcao } from '@/components/RodapeAcao'
import { previaCodigos, sugerirPrefixo } from '@/lib/dominio/cadastros'
import { formatarBRL } from '@/lib/formatos/moeda'
import { salvarFerramenta } from './acoes'

type Props = {
  tipo?: {
    id: string
    nome: string
    icone: ChaveIcone
    prefixo: string
    valor_reposicao: number
    alto_valor: boolean
    codigos: string[]
  }
  /** Prefixos já usados na obra (para sugerir um livre). */
  prefixosUsados: string[]
}

/** "289000" → "2.890,00" para o campo de valor. */
function centavosParaCampo(centavos: number) {
  return formatarBRL(centavos).replace(/^R\$\s/, '')
}

export function FormFerramenta({ tipo, prefixosUsados }: Props) {
  const [estado, acao, salvando] = useActionState(salvarFerramenta, {})
  const erros = estado.campos ?? {}
  const v = estado.valores ?? {}
  const novo = !tipo

  const [icone, setIcone] = useState<ChaveIcone | ''>((v.icone as ChaveIcone) ?? tipo?.icone ?? '')
  const [prefixo, setPrefixo] = useState(v.prefixo ?? tipo?.prefixo ?? '')
  const [prefixoEditado, setPrefixoEditado] = useState(!novo)
  const [quantidade, setQuantidade] = useState(Number(v.quantidade ?? (novo ? 1 : 0)))
  const [alto, setAlto] = useState(
    v.alto_valor ? v.alto_valor === 'on' : (tipo?.alto_valor ?? false),
  )

  const sugerir = (nome: string) => {
    if (!prefixoEditado) setPrefixo(sugerirPrefixo(nome, prefixosUsados))
  }

  return (
    <form action={acao} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-6">
        {tipo && <input type="hidden" name="id" value={tipo.id} />}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">Ícone</legend>
          <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4">
            {CHAVES_ICONE.map((chave) => (
              <label
                key={chave}
                className={`flex cursor-pointer flex-col items-center rounded-cartao border-2 px-1 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-foco ${
                  icone === chave ? 'border-escuro bg-cartao' : 'border-transparent bg-cartao'
                }`}
              >
                <input
                  type="radio"
                  name="icone"
                  value={chave}
                  checked={icone === chave}
                  onChange={() => setIcone(chave)}
                  className="sr-only"
                />
                <IconeFerramenta icone={chave} tamanho="p" />
              </label>
            ))}
          </div>
          {erros.icone && <span className="text-sm font-semibold text-erro">{erros.icone}</span>}
        </fieldset>

        <Campo
          rotulo="Nome"
          name="nome"
          defaultValue={v.nome ?? tipo?.nome ?? ''}
          placeholder={icone ? ICONES_FERRAMENTA[icone].nome : 'Ex.: Furadeira de impacto'}
          autoComplete="off"
          required
          erro={erros.nome}
          onChange={(e) => sugerir(e.target.value)}
        />

        {novo ? (
          <Campo
            rotulo="Prefixo do código"
            name="prefixo"
            value={prefixo}
            onChange={(e) => {
              setPrefixoEditado(true)
              setPrefixo(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, '')
                  .slice(0, 4),
              )
            }}
            className="font-mono uppercase"
            ajuda="Vai na etiqueta de cada unidade (ex.: FUR-01). Não muda depois."
            erro={erros.prefixo}
          />
        ) : (
          <p className="text-sm text-texto-2">
            Prefixo <span className="font-mono font-bold text-texto">{tipo.prefixo}</span> · fixo
          </p>
        )}

        <Campo
          rotulo="Valor de reposição (por unidade)"
          name="valor"
          inputMode="decimal"
          defaultValue={v.valor ?? (tipo ? centavosParaCampo(tipo.valor_reposicao) : '')}
          placeholder="0,00"
          required
          ajuda="Base para cobrar a reposição na medição da empreiteira."
          erro={erros.valor}
        />

        <label className="flex min-h-toque cursor-pointer items-center justify-between gap-3 rounded-cartao bg-cartao px-4 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-foco">
          <span className="flex flex-col">
            <span className="font-semibold">Alto valor</span>
            <span className="text-sm text-texto-2">Pede atenção extra na retirada</span>
          </span>
          <input
            type="checkbox"
            name="alto_valor"
            checked={alto}
            onChange={(e) => setAlto(e.target.checked)}
            className="size-6 accent-escuro"
          />
        </label>

        <div className="flex items-center justify-between gap-3 rounded-cartao bg-cartao px-4 py-3">
          <span className="flex flex-col">
            <span className="font-semibold">{novo ? 'Quantidade' : 'Adicionar unidades'}</span>
            <span className="text-sm text-texto-2">
              {novo || quantidade > 0
                ? 'Uma etiqueta por unidade'
                : 'Deixe 0 para só atualizar o valor'}
            </span>
          </span>
          <Contador
            valor={quantidade}
            onChange={setQuantidade}
            rotulo="unidade"
            minimo={novo ? 1 : 0}
            maximo={200}
          />
          <input type="hidden" name="quantidade" value={quantidade} />
        </div>
        {erros.quantidade && (
          <span className="text-sm font-semibold text-erro">{erros.quantidade}</span>
        )}
        {quantidade > 0 && prefixo && (
          <p className="rounded-cartao bg-sutil px-3.5 py-3 text-sm">
            Unidades novas:{' '}
            <b className="font-mono">{previaCodigos(prefixo, tipo?.codigos ?? [], quantidade)}</b>
          </p>
        )}

        <ErroFormulario mensagem={estado.erro} />
      </div>

      <RodapeAcao>
        <Botao type="submit" tamanho="g" larguraTotal disabled={salvando}>
          {salvando ? 'Salvando…' : novo ? 'Salvar ferramenta' : 'Salvar alterações'}
        </Botao>
      </RodapeAcao>
    </form>
  )
}
