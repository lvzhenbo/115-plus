<template>
  <NButton text :theme-overrides="buttonThemeOverrides" @click="handleDownload"> 下载 </NButton>
  <NButton text :theme-overrides="buttonThemeOverrides" style="margin-left: 1rem" @click="openFile">
    批量新标签打开
  </NButton>
  <NButton
    text
    :theme-overrides="buttonThemeOverrides"
    style="margin-left: 1rem"
    @click="handlePlay"
  >
    播放
  </NButton>
  <NModal v-model:show="showModal">
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
          <video ref="videoRef" class="video-js"></video>
        </NLayout>
      </NLayout>
    </NCard>
  </NModal>
</template>

<script setup lang="tsx">
  import type { ButtonProps, MenuOption, MenuProps } from 'naive-ui';
  import { useMessage } from 'naive-ui';
  import { useMagicKeys } from '@vueuse/core';
  import videojs from 'video.js';
  import 'video.js/dist/video-js.css';
  import zhHans from 'video.js/dist/lang/zh-Hans.json';
  import { ref } from 'vue';
  import { getDownLoadUrl, type FileItem } from '@/utils';
  import type Player from 'video.js/dist/types/player';
  import 'videojs-contrib-quality-levels';
  import 'videojs-hls-quality-selector/dist/videojs-hls-quality-selector';

  type ButtonThemeOverrides = NonNullable<ButtonProps['themeOverrides']>;
  type MenuThemeOverrides = NonNullable<MenuProps['themeOverrides']>;

  interface DownloadItem {
    name: string;
    url: string;
  }

  interface VideoItem {
    name: string;
    code: string;
    url: string;
    time: number;
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

  videojs.addLanguage('zh-Hans', zhHans);

  const message = useMessage();
  const showModal = ref(false);
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
  let player: Player | null = null;
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

        const download = (await getDownLoadUrl(file)) as DownloadItem;
        downloads.value.push(download);
      }
      if (downloads.value.length === 0) {
        loading.destroy();
        message.error('获取下载链接失败');
        return;
      } else {
        loading.destroy();
        showModal.value = true;
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
    showModal.value = false;
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
          const url = (await getVideoUrl(file.code)) as string;
          const historyTime = (await getVideoHistory(file.code)) as number;
          videoList.value.push({
            name: file.name,
            code: file.code,
            // http转https
            url: url.replace('http://', 'https://'),
            time: historyTime || 0,
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
      showVideo.value = true;
      nextTick(() => {
        if (videoRef.value) {
          player = videojs(videoRef.value, {
            controls: true,
            autoplay: true,
            fluid: true,
            language: 'zh-Hans',
            sources: [
              {
                src: videoList.value[0].url,
                type: 'application/x-mpegURL',
              },
            ],
            playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5],
          });
          // @ts-ignore
          player.hlsQualitySelector({
            displayCurrentQuality: true,
          });
          player.currentTime(videoList.value[0].time);
          saveTimer.value = setInterval(() => {
            if (player!.paused()) {
              return;
            }
            const time = player!.currentTime();
            if (time && Math.floor(time) !== videoList.value[0].time) {
              videoList.value[0].time = Math.floor(time);
              setVideoHistory(files[0].code, Math.floor(time));
            }
          }, 5000);
          player.on('playerresize', () => {
            layoutMaxHeight.value = videoRef.value?.clientHeight + 'px';
          });
          player.trigger('playerresize');
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  const getVideoUrl = (code: string) => {
    return new Promise((resolve, reject) => {
      getCookie()
        .then((cookie) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: `https://v.anxia.com/webapi/files/video?pickcode=${code}&share_id=0&local=1`,
            headers: {
              Cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
                cookie.find((item) => item.name === 'SEID')?.value
              };UID=${cookie.find((item) => item.name === 'UID')?.value}`,
            },
            onload: (response) => {
              const json = JSON.parse(response.responseText);
              if (json.state) {
                resolve(json.video_url);
              } else {
                reject(json.error);
              }
            },
            onerror: (error) => {
              reject(error);
            },
          });
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  const getVideoHistory = (code: string) => {
    return new Promise((resolve, reject) => {
      getCookie()
        .then((cookie) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: `https://v.anxia.com/webapi/files/history?pick_code=${code}&fetch=one&category=1&share_id=0`,
            headers: {
              Cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
                cookie.find((item) => item.name === 'SEID')?.value
              };UID=${cookie.find((item) => item.name === 'UID')?.value}`,
            },
            onload: (response) => {
              const json = JSON.parse(response.responseText);
              if (json.state) {
                resolve(json.data.time ? json.data.time : 0);
              } else {
                if (json.error) {
                  reject(json.error);
                } else {
                  resolve(0);
                }
              }
            },
            onerror: (error) => {
              reject(error);
            },
          });
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  const handleVideoClose = () => {
    if (saveTimer.value) {
      clearInterval(saveTimer.value);
    }
    if (player) {
      player.dispose();
    }
    showVideo.value = false;
  };

  const setVideoHistory = (code: string, time: number) => {
    getCookie().then((cookie) => {
      GM_xmlhttpRequest({
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
    });
  };

  const handleMenuUpdate = (value: string) => {
    if (saveTimer.value) {
      clearInterval(saveTimer.value);
    }
    if (player) {
      player.src([
        {
          src: videoList.value.find((item) => item.code === value)?.url || '',
          type: 'application/x-mpegURL',
        },
      ]);
      player.play();
      player.currentTime(videoList.value.find((item) => item.code === value)?.time || 0);
      saveTimer.value = setInterval(() => {
        if (!player!.paused()) {
          return;
        }
        const time = player!.currentTime();
        if (
          time &&
          Math.floor(time) !== videoList.value.find((item) => item.code === value)?.time
        ) {
          videoList.value.find((item) => item.code === value)!.time = Math.floor(time);
          setVideoHistory(value, Math.floor(time));
        }
      }, 5000);
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
