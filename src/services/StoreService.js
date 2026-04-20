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
    
    this.configPath = this.getConfigPath();
    this.config = this.readConfig();
  }

  getConfigPath() {
    try {
      const { app } = require('electron');
      return require('path').join(app.getPath('userData'), 'config.json');
    } catch (error) {
      const path = require('path');
      return path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share'), 'book', 'config.json');
    }
  }

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

  writeConfig(data) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
      this.config = data;
      return true;
    } catch (error) {
      console.error('写入配置文件失败:', error);
      return false;
    }
  }

  saveSettings(settings) {
    const config = this.readConfig();
    config.settings = { ...config.settings, ...settings };
    this.writeConfig(config);
  }

  getSettings() {
    const config = this.readConfig();
    return config.settings || this.defaults.settings;
  }

  saveBooks(books) {
    const config = this.readConfig();
    config.books = books;
    this.writeConfig(config);
  }

  getBooks() {
    const config = this.readConfig();
    return Array.isArray(config.books) ? config.books : this.defaults.books;
  }

  saveReadingProgress(bookId, chapterIndex, lineIndex) {
    try {
      const config = this.readConfig();
      const bookIndex = config.books.findIndex(book => book.id == bookId);
      if (bookIndex !== -1) {
        config.books[bookIndex].readingProgress = { chapterIndex, lineIndex };
        config.settings.lastReadBookId = bookId;
        this.writeConfig(config);
      }
    } catch (error) {
      console.error('保存阅读进度失败:', error);
    }
  }

  getReadingProgress(bookId) {
    try {
      const config = this.readConfig();
      const book = config.books.find(book => book.id == bookId);
      return book?.readingProgress || { chapterIndex: 0, lineIndex: 0 };
    } catch (error) {
      console.error('获取阅读进度失败:', error);
      return { chapterIndex: 0, lineIndex: 0 };
    }
  }

  getLastReadBookId() {
    const config = this.readConfig();
    return config.settings.lastReadBookId || null;
  }

  addBook(book) {
    const config = this.readConfig();
    book.id = Date.now();
    book.readingProgress = { chapterIndex: 0, lineIndex: 0 };
    
    const bookToSave = {
      id: book.id,
      title: book.title,
      author: book.author,
      localPath: book.localPath,
      type: book.type,
      cover: book.cover,
      readingProgress: book.readingProgress
    };
    
    config.books.push(bookToSave);
    config.settings.lastReadBookId = book.id;
    
    if (this.writeConfig(config)) {
      return book;
    }
    return null;
  }

  deleteBook(bookId) {
    const config = this.readConfig();
    const bookIndex = config.books.findIndex(book => book.id === bookId);
    if (bookIndex !== -1) {
      const book = config.books[bookIndex];
      config.books.splice(bookIndex, 1);
      
      if (config.settings.lastReadBookId === bookId) {
        config.settings.lastReadBookId = config.books.length > 0 ? config.books[0].id : null;
      }
      
      try {
        const fs = require('fs');
        if (fs.existsSync(book.localPath)) {
          fs.unlinkSync(book.localPath);
        }
      } catch (error) {
        console.error('删除物理文件失败:', error);
      }
      
      this.writeConfig(config);
      return true;
    }
    return false;
  }

  clearAll() {
    this.writeConfig(this.defaults);
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      let userDataPath;
      try {
        const { app } = require('electron');
        userDataPath = app.getPath('userData');
      } catch (error) {
        userDataPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share'), 'book');
      }
      
      const libraryPath = path.join(userDataPath, 'library');
      
      if (fs.existsSync(libraryPath)) {
        const files = fs.readdirSync(libraryPath);
        for (const file of files) {
          fs.unlinkSync(path.join(libraryPath, file));
        }
      }
    } catch (error) {
      console.error('清空库目录失败:', error);
    }
  }
}

module.exports = new StoreService()