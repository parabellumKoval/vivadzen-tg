import { useTgUserStore } from '~/stores/user'

const normalizeParam = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] || '').trim().toLowerCase()
  return String(value || '').trim().toLowerCase()
}

const normalizeApiBase = (value: unknown) => String(value || '').trim().replace(/\/+$/, '')
const normalizeInitData = (value: unknown) => String(value || '').trim()

const isLoopbackHost = (hostname: string) => {
  const normalized = hostname.toLowerCase()
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '0.0.0.0'
    || normalized === '[::1]'
    || normalized === '::1'
}

const resolveApiBase = (value: unknown) => {
  const apiBase = normalizeApiBase(value)
  if (!process.client || !apiBase) return apiBase

  try {
    const apiUrl = new URL(apiBase, window.location.origin)
    const pageIsLocal = isLoopbackHost(window.location.hostname)
    const apiIsLocal = isLoopbackHost(apiUrl.hostname)

    if (apiIsLocal && !pageIsLocal) {
      console.error('[tg] Ignoring localhost API base on a public host. Set NUXT_PUBLIC_API_BASE in the deployment environment.')
      return ''
    }
  } catch {
    return apiBase
  }

  return apiBase
}

const resolveTelegramInitData = (nuxtApp: any) => {
  if (!process.client) return ''

  const fromPlugin = normalizeInitData((nuxtApp as any).$tg?.initData)
  if (fromPlugin) return fromPlugin

  const fromWindow = normalizeInitData((window as any).Telegram?.WebApp?.initData)
  if (fromWindow) return fromWindow

  try {
    return normalizeInitData(useTgUserStore().initData)
  } catch {
    return ''
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const storefrontCode = String(config.public.storefrontCode || 'main').trim()
  const apiBase = resolveApiBase(config.public.apiBase)

  const api = $fetch.create({
    baseURL: apiBase || undefined,
    credentials: 'include',
    onRequest({ options }) {
      const route = (nuxtApp as any).$router?.currentRoute?.value
      const tgConfig = config.public.tg as any
      const region = normalizeParam(route?.params?.region) || tgConfig?.fallbackRegion || 'cz'
      const locale = normalizeParam(route?.params?.locale) || tgConfig?.regions?.[region]?.locale || 'cs'
      const regionAlias = tgConfig?.regionAliases?.[region] || region
      const headers = new Headers(options.headers || {})

      const baseHeaders: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Storefront': storefrontCode,
        'Accept-Language': locale,
        'X-Region': regionAlias
      }

      const telegramInitData = resolveTelegramInitData(nuxtApp)
      if (telegramInitData) {
        baseHeaders['X-Telegram-Init-Data'] = telegramInitData
      }

      for (const [key, value] of Object.entries(baseHeaders)) {
        if (value && !headers.has(key)) {
          headers.set(key, value)
        }
      }

      options.headers = headers
    }
  })

  return {
    provide: {
      api
    }
  }
})
