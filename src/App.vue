<script setup>
import { onMounted, onUnmounted } from 'vue'
import { NConfigProvider } from 'naive-ui'
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

// 使用 stores
const readerStore = useReaderStore()
const libraryStore = useLibraryStore()
const viewStore = useViewStore()

// ==================== 听书控制 ====================
function togglePlay() {
  if (window.speechSynthesis.speaking) {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      readerStore.isPlaying = true
    } else {
      window.speechSynthesis.pause()
      readerStore.isPlaying = false
    }
  } else {
    const chapter = libraryStore.currentChapter
    if (chapter) {
      const sentences = chapter.content.split(/[。！？.!?]/).filter(s => s.trim())
      if (sentences.length > 0) {
        readerStore.currentSentenceIndex = 0
        speakSentence(sentences, 0)
      }
    }
  }
}

function stopPlay() {
  window.speechSynthesis.cancel()
  readerStore.isPlaying = false
  readerStore.currentSentenceIndex = 0
}

function speakSentence(sentences, index) {
  if (index >= sentences.length) {
    libraryStore.changeChapter(1)
    return
  }
  
  const utterance = new SpeechSynthesisUtterance(sentences[index])
  utterance.lang = 'zh-CN'
  utterance.rate = readerStore.currentSpeed
  utterance.onend = () => {
    readerStore.currentSentenceIndex = index + 1
    speakSentence(sentences, readerStore.currentSentenceIndex)
  }
  
  window.speechSynthesis.speak(utterance)
  readerStore.isPlaying = true
}

function changeChapter(direction) {
  libraryStore.changeChapter(direction)
  
  // 如果正在听书，重新开始朗读
  if (readerStore.isPlaying) {
    window.speechSynthesis.cancel()
    const chapter = libraryStore.currentChapter
    if (chapter) {
      const sentences = chapter.content.split(/[。！？.!?]/).filter(s => s.trim())
      if (sentences.length > 0) {
        readerStore.currentSentenceIndex = 0
        speakSentence(sentences, 0)
      }
    }
  }
}

// ==================== 生命周期 ====================
onMounted(async () => {
  if (!window.electron?.store) return
  
  // 加载设置
  await readerStore.loadSettings()
  
  // 初始化书架
  await libraryStore.initialize()
})

onUnmounted(() => {
  window.speechSynthesis.cancel()
})
</script>

<template>
  <NConfigProvider :locale="zhCN">
    <div 
      id="app" 
      :class="{ 
        'dark': readerStore.isDarkMode, 
        'eye-protection': readerStore.isEyeProtectionMode 
      }"
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

/* 深色模式 */
.dark {
  --bg-main: #16171D;
  --bg-paper: #1A1A1A;
  --bg-sidebar: #21222D;
  --bg-card: #1E1F2A;
  --text-main: #A0A0A0;
  --text-h: #FFFFFF;
  --border: rgba(255, 255, 255, 0.1);
}
</style>

<style scoped>
#app {
  font-family: var(--sans);
}
</style>
