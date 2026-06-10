declare global {
  interface Window {
    dataLayer?: Array<Record<string, any>>
  }
}

const VALID_GTM_ID = /^GTM-[A-Z0-9]+$/

export default defineNuxtPlugin(() => {
  const gtmId = String(useRuntimeConfig().public.gtmId || '').trim()
  if (!gtmId || !VALID_GTM_ID.test(gtmId)) return

  if (document.getElementById('gtm-loader')) return

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })

  const script = document.createElement('script')
  script.id = 'gtm-loader'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`
  document.head.appendChild(script)
})
