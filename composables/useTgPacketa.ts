type PacketaPudoPoint = {
  id?: string | number
  name?: string
  street?: string
  city?: string
  zip?: string
  country?: string
  [key: string]: any
} | null

const PACKETA_WIDGET_SOURCES = [
  'https://widget.packeta.com/v6/www/js/library.js',
  'https://backup.widget.packeta.com/v6/www/js/library.js',
  'https://widget.packeta.com/www/js/library.js'
]

const PACKETA_LOAD_TIMEOUT_MS = 10000

let loadPromise: Promise<void> | null = null

const loadScript = (src: string): Promise<void> => {
  const w = window as any
  if (w.Packeta?.Widget) return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)

  return new Promise((resolve, reject) => {
    const script = existing || document.createElement('script')
    const managed = !existing
    let settled = false

    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
      window.clearTimeout(timeoutId)
      if (err) {
        if (managed) script.remove()
        reject(err)
      } else {
        resolve()
      }
    }

    const onLoad = () => {
      if (!w.Packeta?.Widget) {
        finish(new Error(`Packeta loaded without Packeta.Widget: ${src}`))
        return
      }
      finish()
    }

    const onError = () => finish(new Error(`Failed to load Packeta widget from ${src}`))

    const timeoutId = window.setTimeout(() => finish(new Error(`Timed out loading Packeta widget from ${src}`)), PACKETA_LOAD_TIMEOUT_MS)

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    if (managed) {
      script.src = src
      script.async = true
      script.crossOrigin = 'anonymous'
      document.head.appendChild(script)
    }
  })
}

const loadPacketaWidget = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve()
  const w = window as any
  if (w.Packeta?.Widget) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const errors: string[] = []
    for (const src of PACKETA_WIDGET_SOURCES) {
      try {
        await loadScript(src)
        if (w.Packeta?.Widget) return
        errors.push(`Packeta.Widget missing after loading ${src}`)
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error))
      }
    }
    throw new Error(`Failed to load Packeta widget. ${errors.join(' | ')}`)
  })().catch((err) => {
    loadPromise = null
    throw err
  })

  return loadPromise
}

export const useTgPacketa = () => {
  const config = useRuntimeConfig().public.packeta as {
    apiKey?: string
    language?: string
    defaultCountry?: string
    carriers?: string[]
  } | undefined

  const isConfigured = computed(() => Boolean(config?.apiKey))

  const pickPudo = async (): Promise<PacketaPudoPoint> => {
    if (!config?.apiKey) {
      throw new Error('Packeta API key is not configured')
    }

    await loadPacketaWidget()

    const w = window as any
    if (!w.Packeta?.Widget) throw new Error('Packeta.Widget missing')

    const opts: Record<string, any> = {
      language: config.language || 'en',
      country: config.defaultCountry || 'CZ'
    }
    if (Array.isArray(config.carriers) && config.carriers.length) {
      opts.carriers = config.carriers
    }

    return new Promise((resolve) => {
      w.Packeta.Widget.pick(config.apiKey, (point: PacketaPudoPoint) => resolve(point || null), opts)
    })
  }

  return {
    isConfigured,
    pickPudo
  }
}

export type { PacketaPudoPoint }
