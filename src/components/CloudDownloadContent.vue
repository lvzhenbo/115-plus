<template>
  <NDropdown trigger="hover" :options="options" @select="handleSelect">
    <NButton>离线下载</NButton>
  </NDropdown>
  <NModal v-model:show="showList" style="width: 80%" title="云下载" preset="card" :bordered="false">
    <NDataTable
      remote
      flex-height
      :columns
      :data
      :pagination
      :row-key="(row: ListData) => row.info_hash"
      :loading
      style="height: 70vh"
      @update:page="handlePageChange"
    />
  </NModal>
</template>

<script setup lang="tsx">
  import { request } from '@/utils';
  import {
    type DataTableColumns,
    NProgress,
    type PaginationProps,
    NButton,
    NIcon,
    NSpace,
  } from 'naive-ui';
  import { filesize } from 'filesize';
  import { FolderOutlined, CopyOutlined, DeleteOutlined } from '@vicons/antd';

  interface ListData {
    info_hash: string;
    name: string;
    size: number;
    url: string;
    file_id: string;
    percentDone: number;
  }

  const message = useMessage();
  const { copy } = useClipboard();
  const signData = ref({
    sign: '',
    time: '',
  });
  const downPath = ref({
    file_id: '',
    user_id: '',
  });
  const showList = ref(false);
  const options = [
    {
      label: '云下载',
      key: 'CloudDownload',
    },
  ];
  const columns: DataTableColumns<ListData> = [
    {
      title: '文件名',
      key: 'name',
    },
    {
      title: '大小',
      key: 'size',
      width: 100,
      render(row) {
        return filesize(row.size, { standard: 'jedec' });
      },
    },
    {
      title: '进度',
      key: 'percentDone',
      render(row) {
        if (row.percentDone === 100) {
          return '已完成';
        } else {
          return <NProgress type="line" percentage={Math.floor(row.percentDone)} processing />;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (row) => {
        return (
          <NSpace>
            {row.file_id ? (
              <NButton
                text
                onClick={() =>
                  GM_openInTab(`https://115.com/?cid=${row.file_id}&offset=0&tab=&mode=wangpan`)
                }
              >
                {{
                  icon: () => (
                    <NIcon>
                      <FolderOutlined />
                    </NIcon>
                  ),
                }}
              </NButton>
            ) : null}
            <NButton
              text
              onClick={async () => {
                await copy(row.url);
                message.success('复制成功！');
              }}
            >
              {{
                icon: () => (
                  <NIcon>
                    <CopyOutlined />
                  </NIcon>
                ),
              }}
            </NButton>
            <NButton text>
              {{
                icon: () => (
                  <NIcon>
                    <DeleteOutlined />
                  </NIcon>
                ),
              }}
            </NButton>
          </NSpace>
        );
      },
    },
  ];
  const data = ref<ListData[]>([]);
  const pagination = reactive<PaginationProps>({
    page: 1,
    pageCount: 1,
    pageSize: 30,
  });
  const loading = ref(false);

  onMounted(() => {
    getSign();
    getDownPath();
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

  const getList = async (page?: number) => {
    try {
      loading.value = true;
      const sp = new URLSearchParams();
      sp.append('sign', signData.value.sign);
      sp.append('time', signData.value.time);
      sp.append('page', page ? page.toString() : pagination.page!.toString());
      sp.append('uid', downPath.value.user_id);
      const res = await request({
        url: `https://115.com/web/lixian/?ct=lixian&ac=task_lists`,
        method: 'POST',
        data: sp,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const json = JSON.parse(res.responseText);
      if (json.state) {
        console.log(json);
        data.value = json.tasks;
        pagination.page = json.page;
        pagination.pageCount = json.page_count;
        pagination.itemCount = json.count;
        // console.log(pagination);
      } else {
        if (json.error) {
          throw new Error(json.error);
        } else {
          throw new Error('获取签名失败');
        }
      }
    } catch (error: any) {
      message.error(error);
    } finally {
      loading.value = false;
    }
  };

  const handleSelect = (option: string) => {
    if (option === 'CloudDownload') {
      showList.value = true;
      getList();
    }
  };

  const handlePageChange = (page: number) => {
    // pagination.page = page;
    getList(page);
  };
</script>

<style scoped></style>
