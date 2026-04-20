# Book Reader

一个轻量级的桌面小说阅读器，基于 Electron + Vue3 + Vite + Tailwind CSS + Pinia 开发。

## 版本号

2.1.0

## 展示图

![Book Reader](DisplayImage.png)

## 功能特点

- **多格式支持**：支持 TXT 和 EPUB 格式
- **EPUB 封面提取**：自动提取 EPUB 书籍封面显示在书架
- **智能章节解析**：自动解析 TXT 文件中的章节结构
- **视图分离**：书架视图与阅读视图完全分离，独立全屏展示
- **封面墙布局**：书架采用网格布局展示书籍封面
- **文本朗读**：基于 Web Speech API 实现文本到语音的功能
- **主题切换**：支持多种主题模式，包括白色、羊皮纸、绿色和深色
- **阅读进度保存**：自动保存阅读进度，下次打开时从上次阅读的位置继续
- **书架管理**：支持添加、删除书籍

## 技术栈

| 层面 | 技术 | 用途 |
|------|------|------|
| 桌面壳 | Electron | 提供桌面应用能力 |
| 前端框架 | Vue 3 | 响应式UI框架 |
| 状态管理 | Pinia | 全局状态管理 |
| 构建工具 | Vite | 快速开发与构建 |
| UI库 | Naive UI | 组件库 |
| CSS框架 | Tailwind CSS v4 | 原子化CSS |
| EPUB解析 | epub | EPUB电子书解析 |

## 安装说明

### 环境要求

- Node.js 14.0 或更高版本
- npm 6.0 或更高版本

### 安装步骤

1. 克隆仓库

```bash
git clone https://github.com/starsky1391/book-reader.git
cd book-reader
```

2. 安装依赖

```bash
npm install
```

3. 启动开发服务器

```bash
npm run dev
```

4. 启动 Electron 应用

```bash
npm run electron:start
```

## 使用方法

### 导入书籍

1. 点击左侧侧边栏的「导入书籍」按钮
2. 选择本地的 TXT 或 EPUB 文件
3. 等待文件导入完成，书籍会自动添加到书架并显示封面

### 阅读书籍

1. 在书架封面墙中点击书籍
2. 进入阅读视图显示书籍内容
3. 点击左上角「返回书架」按钮可返回书架
4. 使用目录面板可以快速跳转到不同章节
5. 点击「听书」按钮可以开始朗读当前章节

### 调整设置

1. 点击左侧侧边栏的「设置」按钮
2. 可以调整主题、字体大小、语速等设置
3. 设置会自动保存

## 项目结构

```
book-reader/
├── electron/               # Electron 主进程代码
│   ├── main.js             # 主进程入口文件
│   └── preload.js          # 预加载脚本
├── src/                    # Vue 前端代码
│   ├── assets/             # 静态资源
│   ├── components/         # 组件
│   │   ├── AppSidebar.vue      # 应用侧边栏
│   │   ├── ReaderContent.vue   # 阅读区组件
│   │   ├── SettingsDrawer.vue  # 设置抽屉
│   │   └── DirectoryDrawer.vue # 目录抽屉
│   ├── views/              # 视图页面
│   │   ├── LibraryView.vue     # 书架视图
│   │   └── ReaderView.vue      # 阅读视图
│   ├── stores/             # Pinia 状态管理
│   │   ├── useViewStore.js     # 视图状态
│   │   ├── useReaderStore.js   # 阅读器状态
│   │   └── useLibraryStore.js  # 书架状态
│   ├── services/           # 服务层
│   │   ├── FileService.js      # 文件服务
│   │   └── StoreService.js     # 存储服务
│   ├── App.vue             # 主应用组件
│   └── main.ts             # 前端入口文件
├── public/                 # 公共资源
├── package.json            # 项目配置文件
├── README.md               # 项目说明文件
├── PROJECT_DOC.md          # 项目技术文档
└── vite.config.js          # Vite 配置文件
```

## TODO

- **听书**：集成本地VITS语音合成
- **格式支持**：扩展多种格式（如PDF等）
- **UI优化**：进一步提升用户界面美观度和交互体验
- **阅读页**：标题所对应区域大字形成区别

## 许可证

MIT
