import { createApp } from 'vue';
import Sidebar from './Sidebar.vue';
import Download from './Download.vue';
import Setting from './Setting.vue';
import CloudDownload from './CloudDownload.vue';
import App from './App.vue';
import { settings } from './utils';
import { createDiscreteApi } from 'naive-ui';
import './styles/index.css';

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
  if (typeof settings.oldButton.deleteSource !== 'boolean') {
    newSettings = {
      ...newSettings,
      oldButton: {
        enable: settings.oldButton.enable,
        deleteSource: true,
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
if (window.top === window.self) {
  createApp(App).mount(
    (() => {
      const body = document.querySelector('body');
      const app = document.createElement('div');
      if (body) {
        body.appendChild(app);
      }
      return app;
    })(),
  );
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

if (!settings || settings.oldButton.enable) {
  createApp(CloudDownload).mount(
    (() => {
      const upload_btn_add_dir = document.querySelector(
        'a[data-dropdown-tab="upload_btn_add_dir"]',
      );
      const cloudDownload = document.createElement('div');
      cloudDownload.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      cloudDownload.style.display = 'inline-block';
      if (upload_btn_add_dir) {
        upload_btn_add_dir.parentNode!.insertBefore(cloudDownload, upload_btn_add_dir.nextSibling);
      }
      return cloudDownload;
    })(),
  );
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
