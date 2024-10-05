<template>
  <NModal
    v-model:show="show"
    style="width: 60%"
    title="视频播放"
    preset="card"
    :bordered="false"
    @after-leave="handleVideoClose"
  >
    <NLayout has-sider :content-style="{ height: layoutHeight + 'px' }">
      <NLayoutSider :native-scrollbar="false" bordered>
        <NMenu
          v-model:value="menuValue"
          :options="menuOptions"
          :theme-overrides="menuThemeOverrides"
          @update:value="handleMenuUpdate"
        />
      </NLayoutSider>
      <NLayout :native-scrollbar="false">
        <div ref="videoRef" class="video-js"></div>
      </NLayout>
    </NLayout>
  </NModal>
</template>

<script setup lang="ts">
  import Player from 'xgplayer';
  import 'xgplayer/dist/index.min.css';
  import HlsJsPlugin from 'xgplayer-hls.js';
  import { Events } from 'xgplayer';
  import type { MenuOption } from 'naive-ui';
  import { getCookie, request, settings } from '@/utils';
  import { menuThemeOverrides } from '@/utils/theme';

  interface VideoItem {
    name: string;
    code: string;
    url?: string;
    time?: number;
  }

  const show = defineModel('show', {
    type: Boolean,
    default: false,
  });

  const props = defineProps<{
    data: VideoItem[];
  }>();

  const message = useMessage();
  const menuOptions = ref<MenuOption[]>([]);
  const menuValue = ref('');
  const videoList = ref<VideoItem[]>([]);
  const videoRef = ref<HTMLVideoElement | null>(null);
  const player = ref<Player | null>(null);
  const saveTimer = ref<number | null>(null);
  const layoutHeight = ref(700);

  watch(show, (value) => {
    if (value) {
      videoList.value = [...props.data];
      play();
    }
  });

  const play = async () => {
    menuOptions.value = videoList.value.map((item) => {
      return {
        label: item.name,
        key: item.code,
      };
    });
    menuValue.value = videoList.value[0].code;
    videoList.value[0].url = await getVideoUrl(videoList.value[0].code);
    videoList.value[0].time = (await getVideoHistory(videoList.value[0].code)) || 0;
    if (videoRef.value) {
      const playerConfig = {
        el: videoRef.value,
        url: videoList.value[0].url,
        autoplay: settings ? settings.video.autoplay : true,
        fluid: true,
        volume: settings ? settings.video.volume : 1,
        defaultPlaybackRate: settings ? settings.video.defaultPlaybackRate : 1,
        playbackRate: { list: [5, 4, 3, 2, 1.5, 1.25, 1, 0.75, 0.5] },
        rotate: true,
        pip: true,
        dynamicBg: {
          disable: false,
        },
      };
      if (document.createElement('video').canPlayType('application/vnd.apple.mpegurl')) {
        player.value = new Player(playerConfig);
      } else if (HlsJsPlugin.isSupported()) {
        player.value = new Player({
          ...playerConfig,
          isLive: false,
          plugins: [HlsJsPlugin],
        });
      }
      if (player.value) {
        if (!settings || settings.video.history) {
          player.value.currentTime = videoList.value[0].time!;
          saveTimer.value = setInterval(() => {
            if (player.value!.paused) {
              return;
            }
            const time = player.value!.currentTime;
            if (time && Math.floor(time) !== videoList.value[0].time) {
              videoList.value[0].time = Math.floor(time);
              setVideoHistory(videoList.value[0].code, Math.floor(time));
            }
          }, 5000);
        }
        player.value.on(Events.VIDEO_RESIZE, () => {
          layoutHeight.value = videoRef.value?.clientHeight || 700;
        });
      }
    }
  };

  const getVideoUrl = async (code: string) => {
    const cookie = await getCookie();
    const res = await request({
      method: 'GET',
      url: `https://v.anxia.com/webapi/files/video?pickcode=${code}&share_id=0&local=1`,
      cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
        cookie.find((item) => item.name === 'SEID')?.value
      };UID=${cookie.find((item) => item.name === 'UID')?.value}`,
      anonymous: true,
    });
    const json = JSON.parse(res.responseText);
    if (json.state) {
      if (json.video_url) {
        return json.video_url.replace('http://', 'https://');
      } else {
        throw new Error('视频地址获取失败');
      }
    } else {
      throw new Error(json.error);
    }
  };

  const getVideoHistory = async (code: string) => {
    const cookie = await getCookie();
    const res = await request({
      method: 'GET',
      url: `https://v.anxia.com/webapi/files/history?pick_code=${code}&fetch=one&category=1&share_id=0`,
      cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
        cookie.find((item) => item.name === 'SEID')?.value
      };UID=${cookie.find((item) => item.name === 'UID')?.value}`,
      anonymous: true,
    });
    const json = JSON.parse(res.responseText);
    if (json.state) {
      return json.data.time ? json.data.time : 0;
    } else {
      if (json.error) {
        throw new Error(json.error);
      } else {
        return 0;
      }
    }
  };

  const setVideoHistory = async (code: string, time: number) => {
    const cookie = await getCookie();
    request({
      method: 'POST',
      url: 'https://v.anxia.com/webapi/files/history',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
        cookie.find((item) => item.name === 'SEID')?.value
      };UID=${cookie.find((item) => item.name === 'UID')?.value}`,
      anonymous: true,
      data: `op=update&pick_code=${code}&time=${time}&definition=0&category=1&share_id=0`,
    });
  };

  const handleVideoClose = () => {
    if (saveTimer.value) {
      clearInterval(saveTimer.value);
      saveTimer.value = null;
    }
    if (player.value) {
      player.value.destroy();
      player.value = null;
    }
    show.value = false;
  };

  const handleMenuUpdate = async (value: string) => {
    try {
      if (player.value) {
        const videoIndex = videoList.value.findIndex((item) => item.code === value);
        if (!videoList.value[videoIndex].url) {
          videoList.value[videoIndex].url = await getVideoUrl(value);
          videoList.value[videoIndex].time = (await getVideoHistory(value)) || 0;
        }
        if (saveTimer.value) {
          clearInterval(saveTimer.value);
          saveTimer.value = null;
        }
        player.value.src = videoList.value[videoIndex].url!;
        if (!settings || settings.video.autoplay) {
          player.value.play();
        }
        if (!settings || settings.video.history) {
          player.value.currentTime = videoList.value[videoIndex].time!;
          saveTimer.value = setInterval(() => {
            if (player.value!.paused) {
              return;
            }
            const time = player.value!.currentTime;
            if (time && Math.floor(time) !== videoList.value[videoIndex].time) {
              videoList.value[videoIndex].time = Math.floor(time);
              setVideoHistory(value, Math.floor(time));
            }
          }, 5000);
        }
      }
    } catch (error) {
      console.error(error);
      message.error(`视频播放失败，错误信息：${error}`);
    }
  };
</script>

<style scoped></style>
