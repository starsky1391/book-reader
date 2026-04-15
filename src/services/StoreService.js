// 使用内存存储方案，避免文件系统权限问题

class StoreService {
  constructor() {
    this.defaults = {
      settings: {
        darkMode: false,
        eyeProtectionMode: false,
        speed: 1.0,
        autoContinue: true,
        fontFamily: 'system-ui',
        fontSize: 18,
        lineHeight: 1.5,
        letterSpacing: 0,
        textAlign: 'left',
        selectedTheme: 'white',
        lastReadBookId: null
      },
      books: []
    };
    
    // 获取配置文件路径
    this.configPath = this.getConfigPath();
    
    // 读取配置文件
    this.config = this.readConfig();
    console.log('StoreService 初始化成功');
  }

  // 获取配置文件路径
  getConfigPath() {
    try {
      // 尝试在主进程中获取
      const { app } = require('electron');
      return require('path').join(app.getPath('userData'), 'config.json');
    } catch (error) {
      // 在渲染进程中使用默认路径
      const path = require('path');
      return path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share'), 'book', 'config.json');
    }
  }

  // 读取配置
  readConfig() {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('读取配置文件失败:', error);
    }
    return JSON.parse(JSON.stringify(this.defaults));
  }

  // 写入配置
  writeConfig(data) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 确保目录存在
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 写入配置文件
      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
      this.config = data;
      return true;
    } catch (error) {
      console.error('写入配置文件失败:', error);
      return false;
    }
  }

  // 保存设置
  saveSettings(settings) {
    const config = this.readConfig();
    config.settings = { ...config.settings, ...settings };
    this.writeConfig(config);
  }

  // 获取设置
  getSettings() {
    const config = this.readConfig();
    return config.settings || this.defaults.settings;
  }

  // 保存书架
  saveBooks(books) {
    const config = this.readConfig();
    config.books = books;
    this.writeConfig(config);
  }

  // 获取书架
  getBooks() {
    const config = this.readConfig();
    return Array.isArray(config.books) ? config.books : this.defaults.books;
  }

  // 保存阅读进度
  saveReadingProgress(bookId, chapterIndex, lineIndex) {
    const config = this.readConfig();
    // 为每本书保存阅读进度
    const bookIndex = config.books.findIndex(book => book.id === bookId);
    if (bookIndex !== -1) {
      config.books[bookIndex].readingProgress = { chapterIndex, lineIndex };
      // 保存最后阅读的书籍 ID
      config.settings.lastReadBookId = bookId;
      this.writeConfig(config);
    }
  }

  // 获取阅读进度
  getReadingProgress(bookId) {
    const config = this.readConfig();
    const book = config.books.find(book => book.id === bookId);
    return book?.readingProgress || { chapterIndex: 0, lineIndex: 0 };
  }

  // 获取最后阅读的书籍 ID
  getLastReadBookId() {
    const config = this.readConfig();
    return config.settings.lastReadBookId || null;
  }

  // 添加书籍
  addBook(book) {
    // console.log('开始添加书籍:', book);
    const config = this.readConfig();
    // console.log('读取配置成功:', config);
    // 生成唯一 ID
    book.id = Date.now();
    // console.log('生成唯一 ID:', book.id);
    // 初始化阅读进度
    book.readingProgress = { chapterIndex: 0, lineIndex: 0 };
    // console.log('初始化阅读进度:', book.readingProgress);
    // 创建一个只包含基本信息的书籍对象，不包含章节内容
    const bookToSave = {
      id: book.id,
      title: book.title,
      author: book.author,
      localPath: book.localPath,
      readingProgress: book.readingProgress
    };
    // console.log('创建要保存的书籍对象:', bookToSave);
    // 添加到书架
    config.books.push(bookToSave);
    // console.log('添加到书架成功:', config.books);
    // 保存最后阅读的书籍 ID
    config.settings.lastReadBookId = book.id;
    // console.log('保存最后阅读的书籍 ID:', book.id);
    const success = this.writeConfig(config);
    // console.log('写入配置成功:', success);
    if (success) {
      // console.log('添加书籍成功:', book);
      return book;
    } else {
      console.error('保存书籍失败');
      return null;
    }
  }

  // 删除书籍
  deleteBook(bookId) {
    const config = this.readConfig();
    const bookIndex = config.books.findIndex(book => book.id === bookId);
    if (bookIndex !== -1) {
      // 获取要删除的书籍对象
      const book = config.books[bookIndex];
      
      // 从书架中移除
      config.books.splice(bookIndex, 1);
      // 如果删除的是最后阅读的书籍，更新 lastReadBookId
      if (config.settings.lastReadBookId === bookId) {
        config.settings.lastReadBookId = config.books.length > 0 ? config.books[0].id : null;
      }
      
      // 删除对应的物理文件
      try {
        const fs = require('fs');
        if (fs.existsSync(book.localPath)) {
          fs.unlinkSync(book.localPath);
          console.log('删除物理文件成功:', book.localPath);
        }
      } catch (error) {
        console.error('删除物理文件失败:', error);
      }
      
      this.writeConfig(config);
      return true;
    }
    return false;
  }

  // 清除所有数据
  clearAll() {
    this.writeConfig(this.defaults);
    
    // 删除库目录中的所有文件
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 获取用户数据目录
      let userDataPath;
      try {
        // 尝试在主进程中获取
        const { app } = require('electron');
        userDataPath = app.getPath('userData');
      } catch (error) {
        // 在渲染进程中使用默认路径
        userDataPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share'), 'book');
      }
      
      const libraryPath = path.join(userDataPath, 'library');
      
      if (fs.existsSync(libraryPath)) {
        const files = fs.readdirSync(libraryPath);
        for (const file of files) {
          const filePath = path.join(libraryPath, file);
          fs.unlinkSync(filePath);
        }
        console.log('库目录文件已清空');
      }
    } catch (error) {
      console.error('清空库目录失败:', error);
    }
  }
}

// 导出单例
module.exports = new StoreService()