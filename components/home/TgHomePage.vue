<script setup lang="ts">
import type { TgCategory, TgProduct } from '~/types/tg'
import {
  asArray,
  normalizeCatalog,
  normalizeCategoryId,
  normalizeCategorySlug,
  resolveScopedCatalogCategories
} from '~/composables/useTgCatalog'
import { useTgUiStore } from '~/stores/ui'

type TgHomeSection = {
  category: TgCategory
  products: TgProduct[]
  total: number
}

type TgVibeTile = {
  key: string
  slug: string
  label: string
  tag: string
  icon: string
  bg: string
}

const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const { t } = useTgI18n()
const ui = useTgUiStore()
const { categoryPath, catalogPath, salePath } = useTgRouting()
const { isInStock } = useTgProductUtils()

const tgConfig = (config.public.tg as any) || {}
const tgCatalogConfig = tgConfig.catalog || {}
const baseCategoryId = normalizeCategoryId(tgCatalogConfig.baseCategoryId)
const baseCategorySlug = normalizeCategorySlug(tgCatalogConfig.baseCategorySlug)
const homeVibesConfig = (tgConfig.homeVibes || {}) as Record<string, { tag?: string, icon?: string, bg?: string, label?: string }>
const homeVibeBackgrounds = ['lime', 'magenta', 'accent', 'primary', 'yellow', 'white']

const categories = ref<TgCategory[]>([])
const sections = ref<TgHomeSection[]>([])
const loading = ref(false)
const initialLoading = ref(true)

const sectionIdOf = (category: TgCategory) => {
  return `category-section-${category.slug || category.id || 'item'}`
}

const vibeTiles = computed(() => {
  return sections.value
    .map((section, index) => {
      const category = section.category
      const slug = normalizeCategorySlug(category.slug)
      if (!slug) return null

      const vibe = homeVibesConfig[slug] || {}
      return {
        key: slug,
        slug,
        label: vibe.label || category.name || slug,
        tag: vibe.tag || '',
        icon: vibe.icon || 'tag',
        bg: vibe.bg || homeVibeBackgrounds[index % homeVibeBackgrounds.length]
      }
    })
    .filter((tile): tile is TgVibeTile => Boolean(tile))
})

const perks = computed(() => [
  { icon: 'truck', title: t('perk_discreet_ship_title'), text: t('perk_discreet_ship_text') },
  { icon: 'shield', title: t('perk_lab_tested_title'), text: t('perk_lab_tested_text') },
  { icon: 'flame', title: t('perk_fresh_drops_title'), text: t('perk_fresh_drops_text') }
])

const stripItems = computed(() => [
  t('home_strip_fresh'),
  t('home_strip_fast'),
  t('home_strip_safe'),
  t('home_strip_fresh'),
  t('home_strip_fast'),
  t('home_strip_safe')
])

const loadCategoryProducts = async (category: TgCategory) => {
  const slug = normalizeCategorySlug(category.slug)
  const categoryId = normalizeCategoryId(category.id)

  if (!slug && !categoryId) {
    return {
      products: [],
      total: 0
    }
  }

  const products: TgProduct[] = []
  const perPage = 100
  let page = 1
  let lastPage = 1
  let total = 0

  while (page <= lastPage) {
    const response = await $api('/catalog', {
      method: 'GET',
      query: {
        with_products: true,
        per_page: perPage,
        page,
        cache: true,
        ...(categoryId ? { category_id: categoryId } : {}),
        ...(slug ? { category_slug: slug } : {})
      }
    })

    const normalized = normalizeCatalog(response)
    products.push(...normalized.products.filter((product) => isInStock(product)))

    total = products.length
    const currentPage = Number(normalized.meta?.current_page || page)
    lastPage = Number(normalized.meta?.last_page || currentPage || 1)

    if (!normalized.products.length || currentPage >= lastPage) {
      break
    }

    page = currentPage + 1
  }

  return {
    products,
    total
  }
}

const refreshHome = async () => {
  loading.value = true

  try {
    const response = await $api('/category', {
      method: 'GET',
      query: {
        with_count: true
      }
    })

    const categoryTree = asArray<TgCategory>(response)
    categories.value = resolveScopedCatalogCategories(categoryTree, baseCategoryId, baseCategorySlug)

    sections.value = await Promise.all(categories.value.map(async (category) => {
      const { products, total } = await loadCategoryProducts(category)

      return {
        category,
        products,
        total
      }
    })).then((loadedSections) => loadedSections.filter((section) => section.products.length > 0))
  } catch (err) {
    categories.value = []
    sections.value = []
    ui.showToast(t('loading_error'), 'error')
  } finally {
    loading.value = false
    initialLoading.value = false
  }
}

onMounted(() => {
  void refreshHome()
})
</script>

<template>
  <TgLayout :logo="true" :show-lang="true">
    <section class="tg-page home-hero">
      <div class="hero-card">
        <span class="hero-card__pill">
          <TgIcon name="lightning" :size="12" :stroke="2.4" />
          {{ t('home_hero_pill') }}
        </span>
        <h1 class="hero-card__title">{{ t('home_hero_title_1') }}<br>{{ t('home_hero_title_2') }}</h1>
        <p class="hero-card__sub">{{ t('home_hero_sub') }}</p>
        <div class="hero-card__actions">
          <NuxtLink :to="catalogPath()" class="tg-btn tg-btn--ink hero-card__btn-catalog">
            <TgIcon name="grid" :size="16" :stroke="2.2" />
            {{ t('home_catalog_cta') }}
          </NuxtLink>
          <NuxtLink :to="salePath()" class="tg-btn tg-btn--lime">
            <TgIcon name="flame" :size="16" :stroke="2.2" />
            {{ t('home_trending_cta') }}
          </NuxtLink>
        </div>

        <ul class="hero-card__trust" aria-hidden="false">
          <li><TgIcon name="truck" :size="14" :stroke="2.4" /> {{ t('home_delivery_prague') }}</li>
          <li><TgIcon name="package" :size="14" :stroke="2.4" /> {{ t('home_delivery_czech') }}</li>
          <li><TgIcon name="shield" :size="14" :stroke="2.4" /> {{ t('home_payment_online') }} · {{ t('home_payment_cod') }}</li>
        </ul>

        <div class="hero-card__strip" aria-hidden="true">
          <span v-for="(item, index) in stripItems" :key="`${item}-${index}`">★ {{ item }}</span>
        </div>
      </div>
    </section>

    <section class="tg-page home-external">
      <a
        href="https://vivadzen.com"
        target="_blank"
        rel="noopener noreferrer external"
        class="external-card"
      >
        <span class="external-card__badge">
          <TgIcon name="globe" :size="12" :stroke="2.4" />
          {{ t('home_external_badge') }}
        </span>
        <span class="external-card__arrow" aria-hidden="true">
          <TgIcon name="arrow-right" :size="18" :stroke="2.4" />
        </span>
        <h2 class="external-card__title">{{ t('home_external_title') }}</h2>
        <p class="external-card__text">{{ t('home_external_text') }}</p>
        <span class="external-card__cta">
          {{ t('home_external_cta') }}
          <TgIcon name="arrow-right" :size="14" :stroke="2.4" />
        </span>
        <span class="external-card__note">{{ t('home_external_note') }}</span>
      </a>
    </section>

    <section v-if="vibeTiles.length" class="tg-page home-vibes">
      <div class="home-vibes__track">
        <NuxtLink
          v-for="tile in vibeTiles"
          :key="tile.key"
          :to="categoryPath(tile.slug)"
          class="vibe-tile"
          :class="`vibe-tile--${tile.bg}`"
          :prefetch="false"
        >
          <span v-if="tile.tag" class="vibe-tile__tag">{{ tile.tag }}</span>
          <TgIcon :name="tile.icon" :size="44" :stroke="2.2" class="vibe-tile__icon" />
          <span class="vibe-tile__label">{{ tile.label }}</span>
        </NuxtLink>
      </div>
    </section>

    <section v-if="initialLoading" class="tg-page home-sections">
      <article v-for="item in 3" :key="item" class="home-section">
        <div class="home-section__head">
          <div class="home-section__copy">
            <div class="skeleton home-section__line home-section__line--title" />
          </div>
        </div>

        <div class="tg-grid">
          <TgProductCardSkeleton v-for="card in 4" :key="card" />
        </div>
      </article>
    </section>

    <section v-else-if="sections.length" class="tg-page home-sections">
      <article
        v-for="section in sections"
        :id="sectionIdOf(section.category)"
        :key="section.category.slug || section.category.id"
        class="home-section"
      >
        <div class="home-section__head">
          <div class="home-section__copy">
            <h2 class="home-section__title">{{ section.category.name }}</h2>
            <p class="tg-subtitle">{{ t('products_count', { count: section.total || section.products.length }) }}</p>
          </div>
          <NuxtLink :to="categoryPath(section.category.slug)" class="home-section__more" :prefetch="false">
            {{ t('home_section_all') }}
            <TgIcon name="arrow-right" :size="14" :stroke="2.4" />
          </NuxtLink>
        </div>

        <div class="tg-grid">
          <TgProductCard
            v-for="product in section.products"
            :key="product.id || product.slug"
            :product="product"
            :source-category-slug="section.category.slug"
          />
        </div>
      </article>
    </section>

    <section v-else class="tg-page">
      <div class="tg-empty">
        <div>
          <div class="tg-empty__icon"><TgIcon name="package" :size="32" :stroke="2.2" /></div>
          <p class="tg-empty__title">{{ t('empty_catalog') }}</p>
        </div>
      </div>
    </section>

    <TgGoogleReviewsSlider />

    <section class="tg-page home-perks">
      <h2 class="home-perks__title">{{ t('home_perks_title') }}</h2>
      <div class="home-perks__grid">
        <div v-for="perk in perks" :key="perk.title" class="perk-card">
          <span class="perk-card__icon">
            <TgIcon :name="perk.icon" :size="24" :stroke="2.2" />
          </span>
          <span class="perk-card__copy">
            <strong>{{ perk.title }}</strong>
            <p>{{ perk.text }}</p>
          </span>
        </div>
      </div>
    </section>
  </TgLayout>
</template>

<style scoped>
.home-hero {
  padding-top: 14px;
  padding-bottom: 4px;
}

.hero-card {
  position: relative;
  overflow: hidden;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--color-ink) 0%, #1a1a1a 100%);
  color: var(--color-white);
  padding: 22px 20px 12px;
  box-shadow: var(--shadow-card);
}

.hero-card::before {
  content: '';
  position: absolute;
  top: -60px;
  right: -60px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--color-magenta) 0%, transparent 70%);
  opacity: 0.6;
  pointer-events: none;
}

.hero-card::after {
  content: '';
  position: absolute;
  bottom: 30px;
  left: -40px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--color-lime) 0%, transparent 70%);
  opacity: 0.5;
  pointer-events: none;
}

.hero-card__pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 2px solid var(--color-lime);
  border-radius: var(--radius-full);
  background: rgba(198, 244, 50, 0.12);
  color: var(--color-lime);
  padding: 5px 11px;
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-card__title {
  position: relative;
  margin: 14px 0 10px;
  font-family: var(--font-display);
  font-size: 44px;
  letter-spacing: -0.025em;
  line-height: 0.9;
  text-transform: uppercase;
}

.hero-card__sub {
  position: relative;
  margin: 0 0 18px;
  max-width: 320px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
}

.hero-card__actions {
  position: relative;
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
}

.hero-card__btn-catalog {
  border-color: var(--color-white);
  box-shadow: none;
}

.hero-card__btn-catalog:hover,
.hero-card__btn-catalog:active {
  box-shadow: none;
}

.hero-card__trust {
  position: relative;
  display: grid;
  gap: 6px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}

.hero-card__trust li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.hero-card__strip {
  position: relative;
  display: flex;
  margin: 18px -20px -12px;
  padding: 10px 0;
  border-top: 2px solid var(--color-lime);
  background: var(--color-lime);
  color: var(--color-ink);
  gap: 18px;
  white-space: nowrap;
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.hero-card__strip span {
  flex-shrink: 0;
}

/* External site card */
.home-external {
  padding-top: 12px;
  padding-bottom: 0;
}

.external-card {
  position: relative;
  display: grid;
  gap: 8px;
  overflow: hidden;
  isolation: isolate;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-xl);
  background-color: var(--color-ink);
  background-image: url('/images/leaves.jpg');
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  padding: 18px 18px 14px;
  color: var(--color-white);
  box-shadow: var(--shadow-card);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

/* Dark green overlay over the leaves background */
.external-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(7, 20, 11, 0.5);
  pointer-events: none;
}

.external-card > * {
  position: relative;
  z-index: 1;
}

.external-card:active {
  transform: translateY(1px);
  box-shadow: var(--shadow-card-sm);
}

.external-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: max-content;
  border: 2px solid var(--color-lime);
  border-radius: var(--radius-full);
  background: rgba(198, 244, 50, 0.16);
  color: var(--color-lime);
  padding: 4px 10px;
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.external-card__arrow {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  width: 34px;
  height: 34px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-yellow);
  color: var(--color-ink);
  place-items: center;
  transform: rotate(-45deg);
}

.external-card__title {
  margin: 6px 0 0;
  padding-right: 44px;
  font-family: var(--font-display);
  font-size: 24px;
  letter-spacing: -0.015em;
  line-height: 1;
  text-transform: uppercase;
}

.external-card__text {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
}

.external-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  width: max-content;
  border-radius: var(--radius-full);
  background: var(--color-lime);
  color: var(--color-ink);
  padding: 8px 14px;
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.external-card__note {
  color: rgba(255, 255, 255, 0.62);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* Vibe tiles */
.home-vibes {
  padding-top: 8px;
  padding-right: 0;
  overflow: hidden;
}

.home-vibes__track {
  --vibe-track-gap: 10px;
  --vibe-track-preview: 24px;

  display: flex;
  width: calc(100% + 16px);
  margin-right: -16px;
  margin-left: -16px;
  gap: var(--vibe-track-gap);
  padding-top: 8px;
  padding-right: 16px;
  padding-left: 16px;
  padding-bottom: 10px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-padding-left: 16px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.home-vibes__track::-webkit-scrollbar {
  display: none;
}

.vibe-tile {
  position: relative;
  display: flex;
  flex: 0 0 calc((100% - (var(--vibe-track-gap) * 2) - var(--vibe-track-preview) + 16px) / 2);
  min-height: 168px;
  flex-direction: column;
  justify-content: space-between;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  padding: 14px 12px 12px;
  background: var(--color-lime);
  color: var(--color-ink);
  box-shadow: var(--shadow-card-sm);
  overflow: hidden;
  scroll-snap-align: start;
  transform: translateZ(0);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.vibe-tile--lime { background: var(--color-lime); }
.vibe-tile--magenta { background: var(--color-magenta); color: var(--color-white); }
.vibe-tile--accent { background: var(--color-accent); color: var(--color-white); }
.vibe-tile--primary { background: var(--color-primary); color: var(--color-white); }
.vibe-tile--yellow { background: var(--color-yellow); }
.vibe-tile--white { background: var(--color-white); }

.vibe-tile__tag {
  display: inline-flex;
  position: relative;
  z-index: 1;
  width: max-content;
  max-width: 100%;
  border: 2px solid currentColor;
  border-radius: var(--radius-full);
  padding: 3px 8px;
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vibe-tile__icon {
  position: absolute;
  top: 50%;
  right: -10px;
  transform: translateY(-50%) rotate(-10deg);
  opacity: 0.95;
}

.vibe-tile__label {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-size: clamp(20px, 6vw, 28px);
  letter-spacing: 0;
  line-height: 0.95;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

/* Sections */
.home-sections {
  display: grid;
  gap: 28px;
}

.home-section {
  display: grid;
  gap: 14px;
}

.home-section__head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}

.home-section__copy {
  display: grid;
  gap: 4px;
}

.home-section__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: -0.015em;
  line-height: 0.95;
  text-transform: uppercase;
}

.home-section__more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-white);
  padding: 6px 10px;
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.home-section__line {
  height: 14px;
}

.home-section__line--title {
  width: 180px;
}

/* Perks */
.home-perks {
  padding-top: 4px;
}

.home-perks__title {
  margin: 0 0 14px;
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: -0.015em;
  text-transform: uppercase;
}

.home-perks__grid {
  display: grid;
  gap: 10px;
}

.perk-card {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
  align-items: start;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  padding: 14px;
  box-shadow: var(--shadow-card-sm);
}

.perk-card__icon {
  display: grid;
  width: 44px;
  height: 44px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-yellow);
  color: var(--color-ink);
  place-items: center;
}

.perk-card__copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.perk-card__copy strong {
  display: block;
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.perk-card__copy p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
}
</style>
