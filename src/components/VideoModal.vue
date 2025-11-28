<template>
  <NModal
    v-model:show="show"
    style="width: 60%"
    title="视频播放"
    preset="card"
    :bordered="false"
    @after-leave="handleVideoClose"
  >
    <NLayout has-sider :content-style="layoutHeightStyle">
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
  import { request, settings } from '@/utils';
  import { menuThemeOverrides } from '@/utils/theme';

  /** 视频项接口定义 */
  interface VideoItem {
    name: string;
    code: string;
    url?: string;
    time?: number;
  }

  /** API响应类型 */
  interface VideoApiResponse {
    state: boolean;
    video_url?: string;
    error?: string;
  }

  interface HistoryApiResponse {
    state: boolean;
    data: { time?: number };
    error?: string;
  }

  // Props 和 Model 定义
  const show = defineModel('show', {
    type: Boolean,
    default: false,
  });

  const props = defineProps<{
    data: VideoItem[];
  }>();

  // 组合式 API
  const message = useMessage();

  // 响应式数据
  const menuOptions = ref<MenuOption[]>([]);
  const menuValue = ref<string>('');
  const videoList = ref<VideoItem[]>([]);
  const videoRef = useTemplateRef('videoRef');
  const player = ref<Player | null>(null);
  const layoutHeight = ref<number>(700);
  const currentVideo = ref<VideoItem | null>(null);

  // 使用 VueUse 的 useIntervalFn 来管理定时保存播放进度
  const { pause: pauseSaveTimer, resume: resumeSaveTimer } = useIntervalFn(
    () => {
      if (!player.value || !currentVideo.value || player.value.paused) return;
      if (!videoSettings.value.enableHistory) return;

      const currentTime = Math.floor(player.value.currentTime);
      if (currentTime && currentTime !== currentVideo.value.time) {
        currentVideo.value.time = currentTime;
        setVideoHistory(currentVideo.value.code, currentTime);
      }
    },
    5000,
    { immediate: false },
  );

  // 计算属性
  const layoutHeightStyle = computed(() => ({
    height: `${layoutHeight.value}px`,
  }));

  const videoSettings = computed(() => ({
    autoplay: settings?.video.autoplay ?? true,
    volume: settings?.video.volume ?? 1,
    defaultPlaybackRate: settings?.video.defaultPlaybackRate ?? 1,
    enableHistory: settings?.video.history ?? true,
  }));

  // 监听器
  watch(show, (value) => {
    if (value) {
      initializeVideoList();
    }
  });

  // 工具函数
  const stopSaveTimer = (): void => {
    pauseSaveTimer();
    currentVideo.value = null;
  };

  const destroyPlayer = (): void => {
    if (player.value) {
      player.value.destroy();
      player.value = null;
    }
  };

  /**
   * 初始化视频列表
   */
  const initializeVideoList = (): void => {
    videoList.value = [...props.data];
    play();
  };

  /**
   * 开始播放第一个视频
   */
  const play = async (): Promise<void> => {
    try {
      // 构建菜单选项
      menuOptions.value = videoList.value.map((item) => ({
        label: item.name,
        key: item.code,
      }));

      const firstVideo = videoList.value[0];
      if (!firstVideo) {
        throw new Error('视频列表为空');
      }

      await setupVideoForPlay(firstVideo);
      await createPlayer(firstVideo);
    } catch (error) {
      handleError('视频播放失败', error);
    }
  };

  /**
   * 设置视频播放所需数据
   */
  const setupVideoForPlay = async (video: VideoItem): Promise<void> => {
    menuValue.value = video.code;
    video.url = await getVideoUrl(video.code);
    video.time = videoSettings.value.enableHistory ? (await getVideoHistory(video.code)) || 0 : 0;
  };

  /**
   * 创建播放器实例
   */
  const createPlayer = async (video: VideoItem): Promise<void> => {
    if (!videoRef.value || !video.url) {
      throw new Error('播放器容器或视频URL不可用');
    }

    const baseConfig = {
      el: videoRef.value,
      url: video.url,
      autoplay: videoSettings.value.autoplay,
      fluid: true,
      volume: videoSettings.value.volume,
      defaultPlaybackRate: videoSettings.value.defaultPlaybackRate,
      playbackRate: { list: [5, 4, 3, 2, 1.5, 1.25, 1, 0.75, 0.5] },
      rotate: true,
      pip: true,
      dynamicBg: { disable: false },
    };

    // 根据浏览器支持情况选择播放器配置
    const canPlayHLS = document.createElement('video').canPlayType('application/vnd.apple.mpegurl');

    if (canPlayHLS) {
      player.value = new Player(baseConfig);
    } else if (HlsJsPlugin.isSupported()) {
      player.value = new Player({
        ...baseConfig,
        isLive: false,
        plugins: [HlsJsPlugin],
      });
    } else {
      throw new Error('浏览器不支持HLS播放');
    }

    setupPlayerEvents(video);
  };

  /**
   * 设置播放器事件
   */
  const setupPlayerEvents = (video: VideoItem): void => {
    if (!player.value) return;

    // 设置视频历史记录
    if (videoSettings.value.enableHistory && video.time) {
      player.value.currentTime = video.time;
      startSaveTimer(video);
    }

    // 监听视频尺寸变化
    player.value.on(Events.VIDEO_RESIZE, () => {
      layoutHeight.value = videoRef.value?.clientHeight || 700;
    });
  };

  /**
   * 启动定时保存播放进度
   */
  const startSaveTimer = (video: VideoItem): void => {
    stopSaveTimer();

    if (!videoSettings.value.enableHistory || !player.value) return;

    currentVideo.value = video;
    resumeSaveTimer();
  };

  /**
   * 获取视频播放地址
   */
  const getVideoUrl = async (code: string): Promise<string> => {
    const res = await request({
      method: 'GET',
      url: `https://webapi.115.com/files/video?pickcode=${code}&share_id=0&local=1`,
    });

    if (res.status !== 200) {
      throw new Error('获取视频地址失败');
    }

    const json: VideoApiResponse = JSON.parse(res.responseText);
    if (!json.state) {
      throw new Error(json.error || '获取视频地址失败');
    }

    if (!json.video_url) {
      throw new Error('视频地址获取失败');
    }

    const masterUrl = json.video_url.replace('http://', 'https://');

    // 解析主播放列表获取实际视频流地址
    return await parseM3u8MasterPlaylist(masterUrl);
  };

  /**
   * 解析 m3u8 主播放列表，获取实际视频流地址
   */
  const parseM3u8MasterPlaylist = async (masterUrl: string): Promise<string> => {
    const res = await request({
      method: 'GET',
      url: masterUrl,
    });

    if (res.status !== 200) {
      throw new Error('获取视频流地址失败');
    }

    const m3u8Content = res.responseText;
    const lines = m3u8Content.split('\n');

    // 查找最高质量的视频流
    let bestUrl = '';
    let bestBandwidth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('#EXT-X-STREAM-INF:')) {
        // 解析带宽信息
        const bandwidthMatch = trimmedLine.match(/BANDWIDTH=(\d+)/);
        const bandwidth = bandwidthMatch && bandwidthMatch[1] ? parseInt(bandwidthMatch[1], 10) : 0;

        // 获取下一行的 URL
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !nextLine.startsWith('#')) {
          if (bandwidth > bestBandwidth) {
            bestBandwidth = bandwidth;
            bestUrl = nextLine;
          }
        }
      }
    }

    if (!bestUrl) {
      // 如果没有找到 EXT-X-STREAM-INF，可能本身就是媒体播放列表，直接返回原地址
      return masterUrl;
    }

    return bestUrl;
  };

  /**
   * 获取视频播放历史
   */
  const getVideoHistory = async (code: string): Promise<number> => {
    const res = await request({
      method: 'GET',
      url: `https://webapi.115.com/files/history?pick_code=${code}&fetch=one&category=1&share_id=0`,
    });

    const json: HistoryApiResponse = JSON.parse(res.responseText);
    if (!json.state) {
      if (json.error) {
        throw new Error(json.error);
      }
      return 0;
    }

    return json.data?.time || 0;
  };

  /**
   * 设置视频播放历史
   */
  const setVideoHistory = async (code: string, time: number): Promise<void> => {
    request({
      method: 'POST',
      url: 'https://webapi.115.com/files/history',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: `op=update&pick_code=${code}&time=${time}&definition=0&category=1&share_id=0`,
    });
  };

  /**
   * 处理错误信息
   */
  const handleError = (title: string, error: unknown): void => {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    message.error(`${title}，错误信息：${errorMessage}`);
  };

  /**
   * 处理视频关闭
   */
  const handleVideoClose = (): void => {
    stopSaveTimer();
    destroyPlayer();
    show.value = false;
  };

  /**
   * 处理菜单选择更新
   */
  const handleMenuUpdate = async (value: string): Promise<void> => {
    try {
      if (!player.value) {
        throw new Error('播放器未初始化');
      }

      const videoIndex = videoList.value.findIndex((item) => item.code === value);
      const currentVideo = videoList.value[videoIndex];

      if (!currentVideo) {
        throw new Error('找不到对应的视频');
      }

      // 如果视频URL未缓存，则获取
      if (!currentVideo.url) {
        await setupVideoForPlay(currentVideo);
      }

      await switchVideo(currentVideo);
    } catch (error) {
      handleError('视频切换失败', error);
    }
  };

  /**
   * 切换视频
   */
  const switchVideo = async (video: VideoItem): Promise<void> => {
    if (!player.value || !video.url) return;

    stopSaveTimer();

    player.value.src = video.url;

    if (videoSettings.value.autoplay) {
      player.value.play();
    }

    if (videoSettings.value.enableHistory && video.time) {
      player.value.currentTime = video.time;
      startSaveTimer(video);
    }
  };
</script>

<style scoped></style>
