import { createApp } from 'vue';
import Sidebar from './Sidebar.vue';
import Download from './Download.vue';

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

let delSource = GM_getValue('delSource') ?? true;
GM_setValue('delSource', delSource);

function toggleDelSource() {
  delSource = !delSource;
  GM_setValue('delSource', delSource);
  history.go(0);
}

GM_registerMenuCommand(`${delSource ? '✅' : '🚫'}默认删除源文件`, toggleDelSource);

const observer = new MutationObserver((mutationsList) => {
  mutationsList.some((mutation) => {
    if (
      mutation.type === 'childList' &&
      mutation.addedNodes.length > 0 &&
      (mutation.addedNodes[0] as HTMLElement).className ===
        'dialog-box dialog-mini window-current' &&
      delSource
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
