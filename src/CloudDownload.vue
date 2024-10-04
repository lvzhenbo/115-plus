<template>
  <NConfigProvider :theme>
    <NModalProvider>
      <NMessageProvider>
        <CloudDownloadContent />
      </NMessageProvider>
    </NModalProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
  import { useTheme } from '@/composables/useTheme';

  const theme = useTheme();
</script>

<style scoped></style>
