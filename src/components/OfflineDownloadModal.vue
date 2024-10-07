<template>
  <NModal
    v-model:show="show"
    style="width: 40%"
    title="添加离线下载"
    preset="card"
    :bordered="false"
  >
    <div>
      <NInput
        v-model:value="url"
        type="textarea"
        placeholder="支持HTTP、HTTPS、FTP、磁力链和电驴链接，换行可添加多个"
        clearable
        :rows="10"
      />
      <NFormItem label="保存到：" label-placement="left" style="margin-top: 10px">
        <NInput v-model:value="pathId" placeholder="暂时只支持填入文件夹ID，不填默认云下载文件夹" />
      </NFormItem>
    </div>
    <template #action>
      <div style="display: flex; justify-content: space-between">
        <div>本月配额：剩{{ countData.count - countData.used }}/总{{ countData.count }}</div>
        <div>
          <NButton
            type="primary"
            :disabled="countData.used >= countData.count"
            @click="handleDownload"
          >
            开始下载
          </NButton>
        </div>
      </div>
    </template>
  </NModal>
  <NModal v-model:show="showCaptcha" title="验证账号" style="width: 360px" preset="card">
    <iframe
      ref="iframe"
      src="https://captchaapi.115.com/?ac=security_code&type=web"
      frameborder="0"
      style="width: 100%; height: 500px"
    ></iframe>
  </NModal>
  <NModal
    v-model:show="showResult"
    title="下载任务错误列表"
    style="width: 40%"
    preset="card"
    :close-on-esc="false"
    :mask-closable="false"
    @after-leave="
      () => {
        resultData.success = 0;
        resultData.fail = 0;
        resultData.list = [];
      }
    "
  >
    <NResult status="warning" size="small" :title="resultTitle">
      <NList>
        <template #header> 失败任务列表： </template>
        <NScrollbar style="max-height: 120px">
          <NListItem v-for="(item, index) in resultData.list" :key="index">
            <div style="display: flex; justify-content: space-between">
              <NEllipsis style="max-width: 300px">
                {{ item.url }}
              </NEllipsis>
              <div>
                <NText type="error">
                  {{ item.error }}
                </NText>
              </div>
            </div>
          </NListItem>
        </NScrollbar>
      </NList>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="handleCencel">取消</NButton>
          <NButton type="primary" @click="showResult = false">重试</NButton>
        </NSpace>
      </template>
    </NResult>
  </NModal>
</template>

<script setup lang="ts">
  import { request } from '@/utils';

  const show = defineModel('show', {
    type: Boolean,
    default: false,
  });

  const props = defineProps<{
    signData: {
      sign: string;
      time: string;
    };
    downPath: {
      file_id: string;
      user_id: string;
    };
  }>();

  const message = useMessage();
  const url = ref('');
  const pathId = ref('');
  const countData = ref({
    used: 0,
    count: 0,
  });
  const showCaptcha = ref(false);
  const iframe = ref<HTMLIFrameElement | null>(null);
  const showResult = ref(false);
  const resultData = ref({
    success: 0,
    fail: 0,
    list: [] as { url: string; error: string }[],
  });
  const resultTitle = computed(() => {
    return (
      (resultData.value.success ? resultData.value.success + '个任务添加成功，' : '') +
      resultData.value.fail +
      '个任务添加失败'
    );
  });

  watch(show, (value) => {
    if (value) {
      getCount();
    }
  });

  const getCount = async () => {
    try {
      const res = await request({
        url: `https://115.com/web/lixian/?ct=lixian&ac=get_quota_package_info`,
        method: 'GET',
      });
      const json = JSON.parse(res.responseText);
      countData.value.used = json.used;
      countData.value.count = json.count;
      if (json.used >= json.count) {
        message.error('本月配额已用完');
      }
    } catch (error: any) {
      message.error(error);
    }
  };

  const handleDownload = async () => {
    if (!url.value) {
      message.error('下载链接不能为空');
      return;
    }
    if (pathId.value && !/^\d+$/.test(pathId.value)) {
      message.error('文件夹ID只能为数字');
      return;
    }
    try {
      const sp = new URLSearchParams();
      sp.append('savepath', '');
      sp.append('wp_path_id', pathId.value ? pathId.value : props.downPath.file_id);
      const urls = url.value.split('\n').filter((item) => item.trim());
      if (urls.length > 1) {
        urls.forEach((item, index) => {
          sp.append(`url[${index}]`, item);
        });
      } else {
        sp.append('url', urls[0]);
      }
      sp.append('uid', props.downPath.user_id);
      sp.append('sign', props.signData.sign);
      sp.append('time', props.signData.time);
      const res = await request({
        url: `https://115.com/web/lixian/?ct=lixian&ac=add_task_url${urls.length > 1 ? 's' : ''}`,
        method: 'POST',
        data: sp,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          Origin: 'https://115.com',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const json = JSON.parse(res.responseText);
      if (json.state) {
        if (urls.length > 1) {
          json.result.forEach((item: { state: boolean; url: string; error_msg?: string }) => {
            if (item.state) {
              resultData.value.success++;
            } else {
              resultData.value.fail++;
              resultData.value.list.push({ url: item.url, error: item.error_msg || '未知原因' });
            }
          });
          if (resultData.value.fail) {
            showResult.value = true;
            return;
          }
        }
        message.success('添加下载成功');
        show.value = false;
        url.value = '';
        pathId.value = '';
      } else {
        if (json.errcode === 911) {
          message.warning(json.error_msg);
          showCaptcha.value = true;
          nextTick(() => {
            if (iframe.value) {
              iframe.value.onload = () => {
                const contentWindow = iframe.value?.contentWindow;
                const iframeUrl = contentWindow?.location.href;
                if (iframeUrl !== 'https://captchaapi.115.com/?ac=security_code&type=web') {
                  message.success('验证成功, 请重试');
                  showCaptcha.value = false;
                }
              };
            }
          });
        } else {
          if (json.error_msg) {
            throw json.error_msg;
          } else {
            throw '添加失败';
          }
        }
      }
    } catch (error: any) {
      message.error(error);
    }
  };

  const handleCencel = () => {
    showResult.value = false;
    show.value = false;
  };
</script>

<style scoped></style>
