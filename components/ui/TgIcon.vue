<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  size?: number | string
  stroke?: number
}>(), {
  size: 24,
  stroke: 2
})
</script>

<template>
  <svg
    class="tg-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke-width="stroke"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Navigation -->
    <template v-if="name === 'home'">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </template>
    <template v-else-if="name === 'grid'">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </template>
    <template v-else-if="name === 'bag'">
      <path d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </template>
    <template v-else-if="name === 'list'">
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </template>

    <!-- Actions -->
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </template>
    <template v-else-if="name === 'minus'">
      <path d="M5 12h14" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m4 12 5 5L20 6" />
    </template>
    <template v-else-if="name === 'arrow-left'">
      <path d="M19 12H5" />
      <path d="m12 5-7 7 7 7" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="m9 6 6 6-6 6" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="m6 9 6 6 6-6" />
    </template>
    <template v-else-if="name === 'chevron-up'">
      <path d="m6 15 6-6 6 6" />
    </template>

    <!-- Vibes / categories -->
    <template v-else-if="name === 'leaf'">
      <path d="M4 20c0-9 6-15 16-16-1 10-7 16-16 16Z" />
      <path d="M4 20 14 10" />
    </template>
    <template v-else-if="name === 'mushroom'">
      <path d="M4 12a8 8 0 0 1 16 0c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2Z" />
      <path d="M9 14v4a3 3 0 0 0 6 0v-4" />
      <circle cx="9.5" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="0.7" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'sparkles'">
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M5 12H3" />
      <path d="M21 12h-2" />
      <path d="m6 6 2 2" />
      <path d="m16 16 2 2" />
      <path d="m6 18 2-2" />
      <path d="m16 8 2-2" />
      <path d="M12 9.5 13 12l2.5 1-2.5 1L12 16.5 11 14l-2.5-1L11 12Z" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'flame'">
      <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s1 1 2 1c0-3 2-7 2-7Z" />
    </template>
    <template v-else-if="name === 'tag'">
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'lightning'">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'package'">
      <path d="M3 7.5 12 3l9 4.5v9L12 21 3 16.5v-9Z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
    </template>
    <template v-else-if="name === 'truck'">
      <rect x="2" y="7" width="12" height="9" rx="1" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </template>
    <template v-else-if="name === 'shield'">
      <path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </template>
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13 13 0 0 1 0 18" />
      <path d="M12 3a13 13 0 0 0 0 18" />
    </template>
    <template v-else-if="name === 'heart'">
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </template>
    <template v-else-if="name === 'star'">
      <path d="m12 3 2.6 6 6.4.6-4.8 4.4 1.4 6.4L12 17.5 6.4 20.4l1.4-6.4L3 9.6l6.4-.6L12 3Z" />
    </template>
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'lock'">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </template>
    <template v-else-if="name === 'box'">
      <rect x="3.5" y="6" width="17" height="13" rx="1.5" />
      <path d="M3.5 10h17" />
    </template>
    <template v-else-if="name === 'rocket'">
      <path d="M14 10c2-5 6-7 8-7 0 2-2 6-7 8" />
      <path d="M9 11c-1 1-2 3-2 5 2 0 4-1 5-2" />
      <path d="m9 15 0 0c-1 0-3 1-3 4 3 0 4-2 4-3" />
      <path d="M14 10 9 15" />
    </template>
    <template v-else-if="name === 'circle'">
      <circle cx="12" cy="12" r="9" />
    </template>
    <template v-else-if="name === 'repeat'">
      <path d="M17 2.5 21 6.5 17 10.5" />
      <path d="M21 6.5H8a4 4 0 0 0-4 4v1" />
      <path d="M7 21.5 3 17.5 7 13.5" />
      <path d="M3 17.5h13a4 4 0 0 0 4-4v-1" />
    </template>
    <template v-else-if="name === 'card'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </template>
    <template v-else-if="name === 'phone'">
      <path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 14l5 2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3.5 6.2 2 2 0 0 1 6 3Z" />
    </template>
    <template v-else-if="name === 'mail'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </template>
    <template v-else-if="name === 'menu'">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </template>
    <template v-else-if="name === 'external'">
      <path d="M14 4h6v6" />
      <path d="M20 4 12 12" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
    </template>

    <!-- Social / messengers -->
    <template v-else-if="name === 'telegram'">
      <path d="M21 4 2.5 11.5l5.5 2 2 6.5 3.5-4 5 3.5L21 4Z" />
      <path d="m8 13.5 12-9-9.5 11" />
    </template>
    <template v-else-if="name === 'whatsapp'">
      <path d="M3.5 20.5 5 16a8 8 0 1 1 3 3l-4.5 1.5Z" />
      <path d="M8.5 9.5c.5 3 2 4.5 5 5l1.5-1.5 2.5 1.5c0 1.5-1.5 2.5-3 2.5-3 0-7-4-7-7 0-1.5 1-3 2.5-3l1.5 2.5L8.5 9.5Z" />
    </template>
    <template v-else-if="name === 'viber'">
      <path d="M4 4h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-3l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M8.5 8.5c.5 2.5 2 4 4.5 4.5" />
    </template>
    <template v-else-if="name === 'instagram'">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'facebook'">
      <path d="M14 21v-8h2.5l.5-3.5H14V7.5c0-1 .5-1.5 1.5-1.5H17V3h-2.5C12.5 3 11 4.5 11 7v2.5H9V13h2v8h3Z" />
    </template>
    <template v-else-if="name === 'youtube'">
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="m10.5 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>

<style scoped>
.tg-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
