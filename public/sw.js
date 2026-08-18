/*
 * Service worker de casca (seção 6.1, bloco Offline).
 * Escopo deliberadamente pequeno: nada de edição offline no MVP.
 * Só garante que abrir o app sem rede mostre uma tela clara em vez do erro
 * do navegador. Escrita sem rede falha com mensagem, nunca em silêncio.
 */
const CACHE = 'gf-casca-v1'
const OFFLINE = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([OFFLINE]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Só navegação. Dados financeiros nunca são servidos de cache: número velho
  // em tela é pior que tela de erro.
  if (request.mode !== 'navigate' || request.method !== 'GET') return

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE)
      return (await cache.match(OFFLINE)) ?? Response.error()
    }),
  )
})
