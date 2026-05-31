<script setup lang="ts">
const { t } = useTgI18n()
const { formatMoney } = useTgProductUtils()
const {
  loadSettings,
  deliveryMethods,
  paymentMethodsFor
} = useTgCheckoutOptions()
const {
  freeMinPrice,
  freeCurrency,
  isActive: freeActive
} = useTgFreeDelivery()

onMounted(() => { loadSettings() })

const expanded = ref(false)

const allPayments = computed(() => paymentMethodsFor(null))

const formattedPrice = (price: any) => {
  if (price && typeof price === 'object') {
    return formatMoney(price.amount, price.currency)
  }
  return null
}

const previewDelivery = computed(() => deliveryMethods.value.slice(0, 3))
const previewPayments = computed(() => allPayments.value.slice(0, 3))

const deliveryMeta = (method: { price?: any, eta?: string, isPriceObject?: boolean }) => {
  const parts: string[] = []

  if (method.isPriceObject) {
    const formatted = formattedPrice(method.price)
    if (formatted) {
      parts.push(`${t('delivery_from')} ${formatted}`)
    }
  }

  if (method.eta) {
    parts.push(method.eta)
  }

  return parts.join(' · ') || '—'
}
</script>

<template>
  <section class="tg-prod-delivery">
    <header class="tg-prod-delivery__head">
      <TgIcon name="truck" :size="18" :stroke="2.2" />
      <span>{{ t('product_delivery_title') }}</span>
    </header>

    <div class="tg-prod-delivery__hint">
      <TgIcon name="lightning" :size="14" :stroke="2.4" />
      <span>{{ t('home_delivery_prague') }} · {{ t('home_delivery_czech') }}</span>
    </div>

    <div v-if="freeActive" class="tg-prod-delivery__free">
      <TgIcon name="sparkles" :size="14" :stroke="2.2" />
      <span>{{ t('free_delivery_from', { amount: formatMoney(freeMinPrice, freeCurrency) }) }}</span>
    </div>

    <ul class="tg-prod-delivery__list">
      <li v-for="method in (expanded ? deliveryMethods : previewDelivery)" :key="method.key">
        <span class="tg-prod-delivery__name">{{ method.title }} <small>· {{ method.label }}</small></span>
        <span class="tg-prod-delivery__price">{{ deliveryMeta(method) }}</span>
      </li>
    </ul>

    <div v-if="previewPayments.length" class="tg-prod-delivery__pay">
      <strong>{{ t('payment_methods_short') }}:</strong>
      <span>{{ (expanded ? allPayments : previewPayments).map(p => p.title).join(' · ') }}</span>
    </div>

    <button
      v-if="deliveryMethods.length > 3 || allPayments.length > 3"
      type="button"
      class="tg-prod-delivery__more"
      @click="expanded = !expanded"
    >
      {{ expanded ? t('hide') : t('more') }}
    </button>
  </section>
</template>

<style scoped>
.tg-prod-delivery {
  display: grid;
  gap: 10px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-white);
  padding: 12px 14px;
  box-shadow: var(--shadow-card-sm);
}

.tg-prod-delivery__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tg-prod-delivery__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.tg-prod-delivery__free {
  display: inline-flex;
  width: max-content;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-full);
  background: var(--color-lime);
  padding: 4px 10px;
  color: var(--color-ink);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tg-prod-delivery__list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tg-prod-delivery__list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.tg-prod-delivery__name {
  font-weight: 700;
  color: var(--color-text);
}

.tg-prod-delivery__name small {
  color: var(--color-text-muted);
  font-weight: 500;
}

.tg-prod-delivery__price {
  flex-shrink: 0;
  color: var(--color-accent);
  font-weight: 800;
  font-size: 12px;
  white-space: nowrap;
}

.tg-prod-delivery__pay {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted);
  border-top: 1px dashed var(--color-border-soft);
  padding-top: 10px;
}

.tg-prod-delivery__pay strong {
  color: var(--color-text);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: 11px;
}

.tg-prod-delivery__more {
  width: max-content;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--color-primary-dark);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
