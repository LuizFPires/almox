// Service worker básico do Almox (M0): torna o app instalável e mostra uma
// tela offline quando a navegação falha. A fila offline de lançamentos vem no M10.
// Troque a versão sempre que offline.html mudar, para o SW reinstalar.
const VERSAO = 'almox-v2'
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
