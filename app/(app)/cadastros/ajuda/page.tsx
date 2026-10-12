import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Cabecalho } from '@/components/Cabecalho'

export const metadata: Metadata = { title: 'Passo a passo: impressora e TV · Almox' }

const AGENTE = 'https://github.com/LuizFPires/almox/tree/main/agente-impressao'

function Passo({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-escuro text-sm font-bold text-amarelo"
      >
        {n}
      </span>
      <span className="flex min-w-0 flex-col gap-1 pt-0.5 text-[15px]">{children}</span>
    </li>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3 rounded-cartao bg-cartao px-4 py-4">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <ol className="flex flex-col gap-3">{children}</ol>
    </section>
  )
}

/**
 * Passo a passo para ligar a impressora do adesivo (agente no mini PC) e o painel da TV.
 * Só o engenheiro vê (layout de Cadastros). Detalhes técnicos: agente-impressao/LEIA-ME.md.
 */
export default function PaginaAjuda() {
  return (
    <>
      <Cabecalho
        titulo="Impressora e TV"
        subtitulo="Passo a passo para deixar funcionando"
        voltarPara="/cadastros/pessoas"
      />
      <main className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-8">
        <p className="rounded-cartao bg-sutil px-4 py-3 text-[15px]">
          Tudo fica no almoxarifado: a <b>impressora de etiquetas</b> e um <b>mini PC</b> ligado na
          TV, os dois na mesma rede (Wi-Fi ou cabo). O mini PC faz duas coisas: mostra o painel na
          TV e manda os adesivos para a impressora.
        </p>

        <Secao titulo="1. Impressora de etiquetas">
          <Passo n={1}>
            Ligue a impressora na rede da obra e deixe com <b>IP fixo</b> (peça a reserva no
            roteador). Anote o IP, por exemplo 192.168.0.50.
          </Passo>
          <Passo n={2}>
            Use rolo <b>60 × 80 mm</b> de poliéster ou vinil, com ribbon de resina (aguenta chuva e
            sol).
          </Passo>
          <Passo n={3}>
            Aqui no app: <b>Cadastros › Impressora</b> → preencha o IP, a porta (quase sempre{' '}
            <b>9100</b>) e a linguagem (<b>ZPL</b> para Zebra; <b>TSPL</b> para TSC, Elgin ou Argox)
            → <b>Salvar impressora</b>.
          </Passo>
        </Secao>

        <Secao titulo="2. Agente de impressão no mini PC">
          <Passo n={1}>
            No mini PC (Windows ou Linux), instale o <b>Node.js 24</b> (nodejs.org).
          </Passo>
          <Passo n={2}>
            Aqui no app: <b>Cadastros › Impressora › Cadastrar mini PC</b>. Aparece a{' '}
            <b>Configuração do agente</b> com três linhas.{' '}
            <b>Copie agora: o código aparece uma vez só.</b>
          </Passo>
          <Passo n={3}>
            Baixe a pasta do agente (
            <a href={AGENTE} target="_blank" rel="noreferrer" className="font-semibold underline">
              agente-impressao
            </a>
            ) para o mini PC, crie o arquivo <code className="font-mono text-sm">.env</code> e cole
            as três linhas.
          </Passo>
          <Passo n={4}>
            Instale como serviço, para ligar sozinho com o mini PC:
            <span className="rounded-botao bg-sutil px-3 py-2 font-mono text-[13px] break-all">
              Windows (PowerShell como administrador, dentro da pasta):
              <br />
              powershell -ExecutionPolicy Bypass -File instalar\windows.ps1
            </span>
            <span className="rounded-botao bg-sutil px-3 py-2 font-mono text-[13px] break-all">
              Linux: sudo sh instalar/linux.sh
            </span>
          </Passo>
          <Passo n={5}>
            Volte em <b>Cadastros › Impressora</b>: deve aparecer <b>Agente online</b>. Toque em{' '}
            <b>Imprimir etiqueta de teste</b> e leia o QR da etiqueta com o celular.
          </Passo>
        </Secao>

        <Secao titulo="3. Painel na TV">
          <Passo n={1}>
            Ligue o mini PC na TV pelo HDMI e abra o navegador (Chrome ou Edge) no mini PC.
          </Passo>
          <Passo n={2}>
            Aqui no app (pode ser no celular): <b>Cadastros › Impressora › Conectar uma TV</b>.
            Aparece um endereço.
          </Passo>
          <Passo n={3}>
            Digite esse endereço no navegador do mini PC <b>em até 10 minutos</b> (vale uma vez só).
            O painel aparece; passou do prazo, gere outro.
          </Passo>
          <Passo n={4}>
            Deixe o navegador em <b>tela cheia (F11)</b>, abrindo sozinho com o mini PC, e desligue
            a economia de energia da TV e do mini PC (a tela não pode apagar).
          </Passo>
          <Passo n={5}>
            Teste: faça uma retirada no celular e conte até aparecer na TV (até 3 segundos). O tempo
            das páginas e a rolagem ficam em <b>Cadastros › Painel da TV</b>.
          </Passo>
        </Secao>

        <section
          aria-label="Se algo não funcionar"
          className="flex flex-col gap-2 rounded-cartao bg-aviso-claro px-4 py-4 text-[15px]"
        >
          <h2 className="text-lg font-bold text-aviso">Se algo não funcionar</h2>
          <p>
            <b>“Agente offline” ou “nunca conectou”:</b> ligue o mini PC e confira a internet. A
            fila imprime sozinha quando ele volta.
          </p>
          <p>
            <b>“Impressora sem resposta”:</b> confira se a impressora está ligada, com papel e no
            mesmo IP cadastrado; depois toque em <b>Reimprimir</b> na ficha da pessoa.
          </p>
          <p>
            <b>Trocou o mini PC ou perdeu o código:</b> em <b>Cadastros › Impressora</b>,{' '}
            <b>Revogar</b> o antigo e <b>Cadastrar mini PC</b> de novo.
          </p>
          <p>
            <b>TV parada ou “Dispositivo não autorizado”:</b> gere um novo endereço em{' '}
            <b>Conectar uma TV</b> e abra no mini PC.
          </p>
        </section>

        <Link href="/cadastros/impressora" className="text-center font-bold underline">
          Abrir Cadastros › Impressora
        </Link>
      </main>
    </>
  )
}
