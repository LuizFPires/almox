/**
 * Valores enviados num formulário, para devolver junto com os erros: o React limpa
 * os campos depois de uma Server Action, e sem isso o usuário perderia o que digitou.
 */
export type Valores = Record<string, string>

export function valoresDoForm(form: FormData): Valores {
  const valores: Valores = {}
  for (const [chave, valor] of form.entries()) {
    if (typeof valor === 'string' && !chave.startsWith('$')) valores[chave] = valor
  }
  return valores
}
