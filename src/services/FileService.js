const fs = require('fs')
const path = require('path')

class FileService {
  // 读取文件内容
  static async readFile(filePath) {
    try {
      // 读取文件为 Buffer
      const buffer = fs.readFileSync(filePath)
      
      // 使用 UTF-8 解码
      const content = buffer.toString('utf8')
      return { content, encoding: 'utf8' }
    } catch (error) {
      console.error('读取文件失败:', error)
      return { content: '', encoding: 'utf8' }
    }
  }

  // 解析章节
  static parseChapters(content) {
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
          // 检查是否有前言/简介内容
          const introContent = currentContent.join('\n').trim()
          if (introContent) {
            // 添加前言/简介章节
            chapters.push({
              title: '前言/简介',
              content: introContent
            })
          }
          hasFoundFirstChapter = true
        }
        
        // 如果已经有当前章节，保存它
        if (currentChapter) {
          chapters.push({
            title: currentChapter,
            content: currentContent.join('\n')
          })
        }
        
        // 开始新章节
        currentChapter = match[1]
        currentContent = [line]
      } else {
        // 向当前内容添加行
        currentContent.push(line)
      }
    }

    // 保存最后一个章节
    if (currentChapter) {
      chapters.push({
        title: currentChapter,
        content: currentContent.join('\n')
      })
    } else if (currentContent.length > 0) {
      // 如果没有找到任何章节，将所有内容作为一个章节
      chapters.push({
        title: '正文',
        content: currentContent.join('\n')
      })
    }

    return chapters
  }

  // 获取文件信息
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
        mtime: stats.mtime
      }
    } catch (error) {
      console.error('获取文件信息失败:', error)
      return { name: '', ext: '', size: 0, mtime: new Date() }
    }
  }
}

module.exports = FileService