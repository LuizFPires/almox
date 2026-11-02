/**
 * Recarrega o app na versão nova: pede ao service worker para se atualizar (o `sw.js` nunca fica
 * em cache) e recarrega a página. Os arquivos do build antigo saem do cache no próximo build.
 */
export async function recarregarApp(): Promise<void> {
  try {
    const registro = await navigator.serviceWorker?.getRegistration()
    await registro?.update()
  } catch {
    // Sem service worker (ou falha ao atualizar): a recarga já traz a versão nova.
  }
  window.location.reload()
}
