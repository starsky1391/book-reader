<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { zhCN } from 'naive-ui'

// Stores
import { useReaderStore } from './stores/useReaderStore'
import { useLibraryStore } from './stores/useLibraryStore'
import { useViewStore } from './stores/useViewStore'

// Views
import LibraryView from './views/LibraryView.vue'
import ReaderView from './views/ReaderView.vue'

// Components
import DirectoryDrawer from './components/DirectoryDrawer.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'

// TTS Service
import TTSServicePro from './services/TTSServicePro.js'

const readerStore = useReaderStore()
const libraryStore = useLibraryStore()
const viewStore = useViewStore()

// TTS 状态
const ttsInitialized = ref(false)
const edgeTTSAvailable = ref(false)
const availableVoices = ref([])

// ==================== TTS 初始化 ====================
async function initTTS() {
  try {
    const result = await TTSServicePro.init()
    ttsInitialized.value = true
    edgeTTSAvailable.value = result.edgeTTSAvailable
    availableVoices.value = result.voices

    // 设置事件回调
    TTSServicePro.on('onStart', () => {
      readerStore.isPlaying = true
    })

    TTSServicePro.on('onEnd', () => {
      readerStore.isPlaying = false
      readerStore.currentReadingText = ''
      // 自动播放下一章
      if (readerStore.autoContinue) {
        const currentIndex = libraryStore.currentBook.currentChapterIndex
        if (currentIndex < libraryStore.totalChapters - 1) {
          setTimeout(() => {
            libraryStore.changeChapter(1)
            startTTS()
          }, 1000)
        }
      }
    })

    TTSServicePro.on('onError', (error) => {
      console.error('TTS Error:', error)
      readerStore.isPlaying = false
      readerStore.currentReadingText = ''
    })

    TTSServicePro.on('onProgress', (progress) => {
      readerStore.ttsProgress = progress.progress
      // 保存 TTS 进度
      saveTTSProgress(progress.index)
    })

    // 片段切换回调 - 用于高亮显示
    TTSServicePro.on('onSegmentChange', (data) => {
      readerStore.currentReadingText = data.text || ''
      // 保存 TTS 进度
      saveTTSProgress(data.index)
    })

  } catch (error) {
    console.error('TTS 初始化失败:', error)
  }
}

// ==================== 听书控制 ====================
function togglePlay() {
  if (TTSServicePro.isSpeaking()) {
    if (TTSServicePro.isPaused) {
      TTSServicePro.resume()
      readerStore.isPlaying = true
      readerStore.isPaused = false
    } else {
      TTSServicePro.pause()
      readerStore.isPlaying = false
      readerStore.isPaused = true
    }
  } else {
    startTTS()
  }
}

function stopPlay() {
  TTSServicePro.stop()
  readerStore.isPlaying = false
  readerStore.isPaused = false
  readerStore.currentReadingText = ''
}

function startTTS() {
  const chapter = libraryStore.currentChapter
  if (chapter && chapter.content) {
    readerStore.isPaused = false
    // 获取保存的 TTS 进度
    const savedProgress = libraryStore.currentBook.ttsProgress || 0
    if (savedProgress > 0) {
      TTSServicePro.speakChapterFromSegment(chapter, savedProgress)
    } else {
      TTSServicePro.speakChapter(chapter)
    }
  }
}

// 保存 TTS 进度（防抖）
let ttsProgressTimer = null
function saveTTSProgress(segmentIndex) {
  if (ttsProgressTimer) clearTimeout(ttsProgressTimer)
  ttsProgressTimer = setTimeout(() => {
    const bookId = libraryStore.currentBook.id
    const chapterIndex = libraryStore.currentBook.currentChapterIndex
    if (bookId) {
      window.electron.store.saveSettings({
        ttsProgress: {
          bookId,
          chapterIndex,
          segmentIndex
        }
      })
    }
  }, 1000)
}

function changeChapter(direction) {
  libraryStore.changeChapter(direction)

  // 如果正在听书，重新开始朗读
  if (readerStore.isPlaying) {
    TTSServicePro.stop()
    readerStore.currentReadingText = ''
    setTimeout(() => {
      startTTS()
    }, 300)
  }
}

// ==================== 生命周期 ====================
onMounted(async () => {
  if (!window.electron?.store) return

  await readerStore.loadSettings()
  await libraryStore.initialize()
  await initTTS()
})

onUnmounted(() => {
  TTSServicePro.stop()
})
</script>

<template>
  <NConfigProvider :locale="zhCN">
    <NMessageProvider>
      <NDialogProvider>
        <div
          id="app"
          :class="[
            readerStore.isDarkMode ? 'dark' : '',
            readerStore.isEyeProtectionMode ? 'eye-protection' : '',
            'theme-' + readerStore.selectedTheme
          ]"
          class="h-screen w-full overflow-hidden"
        >
          <!-- 书架视图 -->
          <LibraryView v-if="viewStore.currentView === 'library'" />

          <!-- 阅读视图 -->
          <ReaderView
            v-else-if="viewStore.currentView === 'reader'"
            @toggle-play="togglePlay"
            @stop-play="stopPlay"
            @change-chapter="changeChapter"
          />

          <!-- 目录抽屉 -->
          <DirectoryDrawer
            v-model:visible="readerStore.directoryDrawerVisible"
            :chapters="libraryStore.currentBook.chapters"
            :current-chapter-index="libraryStore.currentBook.currentChapterIndex"
            @select-chapter="libraryStore.selectChapter"
          />

          <!-- 设置抽屉 -->
          <SettingsDrawer
            v-model:visible="readerStore.settingsDrawerVisible"
            :current-speed="readerStore.currentSpeed"
            :auto-continue="readerStore.autoContinue"
            :font-family="readerStore.fontFamily"
            :font-size="readerStore.fontSize"
            :line-height="readerStore.lineHeight"
            :letter-spacing="readerStore.letterSpacing"
            :text-align="readerStore.textAlign"
            :selected-theme="readerStore.selectedTheme"
            @update:current-speed="readerStore.setSpeed"
            @update:auto-continue="readerStore.autoContinue = $event"
            @update:font-family="readerStore.fontFamily = $event"
            @update:font-size="readerStore.fontSize = $event"
            @update:line-height="readerStore.lineHeight = $event"
            @update:letter-spacing="readerStore.letterSpacing = $event"
            @update:text-align="readerStore.textAlign = $event"
            @update:selected-theme="readerStore.selectedTheme = $event"
            @save-text-settings="readerStore.saveTextSettings"
            @set-theme="readerStore.setTheme"
            @clear-all="libraryStore.clearAll"
          />
        </div>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
/* 全局 CSS 变量 */
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

/* 白色主题高亮 */
.theme-white {
  --highlight-bg: rgba(255, 200, 50, 0.5);
  --highlight-text: #8B4513;
  --highlight-border: rgba(184, 133, 82, 0.6);
}

/* 羊皮纸主题 */
.theme-parchment {
  --highlight-bg: rgba(139, 90, 43, 0.4);
  --highlight-text: #3E2723;
  --highlight-border: rgba(93, 64, 55, 0.6);
}

/* 护眼绿主题 */
.theme-green {
  --highlight-bg: rgba(45, 100, 30, 0.35);
  --highlight-text: #1B3311;
  --highlight-border: rgba(45, 79, 30, 0.5);
}

/* 深色模式 */
.dark {
  --bg-main: #16171D;
  --bg-paper: #1A1A1A;
  --bg-sidebar: #21222D;
  --bg-card: #1E1F2A;
  --text-main: #A0A0A0;
  --text-h: #FFFFFF;
  --border: rgba(255, 255, 255, 0.1);
  /* 深色主题高亮 */
  --highlight-bg: rgba(255, 180, 50, 0.45);
  --highlight-text: #FFD700;
  --highlight-border: rgba(255, 200, 100, 0.5);
}

/* 全局高亮样式 - 更加醒目 */
.reading-highlight {
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
  border-radius: 4px;
  padding: 2px 6px;
  margin: 0 -4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 2px var(--highlight-border);
  font-weight: 600;
  position: relative;
  display: inline;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}
</style>

<style scoped>
#app {
  font-family: var(--sans);
}
</style>