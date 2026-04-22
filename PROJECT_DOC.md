# Book Reader v2.2.0 - 项目技术文档

## 一、项目概述

**项目名称**: Book Reader  
**版本**: 2.2.0  
**定位**: 一个基于 Electron + Vue3 + Vite + Tailwind CSS + Pinia 的轻量级桌面小说阅读器  
**GitHub**: https://github.com/starsky1391/book-reader

---

## 二、技术栈

| 层面 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 桌面壳 | Electron | ^41.2.0 | 提供桌面应用能力 |
| 前端框架 | Vue 3 | ^3.5.32 | 响应式UI框架 |
| 状态管理 | Pinia | ^3.0.4 | 全局状态管理 |
| 构建工具 | Vite | ^8.0.4 | 快速开发与构建 |
| UI库 | Naive UI | ^2.44.1 | 组件库 |
| 图标 | @vicons/ionicons5 | ^0.13.0 | 图标库 |
| CSS框架 | Tailwind CSS v4 | ^4.2.2 | 原子化CSS |
| 后处理 | PostCSS + Autoprefixer | - | CSS兼容性处理 |
| 语言 | TypeScript (入口) + JavaScript (服务层) | TS ~6.0.2 | 类型安全 |
| 打包 | electron-builder | ^26.8.1 | 桌面应用打包 |
| EPUB解析 | epub | ^2.1.1 | EPUB电子书解析 |
| 存储 | 自定义 StoreService | - | 本地数据持久化 |
| 语音 | Web Speech API / Edge TTS | 浏览器原生/Node | 文本朗读 |

---

## 三、项目文件结构

```
book/
├── electron/
│   ├── main.js              # Electron主进程
│   └── preload.js           # 预加载脚本
├── src/
│   ├── main.ts              # Vue应用入口
│   ├── App.vue              # 主组件（视图调度、TTS控制）
│   ├── style.css            # 全局样式
│   ├── assets/              # 静态资源
│   ├── components/
│   │   ├── AppSidebar.vue       # 应用侧边栏（导航）
│   │   ├── BookCard.vue         # 书籍卡片组件
│   │   ├── BookDetailModal.vue  # 书籍详情弹窗
│   │   ├── ReaderContent.vue    # 阅读区组件
│   │   ├── SettingsDrawer.vue   # 设置抽屉组件
│   │   ├── DirectoryDrawer.vue  # 目录抽屉组件
│   │   └── TTSPlayer.vue        # 听书播放器组件
│   ├── views/
│   │   ├── LibraryView.vue      # 书架视图（封面墙）
│   │   └── ReaderView.vue       # 阅读视图
│   ├── stores/
│   │   ├── useViewStore.js      # 视图状态管理
│   │   ├── useReaderStore.js    # 阅读器状态管理
│   │   └── useLibraryStore.js   # 书架状态管理
│   └── services/
│       ├── FileService.js       # 文件读取与章节解析（支持TXT/EPUB）
│       ├── StoreService.js      # 持久化存储服务
│       ├── TTSServicePro.js     # TTS服务主类
│       ├── TTSEngine.js         # TTS引擎封装
│       ├── SSMLBuilder.js       # SSML语音标记构建器
│       └── DialogueParser.js    # 对话解析器
├── public/                  # 公共资源
├── dist/                    # 构建输出目录
├── index.html               # 入口HTML
├── package.json             # 项目配置
├── vite.config.js           # Vite配置
├── tailwind.config.js       # Tailwind配置
├── postcss.config.js        # PostCSS配置
├── tsconfig.json            # TypeScript配置
├── README.md                # 项目说明
└── PROJECT_DOC.md           # 项目文档
```

---

## 四、架构设计

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        渲染进程 (Vue3)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Pinia Stores                          │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │   │
│  │  │useViewStore │ │useReaderStore│ │ useLibraryStore │   │   │
│  │  │  - 视图切换  │ │  - 主题/设置 │ │  - 书籍/进度    │   │   │
│  │  │             │ │  - TTS状态   │ │  - TTS进度      │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Vue Views                           │   │
│  │  ┌─────────────────┐      ┌─────────────────┐          │   │
│  │  │  LibraryView    │ ←──→ │   ReaderView    │          │   │
│  │  │  (书架封面墙)    │      │  (阅读视图)     │          │   │
│  │  └─────────────────┘      └─────────────────┘          │   │
│  │                          ┌─────────────────┐           │   │
│  │                          │   TTSPlayer     │           │   │
│  │                          │  (听书播放器)    │           │   │
│  │                          └─────────────────┘           │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ IPC (contextBridge)
┌──────────────────────────────┴──────────────────────────────────┐
│                        主进程 (Electron)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    IPC Handlers                           │   │
│  │  dialog:showOpenDialog | file:* | store:* | tts:*       │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Services                               │   │
│  │  FileService (TXT/EPUB/封面) | StoreService (JSON持久化) │   │
│  │  TTSService (Edge TTS语音合成)                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 TTS 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      TTSPlayer.vue                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  UI 组件                                              │   │
│  │  - 听按钮（毛玻璃效果）                                │   │
│  │  - 播放胶囊（旋转封面）                                │   │
│  │  - 详细播放页（从右侧滑入）                            │   │
│  │  - 语速弹窗、设置弹窗、定时弹窗（从底部滑入）          │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    TTSServicePro.js                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  核心功能                                              │   │
│  │  - 会话ID机制（防止双重语音）                          │   │
│  │  - 播放队列管理                                        │   │
│  │  - 预加载下一段音频                                    │   │
│  │  - 语速实时调整（restartCurrentSegment）              │   │
│  │  - 进度保存回调                                        │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
┌───────┴───────┐                    ┌────────┴────────┐
│ Web Speech API │                    │    Edge TTS     │
│  (浏览器原生)   │                    │ (高质量语音合成) │
└───────────────┘                    └─────────────────┘
```

### 4.3 视图切换架构

**v2.1.0 新增**：书架视图与阅读视图完全分离

```javascript
// useViewStore.js
const currentView = ref('library') // 'library' | 'reader'

function showLibrary() { currentView.value = 'library' }
function showReader() { currentView.value = 'reader' }
```

```vue
<!-- App.vue -->
<LibraryView v-if="viewStore.currentView === 'library'" />
<ReaderView v-else-if="viewStore.currentView === 'reader'" />
```

### 4.4 组件拆分

| 组件 | 职责 | 行数 |
|------|------|------|
| `App.vue` | 视图调度、TTS生命周期管理 | ~160行 |
| `AppSidebar.vue` | 应用侧边栏导航 | ~80行 |
| `BookCard.vue` | 书籍卡片、下拉菜单 | ~150行 |
| `BookDetailModal.vue` | 书籍详情编辑弹窗 | ~180行 |
| `LibraryView.vue` | 书架视图、封面墙布局 | ~140行 |
| `ReaderView.vue` | 阅读视图、控制栏 | ~200行 |
| `SettingsDrawer.vue` | 设置抽屉 | ~280行 |
| `DirectoryDrawer.vue` | 目录抽屉 | ~120行 |
| `TTSPlayer.vue` | 听书播放器UI | ~750行 |

### 4.5 Pinia 状态管理

#### useViewStore

```javascript
currentView: 'library' | 'reader'  // 当前视图
showLibrary()                      // 切换到书架
showReader()                       // 切换到阅读
```

#### useReaderStore

```javascript
// 主题
isDarkMode: false
isEyeProtectionMode: false
selectedTheme: 'white'

// 文字设置
fontFamily: 'system-ui'
fontSize: 18
lineHeight: 1.5
letterSpacing: 0
textAlign: 'left'

// 听书控制
isPlaying: false
isPaused: false
currentSpeed: 1.0
ttsProgress: 0
currentReadingText: ''  // 当前朗读文本（用于高亮）
autoContinue: true      // 自动连读下一章

// 抽屉状态
directoryDrawerVisible: false
settingsDrawerVisible: false
```

#### useLibraryStore

```javascript
books: []              // 书架列表
currentBook: {
  id: null,
  title: '未选择书籍',
  content: '',
  chapters: [],
  currentChapterIndex: 0,
  type: 'txt',         // 'txt' | 'epub'
  cover: null,         // 封面图片 base64
  ttsProgress: 0       // TTS播放进度
}
```

---

## 五、核心功能详解

### 5.1 TTS 听书功能

**功能描述**: 现代化的文本朗读功能，支持双引擎、实时语速调节、定时关闭等。

**核心特性**:
- **双引擎支持**: Web Speech API（浏览器原生）和 Edge TTS（高质量语音）
- **会话ID机制**: 防止双重语音播放
- **实时语速调节**: 拖动滑块立即生效
- **进度保存**: 保存 bookId、chapterIndex、segmentIndex
- **定时关闭**: 支持 15/30/45/60/90 分钟定时

**UI 设计**:
```
听按钮（未播放时）
    ↓ 点击
播放胶囊（播放/暂停时显示）
    ├── 旋转封面（点击进入详细页）
    ├── 暂停按钮
    └── 停止按钮

详细播放页（从右侧滑入）
    ├── 封面区域
    ├── 进度条
    ├── 主控制按钮（上一章/播放/下一章）
    ├── 功能按钮（目录/语速/定时/设置）
    └── 弹窗（语速/设置/定时，从底部滑入）
```

**防止双重语音**:
```javascript
// TTSServicePro.js
class TTSServicePro {
  constructor() {
    this.sessionId = 0
  }
  
  speak(text) {
    const currentSessionId = ++this.sessionId
    // 所有回调检查 sessionId
    if (sessionId !== this.sessionId) return
  }
  
  stop() {
    this.sessionId++  // 使所有旧回调失效
  }
}
```

**实时语速调节**:
```javascript
updateConfig(newConfig) {
  if (wasPlaying && newConfig.rate !== oldRate) {
    this.restartCurrentSegment()  // 立即重新播放当前片段
  }
}
```

### 5.2 书籍管理交互

**功能描述**: 完整的书籍管理交互逻辑，包含删除确认和可编辑的详情弹窗。

**组件结构**:
```
BookCard.vue          # 书籍卡片组件
├── NDropdown         # 下拉菜单（更多按钮）
│   ├── 书籍信息      → 打开 BookDetailModal
│   └── 删除          → 二次确认对话框
└── BookDetailModal   # 详情编辑弹窗
    ├── 封面修改      → electron.dialog 选择图片
    ├── 书名编辑      → NInput
    └── 作者编辑      → NInput
```

**删除确认**:
```javascript
dialog.warning({
  title: '要删除吗？',
  content: `确定要在本阅读器中删除书籍《${book.title}》吗？`,
  positiveText: '删除',
  negativeText: '取消',
  onPositiveClick: () => emit('delete', book.id)
})
```

**封面修改**:
```javascript
const result = await window.electron.dialog.showOpenDialog({
  filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
})
const base64 = await window.electron.file.readImageAsBase64(imagePath)
```

### 5.3 EPUB 封面提取

**功能描述**: 自动提取 EPUB 书籍的第一张图片作为封面。

**实现方式** (`FileService.js`):
```javascript
static async getEpubCover(epubPath) {
  const epub = new EPub(epubPath)
  await epub.parse()
  
  // 获取第一章的第一张图片
  const firstChapter = epub.flow[0]
  const content = await epub.getChapter(firstChapter.id)
  
  // 匹配图片标签（支持 img 和 SVG image）
  const patterns = [
    /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
    /<image[^>]+xlink:href=["']([^"']+)["'][^>]*>/i,
    /<image[^>]+href=["']([^"']+)["'][^>]*>/i
  ]
  
  // 加载图片并转换为 base64
  const cover = await this.loadEpubImage(epub, imageId, new Map())
  return cover  // data:image/jpeg;base64,...
}
```

### 5.4 书架封面墙

**功能描述**: 使用 CSS Grid 布局展示书籍封面。

**实现方式** (`LibraryView.vue`):
```css
.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 150px);
  gap: 32px;
}

.book-cover {
  width: 150px;
  height: 225px;  /* 2:3 比例 */
  border-radius: 8px;
  overflow: hidden;
}
```

### 5.5 章节解析

#### TXT 解析

```javascript
const chapterRegex = /^\s*(第[一二三四五六七八九十百千万0-9]+[章节回部卷]).*/
```

支持格式：`第1章`, `第一章`, `第十二章`, `第1节`, `第1回` 等

#### EPUB 解析

```javascript
static async parseEpubChapters(epubPath) {
  const epub = new EPub(epubPath)
  await epub.parse()
  
  for (const chapter of epub.flow) {
    const content = await this.getEpubChapterContent(epub, chapter.id)
    chapters.push({
      title,
      content,      // HTML 内容
      type: 'html',
      id: chapter.id
    })
  }
}
```

---

## 六、Electron 架构

### 6.1 IPC 通信接口

| 通道 | 功能 |
|------|------|
| `dialog:showOpenDialog` | 打开文件选择对话框 |
| `file:readFile` | 读取文件内容 |
| `file:getFileInfo` | 获取文件信息 |
| `file:parseChapters` | 解析章节 |
| `file:copyFileToLibrary` | 复制文件到库目录 |
| `file:getEpubCover` | 获取 EPUB 封面 |
| `file:readImageAsBase64` | 读取图片并转为 base64 |
| `store:getSettings` | 获取设置 |
| `store:saveSettings` | 保存设置 |
| `store:getBooks` | 获取书架列表 |
| `store:addBook` | 添加书籍 |
| `store:deleteBook` | 删除书籍 |
| `store:updateBook` | 更新书籍信息 |
| `store:getReadingProgress` | 获取阅读进度 |
| `store:saveReadingProgress` | 保存阅读进度 |
| `tts:checkEdgeTTS` | 检查 Edge TTS 可用性 |
| `tts:getVoices` | 获取可用声音列表 |
| `tts:synthesizeEdge` | Edge TTS 语音合成 |

### 6.2 GPU 加速配置

```javascript
// main.js - 禁用硬件加速避免缓存权限问题
app.disableHardwareAcceleration()
```

---

## 七、样式系统

### 7.1 CSS 变量

```css
::root {
  --bg-main: #FBFBFB;
  --bg-paper: #FFFFFF;
  --bg-sidebar: #FFFFFF;
  --bg-card: #F9F9F9;
  --text-main: #2D3436;
  --text-h: #000000;
  --ui-color: #b88552;
  --border: #e0e0e0;
}

.dark {
  --bg-main: #16171D;
  --bg-paper: #1A1A1A;
  --text-main: #A0A0A0;
  --text-h: #FFFFFF;
}
```

### 7.2 TTS 播放器样式

```css
/* 毛玻璃效果 */
.tts-trigger-btn {
  background: rgba(184, 133, 82, 0.9);
  backdrop-filter: blur(12px);
}

/* 封面旋转动画 */
@keyframes rotate-cover {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 弹窗滑入动画 */
.popup-slide-up-enter-from .inner-popup {
  transform: translateY(100%);
}
```

---

## 八、开发路线图

### 已完成 ✅
- [x] 本地TXT导入
- [x] 智能章节解析
- [x] 文本朗读 (Web Speech API)
- [x] 主题切换
- [x] 阅读进度保存
- [x] 书架管理
- [x] 组件拆分重构
- [x] Pinia 状态管理
- [x] EPUB 格式支持
- [x] EPUB 封面提取
- [x] 视图分离（书架/阅读）
- [x] 封面墙布局
- [x] 书籍管理交互（删除确认、详情编辑）
- [x] 自定义封面修改
- [x] Edge TTS 高质量语音合成
- [x] 现代化听书播放器 UI
- [x] 实时语速调节
- [x] 定时关闭功能
- [x] 听书进度保存
- [x] 朗读文本高亮

### 待开发 🚧
- [ ] 集成本地VITS语音合成
- [ ] PDF 格式支持
- [ ] 阅读笔记功能
- [ ] 云同步功能

---

## 九、参考资料

- [Electron 文档](https://www.electronjs.org/docs)
- [Vue 3 文档](https://vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Naive UI 文档](https://www.naiveui.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Edge TTS](https://github.com/rany2/edge-tts)
- [epub 库](https://www.npmjs.com/package/epub)
