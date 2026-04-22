import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 阅读器状态管理
 * 接管：主题、文字设置、听书控制、抽屉状态
 */
export const useReaderStore = defineStore('reader', () => {
  // ==================== 主题状态 ====================
  const isDarkMode = ref(false)
  const isEyeProtectionMode = ref(false)
  const selectedTheme = ref('white')

  // ==================== 文字设置 ====================
  const fontFamily = ref('system-ui')
  const fontSize = ref(18)
  const lineHeight = ref(1.5)
  const letterSpacing = ref(0)
  const textAlign = ref('left')

  // ==================== 听书控制 ====================
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const currentSpeed = ref(1.0)
  const currentSentenceIndex = ref(0)
  const autoContinue = ref(true)
  const ttsProgress = ref(0)
  const currentReadingText = ref('')  // 当前正在朗读的文本（用于高亮）

  // ==================== TTS 配置 ====================
  const ttsConfig = ref({
    engine: 'web',           // 'web' | 'edge' | 'azure'
    voice: 'xiaoxiao',
    enablePause: true,
    enableDialogue: true,
    enableEmotion: true
  })

  // ==================== 抽屉状态 ====================
  const directoryDrawerVisible = ref(false)
  const settingsDrawerVisible = ref(false)

  // ==================== 计算属性 ====================
  const themeVars = computed(() => {
    const themes = {
      white: {
        '--bg-main': '#FBFBFB', '--bg-paper': '#FFFFFF', '--bg-sidebar': '#FFFFFF',
        '--bg-card': '#F9F9F9', '--text-main': '#2D3436', '--text-h': '#000000',
        '--bg': '#FBFBFB', '--text': '#2D3436'
      },
      parchment: {
        '--bg-main': '#F4F1E6', '--bg-paper': '#EBE7D9', '--bg-sidebar': '#EBE7D9',
        '--bg-card': '#F6F3E8', '--text-main': '#5D4037', '--text-h': '#3E2723',
        '--bg': '#F4F1E6', '--text': '#5D4037'
      },
      green: {
        '--bg-main': '#F0F9E8', '--bg-paper': '#E5F2DB', '--bg-sidebar': '#E5F2DB',
        '--bg-card': '#F2FAEA', '--text-main': '#2D4F1E', '--text-h': '#1B3311',
        '--bg': '#F0F9E8', '--text': '#2D4F1E'
      },
      dark: {
        '--bg-main': '#16171D', '--bg-paper': '#1A1A1A', '--bg-sidebar': '#21222D',
        '--bg-card': '#1E1F2A', '--text-main': '#A0A0A0', '--text-h': '#FFFFFF',
        '--bg': '#16171D', '--text': '#A0A0A0'
      }
    }
    return themes[selectedTheme.value] || themes.white
  })

  // ==================== Actions ====================

  /**
   * 设置主题
   */
  async function setTheme(theme) {
    selectedTheme.value = theme
    
    // 更新模式状态
    isDarkMode.value = theme === 'dark'
    isEyeProtectionMode.value = theme === 'green'
    
    // 应用 CSS 变量
    applyThemeVars()
    
    // 持久化
    await saveThemeSettings()
  }

  /**
   * 应用主题 CSS 变量
   */
  function applyThemeVars() {
    Object.entries(themeVars.value).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  }

  /**
   * 保存主题设置到后端
   */
  async function saveThemeSettings() {
    await window.electron.store.saveSettings({
      selectedTheme: selectedTheme.value,
      darkMode: isDarkMode.value,
      eyeProtectionMode: isEyeProtectionMode.value
    })
  }

  /**
   * 保存文字设置
   */
  async function saveTextSettings() {
    await window.electron.store.saveSettings({
      fontFamily: fontFamily.value,
      fontSize: fontSize.value,
      lineHeight: lineHeight.value,
      letterSpacing: letterSpacing.value,
      textAlign: textAlign.value
    })
    
    // 实时应用
    applyTextStyles()
  }

  /**
   * 应用文字样式
   */
  function applyTextStyles() {
    document.documentElement.style.setProperty('--sans', fontFamily.value)
    document.documentElement.style.setProperty('--font-size', fontSize.value + 'px')
    document.documentElement.style.setProperty('--line-height', String(lineHeight.value))
    document.documentElement.style.setProperty('--letter-spacing', letterSpacing.value + 'px')
    document.documentElement.style.setProperty('--text-align', textAlign.value)
    
    // 两端对齐特殊处理
    if (textAlign.value === 'justify') {
      document.documentElement.style.setProperty('--text-align', 'justify')
      document.querySelectorAll('pre').forEach(el => {
        el.style.textJustify = 'inter-character'
      })
    } else {
      document.querySelectorAll('pre').forEach(el => {
        el.style.textJustify = 'auto'
      })
    }
  }

  /**
   * 设置语速
   */
  async function setSpeed(speed) {
    currentSpeed.value = speed
    await window.electron.store.saveSettings({ speed })
  }

  /**
   * 从后端加载设置
   */
  async function loadSettings() {
    const settings = await window.electron.store.getSettings()
    
    isDarkMode.value = settings.darkMode || false
    isEyeProtectionMode.value = settings.eyeProtectionMode || false
    currentSpeed.value = settings.speed || 1.0
    autoContinue.value = settings.autoContinue ?? true
    fontFamily.value = settings.fontFamily || 'system-ui'
    fontSize.value = settings.fontSize || 18
    lineHeight.value = settings.lineHeight || 1.5
    letterSpacing.value = settings.letterSpacing || 0
    textAlign.value = settings.textAlign || 'left'
    selectedTheme.value = settings.selectedTheme || 'white'
    
    // 应用设置
    applyThemeVars()
    applyTextStyles()
  }

  /**
   * 切换目录抽屉
   */
  function toggleDirectoryDrawer() {
    directoryDrawerVisible.value = !directoryDrawerVisible.value
  }

  /**
   * 切换设置抽屉
   */
  function toggleSettingsDrawer() {
    settingsDrawerVisible.value = !settingsDrawerVisible.value
  }

  return {
    // 状态
    isDarkMode,
    isEyeProtectionMode,
    selectedTheme,
    fontFamily,
    fontSize,
    lineHeight,
    letterSpacing,
    textAlign,
    isPlaying,
    isPaused,
    currentSpeed,
    currentSentenceIndex,
    autoContinue,
    ttsProgress,
    ttsConfig,
    currentReadingText,
    directoryDrawerVisible,
    settingsDrawerVisible,

    // 计算属性
    themeVars,

    // Actions
    setTheme,
    saveTextSettings,
    setSpeed,
    loadSettings,
    toggleDirectoryDrawer,
    toggleSettingsDrawer,
    applyThemeVars,
    applyTextStyles
  }
})
