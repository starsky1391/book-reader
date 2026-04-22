/**
 * TTSServicePro - 增强版 TTS 服务
 * 集成 SSML 生成、多音字处理、对话解析等功能
 * 支持预加载下一段音频，优化播放体验
 */

import SSMLBuilder from './SSMLBuilder.js'
import DialogueParser from './DialogueParser.js'

class TTSServicePro {
  constructor() {
    // 播放状态
    this.currentAudio = null
    this.isPlaying = false
    this.isPaused = false

    // 播放队列
    this.queue = []
    this.currentIndex = 0

    // 预加载缓存
    this.preloadedAudio = new Map()

    // 当前使用的引擎（可能因为错误而切换）
    this.activeEngine = 'web'

    // 播放会话 ID（用于防止双重语音）
    this.sessionId = 0

    // 保存进度的回调
    this.onProgressSave = null

    // 配置
    this.config = {
      engine: 'web',
      voice: 'xiaoxiao',
      rate: 1.0,
      pitch: 0,
      enablePause: true,
      enableDialogue: true,
      enableEmotion: true,
      enablePreload: true,
      narratorRate: 1.0,
      narratorPitch: '0%',
      dialogueRate: 0.95,
      dialoguePitch: '+5%',
    }

    // 事件回调
    this.callbacks = {
      onStart: null,
      onEnd: null,
      onError: null,
      onProgress: null,
      onSegmentChange: null
    }

    // 可用声音列表
    this.availableVoices = []

    // Edge TTS 可用性
    this.edgeTTSAvailable = false
  }

  /**
   * 初始化服务
   */
  async init() {
    try {
      if (window.electron && window.electron.tts) {
        try {
          this.edgeTTSAvailable = await window.electron.tts.checkEdgeTTS()
          this.availableVoices = await window.electron.tts.getVoices()
        } catch (e) {
          this.edgeTTSAvailable = false
        }
      }

      if (window.electron && window.electron.store) {
        const settings = await window.electron.store.getSettings()
        if (settings.ttsConfig) {
          this.config = { ...this.config, ...settings.ttsConfig }
        }
        if (settings.speed) {
          this.config.rate = settings.speed
        }
      }

      if (!this.edgeTTSAvailable) {
        this.config.engine = 'web'
      }

      this.activeEngine = this.config.engine

      return {
        edgeTTSAvailable: this.edgeTTSAvailable,
        voices: this.availableVoices
      }
    } catch (error) {
      return { edgeTTSAvailable: false, voices: [] }
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    const wasPlaying = this.isPlaying
    const oldRate = this.config.rate

    this.config = { ...this.config, ...newConfig }
    this.activeEngine = this.config.engine

    // 如果语速改变且正在播放，重新开始当前片段
    if (wasPlaying && newConfig.rate !== undefined && newConfig.rate !== oldRate) {
      this.restartCurrentSegment()
    }

    if (window.electron && window.electron.store) {
      window.electron.store.saveSettings({ ttsConfig: this.config })
    }
  }

  /**
   * 重新开始当前片段（用于语速调整等）
   */
  restartCurrentSegment() {
    if (this.currentIndex >= this.queue.length) return

    const segment = this.queue[this.currentIndex]
    if (!segment) return

    // 停止当前播放
    window.speechSynthesis.cancel()
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }

    // 清除预加载（因为语速变了）
    this.clearPreloadedAudio()

    // 重新播放当前片段
    this.isPlaying = false
    this.isPaused = false

    // 使用当前会话 ID 继续播放
    this.playNext(this.config, this.sessionId)
  }

  /**
   * 设置事件回调
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback
    }
  }

  /**
   * 清理 HTML 标签
   */
  cleanHtml(text) {
    if (!text) return ''
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim()
  }

  /**
   * 朗读文本（主入口）
   */
  async speak(text, options = {}) {
    // 完全停止之前的播放
    this.stop()

    // 生成新的会话 ID
    const currentSessionId = ++this.sessionId

    const config = { ...this.config, ...options }
    const processedText = this.cleanHtml(text)

    // 重置活动引擎为配置的引擎
    this.activeEngine = config.engine

    // 分段处理
    let segments
    if (config.enableDialogue && DialogueParser.hasDialogue(processedText)) {
      segments = DialogueParser.parse(processedText)
      DialogueParser.clearKnownCharacters()
    } else {
      segments = SSMLBuilder.smartSplit(processedText, 500).map(text => ({
        type: 'narration',
        text,
        emotion: 'calm'
      }))
    }

    this.queue = segments.map(segment => ({
      ...segment,
      ssml: this.generateSegmentText(segment, config)
    }))

    this.currentIndex = 0

    // 立即设置播放状态并触发回调
    this.isPlaying = true
    this.isPaused = false
    if (this.callbacks.onStart) {
      this.callbacks.onStart()
    }

    // 预加载
    if (this.activeEngine !== 'web' && config.enablePreload && this.edgeTTSAvailable) {
      this.preloadSegments(config)
    }

    await this.playNext(config, currentSessionId)
  }

  /**
   * 朗读章节
   */
  async speakChapter(chapter) {
    if (!chapter || !chapter.content) {
      console.error('无效的章节')
      return
    }
    await this.speak(chapter.content)
  }

  /**
   * 生成片段文本
   */
  generateSegmentText(segment, config) {
    const { text } = segment
    if (config.enablePause) {
      return SSMLBuilder.insertWebSpeechPauses(text)
    }
    return text
  }

  /**
   * 预加载接下来的几段音频
   */
  async preloadSegments(config) {
    const preloadCount = 2
    for (let i = 0; i < preloadCount; i++) {
      const index = this.currentIndex + i
      if (index >= this.queue.length) break
      if (this.preloadedAudio.has(index)) continue

      const segment = this.queue[index]
      this.preloadSegment(index, segment.ssml, config)
    }
  }

  /**
   * 预加载单个片段
   */
  async preloadSegment(index, text, config) {
    if (this.preloadedAudio.has(index)) return

    try {
      const result = await window.electron.tts.synthesizeEdge(text, {
        voice: config.voice,
        rate: Math.round((config.rate - 1) * 100),
        pitch: config.pitch
      })

      if (result.success && result.audio) {
        const audioData = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))
        const blob = new Blob([audioData], { type: 'audio/mp3' })
        const audioUrl = URL.createObjectURL(blob)
        const audio = new Audio(audioUrl)
        this.preloadedAudio.set(index, { audio, audioUrl })
      }
    } catch (error) {
      // 预加载失败，静默处理
    }
  }

  /**
   * 播放下一段
   */
  async playNext(config, sessionId) {
    // 检查会话 ID，防止旧会话的回调继续执行
    if (sessionId !== this.sessionId) {
      return
    }

    if (this.currentIndex >= this.queue.length) {
      this.isPlaying = false
      this.queue = []
      this.currentIndex = 0
      this.clearPreloadedAudio()
      if (this.callbacks.onEnd && sessionId === this.sessionId) {
        this.callbacks.onEnd()
      }
      return
    }

    const segment = this.queue[this.currentIndex]

    // 触发片段切换回调（用于高亮显示）
    if (this.callbacks.onSegmentChange && sessionId === this.sessionId) {
      this.callbacks.onSegmentChange({
        index: this.currentIndex,
        total: this.queue.length,
        segment,
        text: segment.text
      })
    }

    try {
      // Web Speech API
      if (this.activeEngine === 'web' || !this.edgeTTSAvailable) {
        await this.playWithWeb(segment.ssml, config, sessionId)
        return
      }

      // Edge TTS - 检查预加载缓存
      if (this.preloadedAudio.has(this.currentIndex)) {
        const cached = this.preloadedAudio.get(this.currentIndex)
        this.preloadedAudio.delete(this.currentIndex)

        this.currentAudio = cached.audio

        this.currentAudio.onended = () => {
          // 检查会话 ID
          if (sessionId !== this.sessionId) return
          URL.revokeObjectURL(cached.audioUrl)
          this.currentIndex++
          this.playNext(config, sessionId)
        }

        await this.currentAudio.play()
        this.preloadSegments(config)
      } else {
        // 实时加载
        await this.loadAndPlay(segment.ssml, config, sessionId)
      }

      if (this.callbacks.onProgress && sessionId === this.sessionId) {
        this.callbacks.onProgress({
          index: this.currentIndex,
          total: this.queue.length,
          progress: (this.currentIndex + 1) / this.queue.length
        })
      }

    } catch (error) {
      console.error('TTS 播放错误:', error.message)

      // 检查会话 ID
      if (sessionId !== this.sessionId) return

      // 如果 Edge TTS 失败，切换到 Web Speech API
      if (this.activeEngine !== 'web') {
        this.activeEngine = 'web'
        this.clearPreloadedAudio()
        await this.playWithWeb(segment.ssml, config, sessionId)
        return
      }

      if (this.callbacks.onError && sessionId === this.sessionId) {
        this.callbacks.onError(error)
      }
      this.currentIndex++
      await this.playNext(config, sessionId)
    }
  }

  /**
   * 加载并播放音频
   */
  async loadAndPlay(text, config, sessionId) {
    const result = await window.electron.tts.synthesizeEdge(text, {
      voice: config.voice,
      rate: Math.round((config.rate - 1) * 100),
      pitch: config.pitch
    })

    // 检查会话 ID
    if (sessionId !== this.sessionId) return

    if (!result.success) {
      throw new Error(result.error || 'Edge TTS 合成失败')
    }

    const audioData = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))
    const blob = new Blob([audioData], { type: 'audio/mp3' })
    const audioUrl = URL.createObjectURL(blob)
    const audio = new Audio(audioUrl)

    this.currentAudio = audio

    audio.onended = () => {
      // 检查会话 ID
      if (sessionId !== this.sessionId) return
      URL.revokeObjectURL(audioUrl)
      this.currentIndex++
      this.playNext(config, sessionId)
    }

    await audio.play()
    this.preloadSegments(config)
  }

  /**
   * 使用 Web Speech API 播放
   */
  playWithWeb(text, config, sessionId) {
    return new Promise((resolve, reject) => {
      // 检查会话 ID
      if (sessionId !== this.sessionId) {
        resolve()
        return
      }

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = config.rate
      utterance.pitch = 1 + config.pitch / 100

      const voices = window.speechSynthesis.getVoices()
      const zhVoice = voices.find(v => v.lang.includes('zh-CN')) ||
                      voices.find(v => v.lang.includes('zh'))
      if (zhVoice) {
        utterance.voice = zhVoice
      }

      utterance.onend = () => {
        // 检查会话 ID
        if (sessionId !== this.sessionId) {
          resolve()
          return
        }
        this.currentIndex++
        this.playNext(config, sessionId)
        resolve()
      }

      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve()
          return
        }
        // 检查会话 ID
        if (sessionId !== this.sessionId) {
          resolve()
          return
        }
        reject(new Error(`Web Speech API error: ${event.error}`))
      }

      window.speechSynthesis.speak(utterance)

      if (this.callbacks.onProgress && sessionId === this.sessionId) {
        this.callbacks.onProgress({
          index: this.currentIndex,
          total: this.queue.length,
          progress: (this.currentIndex + 1) / this.queue.length
        })
      }
    })
  }

  /**
   * 清理预加载的音频
   */
  clearPreloadedAudio() {
    for (const [index, data] of this.preloadedAudio) {
      if (data.audioUrl) {
        URL.revokeObjectURL(data.audioUrl)
      }
    }
    this.preloadedAudio.clear()
  }

  /**
   * 暂停播放
   */
  pause() {
    if (this.activeEngine === 'web') {
      window.speechSynthesis.pause()
    } else if (this.currentAudio) {
      this.currentAudio.pause()
    }
    this.isPaused = true
    this.isPlaying = false
  }

  /**
   * 恢复播放
   */
  resume() {
    if (this.activeEngine === 'web') {
      window.speechSynthesis.resume()
    } else if (this.currentAudio) {
      this.currentAudio.play()
    }
    this.isPaused = false
    this.isPlaying = true
  }

  /**
   * 停止播放（完全停止）
   */
  stop() {
    // 增加会话 ID，使所有旧会话的回调失效
    this.sessionId++

    // 停止 Web Speech API
    window.speechSynthesis.cancel()

    // 停止 HTML Audio
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }

    // 清理预加载
    this.clearPreloadedAudio()

    // 重置状态
    this.isPlaying = false
    this.isPaused = false
    this.queue = []
    this.currentIndex = 0
  }

  /**
   * 跳到下一段
   */
  next() {
    if (this.currentIndex < this.queue.length - 1) {
      if (this.currentAudio) {
        this.currentAudio.pause()
      }
      window.speechSynthesis.cancel()
      this.currentIndex++
      this.playNext(this.config, this.sessionId)
    }
  }

  /**
   * 跳到上一段
   */
  previous() {
    if (this.currentIndex > 0) {
      if (this.currentAudio) {
        this.currentAudio.pause()
      }
      window.speechSynthesis.cancel()
      this.currentIndex--
      this.playNext(this.config, this.sessionId)
    }
  }

  /**
   * 获取播放状态
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalSegments: this.queue.length,
      progress: this.queue.length > 0 ? (this.currentIndex + 1) / this.queue.length : 0,
      currentText: this.queue[this.currentIndex]?.text || ''
    }
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.config }
  }

  /**
   * 获取可用声音列表
   */
  getVoices() {
    return this.availableVoices
  }

  /**
   * 检查是否正在播放
   */
  isSpeaking() {
    return this.isPlaying || this.isPaused
  }

  /**
   * 设置进度保存回调
   */
  setProgressSaveCallback(callback) {
    this.onProgressSave = callback
  }

  /**
   * 从指定段落开始播放
   */
  async speakFromSegment(text, segmentIndex, options = {}) {
    // 完全停止之前的播放
    this.stop()

    // 生成新的会话 ID
    const currentSessionId = ++this.sessionId

    const config = { ...this.config, ...options }
    const processedText = this.cleanHtml(text)

    // 重置活动引擎为配置的引擎
    this.activeEngine = config.engine

    // 分段处理
    let segments
    if (config.enableDialogue && DialogueParser.hasDialogue(processedText)) {
      segments = DialogueParser.parse(processedText)
      DialogueParser.clearKnownCharacters()
    } else {
      segments = SSMLBuilder.smartSplit(processedText, 500).map(text => ({
        type: 'narration',
        text,
        emotion: 'calm'
      }))
    }

    this.queue = segments.map(segment => ({
      ...segment,
      ssml: this.generateSegmentText(segment, config)
    }))

    // 设置起始段落索引
    this.currentIndex = Math.min(segmentIndex, this.queue.length - 1)

    // 立即设置播放状态并触发回调
    this.isPlaying = true
    this.isPaused = false
    if (this.callbacks.onStart) {
      this.callbacks.onStart()
    }

    // 预加载
    if (this.activeEngine !== 'web' && config.enablePreload && this.edgeTTSAvailable) {
      this.preloadSegments(config)
    }

    await this.playNext(config, currentSessionId)
  }

  /**
   * 从指定段落开始朗读章节
   */
  async speakChapterFromSegment(chapter, segmentIndex) {
    if (!chapter || !chapter.content) {
      console.error('无效的章节')
      return
    }
    await this.speakFromSegment(chapter.content, segmentIndex)
  }
}

export default new TTSServicePro()