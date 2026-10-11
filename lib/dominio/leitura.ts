/** Resultado da leitura do capacete (RPC ler_capacete). */
export type SituacaoLeitura = 'ok' | 'nao_cadastrado' | 'inativa' | 'outra_empresa'

/** Mensagem para quando a leitura não identifica uma pessoa desta obra. */
export function mensagemLeitura(situacao: Exclude<SituacaoLeitura, 'ok'>): {
  titulo: string
  texto: string
} {
  switch (situacao) {
    case 'nao_cadastrado':
      return {
        titulo: 'Capacete não cadastrado',
        texto:
          'Esse QR não é de ninguém desta obra. Confira o adesivo ou escolha a pessoa na lista.',
      }
    case 'inativa':
      return {
        titulo: 'Pessoa inativa',
        texto: 'Esse capacete é de uma pessoa inativa na obra. Fale com o engenheiro.',
      }
    case 'outra_empresa':
      return {
        titulo: 'Pessoa de outra empresa',
        texto: 'Seu acesso mostra só as pessoas da sua empresa.',
      }
  }
}

/** Primeiro nome, como o protótipo pergunta: "É o Joaquim que está na sua frente?". */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome
}

/** Erro da câmera em linguagem de obra (permissão negada, sem câmera, página sem HTTPS). */
export function mensagemCamera(erro: unknown): string {
  const nome = (erro as { name?: string } | null)?.name
  switch (nome) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Sem permissão para usar a câmera. Libere a câmera para este site nas configurações do navegador.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Nenhuma câmera encontrada neste aparelho.'
    case 'NotReadableError':
      return 'A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo.'
    default:
      return 'Não foi possível abrir a câmera.'
  }
}
