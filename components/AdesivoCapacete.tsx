import QRCode from 'qrcode'

type Props = {
  /** Token opaco: única coisa dentro do QR (RN-17). */
  token: string
  nomeCapacete: string
  nomeCompleto: string
  funcao: string
  empresa: string
  obra: string
  matricula: string
}

/** Desenha o QR como um único path SVG (sem HTML injetado). */
function caminhoQr(token: string) {
  const { modules } = QRCode.create(token, { errorCorrectionLevel: 'M' })
  let d = ''
  for (let linha = 0; linha < modules.size; linha++) {
    for (let coluna = 0; coluna < modules.size; coluna++) {
      if (modules.get(linha, coluna)) d += `M${coluna} ${linha}h1v1h-1z`
    }
  }
  return { d, tamanho: modules.size }
}

/** Prévia do adesivo 60 × 80 mm, igual ao protótipo (o impresso sai em ZPL/TSPL). */
export function AdesivoCapacete(p: Props) {
  const { d, tamanho } = caminhoQr(p.token)
  return (
    <figure
      aria-label={`Prévia do adesivo de ${p.nomeCapacete}`}
      className="mx-auto flex aspect-[3/4] w-full max-w-[260px] flex-col items-center gap-1.5 rounded-cartao bg-white px-5 pt-5 pb-3 text-[#1F2937] shadow-md"
    >
      <svg
        viewBox={`-1 -1 ${tamanho + 2} ${tamanho + 2}`}
        className="w-[62%]"
        role="img"
        aria-label="QR Code do capacete (só o código, sem nome)"
        shapeRendering="crispEdges"
      >
        <path d={d} fill="currentColor" />
      </svg>
      <span className="text-[34px] leading-none font-extrabold tracking-wide">
        {p.nomeCapacete}
      </span>
      <span className="text-[13px] font-semibold">{p.nomeCompleto}</span>
      <span className="text-center text-[11px] text-texto-2">
        {p.funcao} · {p.empresa}
      </span>
      <span className="mt-auto flex w-full justify-between border-t border-borda pt-1.5 font-mono text-[9px] text-texto-2">
        <span>ALMOX · {p.obra}</span>
        <span>{p.matricula}</span>
      </span>
    </figure>
  )
}
