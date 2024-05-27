<template>
  <div class="main">
    <NMenu v-model:value="menuValue" :options="menuOptions" :theme-overrides="menuThemeOverrides" />
  </div>
</template>

<script setup lang="tsx">
  import type { MenuOption, MenuProps } from 'naive-ui';

  type MenuThemeOverrides = NonNullable<MenuProps['themeOverrides']>;

  const menuThemeOverrides: MenuThemeOverrides = {
    itemColorActive: '#EEF0FF',
    itemColorActiveHover: '#EEF0FF',
    itemTextColorActive: '#2777F8',
    itemTextColorActiveHover: '#2777F8',
  };

  const menuOptions: MenuOption[] = [
    {
      label: () => <a href="//115.com/?cid=0&offset=0&mode=wangpan">全部文件</a>,
      key: 'all',
    },
    {
      label: () => <a href="//115.com/?tab=upload&mode=wangpan">最近上传</a>,
      key: 'upload',
    },
    {
      label: () => <a href="//115.com/?tab=offline&mode=wangpan">云下载</a>,
      key: 'offline',
    },
  ];
  const menuValue = ref('all');

  const url = new URL(window.location.href);

  if (url.searchParams.has('cid')) {
    menuValue.value = 'all';
  } else if (url.searchParams.has('tab')) {
    const tab = url.searchParams.get('tab');
    if (tab === 'upload') {
      menuValue.value = 'upload';
    } else if (tab === 'offline') {
      menuValue.value = 'offline';
    }
  }
</script>

<style scoped>
  .main {
    border-right: 1px solid #edeeef;
    height: 100%;
  }
</style>
