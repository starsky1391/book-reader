<script setup>
import { NButton, NIcon, NScrollbar } from 'naive-ui'
import { Book, Settings, ArrowBack, ArrowForward, Play, Pause, Stop, HomeOutline } from '@vicons/ionicons5'
import { useReaderStore } from '../stores/useReaderStore'
import { useLibraryStore } from '../stores/useLibraryStore'
import { useViewStore } from '../stores/useViewStore'
import { computed, ref, watch, nextTick } from 'vue'
import TTSPlayer from '../components/TTSPlayer.vue'

const readerStore = useReaderStore()
const libraryStore = useLibraryStore()
const viewStore = useViewStore()

const emit = defineEmits(['toggle-play', 'stop-play', 'change-chapter'])

const contentRef = ref(null)

const isPrevDisabled = () => {
  return libraryStore.currentBook.chapters &&
    libraryStore.currentBook.currentChapterIndex === 0
}

const isNextDisabled = () => {
  return libraryStore.currentBook.chapters &&
    libraryStore.currentBook.currentChapterIndex === libraryStore.currentBook.chapters.length - 1
}

// 当前章节类型
const chapterType = computed(() => {
  const chapter = libraryStore.currentChapter
  return chapter?.type || libraryStore.currentBook.type || 'txt'
})

// 是否为 HTML 内容
const isHtml = computed(() => chapterType.value === 'html' || chapterType.value === 'epub')

// 返回书架
const handleBackToLibrary = () => {
  emit('stop-play')
  if (libraryStore.currentBook.id) {
    libraryStore.saveReadingProgress(
      libraryStore.currentBook.currentChapterIndex,
      0
    )
  }
  viewStore.showLibrary()
}

// 高亮当前朗读文本
const highlightReadingText = () => {
  const readingText = readerStore.currentReadingText
  if (!contentRef.value) return

  // 移除之前的高亮
  const prevHighlights = contentRef.value.querySelectorAll('.reading-highlight')
  prevHighlights.forEach(el => {
    const parent = el.parentNode
    parent.replaceChild(document.createTextNode(el.textContent), el)
    parent.normalize()
  })

  if (!readingText || !readingText.trim()) return

  const searchText = readingText.trim()

  // 对于 HTML 内容，需要处理所有文本节点
  const walker = document.createTreeWalker(
    contentRef.value,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )

  let node
  let found = false
  while (node = walker.nextNode()) {
    const text = node.textContent
    const index = text.indexOf(searchText)
    if (index !== -1) {
      const before = text.substring(0, index)
      const match = text.substring(index, index + searchText.length)
      const after = text.substring(index + searchText.length)

      const span = document.createElement('span')
      span.className = 'reading-highlight'
      span.textContent = match

      const parent = node.parentNode
      const newNodes = []
      if (before) newNodes.push(document.createTextNode(before))
      newNodes.push(span)
      if (after) newNodes.push(document.createTextNode(after))

      newNodes.forEach(n => parent.insertBefore(n, node))
      parent.removeChild(node)

      // 滚动到高亮位置
      span.scrollIntoView({ behavior: 'smooth', block: 'center' })
      found = true
      break
    }
  }

  // 如果没找到完整匹配，尝试模糊匹配（去除首尾各2个字符）
  if (!found && searchText.length > 4) {
    const fuzzyText = searchText.slice(2, -2)
    walker.currentNode = contentRef.value
    while (node = walker.nextNode()) {
      const text = node.textContent
      const index = text.indexOf(fuzzyText)
      if (index !== -1) {
        const before = text.substring(0, index)
        const match = text.substring(index, index + fuzzyText.length)
        const after = text.substring(index + fuzzyText.length)

        const span = document.createElement('span')
        span.className = 'reading-highlight'
        span.textContent = match

        const parent = node.parentNode
        const newNodes = []
        if (before) newNodes.push(document.createTextNode(before))
        newNodes.push(span)
        if (after) newNodes.push(document.createTextNode(after))

        newNodes.forEach(n => parent.insertBefore(n, node))
        parent.removeChild(node)

        span.scrollIntoView({ behavior: 'smooth', block: 'center' })
        break
      }
    }
  }
}

// 监听朗读文本变化
watch(() => readerStore.currentReadingText, (newText) => {
  if (newText && newText.trim()) {
    nextTick(() => {
      highlightReadingText()
    })
  } else {
    // 清除高亮
    if (contentRef.value) {
      const prevHighlights = contentRef.value.querySelectorAll('.reading-highlight')
      prevHighlights.forEach(el => {
        const parent = el.parentNode
        parent.replaceChild(document.createTextNode(el.textContent), el)
        parent.normalize()
      })
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="reader-view">
    <!-- 顶部控制栏 -->
    <header class="reader-header">
      <div class="header-left">
        <NButton
          @click="handleBackToLibrary"
          size="small"
          quaternary
          class="back-btn"
        >
          <template #icon>
            <NIcon><HomeOutline /></NIcon>
          </template>
          返回书架
        </NButton>
        <h2 class="book-title">{{ libraryStore.currentBook.title }}</h2>
      </div>
      <div class="header-right">
        <NButton
          @click="readerStore.toggleDirectoryDrawer"
          size="small"
          quaternary
        >
          <template #icon>
            <NIcon><Book /></NIcon>
          </template>
          目录
        </NButton>
        <NButton
          @click="readerStore.toggleSettingsDrawer"
          size="small"
          quaternary
        >
          <template #icon>
            <NIcon><Settings /></NIcon>
          </template>
          设置
        </NButton>
      </div>
    </header>

    <!-- 文本显示区 -->
    <div class="reader-content">
      <NScrollbar class="h-full">
        <div class="reader-layout" ref="contentRef">
          <!-- TXT 纯文本渲染 -->
          <pre
            v-if="!isHtml"
            class="whitespace-pre-wrap text-[var(--text)] leading-relaxed"
            style="text-align: justify; text-justify: inter-character;"
          >{{ libraryStore.currentBook.content }}</pre>

          <!-- EPUB HTML 渲染 -->
          <article
            v-else
            class="epub-content text-[var(--text)] leading-relaxed"
            v-html="libraryStore.currentBook.content"
          ></article>
        </div>
      </NScrollbar>
    </div>

    <!-- 底部控制栏 -->
    <footer class="reader-footer">
      <div class="footer-left">
        <NButton
          @click="emit('change-chapter', -1)"
          :disabled="isPrevDisabled()"
          size="small"
          quaternary
        >
          <template #icon>
            <NIcon><ArrowBack /></NIcon>
          </template>
          上一章
        </NButton>
        <span class="chapter-info">
          {{ libraryStore.currentBook.currentChapterIndex + 1 }} / {{ libraryStore.totalChapters }}
        </span>
        <NButton
          @click="emit('change-chapter', 1)"
          :disabled="isNextDisabled()"
          size="small"
          quaternary
        >
          下一章
          <template #icon>
            <NIcon><ArrowForward /></NIcon>
          </template>
        </NButton>
      </div>
    </footer>

    <!-- TTS 播放器组件 -->
    <TTSPlayer
      @toggle-play="emit('toggle-play')"
      @stop-play="emit('stop-play')"
      @change-chapter="emit('change-chapter', $event)"
      @open-directory="readerStore.toggleDirectoryDrawer"
    />
  </div>
</template>

<style scoped>
.reader-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg);
}

.reader-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  background-color: var(--bg-paper);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  color: var(--text-main);
}

.back-btn:hover {
  color: #b88552;
}

.book-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
}

.header-right {
  display: flex;
  gap: 8px;
}

.reader-content {
  flex: 1;
  overflow: hidden;
}

.reader-layout {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 60px !important;
  background-color: var(--bg-paper);
}

.reader-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background-color: var(--bg-paper);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.chapter-info {
  font-size: 14px;
  color: var(--text-main);
  opacity: 0.7;
}
</style>

<style>
/* EPUB HTML 内容样式 */
.epub-content {
  font-family: var(--sans);
  line-height: 1.8;
}

.epub-content h1,
.epub-content h2,
.epub-content h3,
.epub-content h4,
.epub-content h5,
.epub-content h6 {
  color: var(--text-h);
  margin: 1.5em 0 0.8em;
  font-weight: 600;
}

.epub-content h1 { font-size: 1.8em; }
.epub-content h2 { font-size: 1.5em; }
.epub-content h3 { font-size: 1.3em; }

.epub-content p {
  margin: 0.8em 0;
  text-indent: 2em;
  text-align: justify;
}

.epub-content blockquote {
  margin: 1em 2em;
  padding-left: 1em;
  border-left: 3px solid var(--ui-color);
  color: var(--text-main);
  opacity: 0.9;
}

.epub-content img {
  max-width: 100%;
  height: auto;
  margin: 1em auto;
  display: block;
}

.epub-content a {
  color: #b88552;
  text-decoration: none;
}

.epub-content a:hover {
  text-decoration: underline;
}

.epub-content hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2em 0;
}

.epub-content ul,
.epub-content ol {
  margin: 0.8em 0;
  padding-left: 2em;
}

.epub-content li {
  margin: 0.3em 0;
}

.epub-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.epub-content th,
.epub-content td {
  border: 1px solid var(--border);
  padding: 0.5em 1em;
  text-align: left;
}

.epub-content th {
  background-color: var(--bg-card);
  font-weight: 600;
}

/* 深色模式下的链接颜色 */
.dark .epub-content a {
  color: #d4a574;
}
</style>