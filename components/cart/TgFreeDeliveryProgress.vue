<script setup lang="ts">
const props = withDefaults(defineProps<{
  total: number
  compact?: boolean
}>(), {
  compact: false
})

const { t } = useTgI18n()
const { formatMoney } = useTgProductUtils()
const {
  isActive,
  freeMinPrice,
  freeCurrency,
  leftFor,
  progressFor,
  isReachedFor,
  loadSettings
} = useTgFreeDelivery()

onMounted(() => { loadSettings() })

const reached = computed(() => isReachedFor(props.total))
const left = computed(() => leftFor(props.total))
const progress = computed(() => progressFor(props.total))
const leftFormatted = computed(() => formatMoney(left.value, freeCurrency.value))
const minFormatted = computed(() => formatMoney(freeMinPrice.value, freeCurrency.value))
</script>

<template>
  <div v-if="isActive" class="tg-free" :class="{ 'tg-free--reached': reached, 'tg-free--compact': compact }">
    <div class="tg-free__head">
      <TgIcon :name="reached ? 'check' : 'truck'" :size="16" :stroke="2.4" />
      <span v-if="reached">{{ t('free_delivery_unlocked') }}</span>
      <span v-else>{{ t('free_delivery_left', { amount: leftFormatted }) }}</span>
    </div>
    <div class="tg-free__bar">
      <div class="tg-free__fill" :style="{ width: `${progress}%` }" />
    </div>
    <small v-if="!compact && !reached" class="tg-free__hint">{{ t('free_delivery_from', { amount: minFormatted }) }}</small>
  </div>
</template>

<style scoped>
.tg-free {
  display: grid;
  gap: 6px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-white);
  padding: 10px 12px;
  box-shadow: var(--shadow-card-sm);
}

.tg-free--compact {
  padding: 8px 10px;
}

.tg-free__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tg-free__bar {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-bg-alt);
  overflow: hidden;
}

.tg-free__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-lime) 100%);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.tg-free--reached .tg-free__fill {
  background: var(--color-lime);
}

.tg-free__hint {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
}
</style>
