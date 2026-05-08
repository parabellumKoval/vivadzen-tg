<script setup lang="ts">
const { t } = useTgI18n()
const { freeMinPrice, freeCurrency, isActive: freeDeliveryActive, loadSettings } = useTgFreeDelivery()
const { formatMoney } = useTgProductUtils()

onMounted(() => { loadSettings() })

const slides = computed(() => {
  const list: { id: string; type: 'icons' | 'text'; text?: string }[] = [
    { id: 'pay', type: 'icons' },
    { id: 'express', type: 'text', text: t('supheader_express') }
  ]

  if (freeDeliveryActive.value) {
    list.push({
      id: 'free',
      type: 'text',
      text: t('supheader_free_from', { amount: formatMoney(freeMinPrice.value, freeCurrency.value) })
    })
  }

  return list
})

const activeIndex = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const start = () => {
  stop()
  if (slides.value.length <= 1) return
  timer = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % slides.value.length
  }, 7000)
}

const stop = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch(() => slides.value.length, () => {
  if (activeIndex.value >= slides.value.length) activeIndex.value = 0
  start()
})

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <div class="tg-supheader" aria-hidden="true">
    <div class="tg-supheader__viewport">
      <transition name="tg-supheader-slide" mode="out-in">
        <div :key="slides[activeIndex]?.id" class="tg-supheader__slide">
          <template v-if="slides[activeIndex]?.type === 'icons'">
            <div class="tg-supheader__icons">
              <img src="/images/payment/visa.png" alt="Visa">
              <img src="/images/payment/mastercard.png" alt="Mastercard">
              <img src="/images/payment/apple-pay.png" alt="Apple Pay">
              <img src="/images/payment/google-pay.png" alt="Google Pay">
            </div>
          </template>
          <template v-else>
            <span class="tg-supheader__text">{{ slides[activeIndex]?.text }}</span>
          </template>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.tg-supheader {
  position: fixed;
  z-index: 101;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  width: 100%;
  max-width: 480px;
  height: 28px;
  margin: 0 auto;
  background: #0d0d0d;
  color: #fff;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.tg-supheader__viewport {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.tg-supheader__slide {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.tg-supheader__text {
  display: inline-flex;
  align-items: center;
  text-transform: uppercase;
}

.tg-supheader__icons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tg-supheader__icons img {
  height: 14px;
  width: auto;
  filter: brightness(0) invert(1);
  opacity: 0.92;
}

.tg-supheader-slide-enter-active,
.tg-supheader-slide-leave-active {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
}

.tg-supheader-slide-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.tg-supheader-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
