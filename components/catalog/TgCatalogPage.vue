<script setup lang="ts">
import { normalizeCategorySlug } from '~/composables/useTgCatalog'

const props = withDefaults(defineProps<{
  category?: string | null
  saleOnly?: boolean
}>(), {
  category: null,
  saleOnly: false
})

const route = useRoute()
const routeCategorySlug = computed(() => {
  if (props.saleOnly) return null
  return normalizeCategorySlug(route.params.category)
})
const selectedCategorySlug = ref<string | null>(routeCategorySlug.value)
const categorySlug = computed(() => selectedCategorySlug.value)
const { t } = useTgI18n()
const { hasSale } = useTgProductUtils()
const catalog = useTgCatalog(categorySlug)
const {
  categories,
  products: rawProducts,
  meta,
  activeCategory,
  loading,
  hasMore,
  loadMore
} = catalog

const products = computed(() => {
  if (!props.saleOnly) return rawProducts.value
  return rawProducts.value.filter((product) => hasSale(product))
})

const initialLoading = ref(true)

const exhaustPagination = async () => {
  let guard = 0
  while (catalog.hasMore.value && guard < 25) {
    await catalog.loadMore()
    guard += 1
  }
}

const refreshCatalog = async () => {
  initialLoading.value = true
  try {
    await catalog.refresh()
    if (props.saleOnly) await exhaustPagination()
  } finally {
    initialLoading.value = false
  }
}

watch(routeCategorySlug, async (value) => {
  selectedCategorySlug.value = value
  await refreshCatalog()
}, {
  immediate: true
})

const title = computed(() => {
  if (props.saleOnly) return t('sale_page_title')
  return activeCategory.value?.name || t('catalog')
})
const count = computed(() => {
  if (props.saleOnly) return products.value.length
  return Number(meta.value?.total || products.value.length || 0)
})
const subtitle = computed(() => {
  if (props.saleOnly) return t('sale_page_subtitle')
  return t('products_count', { count: count.value })
})
const emptyMessage = computed(() => {
  return props.saleOnly ? t('sale_empty') : t('empty_catalog')
})

const selectCategory = (slug: string | null) => {
  selectedCategorySlug.value = normalizeCategorySlug(slug)
}
</script>

<template>
  <TgLayout :logo="true" :show-lang="true">
    <TgCategoryBar
      v-if="!saleOnly"
      :categories="categories"
      @select="selectCategory"
    />

    <section class="tg-page catalog-page">
      <div class="catalog-page__head">
        <h1 class="tg-title">{{ title }}</h1>
        <p class="tg-subtitle">{{ subtitle }}</p>
      </div>

      <div v-if="(loading || initialLoading) && !products.length" class="tg-grid">
        <TgProductCardSkeleton v-for="item in 4" :key="item" />
      </div>

      <div v-else-if="products.length" class="tg-grid">
        <TgProductCard
          v-for="product in products"
          :key="product.id || product.slug"
          :product="product"
          :source-category-slug="routeCategorySlug"
        />
      </div>

      <div v-else class="tg-empty">
        <div>
          <div class="tg-empty__icon"><TgIcon name="search" :size="32" :stroke="2.2" /></div>
          <p class="tg-empty__title">{{ emptyMessage }}</p>
        </div>
      </div>

      <button
        v-if="hasMore && !saleOnly"
        type="button"
        class="tg-btn catalog-page__more"
        :disabled="loading"
        @click="loadMore"
      >
        {{ t('load_more') }}
      </button>
    </section>
  </TgLayout>
</template>

<style scoped>
.catalog-page {
  display: grid;
  gap: 16px;
}

.catalog-page__head {
  display: grid;
  gap: 4px;
}

.catalog-page__more {
  margin-top: 4px;
}
</style>
