/**
 * Permissões por perfil (PRD §5), para a interface decidir o que mostrar.
 * A garantia de verdade está no banco (RLS e RPCs); isto só evita mostrar o que
 * o servidor vai recusar.
 */
export type Perfil = 'engenheiro' | 'almoxarife' | 'consulta'

/** Ler QR para lançar, retirada, devolução, lançamento manual e fechamento do dia. */
export function podeLancar(perfil: Perfil): boolean {
  return perfil === 'engenheiro' || perfil === 'almoxarife'
}

/** Cadastros e valores, impressão de adesivo e configuração da impressora. */
export function podeCadastrar(perfil: Perfil): boolean {
  return perfil === 'engenheiro'
}

const ROTULOS: Record<Perfil, string> = {
  engenheiro: 'Engenheiro',
  almoxarife: 'Almoxarife',
  consulta: 'Consulta',
}

/** Rótulo curto do perfil; consulta de empreiteira mostra a empresa. */
export function rotuloPerfil(perfil: Perfil, empresa?: string | null): string {
  return perfil === 'consulta' && empresa ? `Consulta · ${empresa}` : ROTULOS[perfil]
}
