const { contextBridge, ipcRenderer } = require('electron')

console.log('preload.js 加载成功');

// 暴露 Electron API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options)
  },
  file: {
    readFile: (filePath) => ipcRenderer.invoke('file:readFile', filePath),
    getFileInfo: (filePath) => ipcRenderer.invoke('file:getFileInfo', filePath),
    parseChapters: (content) => ipcRenderer.invoke('file:parseChapters', content),
    copyFileToLibrary: (sourcePath) => ipcRenderer.invoke('file:copyFileToLibrary', sourcePath)
  },
  store: {
    getSettings: () => ipcRenderer.invoke('store:getSettings'),
    saveSettings: (settings) => {
      console.log('保存设置:', settings);
      return ipcRenderer.invoke('store:saveSettings', settings);
    },
    getBooks: () => ipcRenderer.invoke('store:getBooks'),
    saveBooks: (books) => {
      console.log('保存书架数据:', books);
      console.log('书架数据类型:', typeof books);
      console.log('书架数据是否为数组:', Array.isArray(books));
      try {
        const serialized = JSON.stringify(books);
        console.log('书架数据可序列化');
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

console.log('Electron API 暴露成功');

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})