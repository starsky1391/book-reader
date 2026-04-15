const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// 确保存储目录存在
function ensureDirectories() {
  try {
    // 获取用户数据目录
    const userDataPath = app.getPath('userData')
    console.log('用户数据目录:', userDataPath)
    
    // 创建 library 文件夹
    const libraryPath = path.join(userDataPath, 'library')
    console.log('库目录:', libraryPath)
    
    // 确保目录存在
    if (!fs.existsSync(libraryPath)) {
      console.log('创建库目录:', libraryPath)
      fs.mkdirSync(libraryPath, { recursive: true })
    }
    
    return { userDataPath, libraryPath }
  } catch (error) {
    console.error('确保目录存在失败:', error)
    return null
  }
}

function createWindow() {
  console.log('创建窗口...');
  console.log('preload 路径:', path.join(__dirname, 'preload.js'));
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // 加载 Vite 开发服务器
  mainWindow.loadURL('http://localhost:5173/')
  mainWindow.webContents.openDevTools()

  // 当应用打包后，加载本地文件
  // mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  
  // 监听 webContents 事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成');
  });
  
  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('preload 错误:', error);
  });
}

// 处理渲染进程的 dialog 请求
ipcMain.handle('dialog:showOpenDialog', (event, options) => {
  return dialog.showOpenDialog(options)
})

// 处理渲染进程的文件操作请求
const FileService = require('../src/services/FileService')
ipcMain.handle('file:readFile', async (event, filePath) => {
  try {
    return await FileService.readFile(filePath)
  } catch (error) {
    console.error('读取文件失败:', error)
    return { content: '', encoding: 'utf8' }
  }
})
ipcMain.handle('file:getFileInfo', (event, filePath) => {
  try {
    return FileService.getFileInfo(filePath)
  } catch (error) {
    console.error('获取文件信息失败:', error)
    return { name: '', ext: '', size: 0, mtime: new Date() }
  }
})
ipcMain.handle('file:parseChapters', (event, content) => {
  try {
    return FileService.parseChapters(content)
  } catch (error) {
    console.error('解析章节失败:', error)
    return []
  }
})
ipcMain.handle('file:copyFileToLibrary', (event, sourcePath) => {
  try {
    // 获取库目录路径
    const directories = ensureDirectories()
    if (!directories) {
      console.error('获取目录失败')
      return { success: false, path: sourcePath, error: '获取目录失败' }
    }
    
    const { libraryPath } = directories
    
    // 生成目标文件名
    const fileName = path.basename(sourcePath)
    const targetPath = path.join(libraryPath, fileName)
    
    try {
      // 复制文件
      fs.copyFileSync(sourcePath, targetPath)
      console.log('文件复制成功:', sourcePath, '->', targetPath)
      return { success: true, path: targetPath }
    } catch (copyError) {
      console.error('复制文件失败:', copyError)
      // 如果复制失败，使用原始文件路径
      return { success: true, path: sourcePath, error: copyError.message }
    }
  } catch (error) {
    console.error('复制文件失败:', error)
    // 如果发生其他错误，使用原始文件路径
    return { success: true, path: sourcePath, error: error.message }
  }
})

// 处理渲染进程的存储操作请求
const StoreService = require('../src/services/StoreService')
ipcMain.handle('store:getSettings', (event) => {
  return StoreService.getSettings()
})
ipcMain.handle('store:saveSettings', (event, settings) => {
  return StoreService.saveSettings(settings)
})
ipcMain.handle('store:getBooks', (event) => {
  return StoreService.getBooks()
})
ipcMain.handle('store:saveBooks', (event, books) => {
  try {
    // 确保 books 对象是可序列化的
    const serializableBooks = JSON.parse(JSON.stringify(books))
    return StoreService.saveBooks(serializableBooks)
  } catch (error) {
    console.error('保存书架数据失败:', error)
    return null
  }
})
ipcMain.handle('store:getReadingProgress', (event, bookId) => {
  return StoreService.getReadingProgress(bookId)
})
ipcMain.handle('store:saveReadingProgress', (event, bookId, chapterIndex, lineIndex) => {
  return StoreService.saveReadingProgress(bookId, chapterIndex, lineIndex)
})
ipcMain.handle('store:addBook', (event, book) => {
  try {
    // 确保 book 对象是可序列化的
    const serializableBook = JSON.parse(JSON.stringify(book))
    return StoreService.addBook(serializableBook)
  } catch (error) {
    console.error('添加书籍失败:', error)
    return null
  }
})
ipcMain.handle('store:deleteBook', (event, bookId) => {
  return StoreService.deleteBook(bookId)
})
ipcMain.handle('store:getLastReadBookId', (event) => {
  return StoreService.getLastReadBookId()
})
ipcMain.handle('store:clearAll', (event) => {
  return StoreService.clearAll()
})

// 处理渲染进程的库目录书籍请求
ipcMain.handle('get-library-books', (event) => {
  try {
    // 获取库目录路径
    const directories = ensureDirectories()
    if (!directories) {
      console.error('获取目录失败')
      return []
    }
    
    const { libraryPath } = directories
    
    // 读取库目录下的所有文件
    const files = fs.readdirSync(libraryPath)
    console.log('库目录文件:', files)
    
    // 过滤出TXT文件
    const txtFiles = files.filter(file => path.extname(file) === '.txt')
    console.log('TXT文件:', txtFiles)
    
    // 构建书籍列表
    const books = txtFiles.map(file => {
      const filePath = path.join(libraryPath, file)
      const fileName = path.basename(file, '.txt')
      
      return {
        id: Date.now() + Math.floor(Math.random() * 1000), // 生成临时ID
        title: fileName,
        author: '未知作者',
        localPath: filePath,
        readingProgress: { chapterIndex: 0, lineIndex: 0 }
      }
    })
    
    console.log('库目录书籍:', books)
    return books
  } catch (error) {
    console.error('获取库目录书籍失败:', error)
    return []
  }
})

app.whenReady().then(() => {
  // 确保存储目录存在
  ensureDirectories()
  
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})