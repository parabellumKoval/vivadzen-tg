<script setup lang="ts">
const { t } = useTgI18n()

const sections = computed(() => [
  { icon: 'list', title: t('privacy_s1_title'), body: t('privacy_s1_body') },
  { icon: 'check', title: t('privacy_s2_title'), body: t('privacy_s2_body') },
  { icon: 'globe', title: t('privacy_s3_title'), body: t('privacy_s3_body') },
  { icon: 'lock', title: t('privacy_s4_title'), body: t('privacy_s4_body') },
  { icon: 'shield', title: t('privacy_s5_title'), body: t('privacy_s5_body') },
  { icon: 'mail', title: t('privacy_s6_title'), body: t('privacy_s6_body') }
])
</script>

<template>
  <TgInfoPage
    :title="t('nav_privacy')"
    :intro="t('privacy_intro')"
    icon="lock"
    :sections="sections"
    :updated="t('legal_updated')"
  />
</template>
