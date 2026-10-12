// Service worker do Almox: torna o app instalável (M0), mostra uma tela offline quando a
// navegação falha e recebe as notificações dos avisos (Web Push, M9). A fila offline de
// lançamentos vem no M10.
// Troque a versão sempre que offline.html mudar, para o SW reinstalar.
const VERSAO = 'almox-v5'
const OFFLINE = '/offline.html'

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.add(new Request(OFFLINE, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  if (evento.request.mode !== 'navigate') return
  evento.respondWith(
    fetch(evento.request).catch(() =>
      caches.match(OFFLINE).then((resposta) => resposta ?? Response.error()),
    ),
  )
})

// Notificação (aviso de não devolução, cancelamento, resumo, ocorrência).
self.addEventListener('push', (evento) => {
  let dados = {}
  try {
    dados = evento.data ? evento.data.json() : {}
  } catch {
    dados = {}
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Almox', {
      body: dados.corpo || '',
      icon: '/icones/icone-192.png',
      badge: '/icones/icone-192.png',
      lang: 'pt-BR',
      data: { url: dados.url || '/inicio' },
    }),
  )
})

// Toque na notificação: abre (ou foca) o app na tela do aviso. Só caminhos do próprio app.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const url = evento.notification.data && evento.notification.data.url
  let destino = '/inicio'
  try {
    const alvo = new URL(typeof url === 'string' ? url : '/inicio', self.location.origin)
    if (alvo.origin === self.location.origin) destino = alvo.pathname + alvo.search
  } catch {
    destino = '/inicio'
  }
  evento.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(async (janelas) => {
      for (const janela of janelas) {
        try {
          await janela.navigate(destino)
          return janela.focus()
        } catch {
          // janela que não aceita navegar: tenta a próxima ou abre outra
        }
      }
      return self.clients.openWindow(destino)
    }),
  )
})
