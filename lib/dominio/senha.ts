// Sem letras e números que se confundem ao ditar ou ler (0/O, 1/I/L).
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Senha provisória legível para o engenheiro passar à pessoa: 12 caracteres em
 * grupos de 4 (ex.: "K7PQ-M2XD-9RTA"). ~59 bits de entropia; vale até a primeira troca.
 */
export function gerarSenhaProvisoria(aleatorio: (n: number) => Uint8Array = sortear): string {
  // Descarta bytes ≥ 248 (8 × 31) para não favorecer as primeiras letras.
  const limite = Math.floor(256 / ALFABETO.length) * ALFABETO.length
  const chars: string[] = []
  while (chars.length < 12) {
    for (const b of aleatorio(16)) {
      if (b < limite && chars.length < 12) chars.push(ALFABETO[b % ALFABETO.length]!)
    }
  }
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join('')).join('-')
}

function sortear(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n))
}

export const TAMANHO_MINIMO_SENHA = 8

/** Nova senha: pelo menos 8 caracteres (como no revel), igual à confirmação. Devolve o erro ou null. */
export function validarNovaSenha(senha: string, confirmacao: string): string | null {
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return `Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`
  }
  if (senha !== confirmacao) return 'As duas senhas não são iguais.'
  return null
}

/** Dígitos do código enviado ao e-mail (Auth: `otp_length`). Vale 15 min (`otp_expiry`). */
export const DIGITOS_CODIGO = 8
/**
 * Menor código aceito: o Auth de produção pode ainda mandar 6 dígitos (padrão do Supabase) até o
 * painel passar para 8. A tela aceita os dois; o Auth é quem confere o código.
 */
export const DIGITOS_CODIGO_MINIMO = 6

/** Código com a quantidade de dígitos que o Auth pode mandar (6 a 8). */
export function codigoCompleto(codigo: string): boolean {
  return codigo.length >= DIGITOS_CODIGO_MINIMO && codigo.length <= DIGITOS_CODIGO
}

/** Só os dígitos do código colado ou digitado (o e-mail pode vir com espaços). */
export function limparCodigo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, DIGITOS_CODIGO)
}

/** Erro do Supabase Auth reduzido ao que importa para escolher a mensagem. */
export type ErroAuth = { code?: string; status?: number; reasons?: string[] }

function muitasTentativas(erro: ErroAuth) {
  return erro.status === 429 || (erro.code ?? '').startsWith('over_')
}

export const MENSAGEM_MUITAS_TENTATIVAS =
  'Muitas tentativas. Aguarde alguns minutos e tente de novo.'

/** Mensagem do login por senha. Nunca diz se o e-mail existe. */
export function mensagemErroLogin(erro: ErroAuth): string {
  if (muitasTentativas(erro)) return MENSAGEM_MUITAS_TENTATIVAS
  return 'E-mail ou senha incorretos.'
}

export function mensagemErroCodigo(erro: ErroAuth): string {
  if (muitasTentativas(erro)) return MENSAGEM_MUITAS_TENTATIVAS
  return 'Código inválido ou vencido. Confira o e-mail ou peça outro código.'
}

/** Mensagem ao gravar a senha nova (fraca, vazada ou repetida). */
export function mensagemErroNovaSenha(erro: ErroAuth): string {
  if (erro.code === 'same_password') return 'Escolha uma senha diferente da anterior.'
  if (erro.code === 'weak_password') {
    return erro.reasons?.includes('pwned')
      ? 'Essa senha aparece em vazamentos na internet. Escolha outra.'
      : 'Senha fraca. Misture letras, números e símbolos.'
  }
  if (erro.code === 'reauthentication_needed') return 'Peça um código novo para trocar a senha.'
  if (muitasTentativas(erro)) return MENSAGEM_MUITAS_TENTATIVAS
  return 'Não foi possível salvar a senha. Tente de novo.'
}

/** Quanto tempo vale a prova do código para salvar a senha (igual à validade do código). */
export const VALIDADE_PROVA_CODIGO_S = 15 * 60

/**
 * A sessão foi aberta pelo código do e-mail há pouco? Vem do `amr` do JWT (assinado pelo
 * Auth): é a prova, no servidor, de que quem troca a senha leu o e-mail da conta. O Auth
 * registra o código de recuperação como `otp` (conferido no Auth local); `recovery` fica
 * aceito para versões que usem o nome próprio.
 */
export function provouCodigoRecente(
  amr: unknown,
  agoraS: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!Array.isArray(amr)) return false
  return amr.some((item: unknown) => {
    if (!item || typeof item !== 'object') return false
    const { method, timestamp } = item as { method?: unknown; timestamp?: unknown }
    return (
      (method === 'otp' || method === 'recovery') &&
      typeof timestamp === 'number' &&
      agoraS - timestamp <= VALIDADE_PROVA_CODIGO_S &&
      timestamp <= agoraS + 60
    )
  })
}
