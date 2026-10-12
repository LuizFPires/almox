'use client'

import { useActionState } from 'react'
import { Botao } from '@/components/Botao'
import { Campo, ErroFormulario } from '@/components/Formulario'
import { msEmSegundos, type ConfigTv } from '@/lib/dominio/tv'
import { salvarConfigTv } from './acoes'

export function FormPainelTv({ config }: { config: ConfigTv }) {
  const [estado, acao, salvando] = useActionState(salvarConfigTv, {})
  const erros = estado.campos ?? {}
  const v = estado.valores ?? {}
  const cartoes = v.cartoes ?? String(config.cartoesPorPagina)

  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo
        rotulo="Tempo por página (segundos)"
        name="tempo"
        inputMode="numeric"
        defaultValue={v.tempo ?? String(config.tempoPaginaS)}
        ajuda="De 3 a 30. Padrão: 8."
        erro={erros.tempo}
      />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">Cartões por página</legend>
        <div className="grid grid-cols-3 gap-2">
          {['8', '12', '16'].map((n) => (
            <label
              key={n}
              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-botao border border-borda bg-cartao font-bold has-checked:border-2 has-checked:border-escuro"
            >
              <input type="radio" name="cartoes" value={n} defaultChecked={cartoes === n} />
              {n}
            </label>
          ))}
        </div>
        {erros.cartoes && <span className="text-sm text-erro">{erros.cartoes}</span>}
      </fieldset>
      <Campo
        rotulo="Velocidade das colunas por empresa (px/s)"
        name="velocidade"
        inputMode="numeric"
        defaultValue={v.velocidade ?? String(config.velocidadePxS)}
        ajuda="De 15 a 150. Padrão: 45."
        erro={erros.velocidade}
      />
      <Campo
        rotulo="Pausa antes da rolagem (segundos)"
        name="antes"
        inputMode="decimal"
        defaultValue={v.antes ?? msEmSegundos(config.pausaAntesMs)}
        ajuda="Padrão: 2,5."
        erro={erros.antes}
      />
      <Campo
        rotulo="Pausa depois da rolagem (segundos)"
        name="depois"
        inputMode="decimal"
        defaultValue={v.depois ?? msEmSegundos(config.pausaDepoisMs)}
        ajuda="Padrão: 3."
        erro={erros.depois}
      />
      <ErroFormulario mensagem={estado.erro} />
      {estado.aviso && (
        <p
          role="status"
          className="rounded-botao bg-sucesso-claro px-3 py-2.5 text-[15px] text-sucesso"
        >
          {estado.aviso}
        </p>
      )}
      <Botao type="submit" larguraTotal disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </Botao>
    </form>
  )
}
