<template>
  <div style="display: flex; justify-content: center; margin-top: 8px">
    <NConfigProvider :theme>
      <NButton
        text
        style="font-size: 12px"
        :theme-overrides="buttonThemeOverrides"
        @click="handleOpen"
      >
        <div>
          <NIcon size="24">
            <SettingOutlined />
          </NIcon>
        </div>
        <div> 115+ 设置 </div>
      </NButton>
      <NModal v-model:show="showSetting">
        <NCard
          style="width: 40%"
          title="115+ 设置"
          :bordered="false"
          role="dialog"
          closable
          @close="handleClose"
        >
          <NTabs type="segment" animated>
            <NTabPane name="functionSwitch" tab="功能开关">
              <NForm ref="formRef" label-placement="left" label-width="auto" :show-feedback="false">
                <NFormItem label="精简侧边栏" path="sidebar.enable">
                  <NSwitch v-model:value="settingsRef.sidebar.enable" />
                </NFormItem>
                <NFormItem label="默认删除源文件" path="deleteSource.enable">
                  <template #label>
                    默认删除源文件
                    <NPopover trigger="hover">
                      <template #trigger>
                        <NIcon size="14">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            xmlns:xlink="http://www.w3.org/1999/xlink"
                            viewBox="0 0 1024 1024"
                          >
                            <path
                              d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448s448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372s372 166.6 372 372s-166.6 372-372 372z"
                              fill="currentColor"
                            ></path>
                            <path
                              d="M464 336a48 48 0 1 0 96 0a48 48 0 1 0-96 0zm72 112h-48c-4.4 0-8 3.6-8 8v272c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V456c0-4.4-3.6-8-8-8z"
                              fill="currentColor"
                            ></path>
                          </svg>
                        </NIcon>
                      </template>
                      <span>删除离线下载项时可默认选择删除源文件</span>
                    </NPopover>
                  </template>
                  <NSwitch v-model:value="settingsRef.deleteSource.enable" />
                </NFormItem>
                <NFormItem label="下载文件" path="download.enable">
                  <NSwitch v-model:value="settingsRef.download.enable" />
                </NFormItem>
                <NFormItem label="批量新标签打开" path="openNewTab.enable">
                  <NSwitch v-model:value="settingsRef.openNewTab.enable" />
                </NFormItem>
                <NFormItem label="还原离线下载按钮" path="oldButton.enable">
                  <NSwitch v-model:value="settingsRef.oldButton.enable" />
                </NFormItem>
                <NFormItem label="视频播放" path="video.enable">
                  <NSwitch v-model:value="settingsRef.video.enable" />
                </NFormItem>
                <NFormItem label="跟随系统暗黑模式" path="darkMode.enable">
                  <NSwitch v-model:value="settingsRef.darkMode.enable" />
                </NFormItem>
                <NFormItem label="去水印" path="fp.enable">
                  <NSwitch v-model:value="settingsRef.fp.enable" />
                </NFormItem>
              </NForm>
            </NTabPane>
            <NTabPane name="playSetting" tab="播放设置">
              <NForm ref="formRef" label-placement="left" label-width="auto" :show-feedback="false">
                <NFormItem label="默认音量" path="video.volume">
                  <NSlider
                    v-model:value="settingsRef.video.volume"
                    :step="0.01"
                    :max="1"
                    :format-tooltip="(v) => `${(v * 100).toFixed(0)}%`"
                  />
                </NFormItem>
                <NFormItem label="默认速度" path="video.defaultPlaybackRate">
                  <NRadioGroup
                    v-model:value="settingsRef.video.defaultPlaybackRate"
                    name="radiogroup"
                  >
                    <NSpace>
                      <NRadio :value="0.5"> 0.5x </NRadio>
                      <NRadio :value="0.75"> 0.75x </NRadio>
                      <NRadio :value="1"> 1x </NRadio>
                      <NRadio :value="1.25"> 1.25x </NRadio>
                      <NRadio :value="1.5"> 1.5x </NRadio>
                      <NRadio :value="2"> 2x </NRadio>
                      <NRadio :value="3"> 3x </NRadio>
                      <NRadio :value="4"> 4x </NRadio>
                      <NRadio :value="5"> 5x </NRadio>
                    </NSpace>
                  </NRadioGroup>
                </NFormItem>
                <NFormItem label="自动播放" path="video.autoplay">
                  <NSwitch v-model:value="settingsRef.video.autoplay" />
                </NFormItem>
                <NFormItem label="同步播放进度" path="video.history">
                  <NSwitch v-model:value="settingsRef.video.history" />
                </NFormItem>
              </NForm>
            </NTabPane>
          </NTabs>
          <template #action>
            <div style="display: flex; justify-content: end">
              <NButton type="primary" @click="handleSave">保存</NButton>
            </div>
          </template>
        </NCard>
      </NModal>
    </NConfigProvider>
  </div>
</template>

<script setup lang="ts">
  import { settings, type Settings } from '@/utils';
  import { useTheme } from '@/composables/useTheme';
  import { buttonThemeOverrides } from '@/utils/theme';
  import { SettingOutlined } from '@vicons/antd';

  const showSetting = ref(false);
  const theme = useTheme();
  const settingsRef = ref<Settings>(
    settings ?? {
      sidebar: {
        enable: true,
      },
      deleteSource: {
        enable: true,
      },
      download: {
        enable: true,
      },
      openNewTab: {
        enable: true,
      },
      oldButton: {
        enable: true,
      },
      video: {
        enable: true,
        volume: 1,
        defaultPlaybackRate: 1,
        autoplay: true,
        history: true,
      },
      darkMode: {
        enable: false,
      },
      fp: {
        enable: true,
      },
    },
  );

  const handleOpen = () => {
    showSetting.value = true;
  };

  const handleClose = () => {
    showSetting.value = false;
  };

  const handleSave = () => {
    GM_setValue('settings', settingsRef.value);
    handleClose();
    history.go(0);
  };
</script>

<style scoped>
  :deep(.n-button__content) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
</style>
