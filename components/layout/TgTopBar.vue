<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  showBack?: boolean
  showLang?: boolean
  transparent?: boolean
  logo?: boolean
}>(), {
  title: '',
  showBack: false,
  showLang: false,
  transparent: false,
  logo: false
})

const router = useRouter()
const { pathFor, homePath } = useTgRouting()
const { webApp } = useTelegram()
const { t } = useTgI18n()

const goBack = () => {
  if (process.client && window.history.length > 1) {
    router.back()
    return
  }

  navigateTo(pathFor())
}

onMounted(() => {
  const backButton = webApp.value?.BackButton
  if (!backButton) return

  if (props.showBack) {
    backButton.show()
    backButton.onClick(goBack)
  } else {
    backButton.hide()
  }
})

watch(() => props.showBack, (value) => {
  const backButton = webApp.value?.BackButton
  if (!backButton) return

  if (value) {
    backButton.show()
    backButton.onClick(goBack)
  } else {
    backButton.hide()
  }
})

onBeforeUnmount(() => {
  const backButton = webApp.value?.BackButton
  if (!backButton) return

  try {
    backButton.offClick(goBack)
    backButton.hide()
  } catch {
    backButton.hide()
  }
})
</script>

<template>
  <header class="tg-topbar" :class="{ 'tg-topbar--transparent': transparent }">
    <button
      v-if="showBack"
      type="button"
      class="tg-topbar__btn"
      :aria-label="t('back')"
      @click="goBack"
    >
      <TgIcon name="arrow-left" :size="22" :stroke="2.4" />
      <span>{{ t('back') }}</span>
    </button>
    <div v-else class="tg-topbar__spacer" />

    <NuxtLink v-if="logo" :to="homePath()" class="tg-topbar__logo" aria-label="Vivadzen">
      <img src="/images/logo/vivadzen.png" alt="" width="28" height="28">
      <span>VIVADZEN</span>
    </NuxtLink>
    <div v-else class="tg-topbar__title">
      <slot name="title">{{ title || 'Vivadzen' }}</slot>
    </div>

    <TgLangSwitcher v-if="showLang" class="tg-topbar__lang" />
    <div v-else class="tg-topbar__spacer" />
  </header>
</template>

<style scoped>
.tg-topbar {
  position: fixed;
  z-index: 100;
  top: var(--tg-supheader-height);
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 480px;
  height: var(--tg-topbar-height);
  margin: 0 auto;
  border-bottom: 2px solid var(--color-ink);
  background: var(--color-bg);
  padding: 0 6px;
}

.tg-topbar--transparent {
  background: rgba(255, 245, 225, 0.92);
  backdrop-filter: blur(12px);
}

.tg-topbar__btn,
.tg-topbar__spacer,
.tg-topbar__lang {
  position: relative;
  z-index: 1;
  min-height: 36px;
}

.tg-topbar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-white);
  color: var(--color-ink);
  line-height: 1;
  padding: 0 10px 0 8px;
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tg-topbar__spacer {
  width: 52px;
}

.tg-topbar__title,
.tg-topbar__logo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.tg-topbar__title {
  max-width: calc(100% - 140px);
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: -0.01em;
  text-transform: uppercase;
}

.tg-topbar__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-ink);
  text-decoration: none;
}

.tg-topbar__logo img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.tg-topbar__logo span {
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
</style>
