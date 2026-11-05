'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { dispensarPedido } from '@/app/(app)/materiais/acoes'
import { Botao } from '@/components/Botao'
import { BotaoNovoMaterial } from '@/components/GavetaNovoMaterial'
import { formatarDataHora } from '@/lib/formatos/datas'

type Pedido = { id: string; nome: string; pedidoPor: string; criadoEm: string }

/** Pedidos de cadastro feitos pelo almoxarife: cadastrar o material ou dispensar o pedido. */
export function PedidosCadastro({ pedidos }: { pedidos: Pedido[] }) {
  const router = useRouter()
  const [erro, setErro] = useState('')
  const [pendente, iniciar] = useTransition()

  function dispensar(id: string) {
    setErro('')
    iniciar(async () => {
      const r = await dispensarPedido(id)
      if (!r.ok) setErro(r.erro)
      else router.refresh()
    })
  }

  return (
    <section aria-labelledby="titulo-pedidos" className="flex flex-col gap-2">
      <h2
        id="titulo-pedidos"
        className="mt-1 text-[13px] font-bold tracking-[1.2px] text-texto-2 uppercase"
      >
        Pedidos de cadastro · {pedidos.length}
      </h2>
      {erro && (
        <p role="alert" className="rounded-botao bg-erro-claro px-3 py-2.5 text-[15px] text-erro">
          {erro}
        </p>
      )}
      {pedidos.map((p) => (
        <div key={p.id} className="flex flex-col gap-2.5 rounded-cartao bg-aviso-claro px-3.5 py-3">
          <div className="flex flex-col">
            <span className="text-base font-bold text-aviso">{p.nome}</span>
            <span className="text-[13px] text-aviso">
              Pedido de {p.pedidoPor} · {formatarDataHora(p.criadoEm)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <BotaoNovoMaterial
              pedido={{ id: p.id, nome: p.nome }}
              rotulo={`Cadastrar ${p.nome}`}
              className="inline-flex min-h-toque items-center justify-center rounded-botao bg-engenheiro text-[15px] font-bold text-white"
            >
              Cadastrar
            </BotaoNovoMaterial>
            <Botao variante="secundaria" disabled={pendente} onClick={() => dispensar(p.id)}>
              Dispensar
            </Botao>
          </div>
        </div>
      ))}
    </section>
  )
}
