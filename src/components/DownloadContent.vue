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
  <NModal
    v-model:show="showDownload"
    style="width: 40%"
    title="文件下载"
    :bordered="false"
    preset="card"
  >
    <NTree
      :data="downloads"
      block-line
      expand-on-click
      key-field="code"
      label-field="name"
      show-line
      virtual-scroll
      style="max-height: 40vh"
      :render-suffix="suffixRender"
    />
  </NModal>
</template>

<script setup lang="tsx">
  import { getCookie, getDownLoadUrl, type FileItem } from '@/utils';
  import { settings, request } from '@/utils';
  import { buttonThemeOverrides } from '@/utils/theme';
  import { NButton, type TreeOption } from 'naive-ui';

  interface DownloadItem {
    name: string;
    url?: string;
    code: string;
    children?: DownloadItem[];
  }

  interface VideoItem {
    name: string;
    code: string;
    url?: string;
    time?: number;
  }

  interface ForderVideo {
    n: string;
    pc: string;
  }

  interface ForderFile {
    n: string;
    pc: string;
    fid?: string;
    cid?: string;
  }

  const message = useMessage();
  const showDownload = ref(false);
  const downloads = ref<DownloadItem[]>([]);
  const keys = useMagicKeys();
  const ctrlAltD = keys['Ctrl+Alt+D'];
  const ctrlAltO = keys['Ctrl+Alt+O'];
  const f9 = keys['F9'];
  const videoList = ref<VideoItem[]>([]);
  const bc = new BroadcastChannel('115Plus');

  watch(ctrlAltD, (v) => {
    if (v && GM_info.userAgentData.platform !== 'macOS') {
      handleDownload();
    }
  });
  watch(ctrlAltO, (v) => {
    if (v) {
      openFile();
    }
  });
  watch(f9, (v) => {
    if (v && GM_info.userAgentData.platform === 'macOS') {
      handleDownload();
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
      const selectFiles = getSelectFile();
      if (!selectFiles) return;
      const loading = message.loading(
        '获取下载链接中，如果文件较多等待时间会比较长，并且有几率卡住',
        {
          duration: 0,
        },
      );
      for (const file of selectFiles) {
        if (file.isDir) {
          const children = await getForderDownLoads(file.cateId!);
          downloads.value.push({
            name: file.name,
            code: file.cateId!,
            children,
          });
        } else {
          const download = await getDownLoadUrl(file.code);
          downloads.value.push(download);
        }
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
        GM_openInTab(`https://115.com/?cid=${file.cateId}&offset=0&tab=&mode=wangpan`, {
          setParent: settings?.openNewTab.setParent,
        });
      } else if (file.fileMode === '9') {
        GM_openInTab(`https://115vod.com/?pickcode=${file.code}&share_id=0`, {
          setParent: settings?.openNewTab.setParent,
        });
      }
    });
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
        url: window.top?.location.href,
      });
    } catch (error) {
      console.error(error);
      message.error(`视频播放失败，错误信息：${error}`);
    }
  };

  const handleFolderPlay = async () => {
    try {
      const url = new URL(window.parent.location.href);
      const files: ForderVideo[] = await getForderVideos(url.searchParams.get('cid') as string);
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
        url: window.top?.location.href,
      });
    } catch (error) {
      console.error(error);
      message.error(`视频播放失败，错误信息：${error}`);
    }
  };

  const getForderVideos = async (cid: string) => {
    const cookie = await getCookie();
    const res = await request({
      method: 'GET',
      url: `https://115vod.com/aps/natsort/files.php?aid=1&cid=${cid}&offset=0&limit=9999&show_dir=0&nf=&qid=0&type=4&source=&format=json&star=&is_q=&is_share=&r_all=1&o=file_name&asc=1&cur=1&natsort=1`,
      cookie: `CID=${cookie.find((item) => item.name === 'CID')?.value};SEID=${
        cookie.find((item) => item.name === 'SEID')?.value
      };UID=${cookie.find((item) => item.name === 'UID')?.value};KID=${
        cookie.find((item) => item.name === 'KID')?.value
      }`,
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

  const getForderDownLoads = async (id: string) => {
    const temp: DownloadItem[] = [];
    const files = await getForderFiles(id);
    for (const file of files) {
      if (file.fid) {
        const download = await getDownLoadUrl(file.pc);
        temp.push(download);
      } else {
        const children = await getForderDownLoads(file.cid!);
        temp.push({
          name: file.n,
          code: file.pc,
          children,
        });
      }
    }
    return temp;
  };

  const getForderFiles = async (id: string) => {
    const res = await request({
      method: 'GET',
      url: `https://webapi.115.com/files?aid=1&cid=${id}&show_dir=1&limit=9999&format=json`,
    });
    const json = JSON.parse(res.responseText);
    if (json.state) {
      return json.data as ForderFile[];
    } else {
      if (json.error) {
        throw new Error(json.error);
      } else {
        throw new Error('获取文件夹中的文件失败');
      }
    }
  };

  const suffixRender = (info: { option: TreeOption; checked: boolean; selected: boolean }) => {
    if (info.option.url) {
      return (
        <NButton
          text
          theme-overrides={buttonThemeOverrides}
          tag="a"
          // @ts-ignore
          href={info.option.url}
          target="_blank"
        >
          下载
        </NButton>
      );
    } else {
      return undefined;
    }
  };
</script>

<style scoped></style>
