<script setup lang="ts">
definePageMeta({
  key: (route) => `${route.params.region}-${route.params.locale}-sale`
})
</script>

<template>
  <TgCatalogPage sale-only />
</template>
