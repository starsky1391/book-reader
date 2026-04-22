/**
 * PolyphonicService - 多音字处理服务
 * 根据上下文识别多音字的正确读音
 */

class PolyphonicService {
  constructor() {
    // 多音字词典：字符 -> { 拼音: [词汇列表] }
    this.dictionary = {
      '还': {
        'hái': ['还是', '还有', '还好', '还要', '还没', '还可以', '还行', '还能', '还早', '还多'],
        'huán': ['还书', '还钱', '归还', '偿还', '还债', '还礼', '还击', '还价', '还手', '奉还']
      },
      '重': {
        'zhòng': ['重要', '重点', '严重', '沉重', '重视', '重量', '严重', '敬重', '尊重', '重量级', '重任', '重担'],
        'chóng': ['重新', '重复', '重写', '重来', '重叠', '重逢', '重合', '重修', '重生', '重建', '重演']
      },
      '行': {
        'xíng': ['行走', '行动', '进行', '行为', '不行', '可以', '行吗', '行走', '行程', '行人', '执行', '实行'],
        'háng': ['银行', '行业', '行列', '商行', '行情', '内行', '外行', '行家', '拍行', '本行']
      },
      '长': {
        'cháng': ['长度', '长江', '长途', '长久', '长长', '长短', '长城', '长处', '特长', '漫长', '漫长'],
        'zhǎng': ['长大', '成长', '长辈', '家长', '市长', '首长', '师长', '队长', '班长', '增长', '上涨']
      },
      '了': {
        'le': ['好了', '来了', '走了', '去了', '看了', '听了', '做了', '吃了', '喝了', '睡了'],
        'liǎo': ['了解', '了结', '了不起', '明了', '了如指掌', '了断', '了却', '了事', '了悟']
      },
      '得': {
        'de': ['得', '跑得快', '说得好', '做得对', '看得见', '听得懂'],  // 补语标记
        'dé': ['得到', '获得', '得意', '得体', '得逞', '得奖', '得失', '得益', '心得'],
        'děi': ['得去', '得做', '得走', '得买', '得看', '得说', '得想']  // 口语"必须"
      },
      '地': {
        'de': ['地', '慢慢地', '轻轻地', '悄悄地', '认真地', '仔细地', '高兴地', '飞快地'],  // 状语标记
        'dì': ['地方', '土地', '地面', '地址', '地点', '大地', '天地', '地球', '场地', '目的地']
      },
      '为': {
        'wéi': ['行为', '成为', '认为', '以为', '作为', '为人', '为难', '为数', '广为'],
        'wèi': ['为了', '因为', '为什么', '为何', '为此', '为着']
      },
      '数': {
        'shù': ['数学', '数字', '数量', '数据', '人数', '次数', '岁数', '分数', '无数'],
        'shǔ': ['数数', '数一数', '数落', '数不清', '数钱', '数着']
      },
      '乐': {
        'lè': ['快乐', '欢乐', '乐观', '乐意', '乐趣', '享乐', '乐子'],
        'yuè': ['音乐', '乐器', '乐队', '乐曲', '乐章', '交响乐']
      },
      '觉': {
        'jué': ['觉得', '感觉', '觉悟', '觉醒', '自觉', '知觉', '听觉', '视觉'],
        'jiào': ['睡觉', '午觉', '懒觉', '睡懒觉']
      },
      '好': {
        'hǎo': ['好人', '好事', '好看', '好听', '好处', '友好', '美好', '正好'],
        'hào': ['好奇', '好学', '好客', '爱好', '喜好', '好胜', '好强']
      },
      '少': {
        'shǎo': ['多少', '少年', '少女', '少爷', '少妇', '少将'],
        'shào': ['少年', '少女', '少壮', '老少', '青少年']
      },
      '只': {
        'zhǐ': ['只是', '只有', '只能', '只要', '只管', '只好'],
        'zhī': ['一只', '只身', '船只', '几只']
      },
      '差': {
        'chà': ['差不多', '差劲', '差一点', '相差', '偏差'],
        'chā': ['差别', '差异', '差距', '误差', '落差', '差别'],
        'chāi': ['出差', '差事', '差遣', '差旅']
      },
      '发': {
        'fā': ['发现', '发生', '发展', '发明', '发表', '发挥', '出发', '打发'],
        'fà': ['头发', '发型', '理发', '烫发', '白发']
      },
      '背': {
        'bèi': ['背后', '背景', '背诵', '背叛', '违背', '背部'],
        'bēi': ['背包', '背负', '背带', '背着', '背黑锅']
      },
      '朝': {
        'cháo': ['朝代', '朝廷', '朝向', '朝着', '朝阳', '朝鲜'],
        'zhāo': ['朝阳', '朝气', '朝霞', '朝夕', '一朝一夕']
      },
      '空': {
        'kōng': ['空气', '空间', '天空', '空虚', '空旷', '空话'],
        'kòng': ['空闲', '空隙', '空地', '抽空', '填空', '空白']
      },
      '难': {
        'nán': ['困难', '难题', '难过', '难受', '艰难', '难看'],
        'nàn': ['灾难', '难民', '遇难', '逃难', '避难']
      },
      '传': {
        'chuán': ['传说', '传播', '传递', '传染', '传承', '相传'],
        'zhuàn': ['传记', '自传', '列传', '水浒传']
      },
      '调': {
        'diào': ['调查', '调整', '调动', '强调', '单调', '声调'],
        'tiáo': ['调皮', '调节', '调解', '协调', '调味', '调养']
      },
      '种': {
        'zhǒng': ['种子', '种类', '种族', '品种', '各种', '播种'],
        'zhòng': ['种地', '种田', '种植', '耕种', '种花']
      },
      '便': {
        'biàn': ['方便', '便利', '随便', '便条', '便捷'],
        'pián': ['便宜', '大腹便便']
      },
      '参': {
        'cān': ['参加', '参观', '参与', '参考', '参战'],
        'shēn': ['人参', '海参', '参汤', '党参']
      },
      '省': {
        'shěng': ['省份', '节省', '省心', '省事', '省略'],
        'xǐng': ['反省', '省悟', '省亲', '不省人事']
      },
      '着': {
        'zhe': ['看着', '听着', '走着', '说着', '想着'],  // 助词
        'zhuó': ['着装', '着陆', '着落', '着手', '着重'],
        'zháo': ['着急', '着火', '着凉', '睡着', '着迷'],
        'zhāo': ['着数', '高着', '绝着']
      }
    }

    // 上下文规则（正则匹配，优先级更高）
    this.contextRules = [
      // "还" 的规则
      {
        char: '还',
        tests: [
          { pattern: /还(没|有|是|好|要|可以|能|早|多|行)/, pinyin: 'hái' },
          { pattern: /(归|偿|返)还/, pinyin: 'huán' },
          { pattern: /还(书|钱|债|礼|击|价|手)/, pinyin: 'huán' },
          { pattern: /(奉|退)还/, pinyin: 'huán' }
        ]
      },
      // "重" 的规则
      {
        char: '重',
        tests: [
          { pattern: /重(新|复|来|写|叠|逢|合|修|生|建|演)/, pinyin: 'chóng' },
          { pattern: /(严|沉|尊|看|敬|尊|珍)重/, pinyin: 'zhòng' },
          { pattern: /重(要|点|量|视|任|担|大)/, pinyin: 'zhòng' }
        ]
      },
      // "行" 的规则
      {
        char: '行',
        tests: [
          { pattern: /银(行|行业|商行)/, pinyin: 'háng' },
          { pattern: /(内|外)行/, pinyin: 'háng' },
          { pattern: /行(走|动|为|程|人|政)/, pinyin: 'xíng' },
          { pattern: /(不|可|执|实|施)行/, pinyin: 'xíng' },
          { pattern: /行(家|情)/, pinyin: 'háng' }
        ]
      },
      // "长" 的规则
      {
        char: '长',
        tests: [
          { pattern: /长(大|辈|官)/, pinyin: 'zhǎng' },
          { pattern: /(成|增|上)长/, pinyin: 'zhǎng' },
          { pattern: /长(度|江|途|久|短|城|处)/, pinyin: 'cháng' },
          { pattern: /(漫|特)长/, pinyin: 'cháng' }
        ]
      },
      // "了" 的规则
      {
        char: '了',
        tests: [
          { pattern: /了(解|结|断|却|事|悟)/, pinyin: 'liǎo' },
          { pattern: /了不起/, pinyin: 'liǎo' },
          { pattern: /(明|知)了/, pinyin: 'liǎo' },
          { pattern: /(好|来|去|看|听|做|吃|喝|睡)了/, pinyin: 'le' }
        ]
      },
      // "得" 的规则
      {
        char: '得',
        tests: [
          { pattern: /(跑|走|说|做|看|听|写|读)得/, pinyin: 'de' },  // 补语
          { pattern: /得(到|奖|意|体|逞|失|益)/, pinyin: 'dé' },
          { pattern: /(获|心)得/, pinyin: 'dé' },
          { pattern: /得(去|做|走|买|看|说|想)/, pinyin: 'děi' }
        ]
      },
      // "地" 的规则
      {
        char: '地',
        tests: [
          { pattern: /(慢|轻|悄|认真|仔细|高兴|飞快|慢慢|轻轻)地/, pinyin: 'de' },
          { pattern: /地(方|土|面|址|点|球|场)/, pinyin: 'dì' },
          { pattern: /(大|天|目的)地/, pinyin: 'dì' }
        ]
      },
      // "为" 的规则
      {
        char: '为',
        tests: [
          { pattern: /(行|成|认|以|作)为/, pinyin: 'wéi' },
          { pattern: /为(了|什么|何|此|着)/, pinyin: 'wèi' },
          { pattern: /因(为|着)/, pinyin: 'wèi' }
        ]
      },
      // "着" 的规则
      {
        char: '着',
        tests: [
          { pattern: /(看|听|走|说|想|站|坐|躺)着/, pinyin: 'zhe' },
          { pattern: /着(装|陆|落|手|重)/, pinyin: 'zhuó' },
          { pattern: /(急|火|凉|迷)/, pinyin: 'zháo' },
          { pattern: /睡(着|不着)/, pinyin: 'zháo' }
        ]
      }
    ]

    // X-SAMPA 音标映射（用于 Azure TTS）
    this.xsampaMap = {
      'hái': 'hai2', 'huán': 'huan2',
      'zhòng': 'zhong4', 'chóng': 'chong2',
      'xíng': 'xing2', 'háng': 'hang2',
      'cháng': 'chang2', 'zhǎng': 'zhang3',
      'le': 'le5', 'liǎo': 'liao3',
      'dé': 'de2', 'děi': 'dei3', 'de': 'de5',
      'dì': 'di4', 'wéi': 'wei2', 'wèi': 'wei4',
      'shù': 'shu4', 'shǔ': 'shu3',
      'lè': 'le4', 'yuè': 'yue4',
      'jué': 'jue2', 'jiào': 'jiao4',
      'hǎo': 'hao3', 'hào': 'hao4',
      'shǎo': 'shao3', 'shào': 'shao4',
      'zhǐ': 'zhi3', 'zhī': 'zhi1',
      'chà': 'cha4', 'chā': 'cha1', 'chāi': 'chai1',
      'fā': 'fa1', 'fà': 'fa4',
      'bèi': 'bei4', 'bēi': 'bei1',
      'cháo': 'chao2', 'zhāo': 'zhao1',
      'kōng': 'kong1', 'kòng': 'kong4',
      'nán': 'nan2', 'nàn': 'nan4',
      'chuán': 'chuan2', 'zhuàn': 'zhuan4',
      'diào': 'diao4', 'tiáo': 'tiao2',
      'zhǒng': 'zhong3', 'zhòng': 'zhong4',
      'biàn': 'bian4', 'pián': 'pian2',
      'cān': 'can1', 'shēn': 'shen1',
      'shěng': 'sheng3', 'xǐng': 'xing3',
      'zhe': 'zhe5', 'zhuó': 'zhuo2', 'zháo': 'zhao2', 'zhāo': 'zhao1'
    }
  }

  /**
   * 根据上下文判断多音字读音
   * @param {string} char - 多音字
   * @param {string} context - 包含该字的上下文（前后各5-10字）
   * @returns {string|null} 拼音，如果无法判断返回 null
   */
  resolve(char, context) {
    // 1. 先检查规则匹配（优先级更高）
    const rule = this.contextRules.find(r => r.char === char)
    if (rule) {
      for (const test of rule.tests) {
        if (test.pattern.test(context)) {
          return test.pinyin
        }
      }
    }

    // 2. 检查词典匹配
    const entry = this.dictionary[char]
    if (!entry) return null

    for (const [pinyin, words] of Object.entries(entry)) {
      for (const word of words) {
        if (context.includes(word)) {
          return pinyin
        }
      }
    }

    // 3. 返回默认读音（第一个）
    return Object.keys(entry)[0]
  }

  /**
   * 为文本添加拼音标注（用于 Azure TTS）
   * @param {string} text - 原始文本
   * @returns {string} - 带拼音标注的 SSML
   */
  annotateWithPinyin(text) {
    let result = text
    const processedChars = new Set()

    // 找出所有多音字并标注
    for (const char of Object.keys(this.dictionary)) {
      if (processedChars.has(char)) continue

      const regex = new RegExp(char, 'g')
      result = result.replace(regex, (match, offset) => {
        // 获取上下文（前后各8个字符）
        const start = Math.max(0, offset - 8)
        const end = Math.min(text.length, offset + 9)
        const context = text.slice(start, end)

        const pinyin = this.resolve(char, context)
        if (pinyin) {
          // Azure SSML 拼音标注格式
          const xsampa = this.toXSampa(pinyin)
          return `<phoneme alphabet="x-sampa" ph="${xsampa}">${char}</phoneme>`
        }
        return char
      })

      processedChars.add(char)
    }

    return result
  }

  /**
   * 转换为 X-SAMPA 音标（Azure TTS 格式）
   * @param {string} pinyin - 拼音
   * @returns {string} - X-SAMPA 音标
   */
  toXSampa(pinyin) {
    return this.xsampaMap[pinyin] || pinyin
  }

  /**
   * 批量处理文本中的多音字
   * @param {string} text - 原始文本
   * @returns {Array<{char: string, pinyin: string, position: number}>}
   */
  findPolyphonicChars(text) {
    const results = []

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (this.dictionary[char]) {
        const start = Math.max(0, i - 8)
        const end = Math.min(text.length, i + 9)
        const context = text.slice(start, end)
        const pinyin = this.resolve(char, context)

        results.push({
          char,
          pinyin,
          position: i,
          context
        })
      }
    }

    return results
  }

  /**
   * 检查字符是否为多音字
   * @param {string} char - 字符
   * @returns {boolean}
   */
  isPolyphonic(char) {
    return !!this.dictionary[char]
  }

  /**
   * 获取多音字的所有可能读音
   * @param {string} char - 多音字
   * @returns {Array<string>} 拼音列表
   */
  getPronunciations(char) {
    const entry = this.dictionary[char]
    return entry ? Object.keys(entry) : []
  }
}

// 导出单例
export default new PolyphonicService()