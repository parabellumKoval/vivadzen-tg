<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  showBack?: boolean
  backTo?: string | null
  showLang?: boolean
  transparent?: boolean
  logo?: boolean
}>(), {
  title: '',
  showBack: false,
  backTo: null,
  showLang: false,
  transparent: false,
  logo: false
})
</script>

<template>
  <div class="tg-layout">
    <TgSupheader />
    <TgTopBar
      :title="title"
      :show-back="showBack"
      :back-to="backTo"
      :show-lang="showLang"
      :transparent="transparent"
      :logo="logo"
    />
    <main class="tg-main">
      <slot />
    </main>
    <TgBottomNav />
  </div>
</template>

<style scoped>
.tg-layout {
  min-height: var(--tg-viewport-height, 100dvh);
  max-width: 480px;
  margin: 0 auto;
  background: var(--color-bg);
}

.tg-main {
  min-height: var(--tg-viewport-height, 100dvh);
  padding-top: var(--tg-chrome-height);
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}
</style>
