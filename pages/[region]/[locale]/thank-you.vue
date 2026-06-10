<script setup lang="ts">
import { useTgCartStore } from '~/stores/cart'

const route = useRoute()
const cart = useTgCartStore()
const { t } = useTgI18n()
const { pathFor, catalogPath, region } = useTgRouting()
const { haptic } = useTelegram()

const flashOrder = computed(() => cart.flashOrder || null)

const orderCode = computed(() => {
  return String(route.query.order || flashOrder.value?.code || flashOrder.value?.id || '')
})

const paymentMethod = computed(() => {
  return String(flashOrder.value?.payment?.method || '').trim()
})

const isBankTransfer = computed(() => paymentMethod.value === 'bank_transfer')

const isUaRegion = computed(() => String(region.value || '').toLowerCase() === 'ua')

const showUaBankDetails = computed(() => isBankTransfer.value && isUaRegion.value)

const invoiceQrUrl = computed(() => flashOrder.value?.invoiceQrUrl || '')
const invoiceDownloadUrl = computed(() => flashOrder.value?.invoiceDownloadUrl || '')

const showInvoiceAssets = computed(() => {
  return isBankTransfer.value && !isUaRegion.value && (invoiceQrUrl.value || invoiceDownloadUrl.value)
})

const showBankBlock = computed(() => showUaBankDetails.value || showInvoiceAssets.value)

const successText = computed(() => {
  if (isBankTransfer.value) return t('order_success_bank_transfer')
  return t('order_success_text')
})

const uaBankDetails = computed(() => ([
  { label: t('bank_details_recipient'), value: 'ФОП Тарасенко Мирослав Васильович' },
  { label: t('bank_details_iban'), value: 'UA639358710000067329000102077' },
  { label: t('bank_details_edrpou'), value: '3519712799' },
  { label: t('bank_details_bank'), value: 'ТОВ НоваПей' }
]))

onMounted(() => {
  haptic('success')
})
</script>

<template>
  <TgLayout :title="t('thank_you')" :show-lang="true">
    <section class="thank-page">
      <div class="thank-page__icon"><TgIcon name="check" :size="38" :stroke="3" /></div>
      <h1>{{ t('order_success') }}</h1>
      <p v-if="orderCode" class="thank-page__code">#{{ orderCode }}</p>
      <p class="thank-page__lead">{{ successText }}</p>

      <div v-if="showBankBlock" class="thank-page__bank">
        <p class="thank-page__bank-note">{{ t('payment_info_sent_to_email') }}</p>

        <template v-if="showUaBankDetails">
          <div class="bank-details">
            <div class="bank-details__title">{{ t('bank_details_title') }}</div>
            <div v-for="item in uaBankDetails" :key="item.label" class="bank-details__row">
              <div class="bank-details__label">{{ item.label }}</div>
              <div class="bank-details__value">{{ item.value }}</div>
            </div>
          </div>
        </template>

        <template v-else-if="showInvoiceAssets">
          <p class="thank-page__bank-hint">{{ t('use_qr_or_invoice') }}</p>
          <div v-if="invoiceQrUrl" class="invoice-qr">
            <div class="invoice-qr__label">{{ t('invoice_qr_title') }}</div>
            <img :src="invoiceQrUrl" :alt="t('invoice_qr_title')" class="invoice-qr__img" />
          </div>
          <a
            v-if="invoiceDownloadUrl"
            :href="invoiceDownloadUrl"
            target="_blank"
            rel="noopener"
            class="tg-btn tg-btn--accent thank-page__invoice"
          >
            <TgIcon name="box" :size="18" :stroke="2.4" />
            {{ t('download_invoice') }}
          </a>
        </template>
      </div>

      <div class="thank-page__actions">
        <NuxtLink :to="pathFor('orders')" class="tg-btn">{{ t('go_to_orders') }}</NuxtLink>
        <NuxtLink :to="catalogPath()" class="tg-btn tg-btn--ghost">{{ t('back_to_catalog') }}</NuxtLink>
      </div>
    </section>
  </TgLayout>
</template>

<style scoped>
.thank-page {
  display: grid;
  min-height: calc(var(--tg-viewport-height, 100dvh) - 140px);
  padding: 32px 24px;
  place-content: center;
  text-align: center;
  gap: 0;
}

.thank-page__icon {
  display: grid;
  width: 80px;
  height: 80px;
  margin: 0 auto 18px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-lime);
  color: var(--color-ink);
  place-items: center;
  box-shadow: var(--shadow-card);
}

.thank-page h1 {
  margin: 0 0 8px;
  font-size: 22px;
}

.thank-page p {
  margin: 0 auto 18px;
  max-width: 320px;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.thank-page__code {
  color: var(--color-accent) !important;
  font-size: 18px !important;
  font-weight: 800;
}

.thank-page__lead {
  margin-bottom: 20px;
}

.thank-page__bank {
  display: grid;
  gap: 14px;
  width: min(100%, 360px);
  margin: 6px auto 22px;
  padding: 16px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.thank-page__bank-note {
  margin: 0 !important;
  color: var(--color-ink) !important;
  font-weight: 700;
  font-size: 14px !important;
  text-align: left;
}

.thank-page__bank-hint {
  margin: 0 !important;
  color: var(--color-text-muted) !important;
  font-size: 13px !important;
  text-align: left;
}

.bank-details {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1.5px dashed var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-bg-alt);
}

.bank-details__title {
  font-weight: 800;
  font-size: 14px;
  color: var(--color-ink);
}

.bank-details__row {
  display: grid;
  gap: 2px;
}

.bank-details__label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.bank-details__value {
  font-weight: 700;
  color: var(--color-ink);
  word-break: break-word;
  font-size: 14px;
}

.invoice-qr {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1.5px dashed var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-bg-input);
  place-items: center;
}

.invoice-qr__label {
  font-weight: 700;
  font-size: 13px;
  color: var(--color-ink);
}

.invoice-qr__img {
  width: 200px;
  max-width: 100%;
  height: auto;
  display: block;
  background: var(--color-white);
  border-radius: var(--radius-sm);
}

.thank-page__invoice {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.thank-page__actions {
  display: grid;
  gap: 8px;
}
</style>
