import type { TgCartItem, TgId, TgProduct, TgProductVariant } from '~/types/tg'

const defaultOrderState = () => ({
  delivery: {
    method: null as string | null,
    settlement: null as string | null,
    street: null as string | null,
    house: null as string | null,
    room: null as string | null,
    zip: null as string | null,
    warehouse: null as string | null,
    price: null as number | null,
    priceCurrency: null as string | null,
    codPrice: null as number | null,
    codPriceCurrency: null as string | null
  },
  payment: {
    method: null as string | null,
    settlement: null as string | null,
    street: null as string | null,
    house: null as string | null,
    room: null as string | null,
    zip: null as string | null
  },
  user: {
    first_name: null as string | null,
    last_name: null as string | null,
    phone: null as string | null,
    email: null as string | null
  },
  comment: null as string | null,
  provider: 'data',
  storefront: 'telegram',
  storefront_code: 'telegram'
})

const toId = (value: unknown): TgId => {
  if (typeof value === 'number' || typeof value === 'string') return value
  return ''
}

const getImageSrc = (source: any): string => {
  if (!source) return '/images/noimage.png'
  if (typeof source === 'string') return source
  if (typeof source.src === 'string') return source.src
  if (typeof source.url === 'string') return source.url
  return '/images/noimage.png'
}

const getProductImage = (product: TgProduct, variant?: TgProductVariant | null): string => {
  if (variant?.image) return getImageSrc(variant.image)
  if (Array.isArray(variant?.images) && variant.images.length) return getImageSrc(variant.images[0])
  if (product.image) return getImageSrc(product.image)
  if (Array.isArray(product.images) && product.images.length) return getImageSrc(product.images[0])
  return '/images/noimage.png'
}

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const stringValue = (value: unknown) => String(value || '').trim()

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const productNameOf = (product: TgProduct) => {
  const explicitName = stringValue(
    product.parentName
    || product.parent_name
    || product.productName
    || product.product_name
    || product.baseName
    || product.base_name
  )
  const name = explicitName || stringValue(product.name)
  const labels = Array.isArray(product.modifications)
    ? product.modifications
        .flatMap((variant) => [variant?.short_name, variant?.shortName, variant?.name])
        .map(stringValue)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
    : []

  return labels.reduce((value, label) => {
    if (!label || label === value) return value
    return value.replace(new RegExp(`\\s*[-–—]\\s*${escapeRegExp(label)}\\s*$`, 'i'), '').trim()
  }, name)
}

const isItemInStock = (item?: TgProduct | TgProductVariant | null): boolean => {
  if (!item) return false
  const stock = item.inStock ?? item.in_stock
  return stock === undefined || stock === null || Number(stock) > 0
}

const isProductInStock = (product: TgProduct, variant?: TgProductVariant | null) => {
  if (variant) return isItemInStock(variant)
  if (Array.isArray(product.modifications) && product.modifications.length) {
    return product.modifications.some((modification) => isItemInStock(modification))
  }
  return isItemInStock(product)
}

export const useTgCartStore = defineStore('tgCartStore', {
  persist: true,

  state: () => ({
    items: [] as TgCartItem[],
    orderState: defaultOrderState(),
    flashOrder: null as Record<string, any> | null,
    errors: {} as Record<string, any>
  }),

  getters: {
    totalQty: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: (state) => Number(state.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)),
    deliveryPrice: (state) => numberValue(state.orderState.delivery.price),
    codPrice: (state) => numberValue(state.orderState.delivery.codPrice),
    finishTotal(): number {
      return Number((this.totalPrice + this.deliveryPrice + this.codPrice).toFixed(2))
    },
    cartPayload: (state) => {
      return state.items.reduce<Record<string, number>>((payload, item) => {
        const apiProductId = String(item.variantId || item.productId)
        payload[apiProductId] = (payload[apiProductId] || 0) + item.quantity
        return payload
      }, {})
    },
    order: (state) => state.orderState,
    hasItems: (state) => state.items.length > 0
  },

  actions: {
    key(productId: TgId, variantId?: TgId | null) {
      return `${productId}:${variantId || 'base'}`
    },

    findItem(productId: TgId, variantId?: TgId | null) {
      const key = this.key(productId, variantId)
      return this.items.find((item) => this.key(item.productId, item.variantId) === key)
    },

    getQty(productId: TgId, variantId?: TgId | null) {
      return this.findItem(productId, variantId)?.quantity || 0
    },

    addItem(product: TgProduct, variant: TgProductVariant | null = null, quantity = 1) {
      if (!isProductInStock(product, variant)) return

      const productId = toId(product.id)
      const variantId = variant?.id ? toId(variant.id) : null
      const existing = this.findItem(productId, variantId)

      if (existing) {
        existing.quantity += quantity
        return
      }

      this.items.push({
        productId,
        variantId,
        quantity,
        name: productNameOf(product) || variant?.name || '',
        slug: product.slug || variant?.slug,
        image: getProductImage(product, variant),
        price: numberValue(variant?.price ?? product.price),
        originalPrice: numberValue(variant?.oldPrice ?? variant?.old_price ?? product.oldPrice ?? product.old_price, 0) || null,
        currency: variant?.currency || product.currency,
        variantLabel: variant ? (variant.short_name || variant.name || '') : ''
      })
    },

    updateQty(productId: TgId, variantId: TgId | null | undefined, quantity: number) {
      if (quantity <= 0) {
        this.removeItem(productId, variantId)
        return
      }

      const item = this.findItem(productId, variantId)
      if (item) {
        item.quantity = quantity
      }
    },

    removeItem(productId: TgId, variantId?: TgId | null) {
      const key = this.key(productId, variantId)
      this.items = this.items.filter((item) => this.key(item.productId, item.variantId) !== key)
    },

    setDeliveryPricing(pricing?: {
      price?: { amount?: number; currency?: string } | null
      cod?: { amount?: number; currency?: string } | null
    } | null) {
      this.orderState.delivery.price = pricing?.price?.amount ? numberValue(pricing.price.amount) : null
      this.orderState.delivery.priceCurrency = pricing?.price?.currency || null
      this.orderState.delivery.codPrice = pricing?.cod?.amount ? numberValue(pricing.cod.amount) : null
      this.orderState.delivery.codPriceCurrency = pricing?.cod?.currency || null
    },

    repeatOrder(order: Record<string, any> | null | undefined) {
      const rawProducts = Array.isArray(order?.products)
        ? order!.products
        : (order?.products && typeof order.products === 'object' ? Object.values(order.products) : [])

      const items: TgCartItem[] = []
      let added = 0
      let skipped = 0

      for (const product of rawProducts as any[]) {
        if (!product || typeof product !== 'object') continue

        const productId = toId(product.id ?? product.product_id)
        if (productId === '') {
          skipped += 1
          continue
        }

        const stock = product.inStock ?? product.in_stock
        if (stock !== undefined && stock !== null && Number(stock) <= 0) {
          skipped += 1
          continue
        }

        items.push({
          productId,
          variantId: null,
          quantity: Math.max(1, Math.round(numberValue(product.amount ?? product.quantity ?? product.count, 1))),
          name: stringValue(product.name) || stringValue(product.shortName) || stringValue(product.short_name),
          slug: product.slug || undefined,
          image: getImageSrc(product.image),
          price: numberValue(product.price),
          originalPrice: numberValue(product.oldPrice ?? product.old_price, 0) || null,
          currency: product.currency || order?.currencyCode || order?.currency,
          variantLabel: stringValue(product.shortName ?? product.short_name)
        })
        added += 1
      }

      if (!added) {
        return { added, skipped }
      }

      this.items = items

      const next = defaultOrderState()
      const delivery = (order?.delivery && typeof order.delivery === 'object') ? order.delivery : {}
      const payment = (order?.payment && typeof order.payment === 'object') ? order.payment : {}
      const user = (order?.user && typeof order.user === 'object') ? order.user : {}

      next.delivery = {
        ...next.delivery,
        method: delivery.method ?? null,
        settlement: delivery.settlement ?? null,
        street: delivery.street ?? null,
        house: delivery.house ?? null,
        room: delivery.room ?? null,
        zip: delivery.zip ?? null,
        warehouse: delivery.warehouse ?? null,
        price: typeof delivery.price === 'number' ? delivery.price : null,
        priceCurrency: delivery.priceCurrency ?? delivery.price_currency ?? null,
        codPrice: typeof delivery.codPrice === 'number' ? delivery.codPrice : null,
        codPriceCurrency: delivery.codPriceCurrency ?? delivery.cod_price_currency ?? null
      }
      next.payment = {
        method: payment.method ?? null,
        settlement: payment.settlement ?? null,
        street: payment.street ?? null,
        house: payment.house ?? null,
        room: payment.room ?? null,
        zip: payment.zip ?? null
      }
      next.user = {
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        phone: user.phone ?? null,
        email: user.email ?? null
      }
      next.comment = stringValue(order?.comment) || null

      this.orderState = next
      this.errors = {}

      return { added, skipped }
    },

    clear() {
      this.items = []
      this.orderState = defaultOrderState()
      this.errors = {}
    },

    clearErrors() {
      this.errors = {}
    }
  }
})
