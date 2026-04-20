# Book Reader v2.0.0 - 项目技术文档

## 一、项目概述

**项目名称**: Book Reader  
**版本**: 2.0.0  
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
│   ├── App.vue              # 主组件（容器调度）
│   ├── style.css            # 全局样式
│   ├── assets/              # 静态资源
│   ├── components/
│   │   ├── LibrarySidebar.vue    # 书架侧边栏组件
│   │   ├── ReaderContent.vue     # 阅读区组件
│   │   ├── SettingsDrawer.vue    # 设置抽屉组件
│   │   └── DirectoryDrawer.vue   # 目录抽屉组件
│   ├── stores/
│   │   ├── useReaderStore.js     # 阅读器状态管理
│   │   └── useLibraryStore.js    # 书架状态管理
│   └── services/
│       ├── FileService.js   # 文件读取与章节解析（支持TXT/EPUB）
│       ├── StoreService.js  # 持久化存储服务
│       └── TTSService.js    # 语音合成服务（未直接使用）
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
│  │  ┌─────────────────┐      ┌─────────────────────────┐  │   │
│  │  │ useReaderStore  │      │    useLibraryStore      │  │   │
│  │  │  - 主题/文字设置  │      │  - 书籍列表/阅读进度     │  │   │
│  │  │  - 听书控制      │      │  - 章节管理             │  │   │
│  │  └────────┬────────┘      └───────────┬─────────────┘  │   │
│  └───────────┼───────────────────────────┼─────────────────┘   │
│              │                           │                      │
│  ┌───────────┴───────────────────────────┴─────────────────┐   │
│  │                      Vue Components                       │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │   │
│  │  │LibrarySidebar│ │ReaderContent│ │SettingsDrawer│       │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘        │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┐
                               │ IPC (contextBridge)
┌──────────────────────────────┴──────────────────────────────────┐
│                        主进程 (Electron)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    IPC Handlers                           │   │
│  │  dialog:showOpenDialog | file:* | store:* | library:*    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Services                               │   │
│  │  FileService (TXT/EPUB) | StoreService (JSON持久化)       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 组件拆分

| 组件 | 职责 | 行数 |
|------|------|------|
| `App.vue` | 容器调度、生命周期管理 | ~200行 |
| `LibrarySidebar.vue` | 书架侧边栏、书籍列表、导入逻辑 | ~150行 |
| `ReaderContent.vue` | 阅读区、控制栏、TXT/HTML渲染 | ~180行 |
| `SettingsDrawer.vue` | 设置抽屉（偏好/文字/背景/其他） | ~280行 |
| `DirectoryDrawer.vue` | 目录抽屉、章节列表 | ~120行 |

### 4.3 Pinia 状态管理

#### useReaderStore

**管理的状态**:
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
currentSentenceIndex: 0
autoContinue: true

// 抽屉状态
directoryDrawerVisible: false
settingsDrawerVisible: false
```

**Actions**:
```javascript
setTheme(theme)        // 切换主题并持久化
saveTextSettings()     // 保存文字设置
setSpeed(speed)        // 设置语速
loadSettings()         // 从后端加载设置
toggleDirectoryDrawer()
toggleSettingsDrawer()
```

#### useLibraryStore

**管理的状态**:
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

**计算属性**:
```javascript
hasBooks           // 是否有书籍
currentChapter     // 当前章节
totalChapters      // 总章节数
isEpub             // 是否为EPUB格式
```

**Actions**:
```javascript
loadBooks()        // 加载书架数据
loadBook(id)       // 加载书籍
importFile()       // 导入文件（TXT/EPUB）
deleteBook(id)     // 删除书籍
changeChapter(dir) // 切换章节
initialize()       // 初始化应用
```

---

## 五、核心功能详解

### 5.1 书架管理

**功能描述**: 管理用户的书籍库，支持添加、删除、自动检测库目录书籍。

**支持格式**: TXT、EPUB

**实现方式**:
- 书籍列表存储在 `StoreService` 中，以 JSON 格式持久化到本地文件
- 每本书包含: `id`, `title`, `author`, `localPath`, `type`, `readingProgress`
- 导入书籍时自动复制到用户数据目录的 `library` 文件夹

**导入流程**:
```
用户点击导入按钮
    ↓
useLibraryStore.importFile()
    ↓
electron.dialog.showOpenDialog() → 选择文件
    ↓
FileService.readFile() → 读取内容
    ↓
FileService.parseChapters() → 解析章节
    ↓
FileService.copyFileToLibrary() → 复制到库目录
    ↓
StoreService.addBook() → 保存到书架
    ↓
更新 Pinia Store → UI 自动刷新
```

---

### 5.2 章节解析

#### TXT 解析

**功能描述**: 智能解析 TXT 文件中的章节结构。

**核心正则**:
```javascript
const chapterRegex = /^\s*(第[一二三四五六七八九十百千万0-9]+[章节回部卷]).*/
```

**支持格式**: `第1章`, `第一章`, `第十二章`, `第1节`, `第1回` 等

#### EPUB 解析

**功能描述**: 解析 EPUB 电子书，提取目录和章节内容。

**实现方式** (`FileService.js`):
```javascript
static async parseEpubChapters(epubPath) {
  const epub = new EPub(epubPath)
  
  epub.on('end', async () => {
    // 获取目录
    const tocMap = this.buildTocMap(epub.toc)
    
    // 遍历章节
    for (const chapter of epub.flow) {
      const content = await this.getEpubChapterContent(epub, chapter.id)
      const title = tocMap.get(chapter.id) || chapter.title
      
      chapters.push({
        title,
        content,      // HTML 内容
        type: 'html',
        id: chapter.id,
        href: chapter.href
      })
    }
  })
  
  epub.parse()
}
```

**HTML 安全处理**:
```javascript
static sanitizeHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s*on\w+="[^"]*"/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
}
```

**统一数据结构**:
```javascript
// TXT 章节
{ title: '第一章', content: '纯文本...', type: 'txt' }

// EPUB 章节
{ title: 'Chapter 1', content: '<p>HTML...</p>', type: 'html' }
```

---

### 5.3 阅读器渲染引擎

**功能描述**: 支持 TXT 纯文本和 EPUB HTML 内容的安全渲染。

**实现方式** (`ReaderContent.vue`):
```vue
<template>
  <!-- TXT 纯文本渲染 -->
  <pre 
    v-if="!isHtml"
    class="whitespace-pre-wrap text-[var(--text)]"
  >{{ currentBook.content }}</pre>
  
  <!-- EPUB HTML 渲染 -->
  <article 
    v-else
    class="epub-content"
    v-html="sanitizedContent"
  ></article>
</template>
```

**HTML 内容样式**:
```css
.epub-content h1, .epub-content h2 { /* 标题样式 */ }
.epub-content p { text-indent: 2em; }
.epub-content blockquote { /* 引用块样式 */ }
.epub-content img { max-width: 100%; }
```

---

### 5.4 文本朗读 (TTS)

**功能描述**: 使用 Web Speech API 实现文本转语音朗读。

**实现方式**:
- 使用浏览器原生 `window.speechSynthesis` API
- 支持播放/暂停/停止/语速调节 (0.5x - 2.0x)
- 按句子分割章节内容，逐句朗读

**核心代码**:
```javascript
function speakSentence(sentences, index) {
  const utterance = new SpeechSynthesisUtterance(sentences[index])
  utterance.lang = 'zh-CN'
  utterance.rate = readerStore.currentSpeed
  
  utterance.onend = () => {
    speakSentence(sentences, index + 1)
  }
  
  window.speechSynthesis.speak(utterance)
}
```

---

### 5.5 阅读进度保存

**功能描述**: 自动保存每本书的阅读进度，下次打开时自动恢复。

**存储结构**:
```json
{
  "settings": {
    "darkMode": false,
    "selectedTheme": "white",
    "lastReadBookId": 1713123456789
  },
  "books": [
    {
      "id": 1713123456789,
      "title": "小说名",
      "type": "txt",
      "readingProgress": { "chapterIndex": 5, "lineIndex": 0 }
    }
  ]
}
```

---

### 5.6 主题切换

**功能描述**: 支持多种阅读主题。

| 主题 | 背景色 | 文字色 |
|------|--------|--------|
| 白色 | #FBFBFB | #2D3436 |
| 羊皮纸 | #F4F1E6 | #5D4037 |
| 护眼绿 | #F0F9E8 | #2D4F1E |
| 深色 | #16171D | #A0A0A0 |

**实现方式**:
```javascript
// useReaderStore.js
async function setTheme(theme) {
  selectedTheme.value = theme
  applyThemeVars()  // 应用 CSS 变量
  await saveThemeSettings()  // 持久化
}
```

---

## 六、Electron 架构

### 6.1 主进程 (main.js)

**窗口配置**:
```javascript
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
    webSecurity: true
  }
})
```

**加载逻辑**:
```javascript
// 检查 dist 目录是否存在
const distPath = path.join(__dirname, '../dist/index.html')
const hasDist = fs.existsSync(distPath)

if (hasDist) {
  mainWindow.loadFile(distPath)  // 加载构建文件
} else {
  mainWindow.loadURL('http://localhost:5173/')  // 开发服务器
}
```

### 6.2 IPC 通信接口

| 通道 | 功能 | 参数 |
|------|------|------|
| `dialog:showOpenDialog` | 打开文件选择对话框 | options |
| `file:readFile` | 读取文件内容 | filePath |
| `file:getFileInfo` | 获取文件信息 | filePath |
| `file:parseChapters` | 解析章节 | content, type, filePath |
| `file:copyFileToLibrary` | 复制文件到库目录 | sourcePath |
| `store:getSettings` | 获取设置 | - |
| `store:saveSettings` | 保存设置 | settings |
| `store:getBooks` | 获取书架列表 | - |
| `store:addBook` | 添加书籍 | book |
| `store:deleteBook` | 删除书籍 | bookId |
| `store:getReadingProgress` | 获取阅读进度 | bookId |
| `store:saveReadingProgress` | 保存阅读进度 | bookId, chapterIndex, lineIndex |
| `store:getLastReadBookId` | 获取最后阅读的书籍ID | - |
| `store:clearAll` | 清空所有数据 | - |
| `get-library-books` | 获取库目录书籍 | - |

### 6.3 预加载脚本 (preload.js)

```javascript
contextBridge.exposeInMainWorld('electron', {
  dialog: { showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options) },
  file: {
    readFile: (filePath) => ipcRenderer.invoke('file:readFile', filePath),
    parseChapters: (content, type, filePath) => 
      ipcRenderer.invoke('file:parseChapters', content, type, filePath),
    // ...
  },
  store: { /* ... */ },
  library: { getBooks: () => ipcRenderer.invoke('get-library-books') }
})
```

---

## 七、服务层详解

### 7.1 FileService.js

**职责**: 文件读取、章节解析（TXT/EPUB）、文件信息获取

| 方法 | 参数 | 返回值 | 功能 |
|------|------|--------|------|
| `readFile(filePath)` | 文件路径 | `{ content, type, metadata }` | 读取文件 |
| `parseChapters(content, type, path)` | 内容/类型/路径 | `[{ title, content, type }]` | 解析章节 |
| `parseTxtChapters(content)` | TXT内容 | 章节数组 | TXT解析 |
| `parseEpubChapters(path)` | EPUB路径 | 章节数组 | EPUB解析 |
| `sanitizeHtml(html)` | HTML内容 | 安全HTML | 清理脚本 |
| `getFileInfo(filePath)` | 文件路径 | `{ name, ext, size, type }` | 文件信息 |

### 7.2 StoreService.js

**职责**: 本地数据持久化存储

**存储位置**: 
- Windows: `%APPDATA%/book/config.json`

| 方法 | 功能 |
|------|------|
| `getSettings()` | 获取用户设置 |
| `saveSettings(settings)` | 保存用户设置 |
| `getBooks()` | 获取书架列表 |
| `addBook(book)` | 添加书籍 |
| `deleteBook(bookId)` | 删除书籍 |
| `getReadingProgress(bookId)` | 获取阅读进度 |
| `saveReadingProgress(...)` | 保存阅读进度 |
| `getLastReadBookId()` | 获取最后阅读的书籍ID |
| `clearAll()` | 清空所有数据 |

---

## 八、样式系统

### 8.1 CSS变量

```css
:root {
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

### 8.2 EPUB HTML 样式

```css
.epub-content h1 { font-size: 1.8em; }
.epub-content p { text-indent: 2em; text-align: justify; }
.epub-content blockquote { border-left: 3px solid var(--ui-color); }
.epub-content img { max-width: 100%; }
```

---

## 九、构建与打包

### 9.1 开发命令

```bash
npm run dev           # 启动Vite开发服务器
npm run build         # 构建前端资源
npm run electron:start # 启动Electron应用
npm run electron:build # 构建并打包
```

### 9.2 Vite 配置

```javascript
module.exports = defineConfig({
  base: './',  // 相对路径，解决打包后资源加载
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
```

### 9.3 安全配置

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: blob:;">
```

---

## 十、安全考虑

1. **上下文隔离**: `contextIsolation: true`
2. **禁用Node集成**: `nodeIntegration: false`
3. **预加载脚本**: 通过 `contextBridge` 安全暴露API
4. **IPC通信**: 所有文件操作通过主进程处理
5. **HTML清理**: EPUB 内容经过 `sanitizeHtml()` 处理
6. **CSP策略**: 设置 Content-Security-Policy

---

## 十一、性能优化

1. **组件拆分**: App.vue 从 1481 行精简到 ~200 行
2. **Pinia 状态管理**: 避免跨组件 props 传递
3. **虚拟滚动**: 使用 `NScrollbar` 处理长列表
4. **懒加载**: 章节内容按需加载
5. **CSS变量**: 主题切换使用CSS变量，避免重新渲染
6. **Web Speech API**: 使用浏览器原生API

---

## 十二、开发路线图

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

### 待开发 🚧
- [ ] 集成本地VITS语音合成
- [ ] PDF 格式支持
- [ ] 阅读笔记功能
- [ ] 云同步功能

---

## 十三、参考资料

- [Electron 文档](https://www.electronjs.org/docs)
- [Vue 3 文档](https://vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Naive UI 文档](https://www.naiveui.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [epub 库](https://www.npmjs.com/package/epub)
