import 'server-only'
import { gerarSenhaProvisoria, TAMANHO_MINIMO_SENHA } from '@/lib/dominio/senha'

/**
 * Senha do primeiro acesso: gerada pelo app (padrão) ou escolhida por quem dá o acesso. Nos dois
 * casos a pessoa é obrigada a criar a dela ao entrar. Devolve a senha ou o erro do campo.
 */
export function lerSenhaInicial(form: FormData): { senha: string } | { erro: string } {
  if (form.get('senha_inicial_modo') !== 'escolher') return { senha: gerarSenhaProvisoria() }
  // A senha não passa pelo `texto` (que junta espaços): vale exatamente o que foi digitado.
  const senha = String(form.get('senha_inicial') ?? '')
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return { erro: `Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.` }
  }
  return { senha }
}
