import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 书架状态管理
 * 接管：书籍列表、当前书籍、阅读进度
 */
export const useLibraryStore = defineStore('library', () => {
  // ==================== 状态 ====================
  const books = ref([])
  const currentBook = ref({
    id: null,
    title: '未选择书籍',
    content: '请从左侧书架选择一本书开始阅读',
    chapters: [],
    currentChapterIndex: 0,
    type: 'txt' // 'txt' | 'epub'
  })

  // ==================== 计算属性 ====================
  const hasBooks = computed(() => books.value.length > 0)
  const currentChapter = computed(() => {
    if (!currentBook.value.chapters?.length) return null
    return currentBook.value.chapters[currentBook.value.currentChapterIndex]
  })
  const totalChapters = computed(() => currentBook.value.chapters?.length || 0)
  const isEpub = computed(() => currentBook.value.type === 'epub')

  // ==================== Actions ====================

  /**
   * 加载书架数据
   */
  async function loadBooks() {
    try {
      const savedBooks = await window.electron.store.getBooks()
      books.value = Array.isArray(savedBooks) ? savedBooks : []
    } catch (error) {
      console.error('加载书架数据失败:', error)
      books.value = []
    }
  }

  /**
   * 加载书籍
   */
  async function loadBook(bookId) {
    try {
      let book = books.value.find(b => b.id === bookId)
      if (!book) {
        await loadBooks()
        book = books.value.find(b => b.id === bookId)
      }
      
      if (!book) {
        console.error('书籍不存在:', bookId)
        return false
      }

      const fileInfo = await window.electron.file.getFileInfo(book.localPath)
      const fileType = fileInfo.type || 'txt'
      
      let chapters = []
      let content = ''
      
      if (fileType === 'epub') {
        // EPUB 文件：直接解析章节
        chapters = await window.electron.file.parseChapters('', 'epub', book.localPath)
        content = chapters[0]?.content || ''
      } else {
        // TXT 文件
        const result = await window.electron.file.readFile(book.localPath)
        content = result.content
        chapters = await window.electron.file.parseChapters(content, 'txt')
      }
      
      const readingProgress = await window.electron.store.getReadingProgress(bookId)
      
      currentBook.value = {
        id: book.id,
        title: book.title,
        content: content,
        chapters: chapters,
        currentChapterIndex: readingProgress.chapterIndex || 0,
        type: fileType
      }

      showChapterContent(currentBook.value.currentChapterIndex)
      await window.electron.store.saveSettings({ lastReadBookId: bookId })
      
      return true
    } catch (error) {
      console.error('加载书籍失败:', error)
      return false
    }
  }

  /**
   * 导入文件（支持 TXT 和 EPUB）
   */
  async function importFile() {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: '文本文件', extensions: ['txt'] },
          { name: 'EPUB 电子书', extensions: ['epub'] },
          { name: '所有支持的格式', extensions: ['txt', 'epub'] }
        ]
      })

      if (result.canceled || !result.filePaths.length) return false

      const filePath = result.filePaths[0]
      const fileInfo = await window.electron.file.getFileInfo(filePath)
      const fileType = fileInfo.type || 'txt'
      
      let chapters = []
      let content = ''
      let cover = null
      
      // 复制文件到库目录
      const copyResult = await window.electron.file.copyFileToLibrary(filePath)
      
      if (fileType === 'epub') {
        // EPUB 文件
        chapters = await window.electron.file.parseChapters('', 'epub', copyResult.path)
        content = chapters[0]?.content || ''
        // 获取 EPUB 封面
        cover = await window.electron.file.getEpubCover(copyResult.path)
      } else {
        // TXT 文件
        const result = await window.electron.file.readFile(copyResult.path)
        content = result.content
        chapters = await window.electron.file.parseChapters(content, 'txt')
      }

      // 创建书籍对象
      const newBook = {
        title: fileInfo.name,
        author: '未知作者',
        localPath: copyResult.path,
        chapters: [], // 不在 store 中保存章节内容
        type: fileType,
        cover: cover, // 封面图片 (base64)
        readingProgress: { chapterIndex: 0, lineIndex: 0 }
      }

      const savedBook = await window.electron.store.addBook(newBook)
      if (!savedBook) return false
      
      await loadBooks()
      
      currentBook.value = {
        id: savedBook.id,
        title: savedBook.title,
        content: content,
        chapters: chapters,
        currentChapterIndex: 0,
        type: fileType
      }

      showChapterContent(0)
      await window.electron.store.saveSettings({ lastReadBookId: savedBook.id })
      
      return true
    } catch (error) {
      console.error('导入文件失败:', error)
      return false
    }
  }

  /**
   * 删除书籍
   */
  async function deleteBook(bookId) {
    try {
      const success = await window.electron.store.deleteBook(bookId)
      if (!success) return false
      
      await loadBooks()
      
      if (currentBook.value.id === bookId) {
        const lastReadBookId = await window.electron.store.getLastReadBookId()
        if (lastReadBookId) {
          await loadBook(lastReadBookId)
        } else if (books.value.length > 0) {
          await loadBook(books.value[0].id)
        } else {
          resetCurrentBook()
        }
      }
      
      return true
    } catch (error) {
      console.error('删除书籍失败:', error)
      return false
    }
  }

  /**
   * 显示章节内容
   */
  function showChapterContent(chapterIndex) {
    if (!currentBook.value.chapters?.length) return
    
    const chapter = currentBook.value.chapters[chapterIndex]
    if (!chapter) return
    
    currentBook.value.content = chapter.content
    currentBook.value.currentChapterIndex = chapterIndex
    
    if (currentBook.value.id) {
      saveReadingProgress(chapterIndex, 0)
    }
  }

  /**
   * 保存阅读进度
   */
  async function saveReadingProgress(chapterIndex, lineIndex) {
    if (!currentBook.value.id) return
    await window.electron.store.saveReadingProgress(
      currentBook.value.id,
      chapterIndex,
      lineIndex
    )
  }

  /**
   * 切换章节
   */
  function changeChapter(direction) {
    if (!currentBook.value.chapters?.length) return false
    
    const newIndex = currentBook.value.currentChapterIndex + direction
    if (newIndex < 0 || newIndex >= currentBook.value.chapters.length) return false
    
    showChapterContent(newIndex)
    
    const contentElement = document.querySelector('.flex-1.p-6.overflow-y-auto')
    if (contentElement) contentElement.scrollTop = 0
    
    return true
  }

  /**
   * 选择章节
   */
  function selectChapter(chapterIndex) {
    showChapterContent(chapterIndex)
  }

  /**
   * 重置当前书籍
   */
  function resetCurrentBook() {
    currentBook.value = {
      id: null,
      title: '未选择书籍',
      content: '请从左侧书架选择一本书开始阅读',
      chapters: [],
      currentChapterIndex: 0,
      type: 'txt'
    }
  }

  /**
   * 清空所有数据
   */
  async function clearAll() {
    if (!confirm('确定要清空所有书籍和缓存吗？')) return false
    
    try {
      await window.electron.store.clearAll()
      await loadBooks()
      resetCurrentBook()
      return true
    } catch (error) {
      console.error('清空所有数据失败:', error)
      return false
    }
  }

  /**
   * 初始化
   */
  async function initialize() {
    await loadBooks()
    
    if (window.electron.library) {
      try {
        const libraryBooks = await window.electron.library.getBooks()
        if (libraryBooks?.length > 0) {
          const storeBookIds = books.value.map(book => book.localPath)
          const newBooks = libraryBooks.filter(book => !storeBookIds.includes(book.localPath))
          for (const book of newBooks) {
            await window.electron.store.addBook(book)
          }
          await loadBooks()
        }
      } catch (error) {
        console.error('加载库目录书籍失败:', error)
      }
    }
    
    // 不再自动加载书籍，保持书架视图
    // 用户需要手动点击书籍进入阅读视图
  }

  return {
    // 状态
    books,
    currentBook,
    
    // 计算属性
    hasBooks,
    currentChapter,
    totalChapters,
    isEpub,
    
    // Actions
    loadBooks,
    loadBook,
    importFile,
    deleteBook,
    showChapterContent,
    saveReadingProgress,
    changeChapter,
    selectChapter,
    resetCurrentBook,
    clearAll,
    initialize
  }
})
