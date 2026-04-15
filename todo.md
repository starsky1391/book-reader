项目需求文档：AI 听书小说阅读器 (Desktop)
1. 项目概述
使用 Electron + Vue3 + Vite + Tailwind CSS 开发一款轻量级的桌面小说阅读器。核心功能是支持本地 TXT 导入、智能章节解析以及基于 Web Speech API 的语音朗读（听书）。

2. 技术栈
框架: Electron (桌面外壳)

前端: Vue 3 + Vite

样式: Tailwind CSS (响应式布局)

存储: electron-store (保存设置与进度)

语音: Web Speech API (原生 TTS 引擎)

3. 开发阶段规划
第一阶段：项目初始化与基础框架
[ ] 初始化 Electron + Vite + Vue3 模板。

[ ] 配置双栏布局：

左侧边栏：书架列表、导入按钮。

右侧主区域：文本显示区、顶部/底部控制栏。

[ ] 实现基础样式：支持深色模式和护眼模式（豆沙绿）。

第二阶段：文件处理与解析引擎
[ ] 文件导入：支持点击或拖拽 .txt 文件进入应用。

[ ] 编码检测：自动识别 UTF-8 和 GBK 编码，防止中文乱码。

[ ] 正则解析：自动识别目录（匹配 第[一二三四五六七八九十百千万数字]+章|节|回）。

[ ] 虚拟列表：针对超长文本，采用分段加载或虚拟列表技术，确保阅读不卡顿。

第三阶段：核心阅读功能
[ ] 进度保存：自动记录每本书最后阅读的章节和行数。

[ ] 自定义配置：

字体大小调节 (12px - 30px)。

行高与页边距调节。

翻页模式：平滑滚动或点击翻页。

第四阶段：听书功能 (TTS)
[ ] 语音控制器：实现 播放/暂停、停止、跳到下一句。

[ ] 语速调节：支持 0.5x 到 2.0x 语速。

[ ] 自动跟随：朗读时自动滚动视图，并高亮当前正在朗读的段落。

[ ] 中断处理：关闭应用时自动停止语音，防止后台余音。

4. 关键代码逻辑参考 (供 Trae 内部参考)
章节解析正则
JavaScript
const chapterRegex = /^\s*(第[一二三四五六七八九十百千万0-9]+[章节回部卷]).*/;
语音合成配置
JavaScript
const speak = (text) => {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'zh-CN';
  msg.rate = store.get('speed') || 1.0;
  window.speechSynthesis.speak(msg);
};
5. 交付标准
用户可以打开一个 10MB 的 TXT 且不感到卡顿。

退出软件后再打开，能准确回到上次看到的文字位置。

点击“开始听书”，电脑能清晰读出当前章节内容。

给 Trae 的执行建议：
Step 1: 先搭建环境，输出一个能显示 "Hello World" 的 Electron 窗口。

Step 2: 编写 FileService，处理 TXT 的读取和乱码转换。

Step 3: 构建 UI，使用 Tailwind 快速出效果。

Step 4: 注入 TTS 逻辑，完成闭环。