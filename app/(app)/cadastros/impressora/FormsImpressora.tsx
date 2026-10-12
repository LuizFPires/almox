'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { criarDispositivo, imprimirTeste, salvarImpressora, type EstadoAcaoSimples } from './acoes'

function Aviso({ texto }: { texto?: string }) {
  if (!texto) return null
  return (
    <p
      role="status"
      className="rounded-botao bg-sucesso-claro px-3 py-2.5 text-[15px] text-sucesso"
    >
      {texto}
    </p>
  )
}

type Impressora = {
  id: string
  nome: string
  ip: string
  porta: number
  linguagem: 'ZPL' | 'TSPL'
  rolo: string | null
}

export function FormImpressora({ impressora }: { impressora: Impressora | null }) {
  const [estado, acao, salvando] = useActionState(salvarImpressora, {})
  const erros = estado.campos ?? {}
  const v = estado.valores ?? {}
  const [linguagem, setLinguagem] = useState(v.linguagem ?? impressora?.linguagem ?? 'ZPL')

  return (
    <form action={acao} className="flex flex-col gap-4">
      {impressora && <input type="hidden" name="id" value={impressora.id} />}
      <Campo
        rotulo="Nome"
        name="nome"
        defaultValue={v.nome ?? impressora?.nome ?? 'Etiquetadora do almoxarifado'}
        erro={erros.nome}
      />
      <div className="grid grid-cols-[1fr_96px] gap-3">
        <Campo
          rotulo="IP na rede da obra"
          name="ip"
          inputMode="decimal"
          defaultValue={v.ip ?? impressora?.ip ?? ''}
          placeholder="192.168.0.50"
          erro={erros.ip}
        />
        <Campo
          rotulo="Porta"
          name="porta"
          inputMode="numeric"
          defaultValue={v.porta ?? String(impressora?.porta ?? 9100)}
          erro={erros.porta}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Linguagem da impressora</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['ZPL', 'ZPL (Zebra)'],
              ['TSPL', 'TSPL (TSC, Elgin, Argox)'],
            ] as const
          ).map(([valor, rotulo]) => (
            <label
              key={valor}
              className={`flex min-h-toque cursor-pointer items-center justify-center rounded-botao border px-2 text-center text-sm font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-foco ${
                linguagem === valor ? 'border-2 border-escuro bg-cartao' : 'border-borda bg-cartao'
              }`}
            >
              <input
                type="radio"
                name="linguagem"
                value={valor}
                checked={linguagem === valor}
                onChange={() => setLinguagem(valor)}
                className="sr-only"
              />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>
      <Campo
        rotulo="Rolo"
        name="rolo"
        defaultValue={v.rolo ?? impressora?.rolo ?? '60 × 80 mm'}
        ajuda="Adesivo de poliéster ou vinil com ribbon de resina (resiste a sol e chuva)."
      />
      <ErroFormulario mensagem={estado.erro} />
      <Aviso texto={estado.aviso} />
      <Botao type="submit" variante="engenheiro" tamanho="g" larguraTotal disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar impressora'}
      </Botao>
    </form>
  )
}

export function BotaoTeste({ habilitado }: { habilitado: boolean }) {
  const [estado, acao, enviando] = useActionState(
    async (): Promise<EstadoAcaoSimples> => imprimirTeste(),
    {},
  )
  return (
    <form action={acao} className="flex flex-col gap-2">
      <Botao type="submit" variante="secundaria" larguraTotal disabled={!habilitado || enviando}>
        {enviando ? 'Enviando…' : 'Imprimir etiqueta de teste'}
      </Botao>
      <ErroFormulario mensagem={estado.erro} />
      <Aviso texto={estado.aviso} />
    </form>
  )
}

export function FormDispositivo({ url, chave }: { url: string; chave: string }) {
  const [estado, acao, criando] = useActionState(criarDispositivo, {})
  if (estado.token) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-bold">{estado.nome} cadastrado</p>
        <p className="text-sm">
          Copie agora para o arquivo <code className="font-mono">agente-impressao/.env</code> do
          mini PC. O token aparece só desta vez.
        </p>
        <pre
          aria-label="Configuração do agente"
          className="overflow-x-auto rounded-botao bg-sutil p-3 font-mono text-xs leading-relaxed select-all"
        >
          {`ALMOX_SUPABASE_URL=${url}\nALMOX_CHAVE_PUBLICA=${chave}\nALMOX_TOKEN_DISPOSITIVO=${estado.token}`}
        </pre>
        <p className="text-sm">
          No navegador da TV (no mesmo mini PC), abra este endereço uma vez. Depois o painel abre
          sozinho em <code className="font-mono">/tv</code>.
        </p>
        <pre
          aria-label="Endereço do painel da TV"
          className="overflow-x-auto rounded-botao bg-sutil p-3 font-mono text-xs leading-relaxed select-all"
        >
          {`${window.location.origin}/tv/entrar?t=${estado.token}`}
        </pre>
        <a
          href={`/tv/entrar?t=${estado.token}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center justify-center rounded-botao border border-borda bg-cartao font-bold"
        >
          Abrir painel nesta TV
        </a>
      </div>
    )
  }
  return (
    <form action={acao} className="flex flex-col gap-3">
      <Campo rotulo="Nome do aparelho" name="nome" defaultValue="Mini PC do almoxarifado" />
      <ErroFormulario mensagem={estado.erro} />
      <Botao type="submit" variante="secundaria" larguraTotal disabled={criando}>
        {criando ? 'Cadastrando…' : 'Cadastrar mini PC (gera o token)'}
      </Botao>
    </form>
  )
}
