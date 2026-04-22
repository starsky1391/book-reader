/**
 * SSMLBuilder - SSML 生成服务
 * 用于生成带停顿、情感标注的 SSML 格式文本
 */

class SSMLBuilder {
  constructor() {
    // 标点符号到停顿时长的映射（毫秒）
    this.pauseMap = {
      '，': 300,      // 逗号 - 短停顿
      '。': 500,      // 句号 - 中等停顿
      '！': 500,      // 感叹号
      '？': 500,      // 问号
      '；': 400,      // 分号
      '：': 350,      // 冒号
      '……': 600,      // 省略号 - 较长停顿（表示犹豫）
      '...': 600,     // 英文省略号
      '\n': 700,      // 换行 - 段落停顿
      '\n\n': 1000,   // 双换行 - 场景切换
    }

    // 情感标点映射
    this.emotionMap = {
      '！': 'excited',
      '？': 'question',
      '……': 'calm',
      '...': 'calm',
    }

    // 情感配置
    this.emotionProfiles = {
      calm: { rate: 1.0, pitch: '0%' },
      excited: { rate: 1.1, pitch: '+5%' },
      question: { rate: 1.0, pitch: '+3%' },
      sad: { rate: 0.9, pitch: '-5%' },
      angry: { rate: 1.2, pitch: '+10%' },
    }
  }

  /**
   * 将普通文本转换为带停顿的 SSML
   * @param {string} text - 原始文本
   * @param {Object} options - 配置选项
   * @returns {string} - SSML 格式文本
   */
  buildSSML(text, options = {}) {
    const { voice = 'zh-CN-XiaoxiaoNeural', rate = 1.0, pitch = '0%' } = options

    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">`
    ssml += `<voice name="${voice}">`
    ssml += `<prosody rate="${rate}" pitch="${pitch}">`

    // 按段落分割处理
    const paragraphs = text.split(/\n\n+/)

    paragraphs.forEach((para, pIndex) => {
      // 段落间添加较长停顿
      if (pIndex > 0) {
        ssml += '<break time="800ms"/>'
      }

      // 处理段落内的标点
      ssml += this.processPunctuation(para)
    })

    ssml += '</prosody></voice></speak>'
    return ssml
  }

  /**
   * 处理标点符号，插入停顿
   * @param {string} text - 文本
   * @returns {string} - 处理后的 SSML 片段
   */
  processPunctuation(text) {
    let result = text

    // 按优先级处理（长的模式先处理，避免重复替换）
    const patterns = [
      { regex: /\.\.\./g, pause: 600 },      // 英文省略号
      { regex: /……/g, pause: 600 },          // 中文省略号
      { regex: /[。！？]/g, pause: 500 },     // 句末标点
      { regex: /[；：]/g, pause: 400 },       // 分号冒号
      { regex: /，/g, pause: 300 },           // 逗号
      { regex: /\n/g, pause: 700 },           // 换行
    ]

    patterns.forEach(({ regex, pause }) => {
      result = result.replace(regex, (match) => {
        return `${match}<break time="${pause}ms"/>`
      })
    })

    return result
  }

  /**
   * 为对话添加特殊处理（语速稍慢，更有感情）
   * @param {string} text - 包含对话的文本
   * @returns {string} - 处理后的 SSML
   */
  processDialogue(text) {
    // 匹配中文引号内的对话
    const dialogueRegex = /["「『「『]([^"」』」』]+)["」』」』]/g

    return text.replace(dialogueRegex, (match, content) => {
      // 对话语速稍慢，音调略高
      const processedContent = this.processPunctuation(content)
      return `<prosody rate="0.95" pitch="+5%">${processedContent}</prosody>`
    })
  }

  /**
   * 生成完整 SSML（包含旁白和对话区分）
   * @param {Array} segments - 已解析的文本片段 [{type, text, speaker, emotion}]
   * @param {Object} options - 配置选项
   * @returns {string} - SSML 格式文本
   */
  buildFullSSML(segments, options = {}) {
    const {
      narratorRate = 1.0,
      narratorPitch = '0%',
      dialogueRate = 0.95,
      dialoguePitch = '+5%',
      voice = 'zh-CN-XiaoxiaoNeural',
    } = options

    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">`

    segments.forEach(segment => {
      if (segment.type === 'dialogue') {
        // 对话：使用特定语速和音调
        ssml += `<voice name="${voice}">`
        ssml += `<prosody rate="${dialogueRate}" pitch="${dialoguePitch}">`
        ssml += this.processPunctuation(segment.text)
        ssml += '</prosody></voice>'
      } else {
        // 旁白：使用标准语速
        ssml += `<voice name="${voice}">`
        ssml += `<prosody rate="${narratorRate}" pitch="${narratorPitch}">`
        ssml += this.processPunctuation(segment.text)
        ssml += '</prosody></voice>'
      }
    })

    ssml += '</speak>'
    return ssml
  }

  /**
   * 生成带情感的 SSML
   * @param {Array} segments - 已解析的文本片段（包含 emotion 字段）
   * @param {Object} options - 配置选项
   * @returns {string} - SSML 格式文本
   */
  buildEmotionalSSML(segments, options = {}) {
    const { voice = 'zh-CN-XiaoxiaoNeural' } = options

    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">`

    segments.forEach(segment => {
      const emotion = segment.emotion || 'calm'
      const profile = this.emotionProfiles[emotion] || this.emotionProfiles.calm

      ssml += `<voice name="${voice}">`
      ssml += `<prosody rate="${profile.rate}" pitch="${profile.pitch}">`
      ssml += this.processPunctuation(segment.text)
      ssml += '</prosody></voice>'
    })

    ssml += '</speak>'
    return ssml
  }

  /**
   * 从 SSML 中提取纯文本（用于不支持 SSML 的引擎）
   * @param {string} ssml - SSML 格式文本
   * @returns {string} - 纯文本
   */
  extractText(ssml) {
    return ssml
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * 为 Web Speech API 插入模拟停顿（使用空格）
   * @param {string} text - 原始文本
   * @returns {string} - 处理后的文本
   */
  insertWebSpeechPauses(text) {
    // Web Speech API 不支持 SSML，使用空格模拟停顿
    // 3个空格约等于 300ms，可根据实际效果调整

    return text
      .replace(/，/g, '，   ')           // 逗号：300ms
      .replace(/。/g, '。      ')        // 句号：500ms
      .replace(/！/g, '！      ')        // 感叹号：500ms
      .replace(/？/g, '？      ')        // 问号：500ms
      .replace(/；/g, '；     ')         // 分号：400ms
      .replace(/：/g, '：    ')          // 冒号：350ms
      .replace(/……/g, '……       ')       // 省略号：600ms
      .replace(/\n/g, '        \n')      // 换行：700ms
  }

  /**
   * 智能分割文本（按语义单元分割，避免单次请求过长）
   * @param {string} text - 原始文本
   * @param {number} maxLength - 最大长度
   * @returns {Array<string>} - 分割后的文本片段
   */
  smartSplit(text, maxLength = 500) {
    const sentences = []
    let current = ''
    let i = 0

    while (i < text.length) {
      const char = text[i]
      current += char

      // 句末标点作为分割点
      if (/[。！？.!?]/.test(char)) {
        if (current.length >= maxLength * 0.8) {
          sentences.push(current.trim())
          current = ''
        }
      }
      // 省略号
      else if (char === '……' || (char === '.' && text[i + 1] === '.' && text[i + 2] === '.')) {
        if (current.length >= maxLength * 0.8) {
          sentences.push(current.trim())
          current = ''
        }
        if (char === '.') i += 2
      }
      // 段落结束
      else if (char === '\n' && current.trim()) {
        sentences.push(current.trim())
        current = ''
      }
      // 强制分割（超过最大长度）
      else if (current.length >= maxLength) {
        // 尾随逗号分割
        const lastComma = current.lastIndexOf('，')
        if (lastComma > maxLength * 0.5) {
          sentences.push(current.slice(0, lastComma + 1).trim())
          current = current.slice(lastComma + 1)
        } else {
          sentences.push(current.trim())
          current = ''
        }
      }

      i++
    }

    if (current.trim()) {
      sentences.push(current.trim())
    }

    return sentences.filter(s => s.length > 0)
  }
}

// 导出单例
export default new SSMLBuilder()