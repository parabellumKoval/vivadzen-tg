<script setup lang="ts">
import type { TgGoogleReview } from '~/composables/useTgGoogleReviews'

const props = withDefaults(defineProps<{
  perPage?: number
  commentLimit?: number
}>(), {
  perPage: 12,
  commentLimit: 220
})

const { t, locale } = useTgI18n()
const { reviews, meta, loading, fetchReviews } = useTgGoogleReviews()

const initialLoading = ref(true)

onMounted(async () => {
  await fetchReviews({
    page: 1,
    per_page: props.perPage,
    rating: 5,
    has_comment: true
  })
  initialLoading.value = false
})

const averageRating = computed(() => Number(meta.value?.avg_rating || 0))
const totalReviews = computed(() => Number(meta.value?.total || 0))
const ratingLabel = computed(() => averageRating.value ? averageRating.value.toFixed(1) : '5.0')

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  try {
    return new Intl.DateTimeFormat(locale.value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString))
  } catch {
    return new Date(dateString).toLocaleDateString()
  }
}

const getInitials = (name?: string | null) => {
  const value = (name || '').trim()
  if (!value) return '?'
  const parts = value.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return value.slice(0, 2).toUpperCase()
}

const truncate = (text: string, max: number) => {
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}...`
}

const reviewerName = (review: TgGoogleReview) => {
  if (review.reviewer?.is_anonymous) return t('anonymous')
  return review.reviewer?.name || t('anonymous')
}

const cardBg = (index: number) => {
  const palette = ['white', 'lime', 'yellow', 'white']
  return palette[index % palette.length]
}
</script>

<template>
  <section class="tg-page home-reviews">
    <div class="home-reviews__head">
      <div class="home-reviews__copy">
        <h2 class="home-reviews__title">{{ t('reviews_title') }}</h2>
        <p v-if="totalReviews" class="tg-subtitle home-reviews__sub">
          {{ t('reviews_subtitle', { count: totalReviews, rating: ratingLabel }) }}
        </p>
        <p v-else class="tg-subtitle home-reviews__sub">{{ t('reviews_subtitle_empty') }}</p>
      </div>
      <span class="home-reviews__badge" :aria-label="`Google ${ratingLabel}`">
        <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C41.8 35.8 44 30.3 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        <span>{{ ratingLabel }}</span>
      </span>
    </div>

    <div v-if="(loading || initialLoading) && !reviews.length" class="home-reviews__track home-reviews__track--loading">
      <div v-for="n in 3" :key="n" class="review-card review-card--white">
        <div class="skeleton review-card__skeleton review-card__skeleton--head" />
        <div class="skeleton review-card__skeleton" />
        <div class="skeleton review-card__skeleton" />
        <div class="skeleton review-card__skeleton review-card__skeleton--short" />
      </div>
    </div>

    <div v-else-if="reviews.length" class="home-reviews__track">
      <article
        v-for="(review, index) in reviews"
        :key="review.review_id || review.id"
        class="review-card"
        :class="`review-card--${cardBg(index)}`"
      >
        <header class="review-card__head">
          <div class="review-card__avatar">
            <img
              v-if="review.reviewer?.photo_url"
              :src="review.reviewer.photo_url"
              :alt="reviewerName(review)"
              class="review-card__avatar-img"
              loading="lazy"
              referrerpolicy="no-referrer"
            >
            <span v-else class="review-card__avatar-initials">
              {{ getInitials(review.reviewer?.name) }}
            </span>
          </div>
          <div class="review-card__meta">
            <span class="review-card__name">{{ reviewerName(review) }}</span>
            <span class="review-card__date">{{ formatDate(review.review_created_at) }}</span>
          </div>
        </header>

        <div class="review-card__rating" :aria-label="`${review.rating}/5`">
          <TgIcon
            v-for="i in 5"
            :key="i"
            name="star"
            :size="14"
            :stroke="2.4"
            class="review-card__star"
            :class="{ 'review-card__star--filled': i <= review.rating }"
          />
        </div>

        <p v-if="review.comment" class="review-card__comment">
          {{ truncate(review.comment, props.commentLimit) }}
        </p>
      </article>
    </div>

    <div v-else class="home-reviews__empty">
      {{ t('reviews_empty') }}
    </div>
  </section>
</template>

<style scoped>
.home-reviews {
  display: grid;
  gap: 14px;
  padding-top: 8px;
  padding-right: 0;
  overflow: hidden;
}

.home-reviews__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-right: 16px;
}

.home-reviews__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.home-reviews__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: -0.015em;
  text-transform: uppercase;
}

.home-reviews__sub {
  margin: 0;
}

.home-reviews__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-white);
  padding: 5px 10px;
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--color-ink);
  box-shadow: var(--shadow-card-sm);
}

.home-reviews__track {
  --track-gap: 12px;
  --track-preview: 28px;

  display: flex;
  width: calc(100% + 16px);
  margin-right: -16px;
  margin-left: -16px;
  gap: var(--track-gap);
  padding: 6px 16px 14px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-padding-left: 16px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.home-reviews__track::-webkit-scrollbar {
  display: none;
}

.home-reviews__track--loading {
  overflow-x: hidden;
}

.review-card {
  display: grid;
  gap: 10px;
  flex: 0 0 calc(100% - var(--track-preview) - 16px);
  max-width: 320px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  padding: 14px;
  box-shadow: var(--shadow-card-sm);
  scroll-snap-align: start;
  align-content: start;
}

.review-card--lime { background: var(--color-lime); }
.review-card--yellow { background: var(--color-yellow); }
.review-card--white { background: var(--color-white); }

.review-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.review-card__avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-full);
  background: var(--color-white);
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--color-ink);
}

.review-card__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.review-card__avatar-initials {
  line-height: 1;
}

.review-card__meta {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.review-card__name {
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-card__date {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.review-card__rating {
  display: inline-flex;
  gap: 2px;
}

.review-card__star {
  flex-shrink: 0;
  color: var(--color-ink);
  opacity: 0.25;
}

.review-card__star :deep(path) {
  fill: none;
}

.review-card__star--filled {
  color: var(--color-ink);
  opacity: 1;
}

.review-card__star--filled :deep(path) {
  fill: var(--color-ink);
}

.review-card__comment {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-card__skeleton {
  height: 12px;
  border-radius: var(--radius-sm);
  background: rgba(13, 13, 13, 0.08);
}

.review-card__skeleton--head {
  height: 38px;
  width: 60%;
}

.review-card__skeleton--short {
  width: 50%;
}

.home-reviews__empty {
  margin-right: 16px;
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  padding: 16px;
  text-align: center;
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ink);
  box-shadow: var(--shadow-card-sm);
}
</style>
