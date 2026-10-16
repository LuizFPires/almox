export type AlvoNovaSenha = {
  /** Ainda com a senha do primeiro acesso (não criou a própria). */
  senhaPendente: boolean
  /** Perfil da pessoa nesta obra. */
  perfil: 'engenheiro' | 'almoxarife' | 'consulta'
  /** Obras a que o login tem acesso. */
  obras: string[]
}

export type DecisaoNovaSenha = { pode: true } | { pode: false; motivo: string }

/**
 * O engenheiro pode gerar uma senha nova para alguém da obra dele? Sem e-mail, é o único jeito
 * de quem esqueceu a senha voltar a entrar. Limites, para ninguém tomar a conta de outra pessoa:
 * - login que também é de outra obra: só o administrador (a conta não é só desta obra);
 * - outro engenheiro que já criou a própria senha: só o administrador.
 * O administrador faz isso em Administração › obra › acessos.
 * A pessoa é obrigada a criar uma senha nova no próximo login.
 */
export function podeGerarNovaSenha(alvo: AlvoNovaSenha, obraAtual: string): DecisaoNovaSenha {
  if (alvo.obras.some((o) => o !== obraAtual)) {
    return {
      pode: false,
      motivo:
        'Este login também tem acesso a outra obra: quem gera outra senha é o administrador do Almox.',
    }
  }
  if (!alvo.senhaPendente && alvo.perfil === 'engenheiro') {
    return {
      pode: false,
      motivo: 'Senha de outro engenheiro: quem gera outra é o administrador do Almox.',
    }
  }
  return { pode: true }
}
