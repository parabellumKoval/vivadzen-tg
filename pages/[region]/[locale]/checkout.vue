<script setup lang="ts">
import { useTgCartStore } from '~/stores/cart'
import { useTgUiStore } from '~/stores/ui'
import { useTgUserStore, type TgSavedAddress } from '~/stores/user'

const cart = useTgCartStore()
const ui = useTgUiStore()
const userStore = useTgUserStore()
const { $api } = useNuxtApp()
const { t } = useTgI18n()
const { pathFor, catalogPath, region } = useTgRouting()
const { user: telegramUser, webApp, haptic } = useTelegram()
const { formatMoney } = useTgProductUtils()
const { settings, loadSettings, deliveryMethods, pickupLocations, paymentMethodsFor, messengerCodFeeInfo } = useTgCheckoutOptions()
const { pickPudo: pickPacketaPoint, isConfigured: packetaConfigured } = useTgPacketa()
const {
  loadProfile: loadBackendProfile,
  saveProfile: saveBackendProfile,
  savePaymentMethod: saveBackendPaymentMethod,
  saveAddress: saveBackendAddress
} = useTgProfileApi()

type CheckoutFieldRule = {
  required?: boolean
  hidden?: boolean
  requiredIf?: {
    field?: string
    values?: string[]
  } | null
  children?: Record<string, CheckoutFieldRule>
}

const order = cart.orderState
const loading = ref(false)
const settingsReady = ref(false)
const expandedCart = ref(false)
const activeStep = ref(1)
const selectedSavedAddressId = ref('')
const errors = reactive<Record<string, string>>({})
const submitError = ref('')
const checkoutRules = ref<Record<string, CheckoutFieldRule> | null>(null)
const checkoutRulesLoading = ref(false)

const userFields = ['first_name', 'last_name', 'phone', 'email']
const deliveryFields = ['delivery', 'settlement', 'warehouse', 'street', 'house', 'zip']
const paymentFields = ['payment', 'payment_settlement', 'payment_street', 'payment_house', 'payment_room', 'payment_zip']
const paymentAddressFields = ['settlement', 'street', 'house', 'room', 'zip'] as const
const paymentAddressExcludedDeliveryMethods = new Set([
  'packeta_address',
  'default_address',
  'messenger_address',
  'messenger_express'
])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[+\d][\d\s\-()]{6,}$/

const stepOfField = (key: string): number => {
  if (userFields.includes(key)) return 1
  if (deliveryFields.includes(key)) return 2
  if (paymentFields.includes(key)) return 3
  return 4
}

const errorsForStep = (step: number) => Object.keys(errors).filter((key) => stepOfField(key) === step && errors[key])
const stepHasErrors = (step: number) => errorsForStep(step).length > 0

const errorFieldLabelMap: Record<string, string> = {
  first_name: 'first_name',
  last_name: 'last_name',
  phone: 'phone',
  email: 'email',
  delivery: 'delivery',
  settlement: 'city',
  warehouse: 'warehouse',
  street: 'address',
  house: 'house',
  zip: 'zip',
  payment: 'payment',
  payment_settlement: 'city',
  payment_street: 'address',
  payment_house: 'house',
  payment_room: 'flat',
  payment_zip: 'zip'
}

const ALLOWED_INLINE_TAGS = ['b', 'strong', 'i', 'em', 'br']
const renderSafeHtml = (input: unknown): string => {
  const text = String(input ?? '')
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return ALLOWED_INLINE_TAGS.reduce((value, tag) => {
    return value
      .replace(new RegExp(`&lt;${tag}&gt;`, 'gi'), `<${tag}>`)
      .replace(new RegExp(`&lt;/${tag}&gt;`, 'gi'), `</${tag}>`)
      .replace(new RegExp(`&lt;${tag} ?/&gt;`, 'gi'), `<${tag}/>`)
  }, escaped)
}

const stepErrorFields = (step: number) => errorsForStep(step)
  .map((key) => t(errorFieldLabelMap[key] || key))
  .filter(Boolean)
  .join(', ')

const paymentMethods = computed(() => paymentMethodsFor(order.delivery.method))
const isDeliveryCostEnabled = computed(() => Boolean(settings.value?.shipping?.add_to_order_enabled))
const calculableDeliveryKeys = new Set([
  'packeta_warehouse',
  'packeta_address',
  'novaposhta_warehouse',
  'novaposhta_address',
  'messenger_address',
  'messenger_express'
])

const selectedDelivery = computed(() => {
  return deliveryMethods.value.find((method) => method.key === order.delivery.method) || null
})

const selectedPayment = computed(() => {
  return paymentMethods.value.find((method) => method.key === order.payment.method) || null
})

const countryCode = computed(() => String(region.value || '').trim().toUpperCase())
const pragueCityLabel = computed(() => t('prague_city'))
const phonePlaceholder = computed(() => region.value === 'ua' ? '+380' : '+420')
const needsWarehouse = computed(() => String(order.delivery.method || '').includes('warehouse'))
const needsPickupLocation = computed(() => String(order.delivery.method || '') === 'default_pickup')
const needsAddress = computed(() => {
  const method = String(order.delivery.method || '')
  return method.includes('address') || method === 'messenger_express'
})
const isMessengerMethod = computed(() => ['messenger_address', 'messenger_express'].includes(String(order.delivery.method || '')))
const isMessengerExpress = computed(() => order.delivery.method === 'messenger_express')
const needsHouse = computed(() => ['novaposhta_address', 'default_address', 'messenger_express'].includes(String(order.delivery.method || '')))
const showsZipField = computed(() => ['novaposhta_address', 'packeta_address', 'messenger_express'].includes(String(order.delivery.method || '')))
const isPacketaWarehouse = computed(() => order.delivery.method === 'packeta_warehouse')
const usesManualWarehouseFields = computed(() => needsWarehouse.value && !isPacketaWarehouse.value)
const needsPaymentAddress = computed(() => {
  if (order.payment.method !== 'bank_transfer') return false
  const method = String(order.delivery.method || '').trim()
  if (!method) return false
  return !paymentAddressExcludedDeliveryMethods.has(method)
})
const paymentFieldRequired = (field: typeof paymentAddressFields[number]) => {
  const fallback = needsPaymentAddress.value && field !== 'room'
  return isFieldRequired(`payment.${field}`, fallback)
}
const packetaPickerLoading = ref(false)
const messengerCodPreviewQuote = ref<Record<string, any> | null>(null)
const messengerCodPreviewKey = ref<string | null>(null)

const hasValue = (value: unknown) => String(value ?? '').trim().length > 0

const appendHouseToStreet = (street: unknown, house: unknown) => {
  const streetText = String(street ?? '').trim()
  const houseText = String(house ?? '').trim()

  if (!houseText) return streetText
  if (!streetText) return houseText

  const normalizedStreet = streetText.toLowerCase()
  const normalizedHouse = houseText.toLowerCase()
  if (
    normalizedStreet.endsWith(normalizedHouse)
    || normalizedStreet.includes(` ${normalizedHouse}`)
    || normalizedStreet.includes(`, ${normalizedHouse}`)
  ) {
    return streetText
  }

  return `${streetText}, ${houseText}`
}

const addressLineOf = (street: unknown, house: unknown, room: unknown) => {
  const streetLine = appendHouseToStreet(street, house)
  const roomText = String(room ?? '').trim()
  return [streetLine, roomText].filter(Boolean).join(', ')
}

const resolveFieldRule = (path: string): CheckoutFieldRule | null => {
  const segments = path.split('.').filter(Boolean)
  let node: Record<string, CheckoutFieldRule> | undefined | null = checkoutRules.value
  let meta: CheckoutFieldRule | null = null

  for (const segment of segments) {
    meta = node?.[segment] || null
    if (!meta) return null
    node = meta.children || null
  }

  return meta
}

const fieldValueByPath = (path: string): unknown => {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[segment]
  }, {
    user: order.user,
    delivery: order.delivery,
    payment: order.payment
  })
}

const isFieldRequired = (path: string, fallback = false) => {
  const rule = resolveFieldRule(path)
  if (!rule || rule.hidden) {
    return fallback
  }

  if (rule.required) {
    return true
  }

  if (!rule.requiredIf?.field || !rule.requiredIf.values?.length) {
    return false
  }

  const currentValue = String(fieldValueByPath(rule.requiredIf.field) ?? '').trim()
  return rule.requiredIf.values.some((value) => String(value).trim() === currentValue)
}

const userFieldRequired = (field: 'first_name' | 'last_name' | 'phone' | 'email') => {
  const fallbackMap = {
    first_name: true,
    last_name: true,
    phone: true,
    email: true
  }

  return isFieldRequired(`user.${field}`, fallbackMap[field])
}

const deliveryFieldRequired = (field: 'settlement' | 'warehouse' | 'street' | 'house' | 'zip') => {
  const fallbackMap = {
    settlement: needsWarehouse.value || needsAddress.value,
    warehouse: needsPickupLocation.value || needsWarehouse.value,
    street: needsAddress.value,
    house: needsHouse.value,
    zip: showsZipField.value
  }

  return isFieldRequired(`delivery.${field}`, fallbackMap[field])
}

const recipientName = computed(() => {
  return [order.user.first_name, order.user.last_name].filter(Boolean).join(' ')
})

const recipientSummary = computed(() => {
  return [recipientName.value, order.user.phone, order.user.email].filter(Boolean).join(', ')
})

const paymentSummary = computed(() => selectedPayment.value?.title || order.payment.method || '')

const deliveryDetails = computed(() => {
  const addressLine = addressLineOf(order.delivery.street, order.delivery.house, order.delivery.room)
  return [order.delivery.settlement, order.delivery.warehouse || addressLine || order.delivery.zip].filter(Boolean).join(', ')
})

const deliverySummary = computed(() => {
  const method = selectedDelivery.value?.title || order.delivery.method || t('delivery')
  return deliveryDetails.value ? `${method}: ${deliveryDetails.value}` : method
})

const isUserStepComplete = computed(() => {
  const phone = String(order.user.phone || '')
  const email = String(order.user.email || '')

  return Boolean(
    (!userFieldRequired('first_name') || hasValue(order.user.first_name))
    && (!userFieldRequired('last_name') || hasValue(order.user.last_name))
    && (!userFieldRequired('phone') || hasValue(phone))
    && (!hasValue(phone) || phonePattern.test(phone))
    && (!userFieldRequired('email') || hasValue(email))
    && (!hasValue(email) || emailPattern.test(email))
  )
})
const isPaymentStepComplete = computed(() => {
  const methodOk = Boolean(
    order.payment.method
    && (!paymentMethods.value.length || paymentMethods.value.some((method) => method.key === order.payment.method))
  )
  if (!methodOk) return false
  if (!needsPaymentAddress.value) return true
  return paymentAddressFields.every((field) => !paymentFieldRequired(field) || hasValue(order.payment[field]))
})
const isDeliveryStepComplete = computed(() => {
  if (!order.delivery.method) return false

  return Boolean(
    (!deliveryFieldRequired('warehouse') || hasValue(order.delivery.warehouse))
    && (!deliveryFieldRequired('settlement') || hasValue(order.delivery.settlement))
    && (!deliveryFieldRequired('street') || hasValue(order.delivery.street))
    && (!deliveryFieldRequired('house') || hasValue(order.delivery.house))
    && (!deliveryFieldRequired('zip') || hasValue(order.delivery.zip))
  )
})

const allCheckoutStepsComplete = computed(() => (
  isUserStepComplete.value
  && isPaymentStepComplete.value
  && isDeliveryStepComplete.value
))

const deliveryPriceLabel = (price: any) => {
  if (price && typeof price === 'object') {
    return formatMoney(price.amount, price.currency)
  }
  return price || '—'
}

const shippingQuote = ref<Record<string, any> | null>(null)
const lastQuoteKey = ref<string | null>(null)

const isMessengerCod = computed(() => {
  return ['messenger_address', 'messenger_express'].includes(String(order.delivery.method || ''))
    && order.payment.method === 'messenger_cod'
})

const shippingPayload = computed(() => {
  if (!isDeliveryCostEnabled.value || !order.delivery.method || !region.value || !calculableDeliveryKeys.has(order.delivery.method)) {
    return null
  }

  return {
    methodKey: order.delivery.method,
    destinationCountry: String(region.value).trim().toUpperCase(),
    weightG: 1000,
    codAmount: isMessengerCod.value ? (cart.totalPrice || 0) : 0,
    codEnabled: isMessengerCod.value ? 1 : 0,
    meta: {
      subtotal: cart.totalPrice || 0,
      cod_payment_type: 'cash'
    }
  }
})

const selectedDeliveryEta = computed(() => {
  const value = selectedDelivery.value?.eta
  return typeof value === 'string' ? value.trim() : ''
})

const quotedCodFee = computed(() => {
  const amount = Number(shippingQuote.value?.breakdown?.cod_gross)
  const currencyCode = String(shippingQuote.value?.currency || cart.items[0]?.currency || '').trim()

  if (!Number.isFinite(amount) || amount <= 0 || !currencyCode) {
    return null
  }

  return {
    amount,
    currency: currencyCode
  }
})

const quotedDeliveryOnly = computed(() => {
  const quoteAmount = Number(shippingQuote.value?.amount)
  const currencyCode = String(shippingQuote.value?.currency || cart.items[0]?.currency || '').trim()

  if (Number.isFinite(quoteAmount) && quoteAmount >= 0 && currencyCode && currencyCode !== 'XXX') {
    return {
      amount: Math.max(0, Number((quoteAmount - (quotedCodFee.value?.amount || 0)).toFixed(2))),
      currency: currencyCode
    }
  }

  if (selectedDelivery.value?.price && typeof selectedDelivery.value.price === 'object') {
    return {
      amount: Number(selectedDelivery.value.price.amount || 0),
      currency: selectedDelivery.value.price.currency || cart.items[0]?.currency
    }
  }

  return null
})

const checkoutDeliveryMeta = (method: { price?: any, eta?: string }) => {
  const parts = [deliveryPriceLabel(method.price)]
  if (method.eta) {
    parts.push(method.eta)
  }
  return parts.filter(Boolean).join(' · ')
}

const messengerCodPreviewPayload = computed(() => {
  if (!isDeliveryCostEnabled.value || !isMessengerMethod.value || !order.delivery.method || !region.value) {
    return null
  }

  return {
    methodKey: order.delivery.method,
    destinationCountry: String(region.value).trim().toUpperCase(),
    weightG: 1000,
    codAmount: cart.totalPrice || 0,
    codEnabled: 1,
    meta: {
      subtotal: cart.totalPrice || 0,
      cod_payment_type: 'cash'
    }
  }
})

const messengerCodPreviewFee = computed(() => {
  const amount = Number(messengerCodPreviewQuote.value?.breakdown?.cod_gross)
  const currencyCode = String(messengerCodPreviewQuote.value?.currency || '').trim()

  if (Number.isFinite(amount) && amount > 0 && currencyCode) {
    return {
      amount,
      currency: currencyCode
    }
  }

  const fallback = messengerCodFeeInfo(cart.totalPrice || 0)
  if (fallback && 'amount' in fallback && typeof fallback.amount === 'number') {
    return {
      amount: fallback.amount,
      currency: fallback.currency
    }
  }

  return null
})

const paymentMethodMeta = (method: { key: string }) => {
  if (method.key !== 'messenger_cod' || !isMessengerMethod.value) {
    return ''
  }

  if (!messengerCodPreviewFee.value) {
    return ''
  }

  return `${t('cod_fee')}: ${formatMoney(messengerCodPreviewFee.value.amount, messengerCodPreviewFee.value.currency)}`
}

const clearErrors = () => {
  Object.keys(errors).forEach((key) => delete errors[key])
}

const addUserErrors = () => {
  if (userFieldRequired('first_name') && !hasValue(order.user.first_name)) errors.first_name = t('required')
  if (userFieldRequired('last_name') && !hasValue(order.user.last_name)) errors.last_name = t('required')
  if (userFieldRequired('phone') && !hasValue(order.user.phone)) {
    errors.phone = t('required')
  } else if (hasValue(order.user.phone) && !phonePattern.test(String(order.user.phone))) {
    errors.phone = t('error_invalid_phone')
  }
  if (userFieldRequired('email') && !hasValue(order.user.email)) {
    errors.email = t('required')
  } else if (hasValue(order.user.email) && !emailPattern.test(String(order.user.email))) {
    errors.email = t('error_invalid_email')
  }
}

const addPaymentErrors = () => {
  if (!order.payment.method) {
    errors.payment = t('select_payment')
    return
  }
  if (!needsPaymentAddress.value) return
  paymentAddressFields.forEach((field) => {
    if (paymentFieldRequired(field) && !hasValue(order.payment[field])) {
      errors[`payment_${field}`] = t('required')
    }
  })
}

const addDeliveryErrors = () => {
  if (!order.delivery.method) errors.delivery = t('select_delivery')
  if (deliveryFieldRequired('warehouse') && !hasValue(order.delivery.warehouse)) errors.warehouse = t('required')
  if (deliveryFieldRequired('settlement') && !hasValue(order.delivery.settlement)) errors.settlement = t('required')
  if (deliveryFieldRequired('street') && !hasValue(order.delivery.street)) errors.street = t('required')
  if (deliveryFieldRequired('house') && !hasValue(order.delivery.house)) errors.house = t('required')
  if (deliveryFieldRequired('zip') && !hasValue(order.delivery.zip)) errors.zip = t('required')
}

const validateStep = (step: number) => {
  clearErrors()

  if (step === 1) addUserErrors()
  if (step === 2) addDeliveryErrors()
  if (step === 3) addPaymentErrors()

  return Object.keys(errors).length === 0
}

const validate = () => {
  clearErrors()
  addUserErrors()
  addPaymentErrors()
  addDeliveryErrors()
  return Object.keys(errors).length === 0
}

const firstIncompleteStep = () => {
  if (!isUserStepComplete.value) return 1
  if (!isDeliveryStepComplete.value) return 2
  if (!isPaymentStepComplete.value) return 3
  return 4
}

const isStepComplete = (step: number) => {
  if (step === 1) return isUserStepComplete.value
  if (step === 2) return isDeliveryStepComplete.value
  if (step === 3) return isPaymentStepComplete.value
  return allCheckoutStepsComplete.value
}

const isStepLocked = (step: number) => {
  if (step === 1) return false
  if (step === 2) return !isUserStepComplete.value
  if (step === 3) return !isUserStepComplete.value || !isDeliveryStepComplete.value
  return !allCheckoutStepsComplete.value
}

const showSummary = (step: number) => isStepComplete(step) && activeStep.value !== step

const stepClass = (step: number) => ({
  'checkout-step--active': activeStep.value === step,
  'checkout-step--complete': isStepComplete(step) && !stepHasErrors(step),
  'checkout-step--locked': isStepLocked(step),
  'checkout-step--error': stepHasErrors(step)
})

const stepStatusLabel = (step: number) => {
  if (activeStep.value === step) return step === 4 ? t('ready_to_order') : t('active_step')
  if (isStepComplete(step)) return t('completed')
  if (isStepLocked(step)) return t('step_locked')
  return t('not_completed')
}

const openStep = (step: number) => {
  if (isStepLocked(step)) {
    haptic('error')
    return
  }

  activeStep.value = step
  haptic('selection')
}

const saveUserStep = async () => {
  const profile = {
    first_name: order.user.first_name,
    last_name: order.user.last_name,
    phone: order.user.phone,
    email: order.user.email,
    avatar: userStore.avatarUrl || telegramUser.value?.photo_url || null
  }

  userStore.saveCheckoutProfile(profile)
  await saveBackendProfile(profile)
}

const savePaymentStep = async () => {
  userStore.savePaymentMethod(order.payment.method)
  await saveBackendPaymentMethod(order.payment.method)
}

const saveDeliveryStep = async () => {
  normalizeMessengerDeliveryFields()
  const address = userStore.saveAddressFromDelivery(order.delivery)
  const savedAddress = await saveBackendAddress(address)
  if (savedAddress?.id) selectedSavedAddressId.value = savedAddress.id
}

const focusFirstStepError = async (step: number) => {
  await nextTick()
  const keys = errorsForStep(step)
  if (!keys.length) return
  const root = document.querySelector(`section.checkout-step:nth-of-type(${step + 1})`)
  const target = root?.querySelector('.tg-field--error') as HTMLElement | null
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (typeof target.focus === 'function') target.focus({ preventScroll: true })
  }
}

const continueStep = async (step: number) => {
  if (isStepLocked(step)) {
    activeStep.value = firstIncompleteStep()
    haptic('error')
    return
  }

  if (!validateStep(step)) {
    haptic('error')
    focusFirstStepError(step)
    return
  }

  if (step === 1) await saveUserStep()
  if (step === 2) await saveDeliveryStep()
  if (step === 3) await savePaymentStep()

  activeStep.value = Math.min(step + 1, 4)
  haptic('selection')
}

const persistCheckoutProgress = async () => {
  if (isUserStepComplete.value) await saveUserStep()
  if (isDeliveryStepComplete.value) await saveDeliveryStep()
  if (isPaymentStepComplete.value) await savePaymentStep()
}

const loadCheckoutRules = async () => {
  if (checkoutRulesLoading.value) return

  checkoutRulesLoading.value = true

  try {
    const response = await $api('/order/rules', {
      method: 'GET',
      query: {
        storefront: 'telegram',
        storefront_code: 'telegram',
        destinationCountry: countryCode.value || undefined,
        shipping_country_code: countryCode.value || undefined
      }
    })

    checkoutRules.value = response?.data || response || null
  } catch (error) {
    console.error('Failed to load checkout rules', error)
    checkoutRules.value = null
  } finally {
    checkoutRulesLoading.value = false
  }
}

const applyApiErrors = (source: Record<string, any> | null | undefined, prefix = '') => {
  if (!source || typeof source !== 'object') return

  Object.entries(source).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key

    if (Array.isArray(value)) {
      let normalizedKey: string
      if (path === 'payment.method' || path === 'payment') {
        normalizedKey = 'payment'
      } else if (path.startsWith('payment.')) {
        const subfield = path.slice('payment.'.length).split('.')[0]
        normalizedKey = paymentAddressFields.includes(subfield as any) ? `payment_${subfield}` : 'payment'
      } else if (path === 'delivery.method') {
        normalizedKey = 'delivery'
      } else {
        normalizedKey = path.split('.').pop() || path
      }
      errors[normalizedKey] = String(value[0] || '')
      return
    }

    if (value && typeof value === 'object') {
      applyApiErrors(value as Record<string, any>, path)
    }
  })
}

const buildOrderPayload = (telegramProfile: Record<string, any> | null) => {
  const collapseHouseIntoStreet = isMessengerMethod.value && !isMessengerExpress.value
  const street = collapseHouseIntoStreet
    ? appendHouseToStreet(order.delivery.street, order.delivery.house)
    : String(order.delivery.street || '').trim()

  return {
  provider: 'data',
  storefront: 'telegram',
  storefront_code: 'telegram',
  destinationCountry: countryCode.value || null,
  shipping_country_code: countryCode.value || null,
  telegram_user_id: telegramProfile?.id || null,
  telegram_user: telegramProfile,
  user: {
    first_name: order.user.first_name || null,
    last_name: order.user.last_name || null,
    phone: order.user.phone || null,
    email: order.user.email || null
  },
  delivery: {
    method: order.delivery.method || null,
    settlement: isMessengerExpress.value ? pragueCityLabel.value : (order.delivery.settlement || null),
    street: street || null,
    house: collapseHouseIntoStreet ? null : (order.delivery.house || null),
    room: order.delivery.room || null,
    zip: collapseHouseIntoStreet ? null : (order.delivery.zip || null),
    warehouse: order.delivery.warehouse || null,
    price: order.delivery.price ?? null,
    priceCurrency: order.delivery.priceCurrency || null
  },
  payment: {
    method: order.payment.method || null,
    settlement: needsPaymentAddress.value ? (order.payment.settlement || null) : null,
    street: needsPaymentAddress.value ? (order.payment.street || null) : null,
    house: needsPaymentAddress.value ? (order.payment.house || null) : null,
    room: needsPaymentAddress.value ? (order.payment.room || null) : null,
    zip: needsPaymentAddress.value ? (order.payment.zip || null) : null
  },
  comment: order.comment || null,
  products: { ...cart.cartPayload }
  }
}

const syncDeliveryPricing = () => {
  cart.setDeliveryPricing({
    price: quotedDeliveryOnly.value,
    cod: quotedCodFee.value
  })
}

const fetchShippingQuote = async () => {
  if (!shippingPayload.value) {
    shippingQuote.value = null
    lastQuoteKey.value = null
    syncDeliveryPricing()
    return
  }

  const payloadKey = JSON.stringify(shippingPayload.value)
  if (payloadKey === lastQuoteKey.value && shippingQuote.value) {
    syncDeliveryPricing()
    return
  }

  lastQuoteKey.value = payloadKey

  try {
    shippingQuote.value = await $api('/shipping/quote', {
      method: 'POST',
      body: shippingPayload.value
    })
  } catch (error) {
    console.error('Failed to fetch shipping quote', error)
    shippingQuote.value = null
    lastQuoteKey.value = null
  }

  syncDeliveryPricing()
}

const resetInvalidPayment = () => {
  if (order.payment.method && !paymentMethods.value.some((method) => method.key === order.payment.method)) {
    order.payment.method = null
    if (activeStep.value > 3) {
      activeStep.value = 3
    }
  }
}

const applySavedPayment = () => {
  const savedMethod = userStore.checkoutProfile.paymentMethod
  if (!order.payment.method && savedMethod && paymentMethods.value.some((method) => method.key === savedMethod)) {
    order.payment.method = savedMethod
  }
}

const applySavedAddress = (address: TgSavedAddress, activateStep = true) => {
  if (!userStore.applyAddressToDelivery(address.id, order.delivery)) return

  normalizeMessengerDeliveryFields()
  selectedSavedAddressId.value = address.id
  syncDeliveryPricing()
  resetInvalidPayment()
  applySavedPayment()

  if (activateStep) {
    activeStep.value = 2
    haptic('selection')
  }
}

const savedAddressLine = (address: TgSavedAddress) => {
  const streetLine = addressLineOf(address.street, address.house, address.room)
  return [address.settlement, address.warehouse || streetLine || address.zip].filter(Boolean).join(', ') || address.title
}

const resetDeliveryFields = () => {
  order.delivery.method = null
  order.delivery.settlement = ''
  order.delivery.street = ''
  order.delivery.house = ''
  order.delivery.room = ''
  order.delivery.zip = ''
  order.delivery.warehouse = ''
  shippingQuote.value = null
  lastQuoteKey.value = null
  syncDeliveryPricing()
}

const normalizeMessengerDeliveryFields = () => {
  if (!isMessengerMethod.value) {
    return
  }

  if (isMessengerExpress.value) {
    order.delivery.settlement = pragueCityLabel.value
    delete errors.settlement
    return
  }

  if (hasValue(order.delivery.house)) {
    order.delivery.street = appendHouseToStreet(order.delivery.street, order.delivery.house)
  }

  order.delivery.house = ''
  order.delivery.zip = ''
  delete errors.house
  delete errors.zip
}

const onSavedAddressChange = () => {
  const id = selectedSavedAddressId.value
  if (!id) {
    resetDeliveryFields()
    haptic('selection')
    return
  }
  const address = userStore.addresses.find((item) => item.id === id)
  if (address) applySavedAddress(address, false)
}

const selectedPickupLocationId = computed(() => {
  const current = String(order.delivery.warehouse || '').trim()
  if (!current) return ''
  return pickupLocations.value.find((item) => item.label === current || item.address === current)?.id || ''
})

const applyPickupLocation = (location: { id: string; title: string; address: string; label: string }) => {
  order.delivery.warehouse = location.label || location.address
  order.delivery.street = location.address || null
  delete errors.warehouse
}

const choosePacketaPoint = async () => {
  if (packetaPickerLoading.value) return
  packetaPickerLoading.value = true
  try {
    const point = await pickPacketaPoint()
    if (!point) return
    order.delivery.warehouse = point.name || ''
    order.delivery.settlement = point.city || ''
    order.delivery.street = point.street || ''
    order.delivery.zip = point.zip || ''
    delete errors.warehouse
    delete errors.settlement
    haptic('success')
  } catch (error) {
    console.error('Packeta widget failed', error)
    ui.showToast(t('packeta_loading_error'), 'error')
    haptic('error')
  } finally {
    packetaPickerLoading.value = false
  }
}

const syncPickupSelection = () => {
  if (order.delivery.method !== 'default_pickup') {
    return
  }

  if (!pickupLocations.value.length) {
    order.delivery.warehouse = null
    order.delivery.street = null
    return
  }

  const current = pickupLocations.value.find((item) => item.id === selectedPickupLocationId.value)
  if (current) {
    applyPickupLocation(current)
    return
  }

  if (!order.delivery.warehouse) {
    applyPickupLocation(pickupLocations.value[0])
  }
}

const deliveryMethodTitle = (key: string | null) => {
  return deliveryMethods.value.find((method) => method.key === key)?.title || key || t('delivery')
}

const setInitialStep = () => {
  activeStep.value = firstIncompleteStep()
}

const clearHiddenDeliveryErrors = () => {
  if (!deliveryFieldRequired('warehouse')) delete errors.warehouse
  if (!deliveryFieldRequired('settlement')) delete errors.settlement
  if (!deliveryFieldRequired('street')) delete errors.street
  if (!deliveryFieldRequired('house')) delete errors.house
  if (!deliveryFieldRequired('zip')) delete errors.zip
}

watch(() => order.delivery.method, () => {
  normalizeMessengerDeliveryFields()
  syncPickupSelection()
  resetInvalidPayment()
  applySavedPayment()
  clearHiddenDeliveryErrors()
})

watch(shippingPayload, () => {
  fetchShippingQuote()
}, { immediate: true })

watch([quotedDeliveryOnly, quotedCodFee], () => {
  syncDeliveryPricing()
}, { immediate: true })

const fetchMessengerCodPreview = async () => {
  if (!messengerCodPreviewPayload.value) {
    messengerCodPreviewQuote.value = null
    messengerCodPreviewKey.value = null
    return
  }

  const payloadKey = JSON.stringify(messengerCodPreviewPayload.value)
  if (payloadKey === messengerCodPreviewKey.value && messengerCodPreviewQuote.value) {
    return
  }

  messengerCodPreviewKey.value = payloadKey

  try {
    messengerCodPreviewQuote.value = await $api('/shipping/quote', {
      method: 'POST',
      body: messengerCodPreviewPayload.value
    })
  } catch (error) {
    console.error('Failed to fetch Messenger COD preview', error)
    messengerCodPreviewQuote.value = null
    messengerCodPreviewKey.value = null
  }
}

watch(messengerCodPreviewPayload, () => {
  fetchMessengerCodPreview()
}, { immediate: true })

watch(pickupLocations, () => {
  syncPickupSelection()
}, {
  immediate: true
})

watch(paymentMethods, () => {
  resetInvalidPayment()
  applySavedPayment()
})

const clearPaymentAddressFields = () => {
  paymentAddressFields.forEach((field) => {
    order.payment[field] = null
    delete errors[`payment_${field}`]
  })
}

watch(needsPaymentAddress, (next) => {
  if (!next) clearPaymentAddressFields()
})

watch([isUserStepComplete, isPaymentStepComplete, isDeliveryStepComplete], () => {
  if (isStepLocked(activeStep.value)) {
    activeStep.value = firstIncompleteStep()
  }
})

watch(activeStep, () => {
  submitError.value = ''
})

onMounted(async () => {
  order.provider = 'data'
  order.storefront = 'telegram'
  order.storefront_code = 'telegram'
  userStore.sync(telegramUser.value, webApp.value?.initData || '')

  await Promise.all([
    loadSettings(),
    loadBackendProfile(),
    loadCheckoutRules()
  ])

  userStore.fillOrderUser(order.user)
  normalizeMessengerDeliveryFields()

  if (!order.delivery.method && userStore.addresses[0]) {
    applySavedAddress(userStore.addresses[0], false)
  }

  await fetchShippingQuote()
  syncPickupSelection()
  resetInvalidPayment()
  applySavedPayment()
  setInitialStep()
  settingsReady.value = true
})

const firstStepWithErrors = () => {
  for (const step of [1, 2, 3]) {
    if (stepHasErrors(step)) return step
  }
  return firstIncompleteStep()
}

const submit = async () => {
  if (!cart.items.length || loading.value) return
  submitError.value = ''
  if (!validate()) {
    activeStep.value = firstStepWithErrors()
    submitError.value = t('form_has_errors')
    haptic('error')
    focusFirstStepError(activeStep.value)
    return
  }

  await persistCheckoutProgress()
  loading.value = true
  cart.clearErrors()

  const telegramProfile = telegramUser.value || userStore.user || null

  try {
    const payload = buildOrderPayload(telegramProfile)
    const response = await $api('/order', {
      method: 'POST',
      body: payload
    })

    cart.flashOrder = response?.data || response || null
    cart.clear()
    haptic('success')
    const code = cart.flashOrder?.code || cart.flashOrder?.id || ''
    await navigateTo({ path: pathFor('thank-you'), query: code ? { order: code } : {} }, { replace: true })
  } catch (error: any) {
    const apiErrors = error?.data?.options || error?.response?._data?.options || {}
    clearErrors()
    applyApiErrors(apiErrors)
    const apiMessage = error?.data?.message || error?.response?._data?.message || ''
    submitError.value = apiMessage || t('order_error')
    if (Object.keys(apiErrors).length) {
      activeStep.value = firstStepWithErrors()
      focusFirstStepError(activeStep.value)
    }
    ui.showToast(submitError.value, 'error')
    haptic('error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <TgLayout :title="t('checkout')" :show-back="true" :show-lang="true">
    <form class="tg-page checkout-page" @submit.prevent="submit">
      <div v-if="!cart.items.length" class="tg-empty">
        <div>
          <div class="tg-empty__icon"><TgIcon name="bag" :size="32" :stroke="2.2" /></div>
          <p class="tg-empty__title">{{ t('cart_empty') }}</p>
          <NuxtLink :to="catalogPath()" class="tg-btn checkout-page__empty-btn">{{ t('back_to_catalog') }}</NuxtLink>
        </div>
      </div>

      <template v-else>
        <div v-if="submitError" class="checkout-banner" role="alert">
          <TgIcon name="info" :size="16" :stroke="2.4" />
          <span v-html="renderSafeHtml(submitError)"></span>
        </div>

        <ul class="checkout-trust">
          <li><TgIcon name="sparkles" :size="12" :stroke="2.6" /> {{ t('trust_fresh') }}</li>
          <li><TgIcon name="shield" :size="12" :stroke="2.6" /> {{ t('trust_secure_pay') }}</li>
        </ul>

        <section class="checkout-card">
          <button type="button" class="checkout-card__summary" @click="expandedCart = !expandedCart">
            <span>{{ cart.totalQty }} · {{ formatMoney(cart.totalPrice, cart.items[0]?.currency) }}</span>
            <TgIcon :name="expandedCart ? 'chevron-up' : 'chevron-down'" :size="18" :stroke="2.4" />
          </button>
          <div v-if="expandedCart" class="checkout-card__items">
            <div v-for="item in cart.items" :key="`${item.productId}-${item.variantId}`" class="checkout-item">
              <NuxtImg
                :src="item.image"
                :alt="item.name"
                width="84"
                height="84"
                densities="1x 2x"
                format="webp"
                quality="70"
                loading="lazy"
                decoding="async"
              />
              <span>{{ item.name }} × {{ item.quantity }}</span>
              <strong>{{ formatMoney(item.price * item.quantity, item.currency) }}</strong>
            </div>
          </div>
          <TgFreeDeliveryProgress :total="cart.totalPrice" />
        </section>

        <section class="checkout-step" :class="stepClass(1)">
          <button type="button" class="checkout-step__header" @click="openStep(1)">
            <span class="checkout-step__number">
              <TgIcon v-if="stepHasErrors(1)" name="close" :size="16" :stroke="3" />
              <TgIcon v-else-if="isStepComplete(1) && activeStep !== 1" name="check" :size="16" :stroke="3" />
              <template v-else>1</template>
            </span>
            <span class="checkout-step__title">
              <strong>{{ t('step_user') }}</strong>
              <small>{{ stepStatusLabel(1) }}</small>
            </span>
            <span v-if="stepHasErrors(1)" class="checkout-step__badge checkout-step__badge--error">{{ errorsForStep(1).length }}</span>
            <span v-else-if="isStepComplete(1) && activeStep !== 1" class="checkout-step__badge">{{ t('done') }}</span>
          </button>

          <div v-if="showSummary(1)" class="checkout-summary">
            <p>{{ recipientSummary }}</p>
            <button type="button" class="checkout-link" @click="openStep(1)">{{ t('edit') }}</button>
          </div>

          <div v-else-if="activeStep === 1" class="checkout-step__body">
            <p v-if="stepHasErrors(1)" class="checkout-step__hint">
              {{ t('fix_section_errors') }}
              <span v-if="stepErrorFields(1)" class="checkout-step__hint-fields">{{ stepErrorFields(1) }}</span>
            </p>
            <label>
              <span>{{ t('first_name') }}<span v-if="userFieldRequired('first_name')" class="checkout-required">*</span></span>
              <input v-model="order.user.first_name" class="tg-field" :placeholder="t('placeholder_first_name')" :class="{ 'tg-field--error': errors.first_name }">
              <small v-if="errors.first_name" class="tg-error" v-html="renderSafeHtml(errors.first_name)"></small>
            </label>
            <label>
              <span>{{ t('last_name') }}<span v-if="userFieldRequired('last_name')" class="checkout-required">*</span></span>
              <input v-model="order.user.last_name" class="tg-field" :placeholder="t('placeholder_last_name')" :class="{ 'tg-field--error': errors.last_name }">
              <small v-if="errors.last_name" class="tg-error" v-html="renderSafeHtml(errors.last_name)"></small>
            </label>
            <label>
              <span>{{ t('phone') }}<span v-if="userFieldRequired('phone')" class="checkout-required">*</span></span>
              <input v-model="order.user.phone" class="tg-field" :placeholder="t('placeholder_phone') || phonePlaceholder" :class="{ 'tg-field--error': errors.phone }" inputmode="tel">
              <small v-if="errors.phone" class="tg-error" v-html="renderSafeHtml(errors.phone)"></small>
            </label>
            <label>
              <span>{{ t('email') }}<span v-if="userFieldRequired('email')" class="checkout-required">*</span></span>
              <input v-model="order.user.email" class="tg-field" type="email" inputmode="email" :placeholder="t('placeholder_email')" :class="{ 'tg-field--error': errors.email }">
              <small v-if="errors.email" class="tg-error" v-html="renderSafeHtml(errors.email)"></small>
            </label>
            <button type="button" class="tg-btn" @click="continueStep(1)">{{ t('continue') }}</button>
          </div>
        </section>

        <section class="checkout-step" :class="stepClass(2)">
          <button type="button" class="checkout-step__header" @click="openStep(2)">
            <span class="checkout-step__number">
              <TgIcon v-if="stepHasErrors(2)" name="close" :size="16" :stroke="3" />
              <TgIcon v-else-if="isStepComplete(2) && activeStep !== 2" name="check" :size="16" :stroke="3" />
              <template v-else>2</template>
            </span>
            <span class="checkout-step__title">
              <strong>{{ t('step_delivery') }}</strong>
              <small>{{ stepStatusLabel(2) }}</small>
            </span>
            <span v-if="stepHasErrors(2)" class="checkout-step__badge checkout-step__badge--error">{{ errorsForStep(2).length }}</span>
            <span v-else-if="isStepComplete(2) && activeStep !== 2" class="checkout-step__badge">{{ t('done') }}</span>
          </button>

          <div v-if="showSummary(2)" class="checkout-summary">
            <p>{{ deliverySummary }}</p>
            <button type="button" class="checkout-link" @click="openStep(2)">{{ t('edit') }}</button>
          </div>

          <div v-else-if="activeStep === 2" class="checkout-step__body">
            <p v-if="stepHasErrors(2)" class="checkout-step__hint">
              {{ t('fix_section_errors') }}
              <span v-if="stepErrorFields(2)" class="checkout-step__hint-fields">{{ stepErrorFields(2) }}</span>
            </p>

            <label v-if="userStore.addresses.length" class="address-selector">
              <span>{{ t('use_saved_address') }}</span>
              <select v-model="selectedSavedAddressId" class="tg-field" @change="onSavedAddressChange">
                <option value="">{{ t('new_address') }}</option>
                <option v-for="address in userStore.addresses" :key="address.id" :value="address.id">
                  {{ savedAddressLine(address) }}
                </option>
              </select>
            </label>

            <div class="radio-list">
              <label
                v-for="method in deliveryMethods"
                :key="method.key"
                class="radio-card"
                :class="{ 'radio-card--active': order.delivery.method === method.key }"
              >
                <input v-model="order.delivery.method" type="radio" :value="method.key">
                <span class="radio-card__title">
                  <strong>{{ method.title }}</strong>
                  <small>{{ method.label || t('delivery') }}</small>
                </span>
                <span class="radio-card__meta">
                  <strong class="radio-card__meta-price">{{ deliveryPriceLabel(method.price) }}</strong>
                  <small v-if="method.eta" class="radio-card__meta-eta">{{ method.eta }}</small>
                </span>
              </label>
            </div>
            <small v-if="errors.delivery" class="tg-error" v-html="renderSafeHtml(errors.delivery)"></small>

            <div v-if="order.delivery.method" class="checkout-step__fields">
              <div v-if="needsPickupLocation" class="saved-addresses">
                <strong>{{ t('warehouse') }}<span v-if="deliveryFieldRequired('warehouse')" class="checkout-required">*</span></strong>
                <button
                  v-for="location in pickupLocations"
                  :key="location.id"
                  type="button"
                  class="saved-address"
                  :class="{ 'saved-address--active': selectedPickupLocationId === location.id }"
                  @click="applyPickupLocation(location)"
                >
                  <span>{{ location.label }}</span>
                  <small v-if="location.schedule">{{ location.schedule }}</small>
                </button>
                <small v-if="errors.warehouse" class="tg-error" v-html="renderSafeHtml(errors.warehouse)"></small>
              </div>

              <div v-if="isPacketaWarehouse" class="packeta-picker">
                <button
                  type="button"
                  class="tg-btn tg-btn--lime packeta-picker__btn"
                  :disabled="packetaPickerLoading || !packetaConfigured"
                  @click="choosePacketaPoint"
                >
                  <TgIcon name="package" :size="18" :stroke="2.4" />
                  {{ packetaPickerLoading ? t('loading') : (order.delivery.warehouse ? t('change') : t('choose_pickup_point')) }}
                </button>
                <div v-if="order.delivery.warehouse" class="packeta-picker__point">
                  <strong>{{ order.delivery.warehouse }}</strong>
                  <small v-if="order.delivery.settlement || order.delivery.street || order.delivery.zip">
                    {{ [order.delivery.street, order.delivery.settlement, order.delivery.zip].filter(Boolean).join(', ') }}
                  </small>
                </div>
                <small v-if="errors.warehouse" class="tg-error" v-html="renderSafeHtml(errors.warehouse)"></small>
              </div>

              <label v-if="usesManualWarehouseFields || needsAddress">
                <span>{{ t('city') }}<span v-if="deliveryFieldRequired('settlement')" class="checkout-required">*</span></span>
                <input
                  v-model="order.delivery.settlement"
                  class="tg-field"
                  :placeholder="isMessengerExpress ? pragueCityLabel : t('placeholder_city')"
                  :readonly="isMessengerExpress"
                  :class="{ 'tg-field--error': errors.settlement }"
                >
                <small v-if="isMessengerExpress" class="checkout-city-hint">{{ t('city_locked_prague') }}</small>
                <small v-if="errors.settlement" class="tg-error" v-html="renderSafeHtml(errors.settlement)"></small>
              </label>

              <label v-if="usesManualWarehouseFields">
                <span>{{ t('warehouse') }}<span v-if="deliveryFieldRequired('warehouse')" class="checkout-required">*</span></span>
                <input v-model="order.delivery.warehouse" class="tg-field" :placeholder="t('placeholder_warehouse')" :class="{ 'tg-field--error': errors.warehouse }">
                <small v-if="errors.warehouse" class="tg-error" v-html="renderSafeHtml(errors.warehouse)"></small>
              </label>

              <template v-if="needsAddress">
                <label>
                  <span>{{ t('address') }}<span v-if="deliveryFieldRequired('street')" class="checkout-required">*</span></span>
                  <input v-model="order.delivery.street" class="tg-field" :placeholder="t('placeholder_address')" :class="{ 'tg-field--error': errors.street }">
                  <small v-if="errors.street" class="tg-error" v-html="renderSafeHtml(errors.street)"></small>
                </label>
                <label v-if="needsHouse">
                  <span>{{ t('house') }}<span v-if="deliveryFieldRequired('house')" class="checkout-required">*</span></span>
                  <input v-model="order.delivery.house" class="tg-field" :placeholder="t('placeholder_house')" :class="{ 'tg-field--error': errors.house }">
                  <small v-if="errors.house" class="tg-error" v-html="renderSafeHtml(errors.house)"></small>
                </label>
                <label>
                  <span>{{ t('flat') }}</span>
                  <input v-model="order.delivery.room" class="tg-field" :placeholder="t('placeholder_flat')">
                </label>
                <label v-if="showsZipField">
                  <span>{{ t('zip') }}<span v-if="deliveryFieldRequired('zip')" class="checkout-required">*</span></span>
                  <input v-model="order.delivery.zip" class="tg-field" :placeholder="t('placeholder_zip')" :class="{ 'tg-field--error': errors.zip }">
                  <small v-if="errors.zip" class="tg-error" v-html="renderSafeHtml(errors.zip)"></small>
                </label>
              </template>
            </div>

            <button type="button" class="tg-btn" @click="continueStep(2)">{{ t('continue') }}</button>
          </div>
        </section>

        <section class="checkout-step" :class="stepClass(3)">
          <button type="button" class="checkout-step__header" @click="openStep(3)">
            <span class="checkout-step__number">
              <TgIcon v-if="stepHasErrors(3)" name="close" :size="16" :stroke="3" />
              <TgIcon v-else-if="isStepComplete(3) && activeStep !== 3" name="check" :size="16" :stroke="3" />
              <template v-else>3</template>
            </span>
            <span class="checkout-step__title">
              <strong>{{ t('step_payment') }}</strong>
              <small>{{ stepStatusLabel(3) }}</small>
            </span>
            <span v-if="stepHasErrors(3)" class="checkout-step__badge checkout-step__badge--error">{{ errorsForStep(3).length }}</span>
            <span v-else-if="isStepComplete(3) && activeStep !== 3" class="checkout-step__badge">{{ t('done') }}</span>
          </button>

          <div v-if="showSummary(3)" class="checkout-summary">
            <p>{{ paymentSummary }}</p>
            <button type="button" class="checkout-link" @click="openStep(3)">{{ t('edit') }}</button>
          </div>

          <div v-else-if="activeStep === 3" class="checkout-step__body">
            <p v-if="stepHasErrors(3)" class="checkout-step__hint">
              {{ t('fix_section_errors') }}
              <span v-if="stepErrorFields(3)" class="checkout-step__hint-fields">{{ stepErrorFields(3) }}</span>
            </p>
            <div class="radio-list">
              <label
                v-for="method in paymentMethods"
                :key="method.key"
                class="radio-card"
                :class="{ 'radio-card--active': order.payment.method === method.key }"
              >
                <input v-model="order.payment.method" type="radio" :value="method.key">
                <span class="radio-card__title">
                  <strong>{{ method.title }}</strong>
                  <small v-if="paymentMethodMeta(method)">{{ paymentMethodMeta(method) }}</small>
                </span>
              </label>
            </div>
            <small v-if="errors.payment" class="tg-error" v-html="renderSafeHtml(errors.payment)"></small>

            <div v-if="needsPaymentAddress" class="checkout-step__fields">
              <p class="checkout-step__hint checkout-step__hint--info">{{ t('bank_transfer_address_hint') }}</p>
              <label>
                <span>{{ t('city') }}<span v-if="paymentFieldRequired('settlement')" class="checkout-required">*</span></span>
                <input v-model="order.payment.settlement" class="tg-field" :placeholder="t('placeholder_city')" :class="{ 'tg-field--error': errors.payment_settlement }">
                <small v-if="errors.payment_settlement" class="tg-error" v-html="renderSafeHtml(errors.payment_settlement)"></small>
              </label>
              <label>
                <span>{{ t('address') }}<span v-if="paymentFieldRequired('street')" class="checkout-required">*</span></span>
                <input v-model="order.payment.street" class="tg-field" :placeholder="t('placeholder_address')" :class="{ 'tg-field--error': errors.payment_street }">
                <small v-if="errors.payment_street" class="tg-error" v-html="renderSafeHtml(errors.payment_street)"></small>
              </label>
              <label>
                <span>{{ t('house') }}<span v-if="paymentFieldRequired('house')" class="checkout-required">*</span></span>
                <input v-model="order.payment.house" class="tg-field" :placeholder="t('placeholder_house')" :class="{ 'tg-field--error': errors.payment_house }">
                <small v-if="errors.payment_house" class="tg-error" v-html="renderSafeHtml(errors.payment_house)"></small>
              </label>
              <label>
                <span>{{ t('flat') }}<span v-if="paymentFieldRequired('room')" class="checkout-required">*</span></span>
                <input v-model="order.payment.room" class="tg-field" :placeholder="t('placeholder_flat')" :class="{ 'tg-field--error': errors.payment_room }">
                <small v-if="errors.payment_room" class="tg-error" v-html="renderSafeHtml(errors.payment_room)"></small>
              </label>
              <label>
                <span>{{ t('zip') }}<span v-if="paymentFieldRequired('zip')" class="checkout-required">*</span></span>
                <input v-model="order.payment.zip" class="tg-field" :placeholder="t('placeholder_zip')" :class="{ 'tg-field--error': errors.payment_zip }">
                <small v-if="errors.payment_zip" class="tg-error" v-html="renderSafeHtml(errors.payment_zip)"></small>
              </label>
            </div>

            <button type="button" class="tg-btn" @click="continueStep(3)">{{ t('continue') }}</button>
          </div>
        </section>

        <section class="checkout-step" :class="stepClass(4)">
          <button type="button" class="checkout-step__header" @click="openStep(4)">
            <span class="checkout-step__number">4</span>
            <span class="checkout-step__title">
              <strong>{{ t('step_confirm') }}</strong>
              <small>{{ stepStatusLabel(4) }}</small>
            </span>
          </button>

          <div v-if="activeStep === 4" class="checkout-step__body">
            <div class="checkout-confirm">
              <p>{{ t('recipient') }}: {{ recipientSummary }}</p>
              <p>{{ t('payment') }}: {{ paymentSummary }}</p>
              <p>{{ t('delivery') }}: {{ deliverySummary }}</p>
            </div>

            <label>
              <span>{{ t('comment') }}</span>
              <textarea v-model="order.comment" class="tg-field" rows="3" :placeholder="t('placeholder_comment')" />
            </label>

            <section class="checkout-total">
              <div>
                <span>{{ t('subtotal') }}</span>
                <strong>{{ formatMoney(cart.totalPrice, cart.items[0]?.currency) }}</strong>
              </div>
              <div>
                <span>{{ t('delivery') }}</span>
                <strong>{{ settingsReady ? formatMoney(cart.deliveryPrice, cart.orderState.delivery.priceCurrency || cart.items[0]?.currency) : t('loading') }}</strong>
              </div>
              <div v-if="cart.codPrice > 0">
                <span>{{ t('cod_fee') }}</span>
                <strong>{{ settingsReady ? formatMoney(cart.codPrice, cart.orderState.delivery.codPriceCurrency || cart.items[0]?.currency) : t('loading') }}</strong>
              </div>
              <div class="checkout-total__final">
                <span>{{ t('total') }}</span>
                <strong>{{ formatMoney(cart.finishTotal, cart.items[0]?.currency) }}</strong>
              </div>
            </section>

            <button type="submit" class="tg-btn tg-btn--accent" :disabled="loading">
              {{ loading ? t('loading') : t('place_order') }}
            </button>
          </div>
        </section>
      </template>
    </form>
  </TgLayout>
</template>

<style scoped>
.checkout-page {
  display: grid;
  gap: 14px;
}

.checkout-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 2px solid var(--color-danger);
  border-radius: var(--radius-md);
  background: rgba(220, 38, 38, 0.08);
  padding: 10px 12px;
  color: var(--color-danger);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.checkout-banner svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.checkout-required {
  margin-left: 3px;
  color: var(--color-danger);
  font-weight: 800;
}

.checkout-step__hint {
  display: grid;
  gap: 4px;
  margin: 0;
  border: 1.5px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background: rgba(220, 38, 38, 0.06);
  padding: 8px 10px;
  color: var(--color-danger);
  font-size: 12px;
  font-weight: 600;
}

.checkout-step__hint-fields {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.checkout-step__hint--info {
  border-color: var(--color-ink);
  background: var(--color-bg-alt);
  color: var(--color-ink);
}

.address-selector {
  display: grid;
  gap: 6px;
}

.address-selector > span {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink);
}

.checkout-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.checkout-trust li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1.5px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  padding: 4px 9px;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.checkout-card,
.checkout-step,
.checkout-total {
  display: grid;
  gap: 12px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  padding: 14px;
  box-shadow: var(--shadow-card);
  transition: border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
}

.checkout-card__summary,
.checkout-step__header {
  display: flex;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--color-text);
  align-items: center;
  justify-content: space-between;
  padding: 0;
  text-align: left;
}

.checkout-card__summary {
  font-family: var(--font-display);
  font-size: 15px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.checkout-step__header {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.checkout-step__number {
  display: grid;
  width: 36px;
  height: 36px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  color: var(--color-ink);
  place-items: center;
  font-family: var(--font-display);
  font-size: 14px;
}

.checkout-step__title {
  display: grid;
}

.checkout-step__header strong,
.checkout-step__header small {
  display: block;
}

.checkout-step__header strong {
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.checkout-step__header small {
  margin-top: 3px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.checkout-step__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-lime);
  color: var(--color-ink);
  padding: 4px 10px;
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.checkout-step--active .checkout-step__number {
  background: var(--color-primary);
  color: var(--color-white);
}

.checkout-step--complete {
  border-color: var(--color-primary-dark);
  background: linear-gradient(0deg, rgba(24, 184, 90, 0.06), rgba(24, 184, 90, 0.06)), var(--color-white);
  box-shadow: 4px 4px 0 0 var(--color-primary-dark);
}

.checkout-step--complete .checkout-step__number {
  background: var(--color-primary);
  color: var(--color-white);
}

.checkout-step--complete.checkout-step--active {
  background: var(--color-white);
}

.checkout-step--locked {
  opacity: 0.55;
}

.checkout-step--locked .checkout-step__header {
  cursor: not-allowed;
}

.checkout-step--error {
  border-color: var(--color-danger);
  background: rgba(220, 38, 38, 0.04);
  box-shadow: 4px 4px 0 0 var(--color-danger);
}

.checkout-step--error .checkout-step__number {
  background: var(--color-danger);
  color: var(--color-white);
}

.checkout-step__badge--error {
  border-color: var(--color-danger);
  background: var(--color-danger);
  color: var(--color-white);
  font-family: var(--font-display);
}

.checkout-step__body,
.checkout-step__fields,
.checkout-card__items,
.radio-list,
.saved-addresses {
  display: grid;
  gap: 10px;
}

.checkout-step__body label,
.checkout-step__fields label {
  display: grid;
  gap: 6px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink);
}

.checkout-city-hint {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
}

.checkout-summary,
.checkout-confirm {
  display: grid;
  gap: 8px;
}

.checkout-confirm {
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-bg-input);
  padding: 12px;
}

.checkout-summary p,
.checkout-confirm p {
  margin: 0;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.checkout-link {
  width: max-content;
  border: 0;
  background: transparent;
  color: var(--color-primary-dark);
  padding: 0;
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}

.checkout-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.checkout-item img {
  width: 42px;
  height: 42px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  object-fit: contain;
}

.checkout-item strong {
  font-family: var(--font-display);
  color: var(--color-accent);
}

.radio-card {
  display: grid !important;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  min-height: 56px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-white);
  padding: 12px;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  box-shadow: var(--shadow-card-sm);
  transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.08s ease;
}

.radio-card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 0 var(--color-ink);
}

.radio-card--active {
  background: var(--color-lime);
  box-shadow: 3px 3px 0 0 var(--color-ink);
}

.radio-card input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.radio-card__title strong {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.radio-card__title small {
  display: block;
  margin-top: 3px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.radio-card em {
  font-family: var(--font-display);
  color: var(--color-accent-dark);
  font-size: 13px;
  font-style: normal;
  letter-spacing: 0.02em;
}

.radio-card__meta {
  display: grid;
  gap: 3px;
  justify-items: end;
  text-align: right;
}

.radio-card__meta-price {
  font-family: var(--font-display);
  color: var(--color-accent-dark);
  font-size: 13px;
  letter-spacing: 0.02em;
}

.radio-card__meta-eta {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.saved-addresses > strong {
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.saved-address {
  display: grid;
  gap: 4px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-white);
  padding: 12px;
  text-align: left;
  box-shadow: var(--shadow-card-sm);
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.08s ease;
}

.saved-address:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 0 var(--color-ink);
}

.saved-address--active {
  background: var(--color-lime);
  box-shadow: 3px 3px 0 0 var(--color-ink);
}

.saved-address span {
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.saved-address small {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.packeta-picker {
  display: grid;
  gap: 10px;
}

.packeta-picker__btn {
  width: 100%;
}

.packeta-picker__point {
  display: grid;
  gap: 4px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-lime);
  padding: 12px;
  box-shadow: var(--shadow-card-sm);
}

.packeta-picker__point strong {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.packeta-picker__point small {
  color: var(--color-ink);
  font-size: 11px;
  font-weight: 600;
}

.checkout-total {
  background: var(--color-bg-input);
}

.checkout-total div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
}

.checkout-total strong {
  color: var(--color-text);
}

.checkout-total__final {
  border-top: 2px solid var(--color-ink);
  padding-top: 12px;
  color: var(--color-text) !important;
}

.checkout-total__final span,
.checkout-total__final strong {
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.checkout-total__final strong {
  color: var(--color-accent);
  font-size: 22px;
}

.checkout-page__empty-btn {
  display: inline-flex;
  width: auto;
  margin-top: 14px;
  align-items: center;
}
</style>
