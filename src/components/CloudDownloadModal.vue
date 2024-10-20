<template>
  <NModal v-model:show="show" style="width: 80%" title="云下载" preset="card" :bordered="false">
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
  import { request, settings } from '@/utils';
  import {
    type DataTableColumns,
    NProgress,
    type PaginationProps,
    NButton,
    NIcon,
    NSpace,
    NCheckbox,
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
  const dialog = useDialog();
  const { copy } = useClipboard();
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
      width: 300,
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
                  GM_openInTab(`https://115.com/?cid=${row.file_id}&offset=0&tab=&mode=wangpan`, {
                    setParent: settings?.openNewTab.setParent,
                  })
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
            <NButton
              text
              onClick={() => {
                dialog.warning({
                  title: '信息提示',
                  content: () => (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          marginBottom: '10px',
                        }}
                      >
                        是否确认删除该下载任务？
                      </div>
                      <NCheckbox v-model:checked={flag.value} checked-value={1} unchecked-value={0}>
                        删除源文件
                      </NCheckbox>
                    </div>
                  ),
                  positiveText: '确定',
                  negativeText: '取消',
                  onPositiveClick: () => {
                    handleDelete(row.info_hash);
                  },
                });
              }}
            >
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
  const flag = ref(0);

  onMounted(() => {
    if (settings?.oldButton.deleteSource) {
      flag.value = 1;
    }
  });

  watch(show, (value) => {
    if (value) {
      getList();
    }
  });

  const getList = async (page?: number) => {
    try {
      loading.value = true;
      const sp = new URLSearchParams();
      sp.append('sign', props.signData.sign);
      sp.append('time', props.signData.time);
      sp.append('page', page ? page.toString() : pagination.page!.toString());
      sp.append('uid', props.downPath.user_id);
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
        data.value = json.tasks;
        pagination.page = json.page;
        pagination.pageCount = json.page_count;
        pagination.itemCount = json.count;
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

  const handlePageChange = (page: number) => {
    getList(page);
  };

  const handleDelete = async (hash: string) => {
    try {
      const sp = new URLSearchParams();
      sp.append('sign', props.signData.sign);
      sp.append('time', props.signData.time);
      sp.append('hash[0]', hash);
      sp.append('uid', props.downPath.user_id);
      if (flag.value) {
        sp.append('flag', flag.value.toString());
      }
      const res = await request({
        url: `https://115.com/web/lixian/?ct=lixian&ac=task_del`,
        method: 'POST',
        data: sp,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const json = JSON.parse(res.responseText);
      if (json.state) {
        message.success('删除成功');
        getList();
      } else {
        if (json.error) {
          throw new Error(json.error);
        } else {
          throw new Error('删除失败');
        }
      }
    } catch (error: any) {
      message.error(error);
    }
  };
</script>

<style scoped></style>
