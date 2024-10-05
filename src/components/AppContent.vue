<template>
  <CloudDownloadModal v-model:show="showList" />
  <VideoModal v-model:show="showVideo" :data="videoList" />
</template>

<script setup lang="ts">
  interface VideoItem {
    name: string;
    code: string;
    url?: string;
    time?: number;
  }

  const bc = new BroadcastChannel('115Plus');
  const showList = ref(false);
  const showVideo = ref(false);
  const videoList = ref<VideoItem[]>([]);

  onMounted(() => {
    bc.onmessage = (event) => {
      console.log(event.data);
      if (event.data.type === 'CloudDownload') {
        showList.value = true;
      } else if (event.data.type === 'VideoPlay') {
        videoList.value = JSON.parse(event.data.data);
        showVideo.value = true;
      }
    };
  });
</script>

<style scoped></style>
