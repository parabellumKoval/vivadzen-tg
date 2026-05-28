<script setup lang="ts">
type TgInfoSection = {
  icon?: string
  title: string
  body: string
}

const props = defineProps<{
  title: string
  intro?: string
  icon?: string
  sections: TgInfoSection[]
  updated?: string
}>()

const paragraphsOf = (body: string) => {
  return String(body || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
</script>

<template>
  <TgLayout :title="title" :show-back="true" :show-lang="true">
    <section class="tg-page info-page">
      <header class="info-hero">
        <span class="info-hero__icon">
          <TgIcon :name="icon || 'info'" :size="22" :stroke="2.2" />
        </span>
        <h1 class="info-hero__title">{{ title }}</h1>
        <p v-if="intro" class="info-hero__sub">{{ intro }}</p>
      </header>

      <article
        v-for="(section, index) in sections"
        :key="`${section.title}-${index}`"
        class="info-section"
      >
        <div class="info-section__head">
          <span class="info-section__icon">
            <TgIcon :name="section.icon || 'check'" :size="18" :stroke="2.2" />
          </span>
          <h2 class="info-section__title">{{ section.title }}</h2>
        </div>
        <p
          v-for="(paragraph, pIndex) in paragraphsOf(section.body)"
          :key="pIndex"
          class="info-section__text"
        >
          {{ paragraph }}
        </p>
      </article>

      <p v-if="updated" class="info-updated">{{ updated }}</p>
    </section>
  </TgLayout>
</template>

<style scoped>
.info-page {
  display: grid;
  gap: 14px;
}

.info-hero {
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-xl);
  background: var(--color-ink);
  color: var(--color-white);
  padding: 22px 20px;
  box-shadow: var(--shadow-card);
}

.info-hero__icon {
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

.info-hero__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 30px;
  letter-spacing: -0.02em;
  line-height: 0.95;
  text-transform: uppercase;
}

.info-hero__sub {
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

.info-updated {
  margin: 0;
  padding: 4px 2px 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
