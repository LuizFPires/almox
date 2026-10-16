/** Rótulo da situação da obra na Administração. */
export function situacaoObra(obra: { ativa: boolean; encerrada_em: string | null }) {
  if (obra.encerrada_em) {
    // `date` puro (aaaa-mm-dd): sem fuso, senão vira o dia anterior em São Paulo.
    const [ano, mes, dia] = obra.encerrada_em.split('-')
    return { rotulo: `Encerrada em ${dia}/${mes}/${ano}`, classe: 'text-texto-2' }
  }
  if (!obra.ativa) return { rotulo: 'Desativada', classe: 'text-aviso' }
  return { rotulo: 'Ativa', classe: 'text-sucesso' }
}
