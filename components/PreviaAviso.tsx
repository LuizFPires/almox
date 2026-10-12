import { notificacaoAviso, porPessoa, saudacao, type ItemAviso } from '@/lib/envios/mensagens'
import { formatarData } from '@/lib/formatos/datas'
import { formatarBRL } from '@/lib/formatos/moeda'

type Props = {
  avisoId: string
  obra: string
  empresa: string
  dono: string | null
  donoEmail: string | null
  encarregado: string | null
  encarregadoEmail: string | null
  data: string
  itens: ItemAviso[]
  total: number
}

function Rotulo({ children }: { children: string }) {
  return <h2 className="text-[13px] font-bold tracking-[1.2px] text-texto-2">{children}</h2>
}

/** Prévia do aviso (protótipo): a notificação no app e o e-mail, como o destinatário recebe. */
export function PreviaAviso(p: Props) {
  const n = notificacaoAviso(p.empresa, p.total, p.avisoId)
  const dia = formatarData(p.data).slice(0, 5)
  // Peça de dia anterior: o e-mail real avisa que é lembrete (mesmo valor).
  const lembrete = p.itens.some((i) => formatarData(i.desde).slice(0, 5) !== dia)
  // Dono e encarregado podem ser a mesma pessoa: não repete (o e-mail sai uma vez por endereço).
  const mesmaPessoa = Boolean(p.dono && p.encarregado && p.dono === p.encarregado)
  const para = [
    `${p.dono ?? 'responsável'} <${p.donoEmail ?? 'sem e-mail'}>`,
    ...(mesmaPessoa && (!p.encarregadoEmail || p.encarregadoEmail === p.donoEmail)
      ? []
      : [`${p.encarregado ?? 'encarregado'} <${p.encarregadoEmail ?? 'sem e-mail'}>`]),
  ].join(', ')
  return (
    <div className="flex flex-col gap-3">
      <Rotulo>NOTIFICAÇÃO NO APP</Rotulo>
      <div className="flex gap-3 rounded-cartao bg-escuro px-4 py-3.5 text-white">
        {/* Ícone do app, como a notificação aparece no celular. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icones/icone-192.png"
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-botao"
        />
        <span className="flex flex-col gap-0.5 text-sm">
          <span className="font-bold">{n.titulo}</span>
          <span className="text-white/80">{n.corpo}</span>
        </span>
      </div>

      <Rotulo>E-MAIL</Rotulo>
      <article className="flex flex-col gap-3 rounded-cartao bg-cartao px-4 py-3.5 text-sm leading-[1.45]">
        <div className="flex flex-col gap-0.5 border-b border-borda pb-2.5 text-[13px]">
          <span className="break-words">
            <span className="text-texto-2">Para: </span>
            {para}
          </span>
          <span>
            <span className="text-texto-2">Assunto: </span>
            <b>
              Ferramentas não devolvidas · {p.empresa} · {dia}
            </b>
          </span>
        </div>
        <p>{saudacao(p.dono, p.encarregado)}</p>
        <p>
          As ferramentas abaixo foram retiradas por funcionários da {p.empresa} e não foram
          devolvidas ao almoxarifado até o fechamento do dia {dia}
          {lembrete && ' (inclui peças de dias anteriores, que continuam pendentes)'}:
        </p>
        <ul className="rounded-botao bg-sutil px-3">
          {porPessoa(p.itens).map((l) => (
            <li
              key={l.pessoa}
              className="flex items-start justify-between gap-3 border-b border-borda py-2.5 last:border-b-0"
            >
              <span className="flex flex-col">
                <span className="font-bold">{l.pessoa}</span>
                <span className="text-texto-2">{l.itens}</span>
              </span>
              <span className="font-bold whitespace-nowrap">{formatarBRL(l.valor)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between text-base font-bold">
          <span>Total para reposição</span>
          <span className="text-erro">{formatarBRL(p.total)}</span>
        </p>
        <p>
          Esse valor será <b>descontado na próxima medição</b> da {p.empresa} para reposição das
          ferramentas no canteiro. Se as ferramentas forem devolvidas antes do fechamento da
          medição, o desconto é cancelado.
        </p>
        <p className="text-[13px] text-texto-2">Almox · {p.obra} · mensagem automática</p>
      </article>
    </div>
  )
}
