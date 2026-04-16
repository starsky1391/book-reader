<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

// 书架数据
const books = ref([])

// 当前阅读的书籍内容
const currentBook = ref({
  id: null,
  title: '未选择书籍',
  content: '请从左侧书架选择一本书开始阅读',
  chapters: [],
  currentChapterIndex: 0
})

// 模式切换
const isDarkMode = ref(false)
const isEyeProtectionMode = ref(false)

// 听书控制
const isPlaying = ref(false)
const currentSpeed = ref(1.0)

// 面板状态管理
const activePanel = ref(null) // null, 'directory', 'settings'

// 设置面板标签页
const activeSettingTab = ref('preference') // preference, text, background, other

// 听书设置
const autoContinue = ref(true)

// 文字设置
const fontFamily = ref('system-ui')
const fontSize = ref(18)
const lineHeight = ref(1.5)
const letterSpacing = ref(0)
const textAlign = ref('left')

// 主题设置
const selectedTheme = ref('white')

// 保存文本设置
const saveTextSettings = async () => {
  await window.electron.store.saveSettings({
    fontFamily: fontFamily.value,
    fontSize: fontSize.value,
    lineHeight: lineHeight.value,
    letterSpacing: letterSpacing.value,
    textAlign: textAlign.value
  })
  
  // 实时更新字体
  document.documentElement.style.setProperty('--sans', fontFamily.value)
  
  // 实时更新文本对齐
  if (textAlign.value === 'justify') {
    document.documentElement.style.setProperty('--text-align', 'justify')
    // 强制应用 text-justify: inter-character
    const preElements = document.querySelectorAll('pre')
    preElements.forEach(el => {
      el.style.textJustify = 'inter-character'
    })
  } else {
    document.documentElement.style.setProperty('--text-align', textAlign.value)
    const preElements = document.querySelectorAll('pre')
    preElements.forEach(el => {
      el.style.textJustify = 'auto'
    })
  }
  
  // 实时更新行间距和字间距
  document.documentElement.style.setProperty('--line-height', lineHeight.value)
  document.documentElement.style.setProperty('--letter-spacing', letterSpacing.value + 'px')
}

// 保存主题设置
const saveThemeSettings = async () => {
  await window.electron.store.saveSettings({
    selectedTheme: selectedTheme.value,
    darkMode: isDarkMode.value,
    eyeProtectionMode: isEyeProtectionMode.value
  })
}

// 设置主题
const setTheme = async (theme) => {
  selectedTheme.value = theme
  
  switch (theme) {
    case 'white':
      isDarkMode.value = false
      isEyeProtectionMode.value = false
      // 设置背景为白色，文字为 #333333
      document.documentElement.style.setProperty('--bg', 'white')
      document.documentElement.style.setProperty('--text', '#333333')
      document.documentElement.style.setProperty('--text-h', '#000000')
      break
    case 'parchment':
      isDarkMode.value = false
      isEyeProtectionMode.value = false
      // 设置背景为羊皮纸色，文字为 #333333
      document.documentElement.style.setProperty('--bg', '#f5f0e6')
      document.documentElement.style.setProperty('--text', '#333333')
      document.documentElement.style.setProperty('--text-h', '#000000')
      break
    case 'green':
      isDarkMode.value = false
      isEyeProtectionMode.value = true
      // 设置背景为护眼色 #C7EDCC，文字为深色
      document.documentElement.style.setProperty('--bg', '#C7EDCC')
      document.documentElement.style.setProperty('--text', '#333333')
      document.documentElement.style.setProperty('--text-h', '#000000')
      break
    case 'dark':
      isDarkMode.value = true
      isEyeProtectionMode.value = false
      // 设置背景为 #1A1A1A，文字为浅灰
      document.documentElement.style.setProperty('--bg', '#1A1A1A')
      document.documentElement.style.setProperty('--text', '#CCCCCC')
      document.documentElement.style.setProperty('--text-h', '#FFFFFF')
      break
  }
  
  await saveThemeSettings()
}

// 清空所有数据
const clearAllData = async () => {
  if (confirm('确定要清空所有书籍和缓存吗？')) {
    try {
      // 调用StoreService的clearAll方法
      await window.electron.store.clearAll()
      
      // 重新加载书架数据
      await loadBooks()
      
      // 重置当前书籍
      currentBook.value = {
        id: null,
        title: '未选择书籍',
        content: '请从左侧书架选择一本书开始阅读',
        chapters: [],
        currentChapterIndex: 0
      }
      
      console.log('清空所有数据成功')
    } catch (error) {
      console.error('清空所有数据失败:', error)
    }
  }
}

// 当前朗读的句子索引
const currentSentenceIndex = ref(0)

// 开始/暂停听书
const togglePlay = () => {
  // 这里使用 Web Speech API 直接在渲染进程中实现
  if (window.speechSynthesis.speaking) {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      isPlaying.value = true
    } else {
      window.speechSynthesis.pause()
      isPlaying.value = false
    }
  } else {
    // 开始朗读当前章节
    if (currentBook.value.chapters && currentBook.value.chapters.length > 0) {
      const chapterIndex = currentBook.value.currentChapterIndex || 0
      const chapter = currentBook.value.chapters[chapterIndex]
      if (chapter) {
        // 分割章节内容为句子
        const sentences = chapter.content.split(/[。！？.!?]/).filter(s => s.trim())
        if (sentences.length > 0) {
          currentSentenceIndex.value = 0
          speakSentence(sentences, 0)
        }
      }
    }
  }
}

// 停止听书
const stopPlay = () => {
  window.speechSynthesis.cancel()
  isPlaying.value = false
  currentSentenceIndex.value = 0
}

// 跳到下一句
const nextSentence = () => {
  window.speechSynthesis.cancel()
  if (currentBook.value.chapters && currentBook.value.chapters.length > 0) {
    const chapterIndex = currentBook.value.currentChapterIndex || 0
    const chapter = currentBook.value.chapters[chapterIndex]
    if (chapter) {
      const sentences = chapter.content.split(/[。！？.!?]/).filter(s => s.trim())
      if (sentences.length > 0) {
        currentSentenceIndex.value = (currentSentenceIndex.value + 1) % sentences.length
        speakSentence(sentences, currentSentenceIndex.value)
      }
    }
  }
}

// 朗读句子
const speakSentence = (sentences, index) => {
  if (index >= sentences.length) {
    // 当前章节读完，尝试读下一章
    changeChapter(1)
    return
  }
  
  const utterance = new SpeechSynthesisUtterance(sentences[index])
  utterance.lang = 'zh-CN'
  utterance.rate = currentSpeed.value
  
  // 监听朗读结束事件
  utterance.onend = () => {
    currentSentenceIndex.value = index + 1
    speakSentence(sentences, currentSentenceIndex.value)
  }
  
  window.speechSynthesis.speak(utterance)
  isPlaying.value = true
  
  // 高亮当前句子
  highlightSentence(sentences[index])
}

// 高亮当前句子
const highlightSentence = (sentence) => {
  // 这里可以添加代码来高亮当前句子
  console.log('正在朗读:', sentence)
}

// 切换章节
const changeChapter = (direction) => {
  if (!currentBook.value.chapters || currentBook.value.chapters.length === 0) {
    return
  }
  
  const newIndex = currentBook.value.currentChapterIndex + direction
  
  // 边界检查
  if (newIndex < 0 || newIndex >= currentBook.value.chapters.length) {
    return
  }
  
  // 更新章节
  showChapterContent(newIndex)
  
  // 滚动到顶部
  const contentElement = document.querySelector('.flex-1.p-6.overflow-y-auto')
  if (contentElement) {
    contentElement.scrollTop = 0
  }
  
  // 如果正在听书，重新开始朗读新章节
  if (isPlaying.value) {
    window.speechSynthesis.cancel()
    const chapter = currentBook.value.chapters[newIndex]
    if (chapter) {
      const sentences = chapter.content.split(/[。！？.!?]/).filter(s => s.trim())
      if (sentences.length > 0) {
        currentSentenceIndex.value = 0
        speakSentence(sentences, 0)
      }
    }
  }
}

// 调节语速
const changeSpeed = (speed) => {
  currentSpeed.value = speed
  // 保存语速设置
  window.electron.store.saveSettings({ speed: speed })
}

// 监听播放状态
watch(isPlaying, (newValue) => {
  // 这里可以添加播放状态变化的逻辑
})

// 导入文件
const importFile = async () => {
  try {
    // 使用 Electron 的 dialog 模块选择文件
    const result = await window.electron.dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: '文本文件', extensions: ['txt'] }
      ]
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      console.log('选择的文件:', filePath)

      try {
        // 读取文件内容
        const { content } = await window.electron.file.readFile(filePath)
        
        // 解析章节
        const chapters = await window.electron.file.parseChapters(content)
        console.log('解析出的章节数:', chapters.length)

        // 获取文件信息
        const fileInfo = await window.electron.file.getFileInfo(filePath)
        
        // 复制文件到library目录
        const copyResult = await window.electron.file.copyFileToLibrary(filePath)
        console.log('复制文件结果:', copyResult)
        
        // 创建书籍对象
        const newBook = {
          title: fileInfo.name,
          author: '未知作者',
          localPath: copyResult.path, // 使用复制后的路径
          chapters,
          readingProgress: { chapterIndex: 0, lineIndex: 0 }
        }

        // 添加到书架
        console.log('准备添加书籍:', newBook)
        const savedBook = await window.electron.store.addBook(newBook)
        console.log('添加书籍结果:', savedBook)
        if (savedBook) {
          // 重新加载书架数据
          console.log('重新加载书架数据')
          await loadBooks()
          console.log('书架数据加载完成:', books.value)

          // 加载并显示新导入的书籍
          // 直接使用 savedBook 对象，而不是在 books.value 中查找
          try {
            // 读取文件内容
            console.log('读取文件内容:', savedBook.localPath)
            const { content } = await window.electron.file.readFile(savedBook.localPath)
            
            // 解析章节
            console.log('解析章节')
            const chapters = await window.electron.file.parseChapters(content)
            console.log('解析出的章节数:', chapters.length)
            
            // 更新当前书籍
            currentBook.value = {
              id: savedBook.id,
              title: savedBook.title,
              content: content,
              chapters: chapters,
              currentChapterIndex: savedBook.readingProgress?.chapterIndex || 0
            }

            // 显示当前章节内容
            showChapterContent(currentBook.value.currentChapterIndex)

            // 保存最后阅读的书籍 ID
            await window.electron.store.saveSettings({ lastReadBookId: savedBook.id })

            console.log('文件导入成功:', savedBook.title)
          } catch (error) {
            console.error('加载书籍失败:', error)
          }
        } else {
          console.error('添加书籍失败')
        }
      } catch (readError) {
        console.error('读取文件失败:', readError)
      }
    }
  } catch (error) {
    console.error('导入文件失败:', error)
  }
}

// 加载书架数据
const loadBooks = async () => {
  try {
    const savedBooks = await window.electron.store.getBooks()
    console.log('获取到的书架数据:', savedBooks)
    if (Array.isArray(savedBooks)) {
      books.value = savedBooks
    } else {
      books.value = []
    }
  } catch (error) {
    console.error('加载书架数据失败:', error)
    books.value = []
  }
}

// 加载书籍
const loadBook = async (bookId) => {
  try {
    // 先在 books.value 中查找书籍
    let book = books.value.find(b => b.id === bookId)
    
    // 如果找不到，从存储中重新加载书架数据
    if (!book) {
      await loadBooks()
      book = books.value.find(b => b.id === bookId)
    }
    
    if (!book) {
      console.error('书籍不存在:', bookId)
      return
    }

    // 读取文件内容
    const { content } = await window.electron.file.readFile(book.localPath)
    
    // 解析章节
    const chapters = await window.electron.file.parseChapters(content)
    
    // 获取阅读进度
    const readingProgress = await window.electron.store.getReadingProgress(bookId)
    console.log('获取到的阅读进度:', readingProgress)
    
    // 更新当前书籍
    currentBook.value = {
      id: book.id,
      title: book.title,
      content: content,
      chapters: chapters,
      currentChapterIndex: readingProgress.chapterIndex || 0
    }

    // 显示当前章节内容
    showChapterContent(currentBook.value.currentChapterIndex)

    // 保存最后阅读的书籍 ID
    await window.electron.store.saveSettings({ lastReadBookId: bookId })
  } catch (error) {
    console.error('加载书籍失败:', error)
  }
}

// 显示章节内容
const showChapterContent = (chapterIndex) => {
  if (currentBook.value.chapters && currentBook.value.chapters.length > 0) {
    const chapter = currentBook.value.chapters[chapterIndex]
    if (chapter) {
      currentBook.value.content = chapter.content
      currentBook.value.currentChapterIndex = chapterIndex
      // 保存阅读进度
      if (currentBook.value.id) {
        window.electron.store.saveReadingProgress(
          currentBook.value.id,
          chapterIndex,
          0 // 这里可以添加代码来保存当前行索引
        )
      }
    }
  }
}

// 切换面板
const togglePanel = (panel) => {
  if (activePanel.value === panel) {
    // 如果当前面板已经是要切换的面板，则关闭它
    activePanel.value = null
  } else {
    // 否则，打开指定面板
    activePanel.value = panel
  }
}

// 关闭面板
const closePanel = () => {
  activePanel.value = null
}

// 选择章节
const selectChapter = (chapterIndex) => {
  showChapterContent(chapterIndex)
  // 关闭目录面板
  activePanel.value = null
}

// 删除书籍
const deleteBook = async (bookId) => {
  try {
    const success = await window.electron.store.deleteBook(bookId)
    if (success) {
      // 重新加载书架数据
      await loadBooks()
      
      // 如果删除的是当前阅读的书籍，更新当前书籍
      if (currentBook.value.id === bookId) {
        // 加载最后阅读的书籍或第一本书
        const lastReadBookId = await window.electron.store.getLastReadBookId()
        if (lastReadBookId) {
          await loadBook(lastReadBookId)
        } else if (books.value.length > 0) {
          await loadBook(books.value[0].id)
        } else {
          // 没有书籍时，显示默认内容
          currentBook.value = {
            id: null,
            title: '未选择书籍',
            content: '请从左侧书架选择一本书开始阅读',
            chapters: [],
            currentChapterIndex: 0
          }
        }
      }
      console.log('删除书籍成功:', bookId)
    } else {
      console.error('删除书籍失败:', bookId)
    }
  } catch (error) {
    console.error('删除书籍失败:', error)
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  try {
    // 检查 window.electron 是否存在
    if (window.electron && window.electron.store) {
      // 加载书架数据
      await loadBooks()

      // 加载库目录中的书籍
      if (window.electron.library) {
        try {
          const libraryBooks = await window.electron.library.getBooks()
          console.log('库目录书籍:', libraryBooks)
          
          // 合并书籍列表，避免重复
          if (libraryBooks && libraryBooks.length > 0) {
            // 获取Store中的书籍ID列表
            const storeBookIds = books.value.map(book => book.localPath)
            
            // 过滤出库目录中不在Store中的书籍
            const newBooks = libraryBooks.filter(book => !storeBookIds.includes(book.localPath))
            console.log('新书籍:', newBooks)
            
            // 将新书籍添加到Store中
            for (const book of newBooks) {
              await window.electron.store.addBook(book)
            }
            
            // 重新加载书架数据
            await loadBooks()
          }
        } catch (error) {
          console.error('加载库目录书籍失败:', error)
        }
      }

      // 加载设置
      const settings = await window.electron.store.getSettings()
      isDarkMode.value = settings.darkMode || false
      isEyeProtectionMode.value = settings.eyeProtectionMode || false
      currentSpeed.value = settings.speed || 1.0
      autoContinue.value = settings.autoContinue || true
      fontFamily.value = settings.fontFamily || 'system-ui'
      fontSize.value = settings.fontSize || 18
      lineHeight.value = settings.lineHeight || 1.5
      letterSpacing.value = settings.letterSpacing || 0
      textAlign.value = settings.textAlign || 'left'
      selectedTheme.value = settings.selectedTheme || 'white'
      
      // 应用主题
      await setTheme(selectedTheme.value)
      
      // 应用文本设置
      document.documentElement.style.setProperty('--sans', fontFamily.value)
      document.documentElement.style.setProperty('--font-size', fontSize.value + 'px')
      document.documentElement.style.setProperty('--line-height', lineHeight.value)
      document.documentElement.style.setProperty('--letter-spacing', letterSpacing.value + 'px')
      document.documentElement.style.setProperty('--text-align', textAlign.value)
      
      // 强制应用 text-justify: inter-character（如果是前后对齐）
      if (textAlign.value === 'justify') {
        const preElements = document.querySelectorAll('pre')
        preElements.forEach(el => {
          el.style.textJustify = 'inter-character'
        })
      }

      // 加载最后阅读的书籍
      const lastReadBookId = await window.electron.store.getLastReadBookId()
      if (lastReadBookId) {
        await loadBook(lastReadBookId)
      } else if (books.value.length > 0) {
        // 没有最后阅读的书籍，加载第一本书
        await loadBook(books.value[0].id)
      }
    } else {
      console.error('window.electron 未定义')
      // 使用默认数据
      books.value = []
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
})

// 组件卸载时保存数据
onUnmounted(async () => {
  try {
    // 停止语音合成
    window.speechSynthesis.cancel()
  } catch (error) {
    console.error('保存数据失败:', error)
  }
})
</script>

<template>
  <div 
    id="app" 
    :class="{
      'dark': isDarkMode,
      'eye-protection': isEyeProtectionMode
    }"
    class="flex h-screen w-full bg-[var(--bg)] text-[var(--text)] overflow-hidden"
    :style="{
      '--font-size': fontSize + 'px',
      '--line-height': lineHeight,
      '--letter-spacing': letterSpacing + 'px',
      '--text-align': textAlign
    }"
  >
    <!-- 左侧边栏 -->
    <aside class="sidebar w-[240px] border-r border-[var(--border)] p-4 flex flex-col">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-lg font-bold text-white">书架</h1>
        <button 
          @click="importFile" 
          class="px-3 py-1 bg-[var(--accent)] text-white rounded-md hover:bg-opacity-90 transition-colors"
        >
          导入
        </button>
      </div>
      
      <!-- 书架列表 -->
      <div class="flex-1 overflow-y-auto pr-2">
        <ul class="space-y-2">
          <li 
            v-for="book in books" 
            :key="book.id"
            class="book-item" 
            :class="{ 'selected': currentBook.id === book.id }"
            @click="loadBook(book.id)"
          >
            <div>
              <h3 class="font-medium text-sm">{{ book.title }}</h3>
              <p class="text-xs">{{ book.author }}</p>
            </div>
            <button 
              @click.stop="deleteBook(book.id)"
              class="delete-btn px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs"
            >
              删除
            </button>
          </li>
        </ul>
      </div>
      
      <!-- 版本号 -->
      <div class="mt-6 text-xs opacity-50 text-center">
        v1.0.0
      </div>
    </aside>
    
    <!-- 右侧主区域 -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 顶部控制栏 -->
      <header class="border-b border-[var(--border)] p-4 flex justify-between items-center">
        <h2 class="text-lg font-medium text-[var(--text-h)]">{{ currentBook.title }}</h2>
        <div class="flex space-x-2">
          <button 
            @click="togglePanel('directory')" 
            class="px-3 py-1 border border-[var(--border)] rounded-md hover:bg-[var(--accent-bg)] transition-colors"
          >
            目录
          </button>
          <button 
            @click="togglePanel('settings')" 
            class="px-3 py-1 border border-[var(--border)] rounded-md hover:bg-[var(--accent-bg)] transition-colors"
          >
            设置
          </button>
        </div>
      </header>
      
      <!-- 文本显示区 -->
      <div class="flex-1 overflow-y-auto">
        <pre class="whitespace-pre-wrap text-[var(--text)] leading-relaxed">{{ currentBook.content }}</pre>
      </div>
      
      <!-- 底部控制栏 -->
      <footer class="bottom-controls border-t border-[var(--border)] p-4 flex justify-between items-center">
        <div class="flex space-x-2">
          <button 
            @click="changeChapter(-1)" 
            :disabled="currentBook.chapters && currentBook.currentChapterIndex === 0"
            class="px-3 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一章
          </button>
          <button 
            @click="changeChapter(1)" 
            :disabled="currentBook.chapters && currentBook.currentChapterIndex === currentBook.chapters.length - 1"
            class="px-3 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一章
          </button>
        </div>
        <div class="flex space-x-2 items-center">
          <button 
            @click="togglePlay" 
            class="px-3 py-1 rounded-md transition-colors"
          >
            {{ isPlaying ? '暂停' : '开始听书' }}
          </button>
          <button 
            @click="stopPlay" 
            class="px-3 py-1 rounded-md transition-colors"
          >
            停止
          </button>
        </div>
      </footer>
      
      <!-- 目录面板 -->
      <div 
        v-if="activePanel === 'directory'" 
        class="fixed top-0 right-0 h-full w-80 bg-[var(--bg)] border-l border-[var(--border)] p-4 overflow-y-auto z-50"
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-[var(--text-h)]">目录</h3>
          <button 
            @click="closePanel" 
            class="px-2 py-1 bg-[var(--accent)] text-white rounded-md hover:bg-opacity-90 transition-colors"
          >
            关闭
          </button>
        </div>
        <ul class="space-y-2">
          <li 
            v-for="(chapter, index) in currentBook.chapters" 
            :key="index"
            @click="selectChapter(index)"
            class="p-2 rounded-md hover:bg-[var(--accent-bg)] cursor-pointer transition-colors"
          >
            <span class="text-sm text-[var(--text)]">{{ chapter.title }}</span>
          </li>
          <li v-if="!currentBook.chapters || currentBook.chapters.length === 0" class="p-2 text-sm text-[var(--text)]">
            暂无章节信息
          </li>
        </ul>
      </div>
      
      <!-- 设置面板 -->
      <div 
        v-if="activePanel === 'settings'" 
        class="settings-drawer fixed top-0 right-0 h-full w-80 border-l border-[var(--border)] p-4 overflow-y-auto z-50"
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-[var(--text-h)]">设置</h3>
          <button 
            @click="closePanel" 
            class="px-2 py-1 bg-[var(--accent)] text-white rounded-md hover:bg-opacity-90 transition-colors"
          >
            关闭
          </button>
        </div>
        
        <!-- 设置标签页 -->
        <div class="mb-4">
          <div class="flex border-b border-[var(--border)]">
            <button 
              @click="activeSettingTab = 'preference'" 
              :class="['px-4 py-2 text-sm', activeSettingTab === 'preference' ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text)]']"
            >
              偏好
            </button>
            <button 
              @click="activeSettingTab = 'text'" 
              :class="['px-4 py-2 text-sm', activeSettingTab === 'text' ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text)]']"
            >
              文字
            </button>
            <button 
              @click="activeSettingTab = 'background'" 
              :class="['px-4 py-2 text-sm', activeSettingTab === 'background' ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text)]']"
            >
              阅读背景
            </button>
            <button 
              @click="activeSettingTab = 'other'" 
              :class="['px-4 py-2 text-sm', activeSettingTab === 'other' ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text)]']"
            >
              其它
            </button>
          </div>
        </div>
        
        <!-- 偏好标签页 -->
        <div v-if="activeSettingTab === 'preference'" class="space-y-4">
          <div>
            <h4 class="text-sm font-medium text-[var(--text-h)] mb-2">听书设置</h4>
            <div class="flex items-center space-x-2">
              <span class="text-sm">语速: {{ currentSpeed.toFixed(1) }}x</span>
              <input 
                type="range" 
                min="0.5" 
                max="2.0" 
                step="0.1" 
                v-model="currentSpeed" 
                @change="changeSpeed(currentSpeed)" 
                class="flex-1"
              />
            </div>
          </div>
          <div>
            <h4 class="text-sm font-medium text-[var(--text-h)] mb-2">播放逻辑</h4>
            <div class="flex items-center justify-between">
              <span class="text-sm">自动连读下一章</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="autoContinue" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
              </label>
            </div>
          </div>
        </div>
        
        <!-- 文字标签页 -->
        <div v-if="activeSettingTab === 'text'" class="space-y-4">
          <div>
            <h4 class="text-sm font-medium text-[var(--text-h)] mb-2">字体库</h4>
            <div class="flex space-x-2">
              <select v-model="fontFamily" class="flex-1 px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg)] text-[var(--text)]">
                <option value="system-ui">系统默认</option>
                <option value="Arial">Arial</option>
                <option value="SimSun">宋体</option>
                <option value="SimHei">黑体</option>
                <option value="Microsoft YaHei">微软雅黑</option>
              </select>
              <button class="px-3 py-2 border border-[var(--border)] rounded-md hover:bg-[var(--accent-bg)] transition-colors text-sm">
                导入
              </button>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-medium text-[var(--text-h)] mb-2">精细调节</h4>
            <div class="space-y-3">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span>字体大小</span>
                  <span>{{ fontSize }}px</span>
                </div>
                <input 
                  type="range" 
                  min="12" 
                  max="40" 
                  step="1" 
                  v-model="fontSize" 
                  @change="saveTextSettings" 
                  class="w-full"
                />
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span>行间距</span>
                  <span>{{ lineHeight }}</span>
                </div>
                <input 
                  type="range" 
                  min="1.0" 
                  max="2.0" 
                  step="0.1" 
                  v-model="lineHeight" 
                  @change="saveTextSettings" 
                  class="w-full"
                />
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span>字符间距</span>
                  <span>{{ letterSpacing }}px</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1" 
                  v-model="letterSpacing" 
                  @change="saveTextSettings" 
                  class="w-full"
                />
              </div>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-medium text-[var(--text-h)] mb-2">对齐</h4>
            <div class="flex space-x-2">
              <button 
                @click="textAlign = 'left'" 
                :class="['px-3 py-1 border border-[var(--border)] rounded-md', textAlign === 'left' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--accent-bg)] transition-colors']"
              >
                左对齐
              </button>
              <button 
                @click="textAlign = 'justify'" 
                :class="['px-3 py-1 border border-[var(--border)] rounded-md', textAlign === 'justify' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--accent-bg)] transition-colors']"
              >
                前后对齐
              </button>
            </div>
          </div>
        </div>
        
        <!-- 阅读背景标签页 -->
        <div v-if="activeSettingTab === 'background'" class="space-y-4">
          <div>
            <h4 class="text-sm font-medium text-[var(--text-h)] mb-2">快速色块</h4>
            <div class="flex gap-4">
              <button 
                @click="setTheme('white')" 
                class="rounded-full border border-[var(--border)] cursor-pointer"
                :style="selectedTheme === 'white' ? { width: '28px', height: '28px', boxShadow: '0 0 0 2px var(--accent)', backgroundColor: 'white' } : { width: '28px', height: '28px', backgroundColor: 'white' }"
              ></button>
              <button 
                @click="setTheme('parchment')" 
                class="rounded-full border border-[var(--border)] cursor-pointer"
                :style="selectedTheme === 'parchment' ? { width: '28px', height: '28px', boxShadow: '0 0 0 2px var(--accent)', backgroundColor: '#f5f0e6' } : { width: '28px', height: '28px', backgroundColor: '#f5f0e6' }"
              ></button>
              <button 
                @click="setTheme('green')" 
                class="rounded-full border border-[var(--border)] cursor-pointer"
                :style="selectedTheme === 'green' ? { width: '28px', height: '28px', boxShadow: '0 0 0 2px var(--accent)', backgroundColor: '#C7EDCC' } : { width: '28px', height: '28px', backgroundColor: '#C7EDCC' }"
              ></button>
              <button 
                @click="setTheme('dark')" 
                class="rounded-full border border-[var(--border)] cursor-pointer"
                :style="selectedTheme === 'dark' ? { width: '28px', height: '28px', boxShadow: '0 0 0 2px var(--accent)', backgroundColor: '#1A1A1A' } : { width: '28px', height: '28px', backgroundColor: '#1A1A1A' }"
              ></button>
            </div>
          </div>
        </div>
        
        <!-- 其它标签页 -->
        <div v-if="activeSettingTab === 'other'" class="space-y-4">
          <div>
            <h4 class="text-sm font-medium text-[var(--text-h)] mb-2">软件信息</h4>
            <div class="text-sm text-[var(--text)] space-y-1">
              <p>版本: v1.0.0</p>
              <p>作者: Trae AI</p>
              <p>描述: AI 听书小说阅读器</p>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-medium text-[var(--text-h)] mb-2">数据管理</h4>
            <button 
              @click="clearAllData" 
              class="w-full px-3 py-2 rounded-md border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
            >
              清空所有书籍和缓存
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 自定义样式 */
#app {
  font-family: var(--sans);
}
</style>
