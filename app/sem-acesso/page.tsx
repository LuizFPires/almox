import type { Metadata } from 'next'
import { Botao } from '@/components/Botao'
import { Marca } from '@/components/Marca'
import { sair } from '../login/acoes'

export const metadata: Metadata = { title: 'Sem acesso · Almox' }

export default function PaginaSemAcesso() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-6 px-5">
      <Marca altura={36} />
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold tracking-tight">Sem obra liberada</h1>
        <p className="text-texto-2">
          Seu login existe, mas não está ligado a nenhuma obra em andamento (ou a obra foi
          encerrada). Peça ao engenheiro da obra para liberar o seu acesso.
        </p>
      </div>
      <form action={sair}>
        <Botao type="submit" variante="secundaria" tamanho="g" larguraTotal>
          Sair
        </Botao>
      </form>
    </main>
  )
}
