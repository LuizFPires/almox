import { autenticarServico, ConsultaErro } from '@/lib/ioo/auth'
import { manifest } from '@/lib/ioo/catalogo'
export async function GET(request: Request) {
  try {
    autenticarServico(request)
    return Response.json(manifest, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    return Response.json(
      { error: 'Catálogo indisponível.' },
      {
        status: e instanceof ConsultaErro ? e.status : 503,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    )
  }
}
