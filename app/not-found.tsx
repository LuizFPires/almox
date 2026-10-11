import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="font-condensada text-[32px] font-bold">Tela não encontrada</h1>
      <p className="text-texto-2">Esta parte do Almox ainda não existe ou mudou de lugar.</p>
      <Link
        href="/inicio"
        className="flex min-h-toque items-center rounded-botao bg-escuro px-5 font-bold text-white"
      >
        Voltar ao início
      </Link>
    </main>
  )
}
