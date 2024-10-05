<template>
  <NConfigProvider :theme>
    <NDropdown trigger="hover" :options="options" @select="handleSelect">
      <NButton @click="handleDownload">离线下载</NButton>
    </NDropdown>
  </NConfigProvider>
</template>

<script setup lang="ts">
  import { useTheme } from '@/composables/useTheme';

  const theme = useTheme();
  const options = [
    {
      label: '云下载',
      key: 'CloudDownload',
    },
  ];
  const bc = new BroadcastChannel('115Plus');

  const handleSelect = (option: string) => {
    if (option === 'CloudDownload') {
      bc.postMessage({
        type: 'CloudDownload',
        url: window.top?.location.href,
      });
    }
  };

  const handleDownload = () => {
    bc.postMessage({
      type: 'OfflineDownload',
      url: window.top?.location.href,
    });
  };
</script>

<style scoped></style>
