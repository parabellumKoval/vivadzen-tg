import { useTgCheckoutOptions } from '~/composables/useTgCheckoutOptions'

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getByPath = (root: Record<string, any> | null, path: string, fallback?: any) => {
  if (!root) return fallback
  return path.split('.').reduce((current, segment) => {
    if (current && Object.prototype.hasOwnProperty.call(current, segment)) {
      return current[segment]
    }
    return undefined
  }, root as any) ?? fallback
}

export const useTgFreeDelivery = () => {
  const { settings, loadSettings } = useTgCheckoutOptions()
  const { currency } = useTgRouting()

  const freeMinPrice = computed(() => numberValue(getByPath(settings.value, 'shipping.free_min_price'), 0))
  const freeEnabled = computed(() => Boolean(numberValue(getByPath(settings.value, 'shipping.free_enabled'), 0)))
  const freeCurrency = computed(() => {
    const fromSettings = getByPath(settings.value, 'shipping.free_currency')
      || getByPath(settings.value, 'shipping.zasilkovna.currency')
      || getByPath(settings.value, 'shipping.novaposhta.currency')
    return String(fromSettings || currency.value || 'CZK').toUpperCase()
  })

  const isActive = computed(() => freeEnabled.value && freeMinPrice.value > 0)

  const leftFor = (cartTotal: number) => {
    if (!isActive.value) return 0
    return Math.max(freeMinPrice.value - numberValue(cartTotal), 0)
  }

  const progressFor = (cartTotal: number) => {
    if (!isActive.value || freeMinPrice.value <= 0) return 0
    const percent = (numberValue(cartTotal) / freeMinPrice.value) * 100
    return Math.min(Math.max(percent, 0), 100)
  }

  const isReachedFor = (cartTotal: number) => {
    if (!isActive.value) return false
    return numberValue(cartTotal) >= freeMinPrice.value
  }

  return {
    settings,
    loadSettings,
    freeMinPrice,
    freeEnabled,
    freeCurrency,
    isActive,
    leftFor,
    progressFor,
    isReachedFor
  }
}
