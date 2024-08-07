import { createApp } from 'vue';
import Sidebar from './Sidebar.vue';
import Download from './Download.vue';
import Setting from './Setting.vue';
import { settings } from './utils';
import { createDiscreteApi } from 'naive-ui';

const { message } = createDiscreteApi(['message']);

// 兼容旧版本
if (settings) {
  let newSettings = settings;
  let flag = false;
  if (!settings.darkMode) {
    newSettings = {
      ...newSettings,
      darkMode: {
        enable: false,
      },
    };
    flag = true;
  }
  if (!settings.fp) {
    newSettings = {
      ...newSettings,
      fp: {
        enable: true,
      },
    };
    flag = true;
  }
  GM_setValue('settings', newSettings);
  if (flag) {
    message.loading('115+ 功能更新中，即将刷新页面……');
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
}

createApp(Setting).mount(
  (() => {
    const top_side = document.querySelector('.top-side');
    const setting = document.createElement('div');
    if (top_side) {
      top_side.appendChild(setting);
    }
    return setting;
  })(),
);

if (!settings || settings.sidebar.enable) {
  createApp(Sidebar).mount(
    (() => {
      const wrap_hflow = document.getElementsByClassName('wrap-hflow')[0];
      const site_left_bar = document.getElementById('site_left_bar');
      const sidebar = document.createElement('div');
      sidebar.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      if (site_left_bar && wrap_hflow) {
        wrap_hflow.insertBefore(sidebar, site_left_bar);
        wrap_hflow.removeChild(site_left_bar);
      }
      return sidebar;
    })(),
  );
}

if (!settings || settings.download.enable || settings.openNewTab.enable || settings.video.enable) {
  createApp(Download).mount(
    (() => {
      const js_top_header_file_path_box = document.getElementById('js_top_header_file_path_box');
      const download = document.createElement('div');
      download.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      if (js_top_header_file_path_box) {
        js_top_header_file_path_box.appendChild(download);
      }
      return download;
    })(),
  );
}

// 默认删除源文件功能

if (!settings || settings.deleteSource.enable) {
  const observer = new MutationObserver((mutationsList) => {
    mutationsList.some((mutation) => {
      if (
        mutation.type === 'childList' &&
        mutation.addedNodes.length > 0 &&
        (mutation.addedNodes[0] as HTMLElement).className ===
          'dialog-box dialog-mini window-current'
      ) {
        const checkBox = document.querySelector('#js_del_task_source') as HTMLInputElement;
        if (checkBox) {
          checkBox.checked = true;
        }
        return true;
      }
      return false;
    });
  });

  observer.observe(document.querySelector('body')!, { childList: true });
}

// 还原离线下载按钮
if (!settings || settings.oldButton.enable) {
  const leftTvf = document.querySelector('.left-tvf') as HTMLElement;

  const replaceNodeWithDiv = (parentNode: HTMLElement, index: number) => {
    const node = parentNode.childNodes[index];
    if (node.nodeType === 8 && node.nodeValue!.includes('href')) {
      const div = document.createElement('div');
      div.innerHTML = node.nodeValue!;
      parentNode.replaceChild(div, node);
    }
  };

  if (leftTvf) {
    replaceNodeWithDiv(leftTvf, 9);
    replaceNodeWithDiv(leftTvf, 11);
  }
}

if (!settings || settings.fp.enable) {
  const observer = new MutationObserver((mutationsList) => {
    mutationsList.some((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        const fp = document.querySelector('div[class|="fp"]') as HTMLElement;
        if (fp && fp.style.display !== 'none') {
          fp.style.display = 'none';
        }
        return true;
      }
      return false;
    });
  });

  observer.observe(document.querySelector('body')!, { childList: true });
}
