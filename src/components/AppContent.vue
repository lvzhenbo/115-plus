<template>
  <CloudDownloadModal v-model:show="showList" :down-path :sign-data />
  <OfflineDownloadModal v-model:show="showDownload" :down-path :sign-data />
  <VideoModal v-model:show="showVideo" :data="videoList" />
</template>

<script setup lang="ts">
  import { getCookie, request } from '@/utils';

  interface VideoItem {
    name: string;
    code: string;
    url?: string;
    time?: number;
  }

  const message = useMessage();
  const isLeft = usePageLeave();
  const bc = new BroadcastChannel('115Plus');
  const showList = ref(false);
  const showDownload = ref(false);
  const showVideo = ref(false);
  const videoList = ref<VideoItem[]>([]);
  const signData = ref({
    sign: '',
    time: '',
  });
  const downPath = ref({
    file_id: '',
    user_id: '',
  });

  onMounted(async () => {
    bc.onmessage = (event) => {
      console.log(event.data);
      if (isLeft.value || event.data.url !== window.location.href) {
        return;
      }
      if (event.data.type === 'CloudDownload') {
        showList.value = true;
      } else if (event.data.type === 'VideoPlay') {
        videoList.value = JSON.parse(event.data.data);
        showVideo.value = true;
      } else if (event.data.type === 'OfflineDownload') {
        showDownload.value = true;
      }
    };
    const cookies = await getCookie();
    if (cookies.find((item) => item.name === 'UID')) {
      getSign();
      getDownPath();
    }
  });

  const getSign = async () => {
    try {
      const res = await request({
        url: `https://115.com/?ct=offline&ac=space&_${Date.now()}`,
        method: 'GET',
      });
      const json = JSON.parse(res.responseText);
      if (json.state) {
        signData.value.sign = json.sign;
        signData.value.time = json.time;
      } else {
        if (json.error) {
          throw new Error(json.error);
        } else {
          throw new Error('获取签名失败');
        }
      }
    } catch (error: any) {
      message.error(error);
    }
  };

  const getDownPath = async () => {
    try {
      const res = await request({
        url: `https://webapi.115.com/offine/downpath`,
        method: 'GET',
      });
      const json = JSON.parse(res.responseText);
      if (json.state) {
        downPath.value.file_id = json.data[0].file_id;
        downPath.value.user_id = json.data[0].user_id;
      } else {
        if (json.error) {
          throw new Error(json.error);
        } else {
          throw new Error('获取云下载路径失败');
        }
      }
    } catch (error: any) {
      message.error(error);
    }
  };
</script>

<style scoped></style>
