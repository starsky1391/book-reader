# Book Reader v2.1.0 - 项目技术文档

## 一、项目概述

**项目名称**: Book Reader  
**版本**: 2.1.0  
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
| 语音 | Web Speech API | 浏览器原生 | 文本朗读 |

---

## 三、项目文件结构

```
book/
├── electron/
│   ├── main.js              # Electron主进程
│   └── preload.js           # 预加载脚本
├── src/
│   ├── main.ts              # Vue应用入口
│   ├── App.vue              # 主组件（视图调度）
│   ├── style.css            # 全局样式
│   ├── assets/              # 静态资源
│   ├── components/
│   │   ├── AppSidebar.vue       # 应用侧边栏（导航）
│   │   ├── ReaderContent.vue    # 阅读区组件
│   │   ├── SettingsDrawer.vue   # 设置抽屉组件
│   │   └── DirectoryDrawer.vue  # 目录抽屉组件
│   ├── views/
│   │   ├── LibraryView.vue      # 书架视图（封面墙）
│   │   └── ReaderView.vue       # 阅读视图
│   ├── stores/
│   │   ├── useViewStore.js      # 视图状态管理
│   │   ├── useReaderStore.js    # 阅读器状态管理
│   │   └── useLibraryStore.js   # 书架状态管理
│   └── services/
│       ├── FileService.js   # 文件读取与章节解析（支持TXT/EPUB）
│       └── StoreService.js  # 持久化存储服务
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
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Vue Views                           │   │
│  │  ┌─────────────────┐      ┌─────────────────┐          │   │
│  │  │  LibraryView    │ ←──→ │   ReaderView    │          │   │
│  │  │  (书架封面墙)    │      │  (阅读视图)     │          │   │
│  │  └─────────────────┘      └─────────────────┘          │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ IPC (contextBridge)
┌──────────────────────────────┴──────────────────────────────────┐
│                        主进程 (Electron)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    IPC Handlers                           │   │
│  │  dialog:showOpenDialog | file:* | store:* | library:*    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Services                               │   │
│  │  FileService (TXT/EPUB/封面) | StoreService (JSON持久化) │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 视图切换架构

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

### 4.3 组件拆分

| 组件 | 职责 | 行数 |
|------|------|------|
| `App.vue` | 视图调度、生命周期管理 | ~120行 |
| `AppSidebar.vue` | 应用侧边栏导航 | ~80行 |
| `LibraryView.vue` | 书架视图、封面墙布局 | ~180行 |
| `ReaderView.vue` | 阅读视图、控制栏 | ~200行 |
| `SettingsDrawer.vue` | 设置抽屉 | ~280行 |
| `DirectoryDrawer.vue` | 目录抽屉 | ~120行 |

### 4.4 Pinia 状态管理

#### useViewStore (新增)

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
currentSpeed: 1.0

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
  type: 'txt'          // 'txt' | 'epub'
}
```

---

## 五、核心功能详解

### 5.1 EPUB 封面提取

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

### 5.2 书架封面墙

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

### 5.3 章节解析

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

### 5.4 文本朗读 (TTS)

```javascript
function speakSentence(sentences, index) {
  const utterance = new SpeechSynthesisUtterance(sentences[index])
  utterance.lang = 'zh-CN'
  utterance.rate = readerStore.currentSpeed
  utterance.onend = () => speakSentence(sentences, index + 1)
  window.speechSynthesis.speak(utterance)
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
| `store:getSettings` | 获取设置 |
| `store:saveSettings` | 保存设置 |
| `store:getBooks` | 获取书架列表 |
| `store:addBook` | 添加书籍 |
| `store:deleteBook` | 删除书籍 |
| `store:getReadingProgress` | 获取阅读进度 |
| `store:saveReadingProgress` | 保存阅读进度 |

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
- [epub 库](https://www.npmjs.com/package/epub)
