/**
 * TTSEngine - TTS 引擎服务（运行在 Electron 主进程）
 * 支持 Edge TTS 和 Azure TTS
 */

const { exec } = require('child_process')
const https = require('https')
const fs = require('fs')
const path = require('path')

class TTSEngine {
  constructor() {
    // Edge TTS 可用的中文声音（2024年验证）
    this.edgeVoices = {
      xiaoxiao: 'zh-CN-XiaoxiaoNeural',      // 晓晓（女声-温柔）
      xiaoyi: 'zh-CN-XiaoyiNeural',          // 晓伊（女声-活泼）
      yunjian: 'zh-CN-YunjianNeural',        // 云健（男声-激情）
      yunxi: 'zh-CN-YunxiNeural',            // 云希（男声-年轻）
      yunxia: 'zh-CN-YunxiaNeural',          // 云夏（男声-可爱）
      yunyang: 'zh-CN-YunyangNeural',        // 云扬（男声-专业）
      xiaobei: 'zh-CN-liaoning-XiaobeiNeural', // 晓北（女声-东北方言）
      xiaoni: 'zh-CN-shaanxi-XiaoniNeural',  // 晓妮（女声-陕西方言）
    }

    this.azureConfig = {
      key: process.env.AZURE_TTS_KEY || '',
      region: process.env.AZURE_TTS_REGION || 'eastasia'
    }

    this.cacheDir = null
  }

  initCacheDir(userDataPath) {
    this.cacheDir = path.join(userDataPath, 'tts_cache')
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  getAvailableVoices() {
    return Object.entries(this.edgeVoices).map(([key, name]) => ({
      key,
      name,
      displayName: this.getVoiceDisplayName(key)
    }))
  }

  getVoiceDisplayName(key) {
    const names = {
      xiaoxiao: '晓晓（女声-温柔）',
      xiaoyi: '晓伊（女声-活泼）',
      yunjian: '云健（男声-激情）',
      yunxi: '云希（男声-年轻）',
      yunxia: '云夏（男声-可爱）',
      yunyang: '云扬（男声-专业）',
      xiaobei: '晓北（女声-东北话）',
      xiaoni: '晓妮（女声-陕西话）',
    }
    return names[key] || key
  }

  async synthesizeWithEdge(text, options = {}) {
    const { voice = 'xiaoxiao', rate = 0, pitch = 0 } = options
    const voiceName = this.edgeVoices[voice] || this.edgeVoices.xiaoxiao
    const rateStr = rate === 0 ? '+0%' : `${rate > 0 ? '+' : ''}${rate}%`

    return new Promise((resolve, reject) => {
      const tempDir = this.cacheDir || require('os').tmpdir()
      const timestamp = Date.now() + Math.floor(Math.random() * 10000)
      const tempTextFile = path.join(tempDir, `tts_text_${timestamp}.txt`)
      const tempAudioFile = path.join(tempDir, `tts_${timestamp}.mp3`)

      const cleanedText = text
        .replace(/["\\]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (!cleanedText || cleanedText.length < 2) {
        reject(new Error('文本太短或为空'))
        return
      }

      fs.writeFile(tempTextFile, cleanedText, 'utf8', (writeErr) => {
        if (writeErr) {
          reject(new Error(`写入文本文件失败: ${writeErr.message}`))
          return
        }

        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
        // 构建命令，pitch 为 0 时省略该参数
        let cmd = `${pythonCmd} -m edge_tts --voice "${voiceName}" --rate="${rateStr}"`
        if (pitch !== 0) {
          const pitchStr = `${pitch > 0 ? '+' : ''}${pitch}%`
          cmd += ` --pitch="${pitchStr}"`
        }
        cmd += ` --file "${tempTextFile}" --write-media "${tempAudioFile}"`

        exec(cmd, { maxBuffer: 1024 * 1024 * 10, timeout: 60000 }, (error, stdout, stderr) => {
          fs.unlink(tempTextFile, () => {})

          if (error) {
            console.error('Edge TTS 执行错误:', error.message)
            reject(new Error(`Edge TTS 执行失败: ${error.message}`))
            return
          }

          // 等待文件生成
          let attempts = 0
          const maxAttempts = 100

          const checkFile = () => {
            attempts++

            if (!fs.existsSync(tempAudioFile)) {
              if (attempts < maxAttempts) {
                setTimeout(checkFile, 100)
                return
              }
              reject(new Error('音频文件未生成'))
              return
            }

            // 等待文件写入完成
            setTimeout(() => {
              fs.stat(tempAudioFile, (statErr, stats) => {
                if (statErr || stats.size === 0) {
                  if (attempts < maxAttempts) {
                    setTimeout(checkFile, 100)
                    return
                  }
                  reject(new Error('音频文件无效'))
                  return
                }

                fs.readFile(tempAudioFile, (err, data) => {
                  fs.unlink(tempAudioFile, () => {})
                  if (err || !data || data.length === 0) {
                    reject(new Error('读取音频失败'))
                  } else {
                    resolve(data)
                  }
                })
              })
            }, 200)
          }

          checkFile()
        })
      })
    })
  }

  async synthesizeWithAzure(ssml) {
    if (!this.azureConfig.key) {
      throw new Error('Azure TTS key not configured')
    }

    const url = `https://${this.azureConfig.region}.tts.speech.microsoft.com/cognitiveservices/v1`

    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.azureConfig.key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'BookReader-TTS'
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Azure TTS failed with status ${res.statusCode}`))
          return
        }

        const chunks = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      })

      req.on('error', reject)
      req.write(ssml)
      req.end()
    })
  }

  setAzureConfig(key, region) {
    this.azureConfig.key = key
    this.azureConfig.region = region || 'eastasia'
  }

  async checkEdgeTTS() {
    return new Promise((resolve) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      exec(`${pythonCmd} -c "import edge_tts; print('ok')"`, (error) => {
        resolve(!error)
      })
    })
  }

  async synthesize(text, options = {}) {
    const { engine = 'edge' } = options

    if (engine === 'azure') {
      const audio = await this.synthesizeWithAzure(text)
      return { audio, format: 'mp3' }
    } else {
      const audio = await this.synthesizeWithEdge(text, options)
      return { audio, format: 'mp3' }
    }
  }
}

module.exports = new TTSEngine()