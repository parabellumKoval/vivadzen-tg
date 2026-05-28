import type { TgDeliveryMethod, TgPaymentMethod } from '~/types/tg'

type TgPickupLocation = {
  id: string
  title: string
  address: string
  schedule: string
  label: string
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

const normalizeRates = (value: unknown): Array<Record<string, any>> => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const minRatePrice = (value: unknown) => {
  const rates = normalizeRates(value)
  const prices = rates.map((rate) => Number(rate?.price)).filter(Number.isFinite)
  return prices.length ? Math.min(...prices) : null
}

const normalizeText = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return String((value as { value: string }).value).trim()
  }

  return ''
}

export const useTgCheckoutOptions = () => {
  const { $api } = useNuxtApp()
  const { t } = useTgI18n()
  const { region, currency } = useTgRouting()

  const settings = useState<Record<string, any> | null>('tg-settings', () => null)
  const settingsLoading = ref(false)

  const loadSettings = async () => {
    if (settings.value || settingsLoading.value) return settings.value
    settingsLoading.value = true

    try {
      const response = await $api('/settings/nested', { method: 'GET' })
      settings.value = response?.data || response || {}
    } catch {
      settings.value = {}
    } finally {
      settingsLoading.value = false
    }

    return settings.value
  }

  const priceFromSettings = (method: string) => {
    const data = settings.value || {}
    const currencyCode = String(
      getByPath(data, 'shipping.zasilkovna.currency')
      || getByPath(data, 'shipping.novaposhta.currency')
      || currency.value
    ).toUpperCase()

    const rateMap: Record<string, string> = {
      packeta_warehouse: 'shipping.zasilkovna.pickup_rates',
      packeta_address: 'shipping.zasilkovna.home_rates',
      novaposhta_warehouse: 'shipping.novaposhta.branch_rates',
      novaposhta_address: 'shipping.novaposhta.courier_rates',
      messenger_address: 'shipping.messenger.address_rates',
      // Express использует те же тарифы messenger + надбавку (см. ниже).
      messenger_express: 'shipping.messenger.address_rates'
    }

    const path = rateMap[method]
    let amount = path ? minRatePrice(getByPath(data, path)) : null

    if (amount !== null && method === 'messenger_express') {
      const surcharge = Number(getByPath(data, 'shipping.messenger.express.surcharge', 200))
      amount += Number.isFinite(surcharge) ? surcharge : 200
    }

    return amount === null ? null : { amount, currency: currencyCode }
  }

  const etaFromSettings = (method: string) => {
    const etaMap: Record<string, string> = {
      packeta_warehouse: 'shipping.zasilkovna.pickup_eta',
      packeta_address: 'shipping.zasilkovna.home_eta',
      novaposhta_warehouse: 'shipping.novaposhta.branch_eta',
      novaposhta_address: 'shipping.novaposhta.courier_eta',
      messenger_address: 'shipping.messenger.address_eta',
      messenger_express: 'shipping.messenger.express_eta'
    }

    const path = etaMap[method]
    return path ? normalizeText(getByPath(settings.value, path)) : ''
  }

  const messengerExpressEnabled = computed(() => Boolean(getByPath(settings.value, 'shipping.messenger.express.enabled', false)))

  const allDeliveryMethods = computed<TgDeliveryMethod[]>(() => [
    {
      key: 'packeta_warehouse',
      title: region.value === 'cz' ? 'Zásilkovna' : 'Zasilkovna',
      label: t('warehouse'),
      eta: etaFromSettings('packeta_warehouse'),
      price: priceFromSettings('packeta_warehouse')
    },
    {
      key: 'packeta_address',
      title: 'Zasilkovna',
      label: t('address'),
      eta: etaFromSettings('packeta_address'),
      price: priceFromSettings('packeta_address')
    },
    {
      key: 'novaposhta_warehouse',
      title: t('delivery_novaposhta_title'),
      label: t('warehouse'),
      eta: etaFromSettings('novaposhta_warehouse'),
      price: priceFromSettings('novaposhta_warehouse')
    },
    {
      key: 'novaposhta_address',
      title: t('delivery_novaposhta_title'),
      label: t('address'),
      eta: etaFromSettings('novaposhta_address'),
      price: priceFromSettings('novaposhta_address')
    },
    {
      key: 'default_pickup',
      title: t('pickup_self'),
      label: t('pickup_from_store'),
      price: null
    },
    {
      key: 'messenger_address',
      title: 'Messenger',
      label: t('address'),
      eta: etaFromSettings('messenger_address'),
      price: priceFromSettings('messenger_address')
    },
    {
      key: 'messenger_express',
      title: 'Messenger Express',
      label: t('address'),
      eta: etaFromSettings('messenger_express'),
      price: priceFromSettings('messenger_express')
    },
    {
      key: 'default_address',
      title: t('delivery'),
      label: t('address'),
      price: null
    }
  ])

  const fallbackDeliveryKeys = computed(() => {
    if (region.value === 'ua') {
      return ['novaposhta_warehouse', 'novaposhta_address', 'default_pickup']
    }
    return ['packeta_warehouse', 'packeta_address', 'default_pickup', 'default_address', 'messenger_address']
  })

  const deliveryMethods = computed(() => {
    const settingsKeys = getByPath(settings.value, 'shipping.methods', null)
    const configuredKeys = Array.isArray(settingsKeys)
      ? settingsKeys.filter((key) => allDeliveryMethods.value.some((method) => method.key === key))
      : []
    const keys = configuredKeys.length ? configuredKeys : fallbackDeliveryKeys.value

    const list = allDeliveryMethods.value
      .filter((method) => keys.includes(method.key))
      .map((method) => ({
        ...method,
        isPriceObject: Boolean(method.price && typeof method.price === 'object')
      }))

    // Express не отдельный метод в shipping.methods — показываем рядом с
    // messenger_address, когда включён тоггл в настройках Messenger.cz.
    if (messengerExpressEnabled.value) {
      const messengerIndex = list.findIndex((method) => method.key === 'messenger_address')
      const express = allDeliveryMethods.value.find((method) => method.key === 'messenger_express')
      if (messengerIndex !== -1 && express && !list.some((method) => method.key === 'messenger_express')) {
        list.splice(messengerIndex + 1, 0, {
          ...express,
          isPriceObject: Boolean(express.price && typeof express.price === 'object')
        })
      }
    }

    return list
  })

  const pickupLocations = computed<TgPickupLocation[]>(() => {
    const raw = getByPath(settings.value, 'site.contacts.pickup_locations', null)
    const fallbackAddress = normalizeText(getByPath(settings.value, 'site.contacts.address', null))
    const fallbackSchedule = normalizeText(getByPath(settings.value, 'site.contacts.schedule', null))
    const rows = Array.isArray(raw) ? raw : []

    const normalized = rows.map((item, index) => {
      if (typeof item === 'string') {
        const address = normalizeText(item)
        if (!address) return null

        return {
          id: `pickup-${index + 1}`,
          title: '',
          address,
          schedule: index === 0 ? fallbackSchedule : '',
          label: address
        }
      }

      if (!item || typeof item !== 'object') {
        return null
      }

      const address = normalizeText((item as Record<string, unknown>).address ?? (item as Record<string, unknown>).value)
      if (!address) return null

      const title = normalizeText((item as Record<string, unknown>).title ?? (item as Record<string, unknown>).name ?? (item as Record<string, unknown>).label)

      return {
        id: normalizeText((item as Record<string, unknown>).id) || `pickup-${index + 1}`,
        title,
        address,
        schedule: normalizeText((item as Record<string, unknown>).schedule) || (index === 0 ? fallbackSchedule : ''),
        label: [title, address].filter(Boolean).join(', ')
      }
    }).filter(Boolean) as TgPickupLocation[]

    if (normalized.length) {
      return normalized
    }

    if (!fallbackAddress) {
      return []
    }

    return [{
      id: 'pickup-1',
      title: '',
      address: fallbackAddress,
      schedule: fallbackSchedule,
      label: fallbackAddress
    }]
  })

  const allPaymentMethods = computed<TgPaymentMethod[]>(() => [
    {
      key: 'zasilkovna_cod',
      title: t('payment_zasilkovna_cod'),
      payments: ['packeta_warehouse', 'packeta_address']
    },
    {
      key: 'novaposhta_cod',
      title: t('payment_novaposhta_cod'),
      payments: ['novaposhta_warehouse', 'novaposhta_address']
    },
    {
      key: 'default_cash',
      title: t('payment_default_cash'),
      payments: ['default_pickup']
    },
    {
      key: 'liqpay_online',
      title: 'LiqPay',
      payments: ['packeta_warehouse', 'packeta_address', 'novaposhta_warehouse', 'novaposhta_address', 'default_address', 'default_pickup']
    },
    {
      key: 'niftipay_online',
      title: 'NiftiPay',
      payments: ['packeta_warehouse', 'packeta_address', 'novaposhta_warehouse', 'novaposhta_address', 'default_address', 'default_pickup']
    },
    {
      key: 'card_online',
      title: t('payment_card_online'),
      payments: ['packeta_warehouse', 'packeta_address', 'novaposhta_warehouse', 'novaposhta_address', 'default_address', 'default_pickup']
    },
    {
      key: 'bank_transfer',
      title: t('payment_bank_transfer'),
      payments: ['packeta_warehouse', 'packeta_address', 'default_address', 'default_pickup']
    },
    {
      key: 'messenger_cod',
      title: t('payment_messenger_cod'),
      payments: ['messenger_address', 'messenger_express']
    }
  ])

  const fallbackPaymentKeys = computed(() => {
    if (region.value === 'ua') return ['novaposhta_cod', 'liqpay_online', 'card_online']
    return ['zasilkovna_cod', 'card_online', 'bank_transfer', 'default_cash', 'messenger_cod']
  })

  const paymentMethodsFor = (deliveryMethod: string | null) => {
    const settingsKeys = getByPath(settings.value, 'payment.methods', null)
    const configuredKeys = Array.isArray(settingsKeys)
      ? settingsKeys.filter((key) => allPaymentMethods.value.some((method) => method.key === key))
      : []
    const keys = configuredKeys.length ? configuredKeys : fallbackPaymentKeys.value

    const methods = allPaymentMethods.value.filter((method) => {
      return keys.includes(method.key) && (!deliveryMethod || method.payments?.includes(deliveryMethod))
    })

    if (methods.length || !configuredKeys.length) {
      return methods
    }

    return allPaymentMethods.value.filter((method) => {
      return fallbackPaymentKeys.value.includes(method.key) && (!deliveryMethod || method.payments?.includes(deliveryMethod))
    })
  }

  return {
    settings,
    settingsLoading,
    loadSettings,
    deliveryMethods,
    pickupLocations,
    paymentMethodsFor
  }
}
