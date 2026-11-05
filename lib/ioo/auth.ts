import { createPublicKey, timingSafeEqual, verify } from 'node:crypto';

export class ConsultaErro extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export function autenticarServico(request: Request) {
  const expected = process.env.IOO_API_TOKEN;
  if (!expected) throw new ConsultaErro(503, 'Integração indisponível.');
  const a = Buffer.from(request.headers.get('authorization') ?? ''),
    b = Buffer.from(`Bearer ${expected}`);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new ConsultaErro(401, 'Credencial inválida.');
}
/** The signed external identity is mapped administratively; it is never a model parameter. */
export function autenticar(request: Request): {
  externalIdentity: string;
  userId: string;
  organizationId: string;
} {
  autenticarServico(request);
  const token = request.headers.get('x-ioo-assertion') ?? '';
  if (token.length > 8192) throw new ConsultaErro(401, 'Asserção inválida.');
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error();
    const [h, p, signature] = parts as [string, string, string];
    const head = JSON.parse(Buffer.from(h, 'base64url').toString());
    const claim = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (head.alg !== 'EdDSA' || head.typ !== 'JWT' || head.kid !== process.env.IOO_SIGNING_KID)
      throw new Error();
    const key = createPublicKey((process.env.IOO_SIGNING_PUBLIC_KEY ?? '').replace(/\\n/g, '\n'));
    if (!verify(null, Buffer.from(`${h}.${p}`), key, Buffer.from(signature, 'base64url')))
      throw new Error();
    const now = Math.floor(Date.now() / 1000);
    if (
      claim.iss !== 'ioo' ||
      claim.aud !== 'almox' ||
      !uuid.test(claim.sub) ||
      !uuid.test(claim.org) ||
      !Number.isInteger(claim.exp) ||
      !Number.isInteger(claim.iat) ||
      claim.exp <= now ||
      claim.iat > now + 30 ||
      claim.exp <= claim.iat ||
      claim.exp - claim.iat > 120 ||
      typeof claim.ext !== 'string' ||
      !(uuid.test(claim.ext) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claim.ext)) ||
      !(process.env.IOO_ALLOWED_ORGANIZATIONS ?? '').split(',').includes(claim.org)
    )
      throw new Error();
    return { externalIdentity: claim.ext, userId: claim.sub, organizationId: claim.org };
  } catch {
    throw new ConsultaErro(401, 'Asserção inválida.');
  }
}
