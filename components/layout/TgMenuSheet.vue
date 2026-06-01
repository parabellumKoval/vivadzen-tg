<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useTgI18n()
const { pathFor } = useTgRouting()
const { settings, loadSettings } = useTgCheckoutOptions()

const close = () => emit('update:modelValue', false)

onMounted(() => {
  loadSettings()
})

const getByPath = (root: Record<string, any> | null | undefined, path: string): unknown => {
  if (!root) return undefined
  return path.split('.').reduce<any>((acc, segment) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, segment)) return acc[segment]
    return undefined
  }, root)
}

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && 'value' in (value as any) && typeof (value as any).value === 'string') {
    return String((value as any).value).trim()
  }
  return ''
}

const navItems = computed(() => [
  { key: 'about', title: t('about'), icon: 'info', to: pathFor('about') },
  { key: 'delivery', title: t('nav_delivery'), icon: 'truck', to: pathFor('delivery') },
  { key: 'privacy', title: t('nav_privacy'), icon: 'lock', to: pathFor('privacy') },
  { key: 'terms', title: t('nav_terms'), icon: 'list', to: pathFor('terms') }
])

const phone = computed(() => normalizeText(getByPath(settings.value, 'site.contacts.phone')))
const email = computed(() => normalizeText(getByPath(settings.value, 'site.contacts.email')))
const address = computed(() => normalizeText(getByPath(settings.value, 'site.contacts.address')))

const hasContacts = computed(() => Boolean(phone.value || email.value || address.value))

const messengers = computed(() => [
  { key: 'telegram', name: 'Telegram', icon: 'telegram', link: normalizeText(getByPath(settings.value, 'site.contacts.social.telegram')) },
  { key: 'whatsapp', name: 'WhatsApp', icon: 'whatsapp', link: normalizeText(getByPath(settings.value, 'site.contacts.social.whatsapp')) },
  { key: 'viber', name: 'Viber', icon: 'viber', link: normalizeText(getByPath(settings.value, 'site.contacts.social.viber')) }
].filter((item) => item.link))

const networks = computed(() => [
  { key: 'instagram', name: 'Instagram', icon: 'instagram', link: normalizeText(getByPath(settings.value, 'site.contacts.social.instagram')) },
  { key: 'facebook', name: 'Facebook', icon: 'facebook', link: normalizeText(getByPath(settings.value, 'site.contacts.social.facebook')) },
  { key: 'youtube', name: 'YouTube', icon: 'youtube', link: normalizeText(getByPath(settings.value, 'site.contacts.social.youtube')) }
].filter((item) => item.link))

const socials = computed(() => [...messengers.value, ...networks.value])

const telLink = computed(() => phone.value ? `tel:${phone.value.replace(/\s+/g, '')}` : null)
const mailLink = computed(() => email.value ? `mailto:${email.value}` : null)

const onNavClick = () => {
  close()
}
</script>

<template>
  <TgBottomSheet :model-value="modelValue" :title="t('menu')" @update:model-value="emit('update:modelValue', $event)">
    <div class="menu-sheet">
      <nav class="menu-list" :aria-label="t('menu')">
        <NuxtLink
          v-for="item in navItems"
          :key="item.key"
          :to="item.to"
          class="menu-list__row"
          @click="onNavClick"
        >
          <span class="menu-list__label">
            <span class="menu-list__icon"><TgIcon :name="item.icon" :size="18" :stroke="2.2" /></span>
            {{ item.title }}
          </span>
          <TgIcon name="chevron-right" :size="18" :stroke="2.4" />
        </NuxtLink>
      </nav>

      <section v-if="hasContacts" class="menu-section">
        <h3 class="menu-section__title">{{ t('contacts') }}</h3>
        <div class="menu-list">
          <a v-if="phone" :href="telLink || '#'" class="menu-list__row">
            <span class="menu-list__label">
              <span class="menu-list__icon"><TgIcon name="phone" :size="18" :stroke="2.2" /></span>
              {{ phone }}
            </span>
          </a>
          <a v-if="email" :href="mailLink || '#'" class="menu-list__row">
            <span class="menu-list__label">
              <span class="menu-list__icon"><TgIcon name="mail" :size="18" :stroke="2.2" /></span>
              {{ email }}
            </span>
          </a>
          <div v-if="address" class="menu-list__row menu-list__row--static">
            <span class="menu-list__label">
              <span class="menu-list__icon"><TgIcon name="pin" :size="18" :stroke="2.2" /></span>
              <span class="menu-list__address">{{ address }}</span>
            </span>
          </div>
        </div>
      </section>

      <section v-if="socials.length" class="menu-section">
        <h3 class="menu-section__title">{{ t('socials') }}</h3>
        <div class="menu-socials">
          <a
            v-for="item in socials"
            :key="item.key"
            :href="item.link"
            target="_blank"
            rel="noopener noreferrer"
            class="menu-socials__item"
            :aria-label="item.name"
          >
            <TgIcon :name="item.icon" :size="22" :stroke="2.2" />
            <span>{{ item.name }}</span>
          </a>
        </div>
      </section>
    </div>
  </TgBottomSheet>
</template>

<style scoped>
.menu-sheet {
  display: grid;
  gap: 18px;
}

.menu-list {
  overflow: hidden;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  box-shadow: var(--shadow-card-sm);
}

.menu-list__row {
  display: flex;
  min-height: 56px;
  border-bottom: 2px solid var(--color-ink);
  padding: 10px 16px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-decoration: none;
}

.menu-list__row:last-child {
  border-bottom: 0;
}

.menu-list__row--static {
  cursor: default;
}

.menu-list__label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.menu-list__icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-lime);
  color: var(--color-ink);
  place-items: center;
}

.menu-list__address {
  white-space: normal;
  text-transform: none;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
}

.menu-section {
  display: grid;
  gap: 10px;
}

.menu-section__title {
  margin: 0;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.menu-socials {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
}

.menu-socials__item {
  display: grid;
  gap: 6px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  background: var(--color-white);
  padding: 10px 8px;
  place-items: center;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  box-shadow: var(--shadow-card-sm);
}
</style>
