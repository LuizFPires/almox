import type { Metadata } from 'next'
import { Cartao } from '@/components/Cartao'

export const metadata: Metadata = { title: 'Ferramentas · Cadastros · Almox' }

export default function Pagina() {
  return <Cartao className="py-6 text-center text-[15px] text-texto-2">Em breve.</Cartao>
}
