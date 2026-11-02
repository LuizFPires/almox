import Link from 'next/link'

/**
 * Enquanto o e-mail próprio não está ligado (`CODIGO_POR_EMAIL`), o código não chega: o caminho é
 * o engenheiro da obra, dito em poucas linhas. Vale para "Esqueci a senha" e "Criar conta".
 */
export function SemEmail({ titulo }: { titulo: string }) {
  return (
    <>
      <h1 className="text-[28px] font-bold tracking-tight">{titulo}</h1>
      <p className="text-texto-2">
        Quem libera o acesso ao Almox é o engenheiro da obra. Peça a ele:
      </p>
      <ul className="flex flex-col gap-3">
        <li className="rounded-cartao bg-cartao px-4 py-3">
          <b className="block">Primeiro acesso</b>
          <span className="text-[15px] text-texto-2">
            Ele cadastra seu e-mail em <b>Cadastros › Acessos</b> e te passa a senha para entrar.
          </span>
        </li>
        <li className="rounded-cartao bg-cartao px-4 py-3">
          <b className="block">Esqueceu a senha</b>
          <span className="text-[15px] text-texto-2">
            Ele gera uma senha nova no seu acesso. Ao entrar, você cria uma senha só sua.
          </span>
        </li>
      </ul>
      <Link
        href="/login"
        className="flex min-h-toque items-center justify-center rounded-botao bg-escuro font-bold text-white"
      >
        Voltar para entrar
      </Link>
    </>
  )
}
