<script setup>
/**
 * TTSPlayer - 听书播放器组件
 * 现代化 UI 设计，毛玻璃效果，音乐播放器风格
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { NIcon, NButton, NSlider, NSelect } from 'naive-ui'
import {
  Play, Pause, Stop, PlaySkipBack, PlaySkipForward,
  BookOutline, TimerOutline, SettingsOutline, CloseOutline,
  VolumeHighOutline
} from '@vicons/ionicons5'
import { useReaderStore } from '../stores/useReaderStore'
import { useLibraryStore } from '../stores/useLibraryStore'
import TTSServicePro from '../services/TTSServicePro.js'

const readerStore = useReaderStore()
const libraryStore = useLibraryStore()

const emit = defineEmits(['toggle-play', 'stop-play', 'change-chapter', 'open-directory'])

// ==================== 状态管理 ====================
const showDetailPage = ref(false)
const showSettingsPopup = ref(false)
const showTimerPopup = ref(false)
const showSpeedPopup = ref(false)

// 定时相关
const selectedTimerMinutes = ref(0)
const timerRemaining = ref(0)
const timerInterval = ref(null)

// TTS 配置
const edgeTTSAvailable = ref(false)
const availableVoices = ref([])
const ttsConfig = ref({
  engine: 'web',
  voice: 'xiaoxiao',
  enablePause: true,
  enableDialogue: true,
  enableEmotion: true
})

// ==================== 初始化 ====================
onMounted(async () => {
  const status = await TTSServicePro.init()
  edgeTTSAvailable.value = status.edgeTTSAvailable
  availableVoices.value = status.voices || []

  const config = TTSServicePro.getConfig()
  ttsConfig.value = { ...ttsConfig.value, ...config }

  if (!edgeTTSAvailable.value && ttsConfig.value.engine === 'edge') {
    ttsConfig.value.engine = 'web'
  }
})

// ==================== 计算属性 ====================
const isPlaying = computed(() => readerStore.isPlaying)
const isPaused = computed(() => readerStore.isPaused)
// 胶囊显示条件：正在播放或已暂停（只有完全停止才隐藏）
const showPlayerCapsule = computed(() => isPlaying.value || isPaused.value)
const currentChapterIndex = computed(() => libraryStore.currentBook.currentChapterIndex)
const totalChapters = computed(() => libraryStore.totalChapters)
const currentChapterTitle = computed(() => {
  const chapter = libraryStore.currentChapter
  return chapter?.title || `第 ${currentChapterIndex.value + 1} 章`
})

const coverImage = computed(() => libraryStore.currentBook?.cover || null)
const titleFirstChar = computed(() => libraryStore.currentBook.title?.charAt(0) || '书')

// 引擎选项
const engineOptions = computed(() => {
  const options = [{ label: '浏览器语音', value: 'web' }]
  if (edgeTTSAvailable.value) {
    options.unshift({ label: 'Edge TTS（推荐）', value: 'edge' })
  }
  return options
})

// 声音选项
const voiceOptions = computed(() => {
  return availableVoices.value.map(v => ({
    label: v.displayName,
    value: v.key
  }))
})

// 定时显示文本（按钮上显示）
const timerDisplayText = computed(() => {
  if (timerRemaining.value <= 0) return '定时'
  const minutes = Math.floor(timerRemaining.value / 60)
  return `${minutes}分`
})

// 弹窗内倒计时显示（分:秒格式）
const timerCountdownText = computed(() => {
  if (timerRemaining.value <= 0) return '0:00'
  const minutes = Math.floor(timerRemaining.value / 60)
  const seconds = timerRemaining.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// ==================== 控制方法 ====================
const handleTogglePlay = () => emit('toggle-play')
const handleStop = () => {
  emit('stop-play')
  stopTimer()
}
const handlePrevChapter = () => emit('change-chapter', -1)
const handleNextChapter = () => emit('change-chapter', 1)
const handleOpenDirectory = () => {
  emit('open-directory')
  showDetailPage.value = false
}

// ==================== 语速控制 ====================
const handleSpeedChange = (value) => {
  readerStore.setSpeed(value)
  TTSServicePro.updateConfig({ rate: value })
}

// ==================== TTS 配置更新 ====================
const handleEngineChange = (value) => {
  ttsConfig.value.engine = value
  TTSServicePro.updateConfig({ engine: value })
}

const handleVoiceChange = (value) => {
  ttsConfig.value.voice = value
  TTSServicePro.updateConfig({ voice: value })
}

const handlePauseToggle = (value) => {
  ttsConfig.value.enablePause = value
  TTSServicePro.updateConfig({ enablePause: value })
}

const handleDialogueToggle = (value) => {
  ttsConfig.value.enableDialogue = value
  TTSServicePro.updateConfig({ enableDialogue: value })
}

const handleEmotionToggle = (value) => {
  ttsConfig.value.enableEmotion = value
  TTSServicePro.updateConfig({ enableEmotion: value })
}

// ==================== 定时功能 ====================
const timerOptions = [
  { label: '关闭', value: 0 },
  { label: '15 分钟', value: 15 },
  { label: '30 分钟', value: 30 },
  { label: '45 分钟', value: 45 },
  { label: '60 分钟', value: 60 },
  { label: '90 分钟', value: 90 }
]

const handleTimerSelect = (minutes) => {
  selectedTimerMinutes.value = minutes
  if (minutes > 0) {
    timerRemaining.value = minutes * 60
    startTimer()
  } else {
    stopTimer()
  }
  showTimerPopup.value = false
}

const startTimer = () => {
  // 清除旧的定时器，但不清除剩余时间
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  timerInterval.value = setInterval(() => {
    if (timerRemaining.value > 0) {
      timerRemaining.value--
      if (timerRemaining.value <= 0) {
        handleStop()
        selectedTimerMinutes.value = 0
        showTimerPopup.value = false
      }
    }
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  timerRemaining.value = 0
  selectedTimerMinutes.value = 0
}

// ==================== 弹窗控制 ====================
const openDetailPage = () => { showDetailPage.value = true }
const closeDetailPage = () => {
  showDetailPage.value = false
  showSettingsPopup.value = false
  showTimerPopup.value = false
}

onUnmounted(() => stopTimer())
</script>

<template>
  <!-- 右下角"听"按钮 - 未播放且未暂停时显示 -->
  <Transition name="btn-fade">
    <div v-if="!showPlayerCapsule" class="tts-trigger-btn" @click="handleTogglePlay">
      <span class="listen-text">听</span>
    </div>
  </Transition>

  <!-- 播放胶囊 - 播放或暂停时显示 -->
  <Transition name="player-fade">
    <div v-if="showPlayerCapsule" class="tts-player-capsule">
      <div class="cover-circle" @click="openDetailPage">
        <img v-if="coverImage" :src="coverImage" class="cover-img" :class="{ 'is-playing': isPlaying }" />
        <div v-else class="cover-placeholder" :class="{ 'is-playing': isPlaying }">
          <span>{{ titleFirstChar }}</span>
        </div>
        <div class="cover-glow"></div>
      </div>
      <button class="control-btn play-btn" @click="handleTogglePlay">
        <NIcon size="20"><Pause v-if="isPlaying" /><Play v-else /></NIcon>
      </button>
      <button class="control-btn stop-btn" @click="handleStop">
        <NIcon size="18"><Stop /></NIcon>
      </button>
    </div>
  </Transition>

  <!-- 详细播放页 -->
  <Transition name="detail-slide">
    <div v-if="showDetailPage" class="tts-detail-page">
      <div class="tts-detail-page-inner">
        <button class="close-btn" @click="closeDetailPage">
          <NIcon size="24"><CloseOutline /></NIcon>
        </button>

        <!-- 封面区域 -->
        <div class="detail-cover-section">
          <div class="detail-cover">
            <img v-if="coverImage" :src="coverImage" class="detail-cover-img" :class="{ 'is-playing': isPlaying }" />
            <div v-else class="detail-cover-placeholder" :class="{ 'is-playing': isPlaying }">
              <span>{{ titleFirstChar }}</span>
            </div>
          </div>
          <h2 class="book-title">{{ libraryStore.currentBook.title }}</h2>
          <p class="chapter-title">{{ currentChapterTitle }}</p>
        </div>

        <!-- 进度条 -->
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${readerStore.ttsProgress * 100}%` }"></div>
          </div>
        </div>

        <!-- 主控制按钮 -->
        <div class="main-controls">
        <button class="chapter-btn" @click="handlePrevChapter" :disabled="currentChapterIndex === 0">
          <NIcon size="24"><PlaySkipBack /></NIcon>
        </button>
        <button class="main-play-btn" @click="handleTogglePlay">
          <NIcon size="32"><Pause v-if="isPlaying" /><Play v-else /></NIcon>
        </button>
        <button class="chapter-btn" @click="handleNextChapter" :disabled="currentChapterIndex >= totalChapters - 1">
          <NIcon size="24"><PlaySkipForward /></NIcon>
        </button>
      </div>

      <!-- 功能按钮行 -->
      <div class="function-buttons">
        <button class="func-btn" @click="handleOpenDirectory">
          <NIcon size="20"><BookOutline /></NIcon>
          <span>目录</span>
        </button>
        <button class="func-btn" @click="showSpeedPopup = true">
          <NIcon size="20"><VolumeHighOutline /></NIcon>
          <span>{{ readerStore.currentSpeed.toFixed(1) }}x</span>
        </button>
        <button class="func-btn" :class="{ 'has-timer': timerRemaining > 0 }" @click="showTimerPopup = true">
          <NIcon size="20"><TimerOutline /></NIcon>
          <span>{{ timerDisplayText }}</span>
        </button>
        <button class="func-btn" @click="showSettingsPopup = true">
          <NIcon size="20"><SettingsOutline /></NIcon>
          <span>设置</span>
        </button>
      </div>

      <div class="chapter-info">{{ currentChapterIndex + 1 }} / {{ totalChapters }}</div>
      </div>

      <!-- 语速弹窗（在详细页内部） -->
      <Transition name="popup-slide-up">
        <div v-if="showSpeedPopup" class="inner-popup-overlay" @click.self="showSpeedPopup = false">
          <div class="inner-popup">
            <div class="popup-header">
              <span class="popup-title">语速调节</span>
              <button class="popup-close" @click="showSpeedPopup = false">
                <NIcon size="20"><CloseOutline /></NIcon>
              </button>
            </div>
            <div class="popup-content">
              <div class="speed-display">{{ readerStore.currentSpeed.toFixed(1) }}x</div>
              <NSlider
                :value="readerStore.currentSpeed"
                :min="0.5"
                :max="2.0"
                :step="0.1"
                @update:value="handleSpeedChange"
              />
              <div class="slider-labels"><span>0.5x</span><span>1.0x</span><span>2.0x</span></div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 设置弹窗（在详细页内部） -->
      <Transition name="popup-slide-up">
        <div v-if="showSettingsPopup" class="inner-popup-overlay" @click.self="showSettingsPopup = false">
          <div class="inner-popup">
            <div class="popup-header">
              <span class="popup-title">听书设置</span>
              <button class="popup-close" @click="showSettingsPopup = false">
                <NIcon size="20"><CloseOutline /></NIcon>
              </button>
            </div>

            <div class="popup-content">
              <!-- 语音引擎 -->
              <div class="setting-item">
                <div class="setting-label"><span>语音引擎</span></div>
                <NSelect
                  :value="ttsConfig.engine"
                  :options="engineOptions"
                  @update:value="handleEngineChange"
                  size="small"
                />
              </div>

              <!-- 声音选择 -->
              <div v-if="ttsConfig.engine === 'edge' && voiceOptions.length > 0" class="setting-item">
                <div class="setting-label"><span>声音选择</span></div>
                <NSelect
                  :value="ttsConfig.voice"
                  :options="voiceOptions"
                  @update:value="handleVoiceChange"
                  size="small"
                />
              </div>

              <!-- 高级设置 -->
              <div class="setting-item">
                <div class="setting-label"><span>高级设置</span></div>
                <div class="toggle-list">
                  <div class="toggle-row">
                    <span>标点停顿</span>
                    <label class="toggle-switch">
                      <input type="checkbox" :checked="ttsConfig.enablePause" @change="handlePauseToggle($event.target.checked)" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  <div class="toggle-row">
                    <span>对话识别</span>
                    <label class="toggle-switch">
                      <input type="checkbox" :checked="ttsConfig.enableDialogue" @change="handleDialogueToggle($event.target.checked)" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  <div class="toggle-row">
                    <span>情感分析</span>
                    <label class="toggle-switch">
                      <input type="checkbox" :checked="ttsConfig.enableEmotion" @change="handleEmotionToggle($event.target.checked)" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  <div class="toggle-row">
                    <span>自动连读下一章</span>
                    <label class="toggle-switch">
                      <input type="checkbox" v-model="readerStore.autoContinue" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 定时弹窗（在详细页内部） -->
      <Transition name="popup-slide-up">
        <div v-if="showTimerPopup" class="inner-popup-overlay" @click.self="showTimerPopup = false">
          <div class="inner-popup">
            <div class="popup-header">
              <span class="popup-title">定时关闭</span>
              <button class="popup-close" @click="showTimerPopup = false">
                <NIcon size="20"><CloseOutline /></NIcon>
              </button>
            </div>
            <div class="popup-content">
              <div v-if="timerRemaining > 0" class="timer-countdown">
                <span class="countdown-label">剩余时间</span>
                <span class="countdown-value">{{ timerCountdownText }}</span>
              </div>
              <div class="timer-options">
                <button
                  v-for="opt in timerOptions"
                  :key="opt.value"
                  class="timer-opt-btn"
                  :class="{ 'is-active': selectedTimerMinutes === opt.value }"
                  @click="handleTimerSelect(opt.value)"
                >
                  <span class="timer-opt-label">{{ opt.label }}</span>
                  <span v-if="opt.value > 0 && opt.value === selectedTimerMinutes" class="timer-opt-remaining">{{ timerCountdownText }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
/* ==================== 听按钮 ==================== */
.tts-trigger-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(184, 133, 82, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(184, 133, 82, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tts-trigger-btn:hover { transform: scale(1.08); }
.tts-trigger-btn:active { transform: scale(0.95); }
.listen-text { color: white; font-size: 20px; font-weight: 600; letter-spacing: 2px; }

/* ==================== 播放胶囊 ==================== */
.tts-player-capsule {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1001;
}
.dark .tts-player-capsule { background: rgba(40, 40, 40, 0.9); }

.cover-circle {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
  flex-shrink: 0;
}
.cover-circle:hover { transform: scale(1.1); }
.cover-img, .cover-placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.cover-placeholder {
  background: linear-gradient(135deg, #e6d5b8 0%, #d4bc96 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-placeholder span { font-size: 20px; font-weight: 700; color: #8b7355; }
.is-playing { animation: rotate-cover 8s linear infinite; }
@keyframes rotate-cover { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.cover-glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(184, 133, 82, 0.4);
  pointer-events: none;
}

.control-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(184, 133, 82, 0.15);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #b88552;
  flex-shrink: 0;
}
.control-btn:hover { background: rgba(184, 133, 82, 0.3); transform: scale(1.05); }
.dark .control-btn { background: rgba(255, 255, 255, 0.15); color: #d4a574; }

/* ==================== 详细页 ==================== */
.tts-detail-page {
  position: fixed;
  right: 0;
  top: 0;
  width: 360px;
  height: 100vh;
  background: linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%);
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.1);
  z-index: 1002;
}
.tts-detail-page-inner {
  display: flex;
  flex-direction: column;
  padding: 24px;
  height: 100%;
  overflow-y: auto;
  position: relative;
}
.dark .tts-detail-page { background: linear-gradient(180deg, #1e1e1e 0%, #16171d 100%); }

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-main);
}
.dark .close-btn { background: rgba(255, 255, 255, 0.1); }

.detail-cover-section { display: flex; flex-direction: column; align-items: center; padding: 48px 0 32px; }
.detail-cover {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(184, 133, 82, 0.25);
}
.detail-cover-img, .detail-cover-placeholder { width: 100%; height: 100%; object-fit: cover; }
.detail-cover-placeholder {
  background: linear-gradient(135deg, #e6d5b8 0%, #d4bc96 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-cover-placeholder span { font-size: 64px; font-weight: 700; color: #8b7355; }
.book-title { margin: 24px 0 8px; font-size: 18px; font-weight: 600; color: var(--text-h); text-align: center; }
.chapter-title { margin: 0; font-size: 14px; color: var(--text-main); opacity: 0.7; text-align: center; }

.progress-section { padding: 16px 0; }
.progress-bar { height: 4px; background: rgba(184, 133, 82, 0.15); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #b88552, #d4a574); border-radius: 2px; transition: width 0.3s ease; }

.main-controls { display: flex; align-items: center; justify-content: center; gap: 32px; padding: 24px 0; }
.chapter-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(184, 133, 82, 0.1);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #b88552;
}
.chapter-btn:hover:not(:disabled) { background: rgba(184, 133, 82, 0.2); transform: scale(1.1); }
.chapter-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.dark .chapter-btn { background: rgba(255, 255, 255, 0.1); color: #d4a574; }
.main-play-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #b88552, #a07542);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  box-shadow: 0 4px 16px rgba(184, 133, 82, 0.4);
}
.main-play-btn:hover { transform: scale(1.1); }

.function-buttons { display: flex; justify-content: center; gap: 20px; padding: 16px 0; }
.func-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  background: rgba(184, 133, 82, 0.08);
  border-radius: 12px;
  border: none;
  cursor: pointer;
  color: var(--text-main);
  min-width: 60px;
}
.func-btn:hover { background: rgba(184, 133, 82, 0.15); transform: translateY(-2px); }
.func-btn.has-timer { background: rgba(184, 133, 82, 0.2); color: #b88552; }
.func-btn span { font-size: 12px; opacity: 0.8; }
.dark .func-btn { background: rgba(255, 255, 255, 0.08); }
.chapter-info { text-align: center; padding: 16px 0; font-size: 13px; color: var(--text-main); opacity: 0.6; }

/* ==================== 内部弹窗（在详细页内） ==================== */
.inner-popup-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.inner-popup {
  width: 100%;
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}
.dark .inner-popup { background: #2a2a2a; }
.popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.popup-title { font-size: 16px; font-weight: 600; color: var(--text-h); }
.popup-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-main);
}
.popup-content { display: flex; flex-direction: column; gap: 12px; }
.setting-item { display: flex; flex-direction: column; gap: 8px; }
.setting-label { display: flex; justify-content: space-between; align-items: center; }
.setting-label span { font-size: 14px; color: var(--text-main); }
.setting-value { font-weight: 600; color: #b88552; }
.slider-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-main); opacity: 0.5; }

.toggle-list { display: flex; flex-direction: column; gap: 12px; }
.toggle-row { display: flex; justify-content: space-between; align-items: center; }
.toggle-row span { font-size: 14px; color: var(--text-main); }

/* Toggle Switch */
.toggle-switch { position: relative; width: 44px; height: 24px; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  transition: 0.3s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.toggle-switch input:checked + .toggle-slider { background: #b88552; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }

/* 定时弹窗 */
.timer-countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: rgba(184, 133, 82, 0.1);
  border-radius: 12px;
  margin-bottom: 16px;
}
.countdown-label { font-size: 12px; color: var(--text-main); opacity: 0.6; }
.countdown-value { font-size: 32px; font-weight: 700; color: #b88552; font-variant-numeric: tabular-nums; }
.timer-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.timer-opt-btn {
  padding: 14px;
  background: rgba(184, 133, 82, 0.08);
  border-radius: 12px;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-main);
  transition: all 0.2s ease;
}
.timer-opt-btn:hover { background: rgba(184, 133, 82, 0.15); }
.timer-opt-btn.is-active { background: #b88552; color: white; }
.timer-opt-label { font-size: 14px; }
.timer-opt-remaining { font-size: 12px; opacity: 0.7; font-variant-numeric: tabular-nums; }
.timer-opt-btn.is-active .timer-opt-remaining { opacity: 0.9; }

/* 语速弹窗 */
.speed-display {
  text-align: center;
  font-size: 40px;
  font-weight: 700;
  color: #b88552;
  margin-bottom: 16px;
}

/* ==================== 动画 ==================== */
.btn-fade-enter-active, .btn-fade-leave-active { transition: all 0.3s ease; }
.btn-fade-enter-from, .btn-fade-leave-to { opacity: 0; transform: scale(0.8); }

.player-fade-enter-active { animation: player-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.player-fade-leave-active { animation: player-out 0.3s ease; }
@keyframes player-in { from { opacity: 0; transform: translateY(20px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes player-out { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(20px) scale(0.9); } }

.detail-slide-enter-active { animation: slide-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.detail-slide-leave-active { animation: slide-out 0.25s ease; }
@keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes slide-out { from { transform: translateX(0); } to { transform: translateX(100%); } }

/* 内部弹窗从底部滑入 */
.popup-slide-up-enter-active, .popup-slide-up-leave-active { transition: all 0.3s ease; }
.popup-slide-up-enter-active .inner-popup, .popup-slide-up-leave-active .inner-popup { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.popup-slide-up-enter-from, .popup-slide-up-leave-to { background: rgba(0, 0, 0, 0); }
.popup-slide-up-enter-from .inner-popup, .popup-slide-up-leave-to .inner-popup { transform: translateY(100%); }
</style>