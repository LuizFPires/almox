import Link from 'next/link'
import { IconeImpressora } from '@/components/IconeImpressora'

type Props = {
  impressora: { nome: string; rolo: string | null } | null
  agente: { online: boolean; texto: string }
  /** Tela Impressora (com `volta` para voltar aonde estava). */
  href: string
}

/**
 * Impressora da obra (protótipo › Cadastros e Imprimir): verde quando a impressora está
 * escolhida e o agente do mini PC está online; vermelho quando falta um dos dois.
 */
export function CartaoImpressora({ impressora, agente, href }: Props) {
  const pronta = Boolean(impressora) && agente.online
  const subtitulo = !impressora
    ? 'Toque para escolher a da rede da obra'
    : agente.online
      ? `Wi-Fi da obra · rolo ${impressora.rolo ?? '60 × 80 mm'}`
      : agente.texto
  return (
    <Link
      href={href}
      className={`flex min-h-toque items-center gap-3 rounded-cartao border bg-cartao px-4 py-3 ${
        pronta ? 'border-borda' : 'border-2 border-erro'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
          pronta ? 'bg-sucesso-claro text-sucesso' : 'bg-erro-claro text-erro'
        }`}
      >
        <IconeImpressora />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-semibold">
          {impressora ? impressora.nome : 'Nenhuma impressora escolhida'}
        </span>
        <span className={`truncate text-[13px] ${pronta ? 'text-texto-2' : 'text-erro'}`}>
          {subtitulo}
        </span>
      </span>
      <span className="text-sm font-bold underline">{impressora ? 'Trocar' : 'Escolher'}</span>
    </Link>
  )
}
