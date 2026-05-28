<script setup lang="ts">
import type { TgOrder } from '~/types/tg'
import { useTgCartStore } from '~/stores/cart'
import { useTgUiStore } from '~/stores/ui'

const { t } = useTgI18n()
const { catalogPath, pathFor } = useTgRouting()
const { formatMoney, noImage } = useTgProductUtils()
const { orders, loading, loadOrders } = useTgOrders()
const { loadSettings, deliveryMethods, paymentMethodsFor } = useTgCheckoutOptions()
const cart = useTgCartStore()
const ui = useTgUiStore()
const { haptic } = useTelegram()

const selectedOrder = ref<TgOrder | null>(null)
const repeating = ref(false)

const orderSheetOpen = computed({
  get: () => Boolean(selectedOrder.value),
  set: (value: boolean) => {
    if (!value) selectedOrder.value = null
  }
})

onMounted(() => {
  loadOrders({ silent: true })
  loadSettings()
})

const labelOr = (key: string, raw?: string | null) => {
  const value = t(key)
  return value === key ? (raw || '') : value
}

const orderCurrency = (order?: TgOrder | null) => order?.currencyCode || order?.currency || undefined

const orderTotal = (order: TgOrder) => order.grandTotal ?? order.price ?? order.subtotal ?? order.total ?? order.amount ?? 0

const orderProducts = (order?: TgOrder | null): any[] => {
  if (Array.isArray(order?.products)) return order!.products as any[]
  if (order?.products && typeof order.products === 'object') return Object.values(order.products)
  return []
}

const itemsCount = (order: TgOrder) => {
  return orderProducts(order).reduce((sum, product) => sum + Math.max(1, Number(product?.amount) || 1), 0)
}

const productImage = (product: any) => {
  const image = product?.image
  if (!image) return noImage.value
  if (typeof image === 'string') return image
  return image.src || image.url || noImage.value
}

const productName = (product: any) => product?.name || product?.shortName || product?.short_name || ''

const productLineTotal = (product: any) => Number(product?.price || 0) * Math.max(1, Number(product?.amount) || 1)

const dateLabel = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

const orderStatusLabel = (status?: string) => (status ? labelOr(`ostatus_${status}`, status) : t('ostatus_new'))
const payStatusLabel = (status?: string) => (status ? labelOr(`pstatus_${status}`, status) : '')
const shippingStatusLabel = (status?: string) => (status ? labelOr(`dstatus_${status}`, status) : '')

const statusTone = (status?: string) => {
  if (status && ['paid', 'delivered', 'sent'].includes(status)) return 'success'
  if (status && ['canceled', 'returned', 'refunded'].includes(status)) return 'danger'
  return 'accent'
}

const deliveryTitle = (method?: string | null) => {
  if (!method) return t('delivery')
  return deliveryMethods.value.find((item) => item.key === method)?.title || method
}

const paymentTitle = (method?: string | null) => {
  if (!method) return ''
  return paymentMethodsFor(null).find((item) => item.key === method)?.title || method
}

const deliveryDetails = (order?: TgOrder | null) => {
  const delivery = (order?.delivery && typeof order.delivery === 'object') ? order.delivery : {}
  const addressLine = [delivery.street, delivery.house, delivery.room].filter(Boolean).join(', ')
  return [delivery.settlement, delivery.warehouse || addressLine, delivery.zip].filter(Boolean).join(', ')
}

const recipientName = (order?: TgOrder | null) => {
  const user = (order?.user && typeof order.user === 'object') ? order.user : {}
  return [user.first_name, user.last_name].filter(Boolean).join(' ')
}

const repeatOrder = async (order: TgOrder) => {
  if (repeating.value) return
  repeating.value = true

  try {
    const result = cart.repeatOrder(order)
    if (!result.added) {
      ui.showToast(t('repeat_order_empty'), 'error')
      haptic('error')
      return
    }

    if (result.skipped) {
      ui.showToast(t('repeat_order_partial'), 'info')
    } else {
      ui.showToast(t('order_copied_to_cart'), 'success')
    }

    haptic('success')
    selectedOrder.value = null
    await navigateTo(pathFor('checkout'))
  } finally {
    repeating.value = false
  }
}
</script>

<template>
  <TgLayout :title="t('order_history')" :show-back="false" :show-lang="true">
    <section class="tg-page orders-page">
      <div v-if="loading" class="orders-page__list">
        <div v-for="item in 3" :key="item" class="skeleton orders-page__skeleton" />
      </div>

      <div v-else-if="orders.length" class="orders-page__list">
        <article v-for="order in orders" :key="order.id || order.code" class="order-card">
          <header class="order-card__head">
            <div class="order-card__id">
              <strong>#{{ order.code || order.id }}</strong>
              <span>{{ dateLabel(order.created_at) }}</span>
            </div>
            <span class="order-badge" :class="`order-badge--${statusTone(order.status)}`">
              {{ orderStatusLabel(order.status) }}
            </span>
          </header>

          <div v-if="orderProducts(order).length" class="order-card__thumbs">
            <span
              v-for="(product, index) in orderProducts(order).slice(0, 4)"
              :key="product?.id || index"
              class="order-card__thumb"
            >
              <NuxtImg
                :src="productImage(product)"
                :alt="productName(product)"
                width="80"
                height="80"
                format="webp"
                quality="70"
                loading="lazy"
                decoding="async"
              />
            </span>
            <span v-if="orderProducts(order).length > 4" class="order-card__thumb order-card__thumb--more">
              +{{ orderProducts(order).length - 4 }}
            </span>
          </div>

          <div class="order-card__footer">
            <span>{{ itemsCount(order) }} {{ t('items_total') }}</span>
            <strong>{{ formatMoney(orderTotal(order), orderCurrency(order)) }}</strong>
          </div>

          <div class="order-card__actions">
            <button type="button" class="order-card__detail" @click="selectedOrder = order">
              {{ t('details') }}
              <TgIcon name="chevron-right" :size="14" :stroke="2.4" />
            </button>
            <button type="button" class="tg-btn tg-btn--lime order-card__repeat" :disabled="repeating" @click="repeatOrder(order)">
              <TgIcon name="repeat" :size="16" :stroke="2.4" />
              {{ t('repeat_order') }}
            </button>
          </div>
        </article>
      </div>

      <div v-else class="tg-empty">
        <div>
          <div class="tg-empty__icon"><TgIcon name="package" :size="32" :stroke="2.2" /></div>
          <p class="tg-empty__title">{{ t('no_orders') }}</p>
          <NuxtLink :to="catalogPath()" class="tg-btn orders-page__btn">{{ t('back_to_catalog') }}</NuxtLink>
        </div>
      </div>
    </section>

    <TgBottomSheet v-model="orderSheetOpen" :title="selectedOrder ? `#${selectedOrder.code || selectedOrder.id}` : ''">
      <div v-if="selectedOrder" class="order-details">
        <p v-if="dateLabel(selectedOrder.created_at)" class="order-details__date">
          {{ t('order_date') }}: {{ dateLabel(selectedOrder.created_at) }}
        </p>

        <div class="order-details__statuses">
          <div class="order-status">
            <span class="order-status__label">{{ t('order_status') }}</span>
            <span class="order-badge" :class="`order-badge--${statusTone(selectedOrder.status)}`">
              {{ orderStatusLabel(selectedOrder.status) }}
            </span>
          </div>
          <div v-if="selectedOrder.payStatus" class="order-status">
            <span class="order-status__label">{{ t('pay_status') }}</span>
            <span class="order-badge" :class="`order-badge--${statusTone(selectedOrder.payStatus)}`">
              {{ payStatusLabel(selectedOrder.payStatus) }}
            </span>
          </div>
          <div v-if="selectedOrder.deliveryStatus" class="order-status">
            <span class="order-status__label">{{ t('shipping_status') }}</span>
            <span class="order-badge" :class="`order-badge--${statusTone(selectedOrder.deliveryStatus)}`">
              {{ shippingStatusLabel(selectedOrder.deliveryStatus) }}
            </span>
          </div>
        </div>

        <div v-if="recipientName(selectedOrder) || selectedOrder.user?.phone || selectedOrder.user?.email" class="order-block">
          <h3 class="order-block__title"><TgIcon name="user" :size="15" :stroke="2.4" /> {{ t('recipient') }}</h3>
          <p v-if="recipientName(selectedOrder)">{{ recipientName(selectedOrder) }}</p>
          <p v-if="selectedOrder.user?.phone" class="order-block__muted">
            <TgIcon name="phone" :size="13" :stroke="2.2" /> {{ selectedOrder.user.phone }}
          </p>
          <p v-if="selectedOrder.user?.email" class="order-block__muted">
            <TgIcon name="mail" :size="13" :stroke="2.2" /> {{ selectedOrder.user.email }}
          </p>
        </div>

        <div v-if="selectedOrder.delivery?.method || deliveryDetails(selectedOrder)" class="order-block">
          <h3 class="order-block__title"><TgIcon name="truck" :size="15" :stroke="2.4" /> {{ t('delivery') }}</h3>
          <p>{{ deliveryTitle(selectedOrder.delivery?.method) }}</p>
          <p v-if="deliveryDetails(selectedOrder)" class="order-block__muted">
            <TgIcon name="pin" :size="13" :stroke="2.2" /> {{ deliveryDetails(selectedOrder) }}
          </p>
        </div>

        <div v-if="selectedOrder.payment?.method" class="order-block">
          <h3 class="order-block__title"><TgIcon name="card" :size="15" :stroke="2.4" /> {{ t('payment') }}</h3>
          <p>{{ paymentTitle(selectedOrder.payment.method) }}</p>
        </div>

        <div v-if="selectedOrder.comment" class="order-block">
          <h3 class="order-block__title"><TgIcon name="info" :size="15" :stroke="2.4" /> {{ t('comment') }}</h3>
          <p class="order-block__muted">{{ selectedOrder.comment }}</p>
        </div>

        <div v-if="orderProducts(selectedOrder).length" class="order-block">
          <h3 class="order-block__title"><TgIcon name="bag" :size="15" :stroke="2.4" /> {{ t('order_items') }}</h3>
          <ul class="order-products">
            <li v-for="(product, index) in orderProducts(selectedOrder)" :key="product?.id || index" class="order-product">
              <NuxtImg
                :src="productImage(product)"
                :alt="productName(product)"
                width="96"
                height="96"
                format="webp"
                quality="70"
                loading="lazy"
                decoding="async"
              />
              <div class="order-product__info">
                <span class="order-product__name">{{ productName(product) }}</span>
                <small>{{ Math.max(1, Number(product?.amount) || 1) }} × {{ formatMoney(product?.price, orderCurrency(selectedOrder)) }}</small>
              </div>
              <strong>{{ formatMoney(productLineTotal(product), orderCurrency(selectedOrder)) }}</strong>
            </li>
          </ul>
        </div>

        <div class="order-totals">
          <div v-if="selectedOrder.subtotal">
            <span>{{ t('subtotal') }}</span>
            <strong>{{ formatMoney(selectedOrder.subtotal, orderCurrency(selectedOrder)) }}</strong>
          </div>
          <div v-if="Number(selectedOrder.discountTotal) > 0" class="order-totals__discount">
            <span>{{ t('discount') }}</span>
            <strong>−{{ formatMoney(selectedOrder.discountTotal, orderCurrency(selectedOrder)) }}</strong>
          </div>
          <div v-if="Number(selectedOrder.shippingTotal) >= 0 && selectedOrder.shippingTotal !== null && selectedOrder.shippingTotal !== undefined">
            <span>{{ t('delivery') }}</span>
            <strong>{{ formatMoney(selectedOrder.shippingTotal, orderCurrency(selectedOrder)) }}</strong>
          </div>
          <div class="order-totals__final">
            <span>{{ t('total') }}</span>
            <strong>{{ formatMoney(orderTotal(selectedOrder), orderCurrency(selectedOrder)) }}</strong>
          </div>
        </div>

        <a
          v-if="selectedOrder.invoiceDownloadUrl"
          :href="selectedOrder.invoiceDownloadUrl"
          target="_blank"
          rel="noopener"
          class="order-details__invoice"
        >
          <TgIcon name="box" :size="16" :stroke="2.4" /> {{ t('download_invoice') }}
        </a>

        <button type="button" class="tg-btn tg-btn--accent order-details__repeat" :disabled="repeating" @click="repeatOrder(selectedOrder)">
          <TgIcon name="repeat" :size="18" :stroke="2.4" />
          {{ t('repeat_order') }}
        </button>
      </div>
    </TgBottomSheet>
  </TgLayout>
</template>

<style scoped>
.orders-page__list {
  display: grid;
  gap: 14px;
}

.orders-page__skeleton {
  height: 168px;
  border-radius: var(--radius-lg);
}

.order-card {
  display: grid;
  gap: 12px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  padding: 14px;
  box-shadow: var(--shadow-card);
}

.order-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.order-card__id {
  display: grid;
  gap: 3px;
}

.order-card__id strong {
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.01em;
}

.order-card__id span {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.order-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  padding: 4px 10px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.order-badge--accent {
  background: rgba(255, 132, 0, 0.12);
  color: var(--color-accent);
}

.order-badge--success {
  background: rgba(24, 184, 90, 0.14);
  color: var(--color-primary-dark);
}

.order-badge--danger {
  background: rgba(220, 38, 38, 0.12);
  color: var(--color-danger);
}

.order-card__thumbs {
  display: flex;
  gap: 8px;
}

.order-card__thumb {
  display: grid;
  width: 56px;
  height: 56px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  overflow: hidden;
  place-items: center;
}

.order-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.order-card__thumb--more {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--color-text-muted);
}

.order-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-card__footer span {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
}

.order-card__footer strong {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--color-accent);
}

.order-card__actions {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  border-top: 2px dashed var(--color-border, rgba(0, 0, 0, 0.12));
  padding-top: 12px;
}

.order-card__detail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--color-primary-dark);
  padding: 0;
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.order-card__repeat {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 40px;
  font-size: 12px;
}

.orders-page__btn {
  display: inline-flex;
  width: auto;
  margin-top: 14px;
}

/* Detail sheet */
.order-details {
  display: grid;
  gap: 14px;
}

.order-details__date {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.order-details__statuses {
  display: grid;
  gap: 8px;
}

.order-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.order-status__label {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
}

.order-block {
  display: grid;
  gap: 6px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-bg-input);
  padding: 12px;
}

.order-block__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 2px;
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.order-block p {
  margin: 0;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.order-block__muted {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted) !important;
  font-weight: 600 !important;
  font-size: 13px !important;
}

.order-products {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.order-product {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.order-product img {
  width: 48px;
  height: 48px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  object-fit: contain;
}

.order-product__info {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.order-product__name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
}

.order-product__info small {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.order-product strong {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--color-accent);
}

.order-totals {
  display: grid;
  gap: 8px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-bg-input);
  padding: 12px;
}

.order-totals div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
}

.order-totals strong {
  color: var(--color-text);
}

.order-totals__discount strong {
  color: var(--color-primary-dark);
}

.order-totals__final {
  border-top: 2px solid var(--color-ink);
  padding-top: 10px;
}

.order-totals__final span,
.order-totals__final strong {
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text) !important;
}

.order-totals__final strong {
  font-size: 20px;
  color: var(--color-accent) !important;
}

.order-details__invoice {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-white);
  padding: 10px;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
}

.order-details__repeat {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>
