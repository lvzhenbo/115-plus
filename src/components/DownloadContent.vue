<template>
  <NButton
    v-if="settings ? settings.download.enable : true"
    text
    :theme-overrides="buttonThemeOverrides"
    @click="handleDownload"
  >
    下载
  </NButton>
  <NButton
    v-if="settings ? settings.openNewTab.enable : true"
    text
    :theme-overrides="buttonThemeOverrides"
    style="margin-left: 1rem"
    @click="openFile"
  >
    批量新标签打开
  </NButton>
  <NButton
    v-if="settings ? settings.video.enable : true"
    text
    :theme-overrides="buttonThemeOverrides"
    style="margin-left: 1rem"
    @click="handlePlay"
  >
    播放
  </NButton>
  <NModal v-model:show="showDownload">
    <NCard
      style="width: 40%"
      title="文件下载"
      :bordered="false"
      role="dialog"
      closable
      @close="handleClose"
    >
      <NList hoverable>
        <NListItem v-for="(item, index) in downloads" :key="index">
          <NButton
            text
            tag="a"
            :href="item.url"
            target="_blank"
            :theme-overrides="buttonThemeOverrides"
          >
            {{ item.name }}
          </NButton>
        </NListItem>
      </NList>
    </NCard>
  </NModal>
  <NModal v-model:show="showVideo" @after-leave="handleVideoClose">
    <NCard
      style="width: 60%"
      title="视频播放"
      :bordered="false"
      role="dialog"
      closable
      @close="handleVideoClose"
    >
      <NLayout has-sider :content-style="{ 'max-height': layoutMaxHeight }">
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
    </NCard>
  </NModal>
</template>

<script setup lang="tsx">
  import type { ButtonProps, MenuOption, MenuProps } from 'naive-ui';
  import { useMessage } from 'naive-ui';
  import { useMagicKeys } from '@vueuse/core';
  import { ref } from 'vue';
  import { getDownLoadUrl, type FileItem } from '@/utils';
  import Player from 'xgplayer';
  import 'xgplayer/dist/index.min.css';
  import HlsJsPlugin from 'xgplayer-hls.js';
  import { Events } from 'xgplayer';
  import { settings, request } from '@/utils';

  type ButtonThemeOverrides = NonNullable<ButtonProps['themeOverrides']>;
  type MenuThemeOverrides = NonNullable<MenuProps['themeOverrides']>;

  interface DownloadItem {
    name: string;
    url: string;
  }

  interface VideoItem {
    name: string;
    code: string;
    url?: string;
    time?: number;
  }

  type CbCookie = {
    domain: string;
    hostOnly: boolean;
    httpOnly: boolean;
    name: string;
    path: string;
    sameSite: string;
    secure: boolean;
    session: boolean;
    value: string;
  };

  const message = useMessage();
  const showDownload = ref(false);
  const showVideo = ref(false);
  const buttonThemeOverrides: ButtonThemeOverrides = {
    textColorTextHover: '#2777F8',
    textColorTextPressed: '#2777F8',
    textColorTextFocus: '#2777F8',
  };
  const menuThemeOverrides: MenuThemeOverrides = {
    itemColorActive: '#EEF0FF',
    itemColorActiveHover: '#EEF0FF',
    itemTextColorActive: '#2777F8',
    itemTextColorActiveHover: '#2777F8',
  };
  const downloads = ref<DownloadItem[]>([]);
  const keys = useMagicKeys();
  const ctrlAltD = keys['Ctrl+Alt+D'];
  const ctrlAltO = keys['Ctrl+Alt+O'];
  const videoRef = ref<HTMLVideoElement | null>(null);
  const videoList = ref<VideoItem[]>([]);
  const player = ref<Player | null>(null);
  const saveTimer = ref<number | null>(null);
  const layoutMaxHeight = ref('800px');
  const menuOptions = ref<MenuOption[]>([]);
  const menuValue = ref('');

  watch(ctrlAltD, (v) => {
    if (v) {
      handleDownload();
    }
  });
  watch(ctrlAltO, (v) => {
    if (v) {
      openFile();
    }
  });

  const getSelectFile = () => {
    const files: FileItem[] = [];
    downloads.value = [];
    const lists = document.querySelectorAll('.list-contents > ul > li');
    lists.forEach((item) => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (checkbox && (checkbox as HTMLInputElement).checked) {
        files.push({
          name: item.getAttribute('title') as string,
          isDir: item.getAttribute('file_type') === '0' ? true : false,
          code: item.getAttribute('pick_code') as string,
          cateId: (item.getAttribute('cate_id') as string) || '',
          fileMode: (item.getAttribute('file_mode') as string) || '',
        });
      }
    });
    if (files.length === 0) {
      message.destroyAll();
      message.warning('请选择文件');
      return false;
    }
    return files;
  };

  const handleDownload = async () => {
    try {
      const files = getSelectFile();
      if (!files) return;
      const loading = message.loading('获取下载链接中...');
      for (const file of files) {
        if (file.isDir) {
          loading.destroy();
          message.error('暂不支持下载文件夹，请勿选择文件夹');
          return;
        }

        const download = await getDownLoadUrl(file);
        downloads.value.push(download);
      }
      if (downloads.value.length === 0) {
        loading.destroy();
        message.error('获取下载链接失败');
        return;
      } else {
        loading.destroy();
        showDownload.value = true;
      }
    } catch (error) {
      console.error(error);
      message.error(`获取信息失败，错误信息：${error}`);
    }
  };

  const openFile = () => {
    const files = getSelectFile();
    if (!files) return;
    message.warning('浏览器可能会拦截弹出窗口，请允许弹出窗口权限');
    files.forEach((file) => {
      if (file.isDir) {
        window.open(`https://115.com/?cid=${file.cateId}&offset=0&tab=&mode=wangpan`);
      } else if (file.fileMode === '9') {
        window.open(`https://v.anxia.com/?pickcode=${file.code}&share_id=0`);
      }
    });
  };

  const handleClose = () => {
    showDownload.value = false;
  };

  const handlePlay = async () => {
    try {
      const files = getSelectFile();
      if (!files) return;
      videoList.value = [];
      for (const file of files) {
        if (file.isDir) {
          message.error('暂不支持播放文件夹，请勿选择文件夹');
          return;
        }
        if (file.fileMode === '9') {
          videoList.value.push({
            name: file.name,
            code: file.code,
          });
        }
      }
      if (videoList.value.length === 0) {
        message.error('未选择视频文件');
        return;
      }
      menuOptions.value = videoList.value.map((item) => {
        return {
          label: item.name,
          key: item.code,
        };
      });
      menuValue.value = videoList.value[0].code;
      videoList.value[0].url = await getVideoUrl(videoList.value[0].code);
      videoList.value[0].time = (await getVideoHistory(videoList.value[0].code)) || 0;
      showVideo.value = true;
      nextTick(() => {
        if (videoRef.value) {
          if (document.createElement('video').canPlayType('application/vnd.apple.mpegurl')) {
            player.value = new Player({
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
            });
          } else if (HlsJsPlugin.isSupported()) {
            player.value = new Player({
              el: videoRef.value,
              isLive: false,
              url: videoList.value[0].url,
              plugins: [HlsJsPlugin],
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
                  setVideoHistory(files[0].code, Math.floor(time));
                }
              }, 5000);
            }
            player.value.on(Events.VIDEO_RESIZE, () => {
              layoutMaxHeight.value = videoRef.value?.clientHeight + 'px';
            });
          }
        }
      });
    } catch (error) {
      console.error(error);
      message.error(`视频播放失败，错误信息：${error}`);
    }
  };

  const getVideoUrl = async (code: string) => {
    const cookie = await getCookie();
    const res = await request({
      method: 'GET',
      url: `https://v.anxia.com/webapi/files/video?pickcode=${code}&share_id=0&local=1`,
      headers: {
        Cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
          cookie.find((item) => item.name === 'SEID')?.value
        };UID=${cookie.find((item) => item.name === 'UID')?.value}`,
      },
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
      headers: {
        Cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
          cookie.find((item) => item.name === 'SEID')?.value
        };UID=${cookie.find((item) => item.name === 'UID')?.value}`,
      },
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

  const handleVideoClose = () => {
    if (saveTimer.value) {
      clearInterval(saveTimer.value);
      saveTimer.value = null;
    }
    if (player.value) {
      player.value.destroy();
      player.value = null;
    }
    showVideo.value = false;
  };

  const setVideoHistory = async (code: string, time: number) => {
    const cookie = await getCookie();
    request({
      method: 'POST',
      url: 'https://v.anxia.com/webapi/files/history',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
          cookie.find((item) => item.name === 'SEID')?.value
        };UID=${cookie.find((item) => item.name === 'UID')?.value}`,
      },
      data: `op=update&pick_code=${code}&time=${time}&definition=0&category=1&share_id=0`,
    });
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

  const getCookie = (): Promise<CbCookie[]> => {
    return new Promise((resolve, reject) => {
      GM_cookie.list({ domain: '115.com' }, (cookie, error) => {
        if (error) {
          reject(error);
        } else {
          resolve(cookie);
        }
      });
    });
  };
</script>

<style scoped>
  :deep(.n-base-icon) {
    font-size: 18px;
  }
</style>
