/**
 * Quem está logado neste celular, lido do cookie da sessão do Supabase (funciona sem internet:
 * não renova nem valida o token, só diz de quem é a sessão guardada). Sem sessão: null.
 * O cookie é `sb-<projeto>-auth-token` (às vezes em pedaços `.0`, `.1`…), com o JSON da sessão
 * em texto ou em "base64-<base64url>".
 */
export function usuarioDoCookie(cookies: string): string | null {
  const pedacos = new Map<string, Map<number, string>>()
  for (const parte of cookies.split(';')) {
    const i = parte.indexOf('=')
    if (i < 0) continue
    const nome = parte.slice(0, i).trim()
    const m = /^(sb-.+-auth-token)(?:\.(\d+))?$/.exec(nome)
    if (!m?.[1]) continue
    const grupo = pedacos.get(m[1]) ?? new Map<number, string>()
    grupo.set(Number(m[2] ?? 0), parte.slice(i + 1).trim())
    pedacos.set(m[1], grupo)
  }
  for (const grupo of pedacos.values()) {
    try {
      let valor = decodeURIComponent(
        [...grupo]
          .sort(([a], [b]) => a - b)
          .map(([, v]) => v)
          .join(''),
      )
      if (valor.startsWith('base64-')) {
        const b64 = valor.slice(7).replace(/-/g, '+').replace(/_/g, '/')
        valor = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))
      }
      const sessao = JSON.parse(valor) as { user?: { id?: unknown } } | null
      const id = sessao?.user?.id
      if (typeof id === 'string' && id) return id
    } catch {
      // cookie de outro formato: tenta o próximo
    }
  }
  return null
}
