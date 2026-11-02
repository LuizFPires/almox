import { NextResponse } from 'next/server'
import { VERSAO_APP } from '@/lib/dominio/versao'

/** Versão em produção agora. O app compara com a sua e oferece "Atualizar" quando mudou. */
export function GET() {
  return NextResponse.json(
    { versao: VERSAO_APP },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } },
  )
}
