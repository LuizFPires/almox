import { autenticar, ConsultaErro } from '@/lib/ioo/auth'
import { consultar, validarFiltros } from '@/lib/ioo/consulta'
const headers = { 'Cache-Control': 'private, no-store' }
export async function POST(request: Request) {
  try {
    const identity = autenticar(request)
    const filters = validarFiltros(await request.json().catch(() => null))
    return Response.json(await consultar(identity.externalIdentity, filters), { headers })
  } catch (error) {
    const known = error instanceof ConsultaErro
    return Response.json(
      { error: known ? error.message : 'Consulta indisponível.' },
      { status: known ? error.status : 503, headers },
    )
  }
}
