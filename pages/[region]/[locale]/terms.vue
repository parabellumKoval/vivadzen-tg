<script setup lang="ts">
const { t } = useTgI18n()

const sections = computed(() => [
  { icon: 'info', title: t('terms_s1_title'), body: t('terms_s1_body') },
  { icon: 'shield', title: t('terms_s2_title'), body: t('terms_s2_body') },
  { icon: 'tag', title: t('terms_s3_title'), body: t('terms_s3_body') },
  { icon: 'heart', title: t('terms_s4_title'), body: t('terms_s4_body') },
  { icon: 'repeat', title: t('terms_s5_title'), body: t('terms_s5_body') }
])
</script>

<template>
  <TgInfoPage
    :title="t('nav_terms')"
    :intro="t('terms_intro')"
    icon="info"
    :sections="sections"
    :updated="t('legal_updated')"
  />
</template>
