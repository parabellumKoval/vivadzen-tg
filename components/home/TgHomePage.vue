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
          <div class="tg-empty__icon">□</div>
          <p class="tg-empty__title">{{ t('empty_catalog') }}</p>
        </div>
      </div>
    </section>
  </TgLayout>
</template>

<style scoped>
.home-sections {
  display: grid;
  gap: 24px;
}

.home-section {
  display: grid;
  gap: 14px;
}

.home-section__head {
  display: grid;
  gap: 4px;
}

.home-section__copy {
  display: grid;
  gap: 4px;
}

.home-section__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.home-section__line {
  height: 12px;
}

.home-section__line--title {
  width: 160px;
}

.home-section__empty {
  padding: 12px 0 4px;
}
</style>
