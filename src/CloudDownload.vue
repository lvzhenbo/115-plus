<template>
  <NConfigProvider :theme>
    <NDialogProvider>
      <NModalProvider>
        <NMessageProvider>
          <CloudDownloadContent />
        </NMessageProvider>
      </NModalProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
  import { useTheme } from '@/composables/useTheme';

  const theme = useTheme();
</script>

<style scoped></style>
