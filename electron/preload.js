const { contextBridge, ipcRenderer } = require('electron')

// 暴露 Electron API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options)
  },
  file: {
    readFile: (filePath) => ipcRenderer.invoke('file:readFile', filePath),
    getFileInfo: (filePath) => ipcRenderer.invoke('file:getFileInfo', filePath),
    parseChapters: (content, type = 'txt', filePath = null) => 
      ipcRenderer.invoke('file:parseChapters', content, type, filePath),
    copyFileToLibrary: (sourcePath) => ipcRenderer.invoke('file:copyFileToLibrary', sourcePath),
    getEpubCover: (epubPath) => ipcRenderer.invoke('file:getEpubCover', epubPath)
  },
  store: {
    getSettings: () => ipcRenderer.invoke('store:getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('store:saveSettings', settings),
    getBooks: () => ipcRenderer.invoke('store:getBooks'),
    saveBooks: (books) => {
      try {
        JSON.stringify(books);
        return ipcRenderer.invoke('store:saveBooks', books);
      } catch (error) {
        console.error('书架数据序列化失败:', error);
        return null;
      }
    },
    getReadingProgress: (bookId) => ipcRenderer.invoke('store:getReadingProgress', bookId),
    saveReadingProgress: (bookId, chapterIndex, lineIndex) => ipcRenderer.invoke('store:saveReadingProgress', bookId, chapterIndex, lineIndex),
    addBook: (book) => ipcRenderer.invoke('store:addBook', book),
    deleteBook: (bookId) => ipcRenderer.invoke('store:deleteBook', bookId),
    getLastReadBookId: () => ipcRenderer.invoke('store:getLastReadBookId'),
    clearAll: () => ipcRenderer.invoke('store:clearAll')
  },
  library: {
    getBooks: () => ipcRenderer.invoke('get-library-books')
  }
})

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})