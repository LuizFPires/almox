'use client'

import { useEffect, useState } from 'react'
import { Botao } from '@/components/Botao'
import { ativarNotificacoes, desativarNotificacoes } from './acoes'

type Estado = 'carregando' | 'sem_suporte' | 'bloqueado' | 'ativado' | 'desativado'

/** A chave pública VAPID em bytes, como o navegador pede. */
function bytesDaChave(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

const TEXTOS: Record<Estado, string> = {
  carregando: '',
  ativado: 'Ativadas neste aparelho. Você recebe os avisos de ferramentas não devolvidas.',
  bloqueado:
    'Bloqueadas no navegador. Libere as notificações do Almox nas configurações do celular.',
  sem_suporte:
    'Este navegador não recebe notificações. No iPhone, instale o app na tela inicial (Compartilhar › Adicionar à Tela de Início) e abra por lá.',
  desativado:
    'Receba no celular os avisos de ferramentas não devolvidas e de capacete usado por outra pessoa.',
}

/**
 * Notificações neste aparelho (avisos de não devolução, cancelamentos, resumo do dia e "Não é
 * ele"). No iPhone só funciona com o app instalado na tela inicial (iOS 16.4+).
 */
export function AtivarNotificacoes({ chavePublica }: { chavePublica: string | null }) {
  const [estado, setEstado] = useState<Estado>('carregando')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let ativo = true
    const verificar = async (): Promise<Estado> => {
      if (!chavePublica || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return 'sem_suporte'
      }
      if (Notification.permission === 'denied') return 'bloqueado'
      const registro = await navigator.serviceWorker.ready
      return (await registro.pushManager.getSubscription()) ? 'ativado' : 'desativado'
    }
    void verificar().then((e) => {
      if (ativo) setEstado(e)
    })
    return () => {
      ativo = false
    }
  }, [chavePublica])

  const ativar = async () => {
    if (!chavePublica) return
    setOcupado(true)
    setErro(null)
    try {
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'bloqueado' : 'desativado')
        return
      }
      const registro = await navigator.serviceWorker.ready
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytesDaChave(chavePublica),
      })
      const r = await ativarNotificacoes(inscricao.toJSON())
      if (r.erro) {
        await inscricao.unsubscribe()
        setErro(r.erro)
        return
      }
      setEstado('ativado')
    } catch {
      setErro('Não foi possível ativar as notificações neste aparelho.')
    } finally {
      setOcupado(false)
    }
  }

  const desativar = async () => {
    setOcupado(true)
    setErro(null)
    try {
      const registro = await navigator.serviceWorker.ready
      const inscricao = await registro.pushManager.getSubscription()
      if (inscricao) {
        const r = await desativarNotificacoes(inscricao.endpoint)
        if (r.erro) {
          setErro(r.erro)
          return
        }
        await inscricao.unsubscribe()
      }
      setEstado('desativado')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="titulo-notificacoes">
      <h2 id="titulo-notificacoes" className="text-[13px] font-bold tracking-[1.2px] text-texto-2">
        NOTIFICAÇÕES
      </h2>
      <div className="flex flex-col gap-3 rounded-cartao bg-cartao px-4 py-4">
        {estado !== 'carregando' && <p className="text-[15px]">{TEXTOS[estado]}</p>}
        {estado === 'desativado' && (
          <Botao type="button" larguraTotal disabled={ocupado} onClick={() => void ativar()}>
            {ocupado ? 'Ativando…' : 'Ativar notificações neste celular'}
          </Botao>
        )}
        {estado === 'ativado' && (
          <Botao
            type="button"
            variante="secundaria"
            larguraTotal
            disabled={ocupado}
            onClick={() => void desativar()}
          >
            {ocupado ? 'Desativando…' : 'Desativar neste celular'}
          </Botao>
        )}
        {erro && (
          <p role="alert" className="text-[15px] text-erro">
            {erro}
          </p>
        )}
      </div>
    </section>
  )
}
