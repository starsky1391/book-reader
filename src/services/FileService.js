const fs = require('fs')
const path = require('path')
const EPubModule = require('epub')
const EPub = EPubModule.default || EPubModule.EPub || EPubModule

class FileService {
  // ==================== 通用方法 ====================

  /**
   * 读取文件内容
   * @param {string} filePath - 文件路径
   * @returns {Promise<{content: string, encoding: string, type: string}>}
   */
  static async readFile(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    
    if (ext === '.epub') {
      return this.readEpubFile(filePath)
    }
    
    return this.readTxtFile(filePath)
  }

  /**
   * 读取 TXT 文件
   */
  static async readTxtFile(filePath) {
    try {
      const buffer = fs.readFileSync(filePath)
      const content = buffer.toString('utf8')
      return { content, encoding: 'utf8', type: 'txt' }
    } catch (error) {
      console.error('读取 TXT 文件失败:', error)
      return { content: '', encoding: 'utf8', type: 'txt' }
    }
  }

  /**
   * 读取 EPUB 文件（返回元数据）
   */
  static async readEpubFile(filePath) {
    try {
      const epub = new EPub(filePath)
      await epub.parse()
      
      return {
        content: '',
        encoding: 'utf8',
        type: 'epub',
        metadata: {
          title: epub.metadata.title,
          author: epub.metadata.creator,
          language: epub.metadata.language,
          publisher: epub.metadata.publisher
        },
        flow: epub.flow,
        toc: epub.toc
      }
    } catch (error) {
      console.error('读取 EPUB 文件失败:', error)
      return { content: '', encoding: 'utf8', type: 'epub', error: error.message }
    }
  }

  // ==================== 章节解析 ====================

  /**
   * 解析章节（自动判断文件类型）
   */
  static async parseChapters(content, type = 'txt', epubPath = null) {
    if (type === 'epub' && epubPath) {
      return this.parseEpubChapters(epubPath)
    }
    
    return this.parseTxtChapters(content)
  }

  /**
   * 解析 TXT 章节
   */
  static parseTxtChapters(content) {
    const chapters = []
    const lines = content.split(/\r?\n/)
    let currentChapter = null
    let currentContent = []
    let hasFoundFirstChapter = false

    const chapterRegex = /^\s*(第[一二三四五六七八九十百千万0-9]+[章节回部卷]).*/

    for (const line of lines) {
      const match = line.match(chapterRegex)
      if (match) {
        if (!hasFoundFirstChapter) {
          const introContent = currentContent.join('\n').trim()
          if (introContent) {
            chapters.push({
              title: '前言/简介',
              content: introContent,
              type: 'txt'
            })
          }
          hasFoundFirstChapter = true
        }
        
        if (currentChapter) {
          chapters.push({
            title: currentChapter,
            content: currentContent.join('\n'),
            type: 'txt'
          })
        }
        
        currentChapter = line.trim()
        currentContent = [line]
      } else {
        currentContent.push(line)
      }
    }

    if (currentChapter) {
      chapters.push({
        title: currentChapter,
        content: currentContent.join('\n'),
        type: 'txt'
      })
    } else if (currentContent.length > 0) {
      chapters.push({
        title: '正文',
        content: currentContent.join('\n'),
        type: 'txt'
      })
    }

    return chapters
  }

  /**
   * 解析 EPUB 章节
   */
  static async parseEpubChapters(epubPath) {
    try {
      const epub = new EPub(epubPath)
      await epub.parse()
      
      const chapters = []
      const tocMap = this.buildTocMap(epub.toc)
      const imageCache = new Map()
      const manifestMap = this.buildManifestMap(epub)
      
      for (let i = 0; i < epub.flow.length; i++) {
        const chapter = epub.flow[i]
        const content = await this.getEpubChapterContent(epub, chapter.id, imageCache, manifestMap)
        const title = tocMap.get(chapter.id) || chapter.title || `第 ${i + 1} 章`
        
        chapters.push({
          title,
          content,
          type: 'html',
          id: chapter.id,
          href: chapter.href
        })
      }
      
      return chapters
    } catch (error) {
      console.error('解析 EPUB 章节失败:', error)
      return []
    }
  }
  
  /**
   * 构建 manifest 映射（href -> id）
   */
  static buildManifestMap(epub) {
    const map = {}
    
    if (epub.manifest) {
      for (const [id, item] of Object.entries(epub.manifest)) {
        if (item && item.href) {
          map[item.href] = id
          map[item.href.toLowerCase()] = id
          const fileName = item.href.split('/').pop()
          map[fileName] = id
          map[fileName.toLowerCase()] = id
          const nameWithoutExt = fileName.replace(/\.[^.]+$/, '')
          map[nameWithoutExt] = id
          map[nameWithoutExt.toLowerCase()] = id
        }
      }
    }
    
    return map
  }

  /**
   * 获取 EPUB 单个章节内容
   */
  static async getEpubChapterContent(epub, chapterId, imageCache = new Map(), manifestMap = {}) {
    try {
      let text = await epub.getChapter(chapterId)
      text = await this.processEpubImages(epub, text, imageCache, manifestMap)
      return this.sanitizeHtml(text)
    } catch (error) {
      console.error(`获取章节 ${chapterId} 失败:`, error)
      return ''
    }
  }

  /**
   * 处理 EPUB 中的图片引用
   */
  static async processEpubImages(epub, html, imageCache, manifestMap = {}) {
    if (!html) return html
    
    const imageSrcs = new Set()
    
    // 匹配标准 <img> 标签
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match
    while ((match = imgRegex.exec(html)) !== null) {
      imageSrcs.add(match[1])
    }
    
    // 匹配 SVG <image> 标签的 xlink:href
    const svgImageRegex = /<image[^>]+xlink:href=["']([^"']+)["'][^>]*>/gi
    while ((match = svgImageRegex.exec(html)) !== null) {
      imageSrcs.add(match[1])
    }
    
    // 匹配 SVG <image> 标签的 href
    const svgImageRegex2 = /<image[^>]+href=["']([^"']+)["'][^>]*>/gi
    while ((match = svgImageRegex2.exec(html)) !== null) {
      imageSrcs.add(match[1])
    }
    
    // 加载所有图片
    const promises = []
    for (const src of imageSrcs) {
      const imageId = this.findImageId(src, manifestMap)
      if (imageId && !imageCache.has(imageId)) {
        promises.push(
          this.loadEpubImage(epub, imageId, imageCache)
            .catch(err => console.error(`[EPUB] 加载图片失败: ${imageId}`, err.message))
        )
      }
    }
    
    await Promise.all(promises)
    
    // 替换图片 src 为 base64
    html = html.replace(imgRegex, (fullMatch, src) => {
      const imageId = this.findImageId(src, manifestMap)
      const base64 = imageCache.get(imageId)
      if (base64) return fullMatch.replace(src, base64)
      return fullMatch
    })
    
    html = html.replace(svgImageRegex, (fullMatch, src) => {
      const imageId = this.findImageId(src, manifestMap)
      const base64 = imageCache.get(imageId)
      if (base64) return fullMatch.replace(src, base64)
      return fullMatch
    })
    
    html = html.replace(svgImageRegex2, (fullMatch, src) => {
      const imageId = this.findImageId(src, manifestMap)
      const base64 = imageCache.get(imageId)
      if (base64) return fullMatch.replace(src, base64)
      return fullMatch
    })
    
    return html
  }

  /**
   * 查找图片 ID
   */
  static findImageId(src, manifestMap = {}) {
    if (!src) return null
    
    let cleanPath = src
      .replace(/^\.\.\//, '')
      .replace(/^\.\//, '')
      .replace(/\\/g, '/')
    
    if (manifestMap[cleanPath]) return manifestMap[cleanPath]
    if (manifestMap[cleanPath.toLowerCase()]) return manifestMap[cleanPath.toLowerCase()]
    
    const fileName = cleanPath.split('/').pop()
    if (manifestMap[fileName]) return manifestMap[fileName]
    if (manifestMap[fileName.toLowerCase()]) return manifestMap[fileName.toLowerCase()]
    
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '')
    if (manifestMap[nameWithoutExt]) return manifestMap[nameWithoutExt]
    if (manifestMap[nameWithoutExt.toLowerCase()]) return manifestMap[nameWithoutExt.toLowerCase()]
    
    return cleanPath
  }

  /**
   * 加载 EPUB 图片并转换为 base64
   */
  static async loadEpubImage(epub, imageId, imageCache) {
    const tryMethods = [
      async () => await epub.getImage(imageId),
      async () => await epub.getFile(imageId),
      async () => {
        if (!imageId.includes('.')) {
          for (const ext of ['.jpg', '.jpeg', '.png', '.gif', '.webp']) {
            try {
              const result = await epub.getImage(imageId + ext)
              if (result && result.data) return result
            } catch (e) { /* continue */ }
          }
        }
        return null
      }
    ]
    
    for (const method of tryMethods) {
      try {
        const result = await method()
        if (result && result.data && result.mimeType) {
          const base64 = `data:${result.mimeType};base64,${result.data.toString('base64')}`
          imageCache.set(imageId, base64)
          return base64
        }
      } catch (error) {
        // 继续尝试下一种方法
      }
    }
    
    return null
  }

  /**
   * 构建 TOC ID 到标题的映射
   */
  static buildTocMap(toc) {
    const map = new Map()
    
    const traverse = (items) => {
      for (const item of items) {
        if (item.id && item.title) {
          map.set(item.id, item.title)
        }
        if (item.href && item.title) {
          const anchor = item.href.split('#')[1] || item.href
          map.set(anchor, item.title)
        }
        if (item.subitems) {
          traverse(item.subitems)
        }
      }
    }
    
    traverse(toc)
    return map
  }

  /**
   * 清理 HTML 内容
   */
  static sanitizeHtml(html) {
    if (!html) return ''
    
    let cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    
    cleaned = cleaned.replace(/\s*on\w+="[^"]*"/gi, '')
    cleaned = cleaned.replace(/\s*on\w+='[^']*'/gi, '')
    cleaned = cleaned.replace(/href="javascript:[^"]*"/gi, 'href="#"')
    
    return cleaned.trim()
  }

  // ==================== 文件信息 ====================

  /**
   * 获取文件信息
   */
  static getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath)
      const fileName = path.basename(filePath)
      const ext = path.extname(fileName)
      const name = path.basename(fileName, ext)

      return {
        name,
        ext,
        size: stats.size,
        mtime: stats.mtime,
        type: ext.toLowerCase() === '.epub' ? 'epub' : 'txt'
      }
    } catch (error) {
      console.error('获取文件信息失败:', error)
      return { name: '', ext: '', size: 0, mtime: new Date(), type: 'txt' }
    }
  }

  /**
   * 检测文件类型
   */
  static getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    return ext === '.epub' ? 'epub' : 'txt'
  }

  // ==================== 封面提取 ====================

  /**
   * 获取 EPUB 封面图片（base64）- 直接获取第一章的第一张图片
   * @param {string} epubPath - EPUB 文件路径
   * @returns {Promise<string|null>} - base64 格式的封面图片，或 null
   */
  static async getEpubCover(epubPath) {
    try {
      const epub = new EPub(epubPath)
      await epub.parse()
      
      if (!epub.flow || epub.flow.length === 0) {
        return null
      }
      
      const firstChapter = epub.flow[0]
      const manifestMap = this.buildManifestMap(epub)
      const content = await epub.getChapter(firstChapter.id)
      
      // 匹配所有图片类型
      const patterns = [
        /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
        /<image[^>]+xlink:href=["']([^"']+)["'][^>]*>/i,
        /<image[^>]+href=["']([^"']+)["'][^>]*>/i
      ]
      
      for (const regex of patterns) {
        const match = content.match(regex)
        if (match && match[1]) {
          const imageId = this.findImageId(match[1], manifestMap)
          if (imageId) {
            const cover = await this.loadEpubImage(epub, imageId, new Map())
            if (cover) return cover
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('获取 EPUB 封面失败:', error)
      return null
    }
  }

  /**
   * 读取图片文件并转换为 base64
   * @param {string} imagePath - 图片文件路径
   * @returns {Promise<string|null>} - base64 格式的图片数据，或 null
   */
  static async readImageAsBase64(imagePath) {
    try {
      const ext = path.extname(imagePath).toLowerCase()
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml'
      }
      
      const mimeType = mimeTypes[ext] || 'image/jpeg'
      const buffer = fs.readFileSync(imagePath)
      const base64 = buffer.toString('base64')
      
      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      console.error('读取图片失败:', error)
      return null
    }
  }
}

module.exports = FileService
