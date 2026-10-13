'use client'

import { useActionState, useRef, useState } from 'react'
import { Botao } from '@/components/Botao'
import { Contador } from '@/components/Contador'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { IconeFerramenta } from '@/components/IconeFerramenta'
import { IconeInterface } from '@/components/IconeInterface'
import {
  CHAVES_ICONE,
  GRUPOS_ICONE,
  ICONES_FERRAMENTA,
  ehChaveIcone,
  ehIcone,
  ehIconeArquivo,
  type GrupoIcone,
  type Icone,
  type IconeArquivo,
} from '@/components/icones-ferramenta'
import { RodapeAcao } from '@/components/RodapeAcao'
import { previaCodigos, sugerirPrefixo } from '@/lib/dominio/cadastros'
import { formatarBRL } from '@/lib/formatos/moeda'
import { normalizarTexto } from '@/lib/formatos/texto'
import { prepararIcone } from '@/lib/imagem'
import { criarClienteNavegador } from '@/lib/supabase/navegador'
import { salvarFerramenta } from './acoes'

type Props = {
  obraId: string
  tipo?: {
    id: string
    nome: string
    icone: Icone
    prefixo: string
    valor_reposicao: number
    alto_valor: boolean
    codigos: string[]
  }
  /** Prefixos já usados na obra (o código das peças novas sai do nome, sem colidir). */
  prefixosUsados: string[]
  /** Ícones próprios já enviados nesta obra (ficam na grade para reusar). */
  iconesProprios: IconeArquivo[]
}

/** "289000" → "2.890,00" para o campo de valor. */
function centavosParaCampo(centavos: number) {
  return formatarBRL(centavos).replace(/^R\$\s/, '')
}

export function FormFerramenta({ obraId, tipo, prefixosUsados, iconesProprios }: Props) {
  const [estado, acao, salvando] = useActionState(salvarFerramenta, {})
  const erros = estado.campos ?? {}
  const v = estado.valores ?? {}
  const novo = !tipo

  const inicial = v.icone ?? tipo?.icone ?? ''
  const [icone, setIcone] = useState<Icone | ''>(ehIcone(inicial) ? inicial : '')
  const [enviados, setEnviados] = useState<IconeArquivo[]>(() => {
    const lista = [...iconesProprios]
    if (ehIconeArquivo(inicial) && !lista.includes(inicial)) {
      lista.push(inicial)
    }
    return lista
  })
  const [enviando, setEnviando] = useState(false)
  const [erroIcone, setErroIcone] = useState<string | null>(null)
  const entradaArquivo = useRef<HTMLInputElement>(null)
  const [filtroIcone, setFiltroIcone] = useState('')

  const [nome, setNome] = useState(v.nome ?? tipo?.nome ?? '')
  const [quantidade, setQuantidade] = useState(Number(v.quantidade ?? (novo ? 1 : 0)))
  const [alto, setAlto] = useState(
    v.alto_valor ? v.alto_valor === 'on' : (tipo?.alto_valor ?? false),
  )
  const prefixo = tipo?.prefixo ?? (nome.trim() ? sugerirPrefixo(nome, prefixosUsados) : '')

  async function enviarIcone(arquivo: File | undefined) {
    if (!arquivo) return
    setErroIcone(null)
    if (arquivo.size > 5 * 1024 * 1024) {
      setErroIcone('Imagem grande demais (até 5 MB).')
      return
    }
    setEnviando(true)
    try {
      const blob = await prepararIcone(arquivo)
      const caminho = `${obraId}/${crypto.randomUUID()}.png`
      const { error } = await criarClienteNavegador()
        .storage.from('icones')
        .upload(caminho, blob, { contentType: 'image/png', upsert: false })
      if (error) throw error
      const novoIcone: IconeArquivo = `arquivo:${caminho}`
      setEnviados((lista) => [...lista, novoIcone])
      setIcone(novoIcone)
    } catch {
      setErroIcone('Não foi possível enviar a imagem. Confira a internet e tente de novo.')
    } finally {
      setEnviando(false)
      if (entradaArquivo.current) entradaArquivo.current.value = ''
    }
  }

  const busca = normalizarTexto(filtroIcone.trim())
  const grupos: { titulo: string; icones: Icone[] }[] = [
    { titulo: 'Próprios da obra', icones: busca ? [] : enviados },
    ...(Object.keys(GRUPOS_ICONE) as GrupoIcone[]).map((grupo) => ({
      titulo: GRUPOS_ICONE[grupo],
      icones: CHAVES_ICONE.filter(
        (c) =>
          ICONES_FERRAMENTA[c].grupo === grupo &&
          (!busca || normalizarTexto(ICONES_FERRAMENTA[c].nome).includes(busca)),
      ),
    })),
  ].filter((g) => g.icones.length > 0)

  function escolher(chave: Icone) {
    setIcone(chave)
    // Ferramenta nova sem nome: o nome do ícone já serve de ponto de partida.
    if (novo && !nome.trim() && ehChaveIcone(chave)) setNome(ICONES_FERRAMENTA[chave].nome)
  }

  function opcao(chave: Icone) {
    return (
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
          onChange={() => escolher(chave)}
          className="sr-only"
        />
        <IconeFerramenta
          icone={chave}
          nome={ehChaveIcone(chave) ? undefined : 'Próprio'}
          tamanho="p"
        />
      </label>
    )
  }

  return (
    <form action={acao} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-6">
        {tipo && <input type="hidden" name="id" value={tipo.id} />}

        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-1.5 text-sm font-semibold">Ícone</legend>
          <div className="flex gap-2">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-botao border border-borda bg-cartao px-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-foco">
              <IconeInterface nome="search" tamanho={20} className="shrink-0 text-texto-2" />
              <span className="sr-only">Buscar ícone</span>
              <input
                type="search"
                value={filtroIcone}
                onChange={(e) => setFiltroIcone(e.target.value)}
                placeholder="Buscar ícone"
                className="min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => entradaArquivo.current?.click()}
              disabled={enviando}
              className="flex h-12 shrink-0 items-center gap-1.5 rounded-botao border-2 border-dashed border-texto-2 bg-sutil px-3 text-sm font-bold"
            >
              <IconeInterface nome="upload" tamanho={18} />
              {enviando ? 'Enviando…' : 'Enviar ícone'}
            </button>
          </div>
          <input
            ref={entradaArquivo}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            tabIndex={-1}
            aria-label="Escolher imagem do ícone"
            onChange={(e) => void enviarIcone(e.target.files?.[0])}
          />
          {erroIcone && (
            <span role="alert" className="text-sm font-semibold text-erro">
              {erroIcone}
            </span>
          )}
          {erros.icone && <span className="text-sm font-semibold text-erro">{erros.icone}</span>}
          <div className="flex max-h-[22rem] flex-col gap-3 overflow-y-auto rounded-cartao bg-sutil p-2">
            {grupos.map((g) => (
              <div key={g.titulo} className="flex flex-col gap-2">
                <span className="text-[13px] font-bold tracking-[1.2px] text-texto-2 uppercase">
                  {g.titulo}
                </span>
                <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4">
                  {g.icones.map((chave) => opcao(chave))}
                </div>
              </div>
            ))}
          </div>
          {grupos.length === 0 && (
            <span className="text-sm text-texto-2">
              Nenhum ícone com “{filtroIcone.trim()}”. Use <b>Enviar ícone</b> com uma imagem da
              ferramenta.
            </span>
          )}
          <span className="text-sm text-texto-2">
            Não achou? Envie uma imagem da ferramenta (PNG, JPG ou SVG), de preferência com fundo
            transparente. Fica disponível para as outras ferramentas da obra.
          </span>
        </fieldset>

        <Campo
          rotulo="Nome"
          name="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={
            icone && ehChaveIcone(icone) ? ICONES_FERRAMENTA[icone].nome : 'Ex.: Betoneira 400 L'
          }
          autoComplete="off"
          required
          erro={erros.nome}
        />

        <Campo
          rotulo="Valor de reposição (por unidade)"
          name="valor"
          inputMode="decimal"
          defaultValue={v.valor ?? (tipo ? centavosParaCampo(tipo.valor_reposicao) : '')}
          placeholder="0,00"
          required
          prefixo="R$"
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
                ? 'Peças iguais deste tipo'
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
        <p
          className="flex flex-col gap-0.5 rounded-cartao bg-sutil px-3.5 py-3 text-sm"
          aria-live="polite"
        >
          <span>
            Códigos das peças:{' '}
            {!prefixo ? (
              <b>digite o nome</b>
            ) : quantidade === 0 ? (
              <b>nenhuma nova (só muda o valor)</b>
            ) : (
              <>
                <b className="font-mono">
                  {previaCodigos(prefixo, tipo?.codigos ?? [], quantidade)}
                </b>
                {' · '}total passa a {(tipo?.codigos.length ?? 0) + quantidade}
              </>
            )}
          </span>
          <span className="text-[13px] text-texto-2">
            Criados sozinhos pelo nome. Servem para achar a peça na lista e na avaria.
          </span>
        </p>

        <ErroFormulario mensagem={estado.erro} />
      </div>

      <RodapeAcao>
        <Botao type="submit" tamanho="g" larguraTotal disabled={salvando || enviando}>
          {salvando
            ? 'Salvando…'
            : quantidade === 0
              ? 'Salvar valor'
              : `Salvar ${quantidade} ${quantidade === 1 ? 'unidade' : 'unidades'}`}
        </Botao>
      </RodapeAcao>
    </form>
  )
}
