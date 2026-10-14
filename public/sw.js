// Service worker do Almox: torna o app instalável (M0), mostra uma tela offline quando a
// navegação falha, recebe as notificações dos avisos (Web Push, M9) e guarda a tela de lançar
// sem internet (/campo, M10) com os arquivos dela.
// Troque a versão quando offline.html mudar (o cache dela se refaz). Trocar apaga também a cópia
// guardada de /campo até o app abrir de novo com internet: só mude o comportamento sem trocar.
const VERSAO = 'almox-v7'
const ESTATICOS = 'almox-estaticos-v1'
const OFFLINE = '/offline.html'
const CAMPO = '/campo'
/** Sinal fraco: quanto esperar a rede antes de abrir a cópia guardada de /campo. */
const ESPERA_CAMPO_MS = 3000

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
        Promise.all(
          chaves.filter((c) => c !== VERSAO && c !== ESTATICOS).map((c) => caches.delete(c)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

/** Arquivos do Next com hash no nome: nunca mudam, então servem do cache. */
const DESENVOLVIMENTO = new URL(self.location.href).searchParams.has('dev')

function ehEstatico(url) {
  return (
    !DESENVOLVIMENTO &&
    url.origin === self.location.origin &&
    url.pathname.startsWith('/_next/static/')
  )
}

/** O cache de arquivos não cresce sem fim (TV e celulares ficam dias abertos entre deploys). */
const MAX_ESTATICOS = 300
async function aparar(cache) {
  const chaves = await cache.keys()
  // Ordem de inserção: os mais antigos saem primeiro.
  await Promise.all(
    chaves.slice(0, Math.max(0, chaves.length - MAX_ESTATICOS)).map((c) => cache.delete(c)),
  )
}

/**
 * Guarda /campo e os arquivos que a página pede (JS, CSS, fontes). Novo build: os arquivos
 * antigos saem do cache. Só guarda resposta boa (sessão vencida redireciona para o login).
 */
async function guardarCampo() {
  if (DESENVOLVIMENTO) return
  const resposta = await fetch(CAMPO, { cache: 'no-store', credentials: 'same-origin' })
  if (!resposta.ok || resposta.redirected) return
  const html = await resposta.clone().text()
  const arquivos = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])]
  const estaticos = await caches.open(ESTATICOS)
  const guardados = await estaticos.keys()
  const novos = new Set(arquivos.map((a) => new URL(a, self.location.origin).href))
  // Build novo (arquivos da página mudaram): limpa o que não é mais usado.
  if (arquivos.length && !guardados.some((r) => novos.has(r.url))) {
    await Promise.all(guardados.map((r) => estaticos.delete(r)))
  }
  await Promise.all(
    arquivos.map(async (a) => {
      if (await estaticos.match(a)) return
      const r = await fetch(a)
      if (r.ok) await estaticos.put(a, r)
    }),
  )
  await (await caches.open(VERSAO)).put(CAMPO, resposta)
}

self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.tipo === 'guardar-campo') {
    evento.waitUntil(guardarCampo().catch(() => undefined))
  }
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (ehEstatico(url)) {
    // Do cache quando existe; senão da rede, guardando (ex.: o leitor de QR, carregado sob demanda).
    evento.respondWith(
      caches.open(ESTATICOS).then(async (cache) => {
        const guardado = await cache.match(request)
        if (guardado) return guardado
        const resposta = await fetch(request)
        if (resposta.ok) cache.put(request, resposta.clone()).then(() => aparar(cache))
        return resposta
      }),
    )
    return
  }

  if (request.mode !== 'navigate') return
  if (url.pathname === CAMPO) {
    // Com internet, a versão nova (e guarda); sem, a guardada. Sinal fraco (a rede não responde
    // nem falha): depois de ESPERA_CAMPO_MS abre a guardada; a da rede, se chegar, fica para a
    // próxima vez.
    const daRede = fetch(request).then((resposta) => {
      if (resposta.ok && !resposta.redirected) {
        const copia = resposta.clone()
        caches.open(VERSAO).then((c) => c.put(CAMPO, copia))
      }
      return resposta
    })
    evento.respondWith(
      caches.match(CAMPO).then((guardada) => {
        const reserva = () =>
          Promise.resolve(guardada ?? caches.match(OFFLINE)).then((r) => r ?? Response.error())
        if (!guardada) return daRede.catch(reserva)
        return Promise.race([
          daRede.catch(reserva),
          new Promise((resolver) => setTimeout(() => resolver(guardada), ESPERA_CAMPO_MS)),
        ])
      }),
    )
    return
  }
  evento.respondWith(
    fetch(request).catch(() =>
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
