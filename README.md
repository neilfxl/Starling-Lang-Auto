# Starling 目标语言自动勾选（离线浏览器扩展）

## 加载方式（Chrome / Chromium）
- 打开 `chrome://extensions/`
- 右上角开启“开发者模式”
- 点击“加载已解压的扩展程序”
- 选择本项目目录（包含 `manifest.json` 的目录）

## 使用方式
- 点击扩展图标：选择预设、开启自动应用、或点击“立即应用到当前页面”
- 打开“设置”：管理预设、配置站点匹配规则、导入导出

## 重要说明
- 本扩展离线运行，不需要服务端。
- 所有配置与日志仅保存在本地 `chrome.storage.local`。
- 默认 `host_permissions` 为 `<all_urls>`，你可在 `manifest.json` 中改为公司内网域名以缩小权限。

## 本地测试（可选）
使用 Node 内置测试运行器：

```bash
node --test
```

