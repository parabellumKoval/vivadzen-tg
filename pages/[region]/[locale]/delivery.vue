<script setup lang="ts">
const { t } = useTgI18n()

const sections = computed(() => [
  { icon: 'truck', title: t('delivery_s1_title'), body: t('delivery_s1_body') },
  { icon: 'card', title: t('delivery_s2_title'), body: t('delivery_s2_body') },
  { icon: 'shield', title: t('delivery_s3_title'), body: t('delivery_s3_body') },
  { icon: 'repeat', title: t('delivery_s4_title'), body: t('delivery_s4_body') }
])
</script>

<template>
  <TgInfoPage
    :title="t('nav_delivery')"
    :intro="t('delivery_intro')"
    icon="truck"
    :sections="sections"
    :updated="t('legal_updated')"
  />
</template>
