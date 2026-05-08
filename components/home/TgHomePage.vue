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

const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const { t } = useTgI18n()
const ui = useTgUiStore()
const { categoryPath, catalogPath } = useTgRouting()

const tgCatalogConfig = (config.public.tg as any)?.catalog || {}
const baseCategoryId = normalizeCategoryId(tgCatalogConfig.baseCategoryId)
const baseCategorySlug = normalizeCategorySlug(tgCatalogConfig.baseCategorySlug)

const categories = ref<TgCategory[]>([])
const sections = ref<TgHomeSection[]>([])
const loading = ref(false)
const initialLoading = ref(true)

const sectionIdOf = (category: TgCategory) => {
  return `category-section-${category.slug || category.id || 'item'}`
}

// Vibe stickers — top 3 thematic tiles linking into the catalog
const vibeTiles = computed(() => [
  { key: 'cbd', label: 'CBD', tag: 'Chill', icon: 'leaf', bg: 'lime' },
  { key: 'mushrooms', label: 'Грибы', tag: 'Magic', icon: 'mushroom', bg: 'magenta' },
  { key: 'entheogens', label: 'Энтеогены', tag: 'Trip', icon: 'sparkles', bg: 'accent' }
])

const perks = [
  { icon: 'truck', title: 'Discreet ship', text: 'Все заказы упаковываются нейтрально и без следов.' },
  { icon: 'shield', title: 'Lab-tested', text: 'Только проверенные партии. Сертификаты по запросу.' },
  { icon: 'flame', title: 'Fresh drops', text: 'Новые позиции каждую неделю. Не пропусти дроп.' }
]

const loadCategoryProducts = async (slug: string) => {
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
        category_slug: slug
      }
    })

    const normalized = normalizeCatalog(response)
    products.push(...normalized.products)

    total = Number(normalized.meta?.total || products.length || 0)
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
      const slug = normalizeCategorySlug(category.slug)

      if (!slug) {
        return {
          category,
          products: [],
          total: 0
        }
      }

      const { products, total } = await loadCategoryProducts(slug)

      return {
        category,
        products,
        total
      }
    }))
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
  <TgLayout title="Vivadzen" :show-lang="true">
    <section class="tg-page home-hero">
      <div class="hero-card">
        <span class="hero-card__pill">
          <TgIcon name="lightning" :size="12" :stroke="2.4" />
          New drop · 24/7
        </span>
        <h1 class="hero-card__title">Hi-vibe<br>street shop</h1>
        <p class="hero-card__sub">CBD · Грибы · Энтеогены — всё, что меняет настроение, в одном месте.</p>
        <div class="hero-card__actions">
          <NuxtLink :to="catalogPath()" class="tg-btn tg-btn--ink">
            <TgIcon name="rocket" :size="16" :stroke="2.2" />
            Залететь в каталог
          </NuxtLink>
          <NuxtLink :to="catalogPath()" class="tg-btn tg-btn--lime">
            <TgIcon name="flame" :size="16" :stroke="2.2" />
            Что в тренде
          </NuxtLink>
        </div>

        <div class="hero-card__strip" aria-hidden="true">
          <span>★ FRESH</span><span>★ FAST</span><span>★ SAFE</span><span>★ FRESH</span><span>★ FAST</span><span>★ SAFE</span>
        </div>
      </div>
    </section>

    <section class="tg-page home-vibes">
      <NuxtLink
        v-for="tile in vibeTiles"
        :key="tile.key"
        :to="catalogPath()"
        class="vibe-tile"
        :class="`vibe-tile--${tile.bg}`"
        :prefetch="false"
      >
        <span class="vibe-tile__tag">{{ tile.tag }}</span>
        <TgIcon :name="tile.icon" :size="44" :stroke="2.2" class="vibe-tile__icon" />
        <span class="vibe-tile__label">{{ tile.label }}</span>
      </NuxtLink>
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
            All
            <TgIcon name="arrow-right" :size="14" :stroke="2.4" />
          </NuxtLink>
        </div>

        <div v-if="section.products.length" class="tg-grid">
          <TgProductCard
            v-for="product in section.products"
            :key="product.id || product.slug"
            :product="product"
          />
        </div>

        <div v-else class="home-section__empty">
          <p class="tg-empty__text">{{ t('empty_catalog') }}</p>
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

    <section class="tg-page home-perks">
      <h2 class="home-perks__title">Why us</h2>
      <div class="home-perks__grid">
        <div v-for="perk in perks" :key="perk.title" class="perk-card">
          <span class="perk-card__icon">
            <TgIcon :name="perk.icon" :size="24" :stroke="2.2" />
          </span>
          <strong>{{ perk.title }}</strong>
          <p>{{ perk.text }}</p>
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

/* Vibe tiles */
.home-vibes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-top: 8px;
}

.vibe-tile {
  position: relative;
  display: flex;
  aspect-ratio: 1 / 1.05;
  flex-direction: column;
  justify-content: space-between;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  padding: 12px 10px 10px;
  color: var(--color-ink);
  box-shadow: var(--shadow-card-sm);
  overflow: hidden;
}

.vibe-tile--lime { background: var(--color-lime); }
.vibe-tile--magenta { background: var(--color-magenta); color: var(--color-white); }
.vibe-tile--accent { background: var(--color-accent); color: var(--color-white); }

.vibe-tile__tag {
  display: inline-flex;
  width: max-content;
  border: 2px solid currentColor;
  border-radius: var(--radius-full);
  padding: 3px 8px;
  font-family: var(--font-display);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.vibe-tile__icon {
  position: absolute;
  top: 50%;
  right: -6px;
  transform: translateY(-50%) rotate(-8deg);
  opacity: 0.95;
}

.vibe-tile__label {
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: -0.01em;
  line-height: 1;
  text-transform: uppercase;
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

.home-section__empty {
  padding: 12px 0 4px;
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

.perk-card strong {
  display: block;
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.perk-card p {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
}
</style>
