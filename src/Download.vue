<template>
  <div style="height: 100%; display: flex; align-items: center; margin-left: 1rem">
    <NConfigProvider :theme>
      <NModalProvider>
        <NMessageProvider>
          <DownloadContent />
        </NMessageProvider>
      </NModalProvider>
    </NConfigProvider>
  </div>
</template>

<script setup lang="ts">
  import { useTheme } from '@/composables/useTheme';

  const theme = useTheme();
</script>

<style scoped></style>
