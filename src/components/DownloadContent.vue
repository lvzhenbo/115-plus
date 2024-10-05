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
  <NButton
    v-if="settings ? settings.video.enable : true"
    text
    :theme-overrides="buttonThemeOverrides"
    style="margin-left: 1rem"
    @click="handleFolderPlay"
  >
    播放当前文件夹
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
</template>

<script setup lang="tsx">
  import { getCookie, getDownLoadUrl, type FileItem } from '@/utils';
  import { settings, request } from '@/utils';
  import { buttonThemeOverrides } from '@/utils/theme';

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

  interface ForderFile {
    n: string;
    pc: string;
  }

  const message = useMessage();
  const showDownload = ref(false);
  const downloads = ref<DownloadItem[]>([]);
  const keys = useMagicKeys();
  const ctrlAltD = keys['Ctrl+Alt+D'];
  const ctrlAltO = keys['Ctrl+Alt+O'];
  const videoList = ref<VideoItem[]>([]);
  const bc = new BroadcastChannel('115Plus');

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
      loading.destroy();
      if (downloads.value.length === 0) {
        message.error('获取下载链接失败');
      } else {
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
    files.forEach((file) => {
      if (file.isDir) {
        GM_openInTab(`https://115.com/?cid=${file.cateId}&offset=0&tab=&mode=wangpan`);
      } else if (file.fileMode === '9') {
        GM_openInTab(`https://v.anxia.com/?pickcode=${file.code}&share_id=0`);
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
          message.error('暂不支持选择文件夹播放，请勿选择文件夹');
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
      bc.postMessage({
        type: 'VideoPlay',
        data: JSON.stringify(videoList.value),
      });
    } catch (error) {
      console.error(error);
      message.error(`视频播放失败，错误信息：${error}`);
    }
  };

  const handleFolderPlay = async () => {
    try {
      const url = new URL(window.parent.location.href);
      const files: ForderFile[] = await getForderFiles(url.searchParams.get('cid') as string);
      if (files.length === 0) {
        message.error('文件夹内没有视频文件');
        return;
      }
      videoList.value = files.map((item) => {
        return {
          name: item.n,
          code: item.pc,
        };
      });
      bc.postMessage({
        type: 'VideoPlay',
        data: JSON.stringify(videoList.value),
      });
    } catch (error) {
      console.error(error);
      message.error(`视频播放失败，错误信息：${error}`);
    }
  };

  const getForderFiles = async (cid: string) => {
    const cookie = await getCookie();
    const res = await request({
      method: 'GET',
      url: `https://v.anxia.com/aps/natsort/files.php?aid=1&cid=${cid}&offset=0&limit=9999&show_dir=0&nf=&qid=0&type=4&source=&format=json&star=&is_q=&is_share=&r_all=1&o=file_name&asc=1&cur=1&natsort=1`,
      cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
        cookie.find((item) => item.name === 'SEID')?.value
      };UID=${cookie.find((item) => item.name === 'UID')?.value}`,
      anonymous: true,
    });
    const json = JSON.parse(res.responseText);
    if (json.state) {
      return json.data;
    } else {
      if (json.error) {
        throw new Error(json.error);
      } else {
        throw new Error('获取文件夹文件失败');
      }
    }
  };
</script>

<style scoped></style>
