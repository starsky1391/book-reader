<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { NConfigProvider, NLayout, NLayoutSider, NLayoutContent, NLayoutFooter, NButton, NList, NListItem, NDrawer, NTabs, NTab, NTabPane, NSlider, NSwitch, NSelect, NRadioGroup, NRadio, NScrollbar, NIcon, NEmpty, NEllipsis, NCard } from 'naive-ui'
import { Sunny, Moon, Book, Settings, Add, Trash, ArrowBack, ArrowForward, Play, Pause, Stop, Menu } from '@vicons/ionicons5'
import { zhCN, enUS } from 'naive-ui'
import { useThemeVars } from 'naive-ui'
import { createDiscreteApi } from 'naive-ui'

// 创建离散API
const { message, notification, dialog, loadingBar } = createDiscreteApi(['message', 'notification', 'dialog', 'loadingBar'])

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

// 抽屉控制
const directoryDrawerVisible = ref(false)
const settingsDrawerVisible = ref(false)

// 设置面板标签页
const activeSettingTab = ref('preference') // preference, text, background, other

// 字体选项
const fontOptions = [
  { label: '系统默认', value: 'system-ui' },
  { label: 'Arial', value: 'Arial' },
  { label: '宋体', value: 'SimSun' },
  { label: '黑体', value: 'SimHei' },
  { label: '微软雅黑', value: 'Microsoft YaHei' }
]

// 主题选项
const themeOptions = [
  { key: 'white', label: '白色', color: '#FBFBFB' },
  { key: 'parchment', label: '羊皮纸', color: '#F4F1E6' },
  { key: 'green', label: '护眼绿', color: '#F0F9E8' },
  { key: 'dark', label: '深夜', color: '#16171D' }
]

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
      // 更新全局 CSS 变量
      document.documentElement.style.setProperty('--bg-main', '#FBFBFB')
      document.documentElement.style.setProperty('--bg-paper', '#FFFFFF')
      document.documentElement.style.setProperty('--bg-sidebar', '#FFFFFF')
      document.documentElement.style.setProperty('--bg-card', '#F9F9F9')
      document.documentElement.style.setProperty('--text-main', '#2D3436')
      document.documentElement.style.setProperty('--text-h', '#000000')
      document.documentElement.style.setProperty('--bg', '#FBFBFB')
      document.documentElement.style.setProperty('--text', '#2D3436')
      break
    case 'parchment':
      isDarkMode.value = false
      isEyeProtectionMode.value = false
      // 更新全局 CSS 变量
      document.documentElement.style.setProperty('--bg-main', '#F4F1E6')
      document.documentElement.style.setProperty('--bg-paper', '#EBE7D9')
      document.documentElement.style.setProperty('--bg-sidebar', '#EBE7D9')
      document.documentElement.style.setProperty('--bg-card', '#F6F3E8')
      document.documentElement.style.setProperty('--text-main', '#5D4037')
      document.documentElement.style.setProperty('--text-h', '#3E2723')
      document.documentElement.style.setProperty('--bg', '#F4F1E6')
      document.documentElement.style.setProperty('--text', '#5D4037')
      break
    case 'green':
      isDarkMode.value = false
      isEyeProtectionMode.value = true
      // 更新全局 CSS 变量
      document.documentElement.style.setProperty('--bg-main', '#F0F9E8')
      document.documentElement.style.setProperty('--bg-paper', '#E5F2DB')
      document.documentElement.style.setProperty('--bg-sidebar', '#E5F2DB')
      document.documentElement.style.setProperty('--bg-card', '#F2FAEA')
      document.documentElement.style.setProperty('--text-main', '#2D4F1E')
      document.documentElement.style.setProperty('--text-h', '#1B3311')
      document.documentElement.style.setProperty('--bg', '#F0F9E8')
      document.documentElement.style.setProperty('--text', '#2D4F1E')
      break
    case 'dark':
      isDarkMode.value = true
      isEyeProtectionMode.value = false
      // 更新全局 CSS 变量
      document.documentElement.style.setProperty('--bg-main', '#16171D')
      document.documentElement.style.setProperty('--bg-paper', '#1A1A1A')
      document.documentElement.style.setProperty('--bg-sidebar', '#21222D')
      document.documentElement.style.setProperty('--bg-card', '#1E1F2A')
      document.documentElement.style.setProperty('--text-main', '#A0A0A0')
      document.documentElement.style.setProperty('--text-h', '#FFFFFF')
      document.documentElement.style.setProperty('--bg', '#16171D')
      document.documentElement.style.setProperty('--text', '#A0A0A0')
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
  if (panel === 'directory') {
    directoryDrawerVisible.value = true
  } else if (panel === 'settings') {
    settingsDrawerVisible.value = true
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
  directoryDrawerVisible.value = false
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
  <NConfigProvider :locale="zhCN">
    <div 
      id="app" 
      :class="{
        'dark': isDarkMode,
        'eye-protection': isEyeProtectionMode
      }"
      class="h-screen w-full overflow-hidden"
    >
      <NLayout position="absolute" has-sider class="h-full w-full">
        <!-- 左侧边栏 -->
        <NLayoutSider 
          collapse-mode="width" 
          :width="300" 
          :collapsed-width="64" 
          class="bg-[var(--bg-sidebar)] text-[var(--text-main)]"
        >
          <div class="bookshelf-container">
            <div class="bookshelf-content">
              <div class="flex justify-between items-center mb-6">
                <h2 class="shelf-title">我的书架</h2>
                <NButton 
                  @click="importFile" 
                  type="primary" 
                  size="small" 
                  circle 
                  secondary
                  style="background-color: #b88552"
                >
                  <template #icon>
                    <NIcon><Add /></NIcon>
                  </template>
                </NButton>
              </div>
              
              <!-- 书架列表 -->
              <NScrollbar class="flex-1">
                <div class="book-list-vertical">
                  <div 
                    v-for="book in books" 
                    :key="book.id"
                    @click="loadBook(book.id)"
                    class="book-row-item"
                    :class="{ 'ring-2 ring-[#b88552]': currentBook.id === book.id }"
                  >
                    <!-- 微型封面 -->
                    <div class="book-cover-mini">
                      <span class="cover-text">{{ book.title.charAt(0) }}</span>
                    </div>
                    
                    <!-- 书籍信息 -->
                    <div class="book-details">
                      <div class="book-name-row">
                        <span class="name">{{ book.title }}</span>
                      </div>
                      <div class="book-author">{{ book.author }}</div>
                    </div>
                    
                    <!-- 操作按钮 -->
                    <div class="book-actions">
                      <NButton 
                        @click.stop="deleteBook(book.id)"
                        quaternary 
                        circle 
                        type="error" 
                        size="small"
                      >
                        <template #icon>
                          <NIcon><Trash /></NIcon>
                        </template>
                      </NButton>
                    </div>
                  </div>
                  
                  <NEmpty v-if="books.length === 0" description="书架空空如也" />
                </div>
              </NScrollbar>
              
              <!-- 版本号 -->
              <div class="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
                v1.0.0
              </div>
            </div>
          </div>
        </NLayoutSider>
        
        <!-- 右侧主区域 -->
        <NLayoutContent class="bg-[var(--bg)] text-[var(--text)]">
          <div class="h-full flex flex-col">
            <!-- 顶部控制栏 -->
            <header class="border-b border-[var(--border)] p-4 flex justify-between items-center">
              <h2 class="text-lg font-medium text-[var(--text-h)]">{{ currentBook.title }}</h2>
              <div class="flex space-x-2">
                <NButton 
                  @click="togglePanel('directory')" 
                  size="small"
                  quaternary
                >
                  <template #icon>
                    <NIcon><Book /></NIcon>
                  </template>
                  目录
                </NButton>
                <NButton 
                  @click="togglePanel('settings')" 
                  size="small"
                  quaternary
                >
                  <template #icon>
                    <NIcon><Settings /></NIcon>
                  </template>
                  设置
                </NButton>
              </div>
            </header>
            
            <!-- 文本显示区 -->
            <div class="flex-1 overflow-hidden">
              <NScrollbar class="h-full">
                <div class="reader-layout">
                  <pre class="whitespace-pre-wrap text-[var(--text)] leading-relaxed" style="text-align: justify; text-justify: inter-character;">{{ currentBook.content }}</pre>
                </div>
              </NScrollbar>
            </div>
            
            <!-- 底部控制栏 -->
            <footer class="border-t border-[var(--border)] p-4 flex justify-between items-center">
              <div class="flex space-x-2">
                <NButton 
                  @click="changeChapter(-1)" 
                  :disabled="currentBook.chapters && currentBook.currentChapterIndex === 0"
                  size="small"
                  quaternary
                >
                  <template #icon>
                    <NIcon><ArrowBack /></NIcon>
                  </template>
                </NButton>
                <NButton 
                  @click="changeChapter(1)" 
                  :disabled="currentBook.chapters && currentBook.currentChapterIndex === currentBook.chapters.length - 1"
                  size="small"
                  quaternary
                >
                  <template #icon>
                    <NIcon><ArrowForward /></NIcon>
                  </template>
                </NButton>
              </div>
              <div class="flex space-x-2 items-center">
                <NButton 
                  @click="togglePlay" 
                  size="small"
                  quaternary
                >
                  <template #icon>
                    <NIcon v-if="!isPlaying"><Play /></NIcon>
                    <NIcon v-else><Pause /></NIcon>
                  </template>
                </NButton>
                <NButton 
                  @click="stopPlay" 
                  size="small"
                  quaternary
                >
                  <template #icon>
                    <NIcon><Stop /></NIcon>
                  </template>
                </NButton>
              </div>
            </footer>
          </div>
        </NLayoutContent>
      </NLayout>
      
      <!-- 目录抽屉 -->
      <NDrawer 
        v-model:show="directoryDrawerVisible" 
        :width="320"
        placement="left"
        class="modern-drawer"
        :native-scrollbar="false"
      >
        <div class="drawer-container">
          <div class="drawer-header">
            <span class="title">目录</span>
            <span class="count">共 {{ currentBook?.chapters?.length || 0 }} 章</span>
          </div>

          <NScrollbar class="drawer-content">
            <div class="px-4 py-2">
              <div
                v-for="(chapter, index) in currentBook?.chapters || []"
                :key="index"
                @click="selectChapter(index)"
                class="chapter-item"
                :class="{ 'active': currentBook?.currentChapterIndex === index }"
              >
                <span class="index-num">{{ (index + 1).toString().padStart(2, '0') }}</span>
                
                <span class="chapter-title">{{ chapter.title }}</span>

                <div class="active-indicator"></div>
              </div>

              <NEmpty
                v-if="!currentBook?.chapters?.length"
                description="暂无章节信息"
                class="mt-10"
              />
            </div>
          </NScrollbar>
        </div>
      </NDrawer>
      
      <!-- 设置抽屉 -->
      <NDrawer 
        v-model:show="settingsDrawerVisible" 
        :width="500"
        placement="right"
        class="modern-settings-drawer"
        title="设置"
      >
        <div class="settings-content">
          <NTabs v-model:value="activeSettingTab" type="card" class="custom-tabs">
          <NTabPane name="preference" tab="偏好">
            <div class="p-4 space-y-4">
              <div class="setting-card">
                <h4 class="text-sm font-medium mb-3">听书设置 <span class="text-xs text-gray-500">{{ currentSpeed.toFixed(1) }}x</span></h4>
                <NSlider 
                  v-model:value="currentSpeed" 
                  :min="0.5" 
                  :max="2.0" 
                  :step="0.1" 
                  @update:value="changeSpeed(currentSpeed)"
                  class="custom-slider"
                />
                <div class="flex justify-between text-xs mt-1">
                  <span>0.5x</span>
                  <span>2.0x</span>
                </div>
              </div>
              <div class="setting-card">
                <h4 class="text-sm font-medium mb-3">播放逻辑</h4>
                <div class="flex items-center justify-between">
                  <span class="text-sm">自动连读下一章</span>
                  <NSwitch v-model:value="autoContinue" class="custom-switch" />
                </div>
              </div>
            </div>
          </NTabPane>
          
          <NTabPane name="text" tab="文字">
            <div class="p-4 space-y-4">
              <div class="setting-card">
                <h4 class="text-sm font-medium mb-3">字体库</h4>
                <NSelect v-model:value="fontFamily" :options="fontOptions" class="w-full" />
              </div>
              <div class="setting-card">
                <h4 class="text-sm font-medium mb-3">字体大小 <span class="text-xs text-gray-500">{{ fontSize }}px</span></h4>
                <NSlider 
                  v-model:value="fontSize" 
                  :min="12" 
                  :max="40" 
                  :step="1" 
                  @update:value="saveTextSettings"
                  class="custom-slider"
                />
                <div class="flex justify-between text-xs mt-1">
                  <span>12px</span>
                  <span>40px</span>
                </div>
              </div>
              <div class="setting-card">
                <h4 class="text-sm font-medium mb-3">行间距 <span class="text-xs text-gray-500">{{ lineHeight }}</span></h4>
                <NSlider 
                  v-model:value="lineHeight" 
                  :min="1.0" 
                  :max="2.0" 
                  :step="0.1" 
                  @update:value="saveTextSettings"
                  class="custom-slider"
                />
                <div class="flex justify-between text-xs mt-1">
                  <span>1.0</span>
                  <span>2.0</span>
                </div>
              </div>
              <div class="setting-card">
                <h4 class="text-sm font-medium mb-3">字符间距 <span class="text-xs text-gray-500">{{ letterSpacing }}px</span></h4>
                <NSlider 
                  v-model:value="letterSpacing" 
                  :min="0" 
                  :max="2" 
                  :step="0.1" 
                  @update:value="saveTextSettings"
                  class="custom-slider"
                />
                <div class="flex justify-between text-xs mt-1">
                  <span>0px</span>
                  <span>2px</span>
                </div>
              </div>
              <div class="setting-card">
                <h4 class="text-sm font-medium mb-3">对齐方式</h4>
                <NRadioGroup v-model:value="textAlign" @update:value="saveTextSettings">
                  <div class="flex space-x-4">
                    <NRadio value="left">左对齐</NRadio>
                    <NRadio value="justify">前后对齐</NRadio>
                  </div>
                </NRadioGroup>
              </div>
            </div>
          </NTabPane>
          
          <NTabPane name="background" tab="阅读背景">
            <div class="p-4 space-y-4">
              <div class="setting-card">
                <h4 class="text-sm font-medium mb-3">主题选择</h4>
                <div class="flex space-x-5 mt-4">
                  <div 
                    v-for="theme in themeOptions" 
                    :key="theme.key" 
                    @click="setTheme(theme.key)" 
                    class="theme-circle-wrapper" 
                    :class="{ 'is-active': selectedTheme === theme.key }"
                  >
                    <div 
                      class="color-dot" 
                      :style="{ backgroundColor: theme.color, border: theme.key === 'white' ? '1px solid #ddd' : 'none' }"
                    >
                      <div v-if="selectedTheme === theme.key" class="active-check"></div>
                    </div>
                    <span class="theme-label">{{ theme.label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </NTabPane>
          
          <NTabPane name="other" tab="其它">
            <div class="p-4 space-y-4">
              <div class="setting-card">
                <h4 class="text-sm font-medium mb-3">关于</h4>
                <p class="text-sm">Book Reader v1.0.0</p>
                <p class="text-sm">一个轻量级的桌面小说阅读器</p>
              </div>
              <div class="setting-card">
                <NButton 
                  @click="clearAllData" 
                  class="w-full"
                  type="warning"
                  quaternary
                >
                  清空书籍和缓存
                </NButton>
              </div>
            </div>
          </NTabPane>
        </NTabs>
        </div>
      </NDrawer>
    </div>
  </NConfigProvider>
</template>

<style>
/* 全局 CSS 变量 */
:root {
  --bg-main: #FBFBFB;
  --bg-paper: #FFFFFF;
  --bg-sidebar: #FFFFFF;
  --bg-card: #F9F9F9;
  --text-main: #2D3436;
  --text-h: #000000;
  --ui-color: #b88552;
  --border: #e0e0e0;
}

/* 深色模式 */
.dark {
  --bg-main: #16171D;
  --bg-paper: #1A1A1A;
  --bg-sidebar: #21222D;
  --bg-card: #1E1F2A;
  --text-main: #A0A0A0;
  --text-h: #FFFFFF;
  --border: rgba(255, 255, 255, 0.1);
}
</style>

<style scoped>
/* 自定义样式 */
#app {
  font-family: var(--sans);
}

/* 阅读页容器（解决贴边） */
.reader-layout {
  max-width: 900px; /* 限制宽度 */
  margin: 0 auto;
  padding: 40px 60px !important; /* 强制两边留白 */
  background-color: var(--bg-paper); /* 绑定到 --bg-paper */
}

/* 全局容器：确保背景色与阅读页一致 */
.bookshelf-container {
  min-height: 100vh;
  background-color: var(--bg-sidebar); /* 同步阅读页颜色 */
  padding: 40px 20px;
}

/* 内容限宽居中 */
.bookshelf-content {
  max-width: 680px; /* 限制宽度，防止长条过长 */
  margin: 0 auto;
}

.shelf-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 24px;
  padding-left: 8px;
}

/* 长条条目样式 */
.book-row-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-card); /* 使用卡片背景色 */
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid rgba(184, 133, 82, 0.05);
}

.book-row-item:hover {
  transform: translateX(4px);
  background-color: rgba(184, 133, 82, 0.05);
  box-shadow: 0 4px 12px rgba(184, 133, 82, 0.1);
}

/* 微型封面：窄长比 */
.book-cover-mini {
  width: 42px;
  height: 58px;
  background: linear-gradient(135deg, #e6d5b8 0%, #d4bc96 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18px;
  flex-shrink: 0;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.1);
}

.cover-text {
  color: #8b7355;
  font-weight: bold;
  font-size: 14px;
}

/* 详情区 */
.book-details {
  flex: 1;
  min-width: 0;
}

.book-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.book-name-row .name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-author {
  font-size: 13px;
  color: #94a3b8;
}

/* 操作按钮：默认隐藏，Hover 出现 */
.book-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.book-row-item:hover .book-actions {
  opacity: 1;
}

/* 强制同步大背景 */
:deep(.n-drawer-content) {
  background-color: var(--bg-main) !important;
}

/* 抽屉容器 */
.drawer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-main);
}

/* 抽屉头部 */
.drawer-header {
  padding: 20px 24px;
  display: flex;
  align-items: baseline;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background-color: var(--bg-main);
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 抽屉内容 */
.drawer-content {
  flex: 1;
  overflow: auto;
  background-color: var(--bg-main);
}
.drawer-header .title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-main);
}
.drawer-header .count {
  font-size: 0.8rem;
  color: #999;
}

/* 章节条目 */
.chapter-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border-left: 3px solid transparent;
}

/* 序号样式 */
.index-num {
  font-family: "Fira Code", monospace; /* 使用等宽字体更有设计感 */
  font-size: 0.8rem;
  color: #bbb;
  margin-right: 16px;
  width: 24px;
}

/* 标题样式 */
.chapter-title {
  font-size: 0.95rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* 悬浮效果：不要生硬地变色，用浅浅的灰色 */
.chapter-item:hover {
  background-color: rgba(184, 133, 82, 0.05);
}

/* 激活状态：精致的暖棕色方案 */
.chapter-item.active {
  background-color: rgba(184, 133, 82, 0.1);
  border-left-color: #b88552;
}
.chapter-item.active .chapter-title {
  color: #b88552;
  font-weight: 600;
}
.chapter-item.active .index-num {
  color: #b88552;
  opacity: 0.7;
}

/* 侧边指示条：现代 UI 的灵魂 */
.active-indicator {
  position: absolute;
  left: 0;
  top: 25%;
  height: 50%;
  width: 3px;
  background-color: #b88552;
  border-radius: 0 4px 4px 0;
  transform: scaleY(0);
  transition: transform 0.2s ease;
}
.chapter-item.active .active-indicator {
  transform: scaleY(1);
}

/* 深色模式下的目录抽屉 */
.dark .drawer-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.dark .chapter-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.dark .chapter-item.active {
  background-color: rgba(184, 133, 82, 0.2);
}

/* 滚动条美化（隐藏多余的，统一风格） */
:deep(.n-scrollbar-rail) {
  width: 6px !important;
}
:deep(.n-scrollbar-rail--vertical) {
  right: 2px !important;
}

/* 设置抽屉样式 */
.modern-settings-drawer {
  background-color: rgba(251, 247, 242, 0.8);
  backdrop-filter: blur(10px);
  color: var(--text-main);
}

/* 深色模式下的设置抽屉 */
.dark .modern-settings-drawer {
  background-color: rgba(22, 23, 29, 0.8);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

/* 设置内容容器 */
.settings-content {
  max-width: 450px;
  margin: 0 auto;
  padding: 20px;
}

/* 设置卡片 */
.setting-card {
  /* 使用比大背景稍亮或稍暗的颜色，建议带一点透明度 */
  background-color: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(184, 133, 82, 0.1);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  margin-bottom: 16px;
}

.setting-card:hover {
  box-shadow: 0 4px 12px rgba(184, 133, 82, 0.1);
}

/* 深色模式下的设置卡片 */
.dark .setting-card {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

/* 深色模式下的图标颜色 */
.dark .n-button.n-button--quaternary .n-icon {
  color: #e0e0e0 !important;
}

/* 深色模式下的标签页 */
.dark .custom-tabs {
  --n-tab-text-color: #94a3b8;
  --n-tab-text-color-active: #b88552;
}

/* 书架背景色始终设置为比主背景色稍深/稍浅的一个梯度 */
.bookshelf-container {
  min-height: 100vh;
  background-color: var(--bg-sidebar); /* 同步阅读页颜色 */
  padding: 40px 20px;
  filter: brightness(0.95);
}

/* 强制同步抽屉的大背景 */
:deep(.n-drawer-content) {
  background-color: var(--bg-main) !important;
}

/* 如果你使用的是嵌套的 div 容器 */
.settings-content {
  min-height: 100%;
  background-color: var(--bg-main); /* 确保撑满全高 */
  transition: background-color 0.3s ease;
}

/* 设置面板采用半透明磨砂质感，背景色跟随当前主题色 */
.modern-settings-drawer {
  background-color: var(--bg-main);
  backdrop-filter: blur(10px);
  color: var(--text-main);
}

/* 深色模式下的设置面板 */
.dark .modern-settings-drawer {
  background-color: var(--bg-main);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

/* 自定义滑动条 */
.custom-slider {
  --n-slider-rail-background: #e0e0e0;
  --n-slider-rail-fill-background: #b88552;
  --n-slider-handle-background: white;
  --n-slider-handle-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  --n-slider-rail-height: 4px;
}

/* 自定义标签页 */
.custom-tabs {
  --n-tab-line-color: transparent;
  --n-tab-text-color: #94a3b8;
  --n-tab-text-color-active: #b88552;
  --n-tab-border-radius: 20px;
  --n-tab-padding: 8px 16px;
  --n-tab-font-size: 14px;
}

/* 自定义开关 */
.custom-switch {
  --n-switch-button-background: white;
  --n-switch-background: #e0e0e0;
  --n-switch-background-active: #b88552;
  --n-switch-button-box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  --n-switch-height: 20px;
  --n-switch-width: 36px;
}

/* 主题选择样式 */
.theme-circle-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* 基础圆圈样式 */
.color-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 激活状态的环绕：不要直接贴着圆圈，要留 2px 的呼吸间距 */
.theme-circle-wrapper.is-active .color-dot {
  outline: 2px solid #b88552; /* 使用项目主色调 */
  outline-offset: 3px;
  transform: scale(0.9);
}

/* 【重点】黑色模式下的对比度处理 */
.theme-circle-wrapper .color-dot[style*="#16171D"] {
  border: 1px solid rgba(255, 255, 255, 0.15) !important; /* 给黑色圆圈加一圈微光，防止隐身 */
}

/* 标签文字 */
.theme-label {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
  display: block;
  text-align: center;
  transition: all 0.3s ease;
}

.is-active .theme-label {
  color: #b88552;
  font-weight: 600;
}

/* 勾选小图标 */
.active-check {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #b88552;
  transition: all 0.3s ease;
}

/* 颜色选择器 */
.color-picker {
  transition: all 0.3s ease;
}

.color-picker:hover {
  transform: scale(1.1);
}
</style>
