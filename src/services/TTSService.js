const StoreService = require('./StoreService')

class TTSService {
  constructor() {
    this.speechSynthesis = window.speechSynthesis
    this.currentUtterance = null
    this.isPlaying = false
    this.queue = []
    this.currentIndex = 0
  }

  // 朗读文本
  speak(text, options = {}) {
    // 停止当前朗读
    this.stop()

    // 获取语速设置
    const speed = StoreService.getSettings().speed || 1.0

    // 创建语音合成实例
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = options.rate || speed
    utterance.pitch = options.pitch || 1
    utterance.volume = options.volume || 1

    // 保存当前语音实例
    this.currentUtterance = utterance

    // 开始朗读
    this.speechSynthesis.speak(utterance)
    this.isPlaying = true

    // 朗读结束事件
    utterance.onend = () => {
      this.isPlaying = false
      this.currentUtterance = null
      
      // 处理队列
      if (this.queue.length > 0 && this.currentIndex < this.queue.length - 1) {
        this.currentIndex++
        this.speak(this.queue[this.currentIndex])
      }
    }

    // 朗读错误事件
    utterance.onerror = (event) => {
      console.error('语音合成错误:', event)
      this.isPlaying = false
      this.currentUtterance = null
    }
  }

  // 暂停朗读
  pause() {
    if (this.speechSynthesis.speaking) {
      this.speechSynthesis.pause()
      this.isPlaying = false
    }
  }

  // 恢复朗读
  resume() {
    if (this.speechSynthesis.paused) {
      this.speechSynthesis.resume()
      this.isPlaying = true
    }
  }

  // 停止朗读
  stop() {
    this.speechSynthesis.cancel()
    this.isPlaying = false
    this.currentUtterance = null
    this.queue = []
    this.currentIndex = 0
  }

  // 跳到下一句
  next() {
    this.stop()
    if (this.queue.length > 0 && this.currentIndex < this.queue.length - 1) {
      this.currentIndex++
      this.speak(this.queue[this.currentIndex])
    }
  }

  // 设置语速
  setSpeed(speed) {
    StoreService.saveSettings({ speed })
    if (this.currentUtterance) {
      this.currentUtterance.rate = speed
    }
  }

  // 获取语速
  getSpeed() {
    return StoreService.getSettings().speed || 1.0
  }

  // 朗读章节
  speakChapter(chapter) {
    // 分割章节内容为句子
    const sentences = chapter.content.split(/[。！？.!?]/).filter(s => s.trim())
    this.queue = sentences
    this.currentIndex = 0
    
    if (sentences.length > 0) {
      this.speak(sentences[0])
    }
  }

  // 检查是否正在朗读
  isSpeaking() {
    return this.speechSynthesis.speaking
  }

  // 检查是否暂停
  isPaused() {
    return this.speechSynthesis.paused
  }
}

// 导出单例
module.exports = new TTSService()