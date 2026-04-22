/**
 * DialogueParser - 对话解析服务
 * 识别旁白和对话，分析说话人和情感
 */

class DialogueParser {
  constructor() {
    // 中文引号模式
    this.quotePatterns = {
      left: /["「『「『"]/,
      right: /["」』」』"]/,
      pair: /(["「『「『"])([^"」』」』]+)(["」』」』"])/g
    }

    // 常见说话动词
    this.speechVerbs = [
      // 单字动词
      '说', '道', '问', '答', '喊', '叫', '吼', '唱', '叹', '笑',
      // 双字动词
      '说道', '问道', '答道', '喊道', '叫道', '吼道',
      '笑道', '叹道', '怒道', '惊道', '喜道', '悲道',
      '低声', '大声', '轻声', '沉声', '冷声', '厉声',
      '喃喃', '嘀咕', '嘟囔', '咆哮', '嘶吼',
      // 三字动词
      '大声说', '小声说', '低声说', '轻声说', '笑着说', '哭着说',
      '冷冷说', '淡淡说', '严肃说', '认真说', '郑重说'
    ]

    // 构建说话动词正则
    this.speechVerbPattern = this.buildSpeechVerbPattern()

    // 情感关键词映射
    this.emotionKeywords = {
      angry: ['怒', '气', '混蛋', '滚', '该死', '可恶', '畜生', '王八', '畜生', '该死', '他妈', '操', '妈的', '混账'],
      happy: ['哈哈', '呵呵', '嘻嘻', '太好了', '真好', '开心', '高兴', '太棒了', '好极了', '妙极了'],
      sad: ['唉', '呜呜', '呜咽', '难过', '伤心', '眼泪', '泪水', '哭泣', '悲痛', '心碎', '绝望'],
      surprised: ['啊', '什么', '怎么可能', '竟然', '居然', '天哪', '我的天', '不会吧', '真的吗'],
      fear: ['怕', '害怕', '恐惧', '颤抖', '发抖', '惊恐', '惶恐', '不安'],
      calm: []
    }

    // 情感标点模式
    this.emotionPatterns = {
      angry: [/！{3,}/, /怒[道吼叫]/],
      happy: [/哈{3,}/, /呵{3,}/, /嘻{3,}/],
      sad: [/……{2,}/, /呜{3,}/],
      surprised: [/？{2,}/, /啊{2,}/],
      fear: [/颤[抖栗]/]
    }

    // 角色声音配置
    this.characterVoices = {
      default: { voice: 'zh-CN-XiaoxiaoNeural', pitch: '0%', rate: 1.0 },
      male: { voice: 'zh-CN-YunxiNeural', pitch: '-5%', rate: 1.0 },
      female: { voice: 'zh-CN-XiaoxiaoNeural', pitch: '+5%', rate: 1.0 },
      old_male: { voice: 'zh-CN-YunyangNeural', pitch: '-10%', rate: 0.9 },
      old_female: { voice: 'zh-CN-XiaoyiNeural', pitch: '-5%', rate: 0.9 },
      child: { voice: 'zh-CN-XiaoyiNeural', pitch: '+15%', rate: 1.1 }
    }

    // 已知角色映射（可动态扩展）
    this.knownCharacters = new Map()
  }

  /**
   * 构建说话动词正则表达式
   */
  buildSpeechVerbPattern() {
    // 按长度排序，长的优先匹配
    const sortedVerbs = [...this.speechVerbs].sort((a, b) => b.length - a.length)
    const verbPattern = sortedVerbs.map(v => this.escapeRegex(v)).join('|')
    return new RegExp(`([\\u4e00-\\u9fa5]*)(${verbPattern})\\s*[:：]?`)
  }

  /**
   * 转义正则特殊字符
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * 解析文本，识别旁白和对话
   * @param {string} text - 原始文本
   * @returns {Array<{type, text, speaker, emotion}>}
   */
  parse(text) {
    const segments = []
    let lastIndex = 0

    // 重置正则的 lastIndex
    this.quotePatterns.pair.lastIndex = 0

    let match
    while ((match = this.quotePatterns.pair.exec(text)) !== null) {
      // 匹配前的旁白
      if (match.index > lastIndex) {
        const narration = text.slice(lastIndex, match.index)
        if (narration.trim()) {
          // 检查旁白中是否包含说话人信息
          const speakerInfo = this.extractSpeakerFromNarration(narration)
          segments.push({
            type: 'narration',
            text: narration.trim(),
            speaker: null,
            emotion: 'calm'
          })
        }
      }

      // 尝试识别说话人
      const beforeText = text.slice(Math.max(0, match.index - 30), match.index)
      const speaker = this.identifySpeaker(beforeText)

      // 对话内容
      const dialogueText = match[2].trim()
      const emotion = this.analyzeEmotion(dialogueText, beforeText)

      segments.push({
        type: 'dialogue',
        text: dialogueText,
        speaker: speaker.name,
        speakerType: speaker.type,
        emotion
      })

      lastIndex = match.index + match[0].length
    }

    // 剩余的旁白
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex).trim()
      if (remaining) {
        segments.push({
          type: 'narration',
          text: remaining,
          speaker: null,
          emotion: 'calm'
        })
      }
    }

    return segments
  }

  /**
   * 从旁白中提取说话人信息
   * @param {string} narration - 旁白文本
   * @returns {{name: string, type: string}|null}
   */
  extractSpeakerFromNarration(narration) {
    // 匹配 "XXX说/道/问" 模式
    const match = narration.match(this.speechVerbPattern)
    if (match && match[1]) {
      const name = match[1].trim()
      if (name && name.length <= 4) {  // 名字通常不超过4个字
        return {
          name,
          type: this.guessCharacterType(name)
        }
      }
    }
    return null
  }

  /**
   * 识别说话人
   * @param {string} context - 对话前的上下文
   * @returns {{name: string, type: string}}
   */
  identifySpeaker(context) {
    // 模式1：名字 + 说/道/问
    const nameMatch = context.match(this.speechVerbPattern)
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim()
      if (name && name.length <= 4) {
        const type = this.guessCharacterType(name)
        // 记录已知角色
        this.knownCharacters.set(name, type)
        return { name, type }
      }
    }

    // 模式2：代词
    const pronounMatch = context.match(/(他|她|它|我|你|咱们|我们|你们|他们|她们)/)
    if (pronounMatch) {
      const pronoun = pronounMatch[1]
      return {
        name: pronoun,
        type: this.getPronounType(pronoun)
      }
    }

    // 模式3：从已知角色中推断
    const lastSpeaker = this.getLastMentionedSpeaker(context)
    if (lastSpeaker) {
      return lastSpeaker
    }

    return { name: 'unknown', type: 'default' }
  }

  /**
   * 猜测角色类型（男/女/老/少）
   * @param {string} name - 角色名
   * @returns {string}
   */
  guessCharacterType(name) {
    // 常见男性名字用字
    const maleChars = ['强', '刚', '明', '伟', '军', '杰', '龙', '虎', '鹏', '峰', '浩', '磊', '波', '辉', '勇']
    // 常见女性名字用字
    const femaleChars = ['芳', '娟', '敏', '静', '丽', '燕', '玲', '婷', '雪', '梅', '红', '琳', '霞', '倩', '颖']
    // 老年称谓
    const oldChars = ['爷', '奶', '老', '伯', '叔', '婶', '公', '婆']
    // 孩子称谓
    const childChars = ['小', '孩', '童', '宝']

    // 检查名字中的字
    for (const char of name) {
      if (oldChars.includes(char)) {
        return name.includes('奶') || name.includes('婶') || name.includes('婆') ? 'old_female' : 'old_male'
      }
      if (childChars.includes(char)) return 'child'
      if (maleChars.includes(char)) return 'male'
      if (femaleChars.includes(char)) return 'female'
    }

    // 检查称谓
    if (/爷爷|大爷|伯伯|叔叔|公公|父亲|爸爸/.test(name)) return 'old_male'
    if (/奶奶|大娘|婶婶|婆婆|母亲|妈妈/.test(name)) return 'old_female'
    if (/先生|男士/.test(name)) return 'male'
    if (/女士|小姐|夫人/.test(name)) return 'female'
    if (/小孩|孩子|儿童/.test(name)) return 'child'

    return 'default'
  }

  /**
   * 获取代词对应的角色类型
   */
  getPronounType(pronoun) {
    const typeMap = {
      '他': 'male',
      '她': 'female',
      '它': 'default',
      '我': 'default',
      '你': 'default',
      '咱们': 'default',
      '我们': 'default',
      '你们': 'default',
      '他们': 'male',
      '她们': 'female'
    }
    return typeMap[pronoun] || 'default'
  }

  /**
   * 获取最后提到的说话人
   */
  getLastMentionedSpeaker(context) {
    // 从后往前查找已知角色
    for (const [name, type] of this.knownCharacters) {
      if (context.includes(name)) {
        return { name, type }
      }
    }
    return null
  }

  /**
   * 分析对话情感
   * @param {string} dialogue - 对话内容
   * @param {string} context - 上下文
   * @returns {string} 情感类型
   */
  analyzeEmotion(dialogue, context = '') {
    // 1. 检查上下文中的情感动词
    if (/怒[道吼叫]|气[道叫]|愤愤/.test(context)) return 'angry'
    if (/笑[道说]|乐呵呵|喜滋滋/.test(context)) return 'happy'
    if (/叹[道气]|悲伤|哭[道着]|泪流/.test(context)) return 'sad'
    if (/惊[道叫]|吓[道一跳]|震惊/.test(context)) return 'surprised'
    if (/颤[抖声]|害怕|恐惧/.test(context)) return 'fear'

    // 2. 检查对话中的情感关键词
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      for (const keyword of keywords) {
        if (dialogue.includes(keyword)) {
          return emotion
        }
      }
    }

    // 3. 检查情感标点模式
    for (const [emotion, patterns] of Object.entries(this.emotionPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(dialogue)) {
          return emotion
        }
      }
    }

    // 4. 根据标点判断
    if (dialogue.endsWith('！') || dialogue.endsWith('!')) return 'excited'
    if (dialogue.endsWith('？') || dialogue.endsWith('?')) return 'question'

    return 'calm'
  }

  /**
   * 获取角色声音配置
   * @param {string} speakerType - 角色类型
   * @returns {Object}
   */
  getVoiceConfig(speakerType) {
    return this.characterVoices[speakerType] || this.characterVoices.default
  }

  /**
   * 清除已知角色缓存
   */
  clearKnownCharacters() {
    this.knownCharacters.clear()
  }

  /**
   * 添加已知角色
   * @param {string} name - 角色名
   * @param {string} type - 角色类型
   */
  addKnownCharacter(name, type) {
    this.knownCharacters.set(name, type)
  }

  /**
   * 统计对话数量
   * @param {string} text - 文本
   * @returns {number}
   */
  countDialogues(text) {
    const matches = text.match(this.quotePatterns.pair)
    return matches ? matches.length : 0
  }

  /**
   * 检查文本是否包含对话
   * @param {string} text - 文本
   * @returns {boolean}
   */
  hasDialogue(text) {
    return this.quotePatterns.pair.test(text)
  }
}

// 导出单例
export default new DialogueParser()