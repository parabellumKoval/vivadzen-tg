<script setup lang="ts">
import { useTgCartStore } from '~/stores/cart'

const { t } = useTgI18n()
const { formatMoney } = useTgProductUtils()
const cart = useTgCartStore()
const { loadSettings, deliveryMethods, paymentMethodsFor, messengerCodFeeInfo } = useTgCheckoutOptions()

onMounted(() => {
  loadSettings()
})

const allPayments = computed(() => paymentMethodsFor(null))

const infoSections = computed(() => [
  { icon: 'shield', title: t('delivery_s3_title'), body: t('delivery_s3_body') },
  { icon: 'repeat', title: t('delivery_s4_title'), body: t('delivery_s4_body') }
])

const deliveryMeta = (method: { price?: any, eta?: string }) => {
  const parts: string[] = []

  if (method.price && typeof method.price === 'object') {
    parts.push(formatMoney(method.price.amount, method.price.currency))
  }

  if (method.eta) {
    parts.push(method.eta)
  }

  return parts.join(' · ') || '—'
}

const paymentAvailability = (method: { payments?: string[] }) => {
  return deliveryMethods.value
    .filter((deliveryMethod) => method.payments?.includes(deliveryMethod.key))
    .map((deliveryMethod) => deliveryMethod.title)
    .join(' · ')
}

const messengerCodLabel = computed(() => {
  const feeInfo = messengerCodFeeInfo(cart.totalPrice || null)
  if (!feeInfo) {
    return ''
  }

  if ('amount' in feeInfo && typeof feeInfo.amount === 'number') {
    return `${t('cod_fee')}: ${formatMoney(feeInfo.amount, feeInfo.currency)}`
  }

  if (typeof feeInfo.minAmount === 'number' && typeof feeInfo.maxAmount === 'number') {
    if (feeInfo.minAmount === feeInfo.maxAmount) {
      return `${t('cod_fee')}: ${formatMoney(feeInfo.minAmount, feeInfo.currency)}`
    }

    return t('cod_fee_range', {
      from: formatMoney(feeInfo.minAmount, feeInfo.currency),
      to: formatMoney(feeInfo.maxAmount, feeInfo.currency)
    })
  }

  return ''
})

const paymentMeta = (method: { key: string }) => {
  if (method.key === 'messenger_cod') {
    return messengerCodLabel.value
  }

  return ''
}
</script>

<template>
  <TgLayout :title="t('nav_delivery')" :show-lang="true">
    <section class="tg-page delivery-page">
      <header class="delivery-hero">
        <span class="delivery-hero__icon">
          <TgIcon name="truck" :size="22" :stroke="2.2" />
        </span>
        <h1 class="delivery-hero__title">{{ t('nav_delivery') }}</h1>
        <p class="delivery-hero__sub">{{ t('delivery_intro') }}</p>
      </header>

      <article class="info-section">
        <div class="info-section__head">
          <span class="info-section__icon">
            <TgIcon name="truck" :size="18" :stroke="2.2" />
          </span>
          <h2 class="info-section__title">{{ t('delivery_methods_title') }}</h2>
        </div>
        <p class="info-section__text">{{ t('delivery_s1_body') }}</p>
        <p class="info-section__text">{{ t('delivery_methods_subtitle') }}</p>

        <div class="delivery-grid">
          <article
            v-for="method in deliveryMethods"
            :key="method.key"
            class="delivery-card"
          >
            <div class="delivery-card__main">
              <strong>{{ method.title }}</strong>
              <small>{{ method.label || t('delivery') }}</small>
            </div>
            <em>{{ deliveryMeta(method) }}</em>
          </article>
        </div>
      </article>

      <article class="info-section">
        <div class="info-section__head">
          <span class="info-section__icon">
            <TgIcon name="card" :size="18" :stroke="2.2" />
          </span>
          <h2 class="info-section__title">{{ t('payment_methods_title') }}</h2>
        </div>
        <p class="info-section__text">{{ t('delivery_s2_body') }}</p>
        <p class="info-section__text">{{ t('payment_methods_subtitle') }}</p>

        <div class="delivery-grid">
          <article
            v-for="method in allPayments"
            :key="method.key"
            class="delivery-card delivery-card--payment"
          >
            <div class="delivery-card__main">
              <strong>{{ method.title }}</strong>
              <small>{{ t('available_for') }}: {{ paymentAvailability(method) }}</small>
            </div>
            <em v-if="paymentMeta(method)">{{ paymentMeta(method) }}</em>
          </article>
        </div>
      </article>

      <article
        v-for="(section, index) in infoSections"
        :key="`${section.title}-${index}`"
        class="info-section"
      >
        <div class="info-section__head">
          <span class="info-section__icon">
            <TgIcon :name="section.icon" :size="18" :stroke="2.2" />
          </span>
          <h2 class="info-section__title">{{ section.title }}</h2>
        </div>
        <p
          v-for="(paragraph, paragraphIndex) in String(section.body).split('\n').map((line) => line.trim()).filter(Boolean)"
          :key="paragraphIndex"
          class="info-section__text"
        >
          {{ paragraph }}
        </p>
      </article>

      <p class="info-updated">{{ t('legal_updated') }}</p>
    </section>
  </TgLayout>
</template>

<style scoped>
.delivery-page {
  display: grid;
  gap: 14px;
}

.delivery-hero {
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-xl);
  background: var(--color-ink);
  color: var(--color-white);
  padding: 22px 20px;
  box-shadow: var(--shadow-card);
}

.delivery-hero__icon {
  display: grid;
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  border: 2px solid var(--color-lime);
  border-radius: var(--radius-full);
  background: rgba(198, 244, 50, 0.12);
  color: var(--color-lime);
  place-items: center;
}

.delivery-hero__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 30px;
  letter-spacing: -0.02em;
  line-height: 0.95;
  text-transform: uppercase;
}

.delivery-hero__sub {
  margin: 10px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.info-section {
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  padding: 16px;
  box-shadow: var(--shadow-card-sm);
}

.info-section__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.info-section__icon {
  display: grid;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-lime);
  color: var(--color-ink);
  place-items: center;
}

.info-section__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.01em;
  text-transform: uppercase;
}

.info-section__text {
  margin: 0;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
}

.info-section__text + .info-section__text {
  margin-top: 8px;
}

.delivery-grid {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.delivery-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  padding: 14px;
  box-shadow: var(--shadow-card-sm);
}

.delivery-card__main {
  display: grid;
  gap: 4px;
}

.delivery-card__main strong {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.delivery-card__main small {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
}

.delivery-card em {
  color: var(--color-accent-dark);
  font-family: var(--font-display);
  font-size: 13px;
  font-style: normal;
  letter-spacing: 0.02em;
  text-align: right;
}

.delivery-card--payment {
  align-items: start;
}

.info-updated {
  margin: 0;
  padding: 4px 2px 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
