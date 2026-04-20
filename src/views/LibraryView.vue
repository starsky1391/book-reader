<script setup>
import { NButton, NIcon, NEmpty } from 'naive-ui'
import { Trash } from '@vicons/ionicons5'
import { useLibraryStore } from '../stores/useLibraryStore'
import { useViewStore } from '../stores/useViewStore'
import { useReaderStore } from '../stores/useReaderStore'
import AppSidebar from '../components/AppSidebar.vue'

const libraryStore = useLibraryStore()
const viewStore = useViewStore()
const readerStore = useReaderStore()

const handleSelectBook = async (bookId) => {
  const success = await libraryStore.loadBook(bookId)
  if (success) {
    viewStore.showReader()
  }
}

const handleImport = () => {
  libraryStore.importFile()
}

const handleSettings = () => {
  readerStore.toggleSettingsDrawer()
}
</script>

<template>
  <div class="library-container h-screen flex overflow-hidden">
    <!-- 左侧侧边栏 -->
    <aside class="w-56 flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border)]">
      <AppSidebar @import="handleImport" @settings="handleSettings" />
    </aside>
    
    <!-- 右侧主内容区 -->
    <main class="flex-1 bg-[var(--bg-main)] overflow-y-auto custom-scrollbar pl-[10px]">
      <div class="p-10">
        <!-- 顶部标题栏 -->
        <header class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-3xl font-bold text-[var(--text-h)]">我的书架</h1>
            <p class="text-sm text-[var(--text-main)] opacity-60 mt-1">
              共 {{ libraryStore.books.length }} 本书籍
            </p>
          </div>
        </header>
        
        <!-- 书籍网格 -->
        <div v-if="libraryStore.hasBooks" class="books-grid">
          <div 
            v-for="book in libraryStore.books" 
            :key="book.id"
            class="book-card"
            @click="handleSelectBook(book.id)"
          >
            <!-- 封面 -->
            <div class="book-cover">
              <img 
                v-if="book.cover" 
                :src="book.cover" 
                class="cover-image"
                alt="封面"
              />
              <div v-else class="cover-placeholder">
                <span>{{ book.title.charAt(0) }}</span>
              </div>
              
              <!-- 删除按钮 -->
              <div class="delete-btn" @click.stop="libraryStore.deleteBook(book.id)">
                <NIcon size="18"><Trash /></NIcon>
              </div>
            </div>
            
            <!-- 书籍信息 -->
            <div class="book-info">
              <h3 class="book-title">{{ book.title }}</h3>
              <p class="book-author">{{ book.author }}</p>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-else class="empty-state">
          <NEmpty description="书架空空如也" />
          <NButton 
            @click="handleImport" 
            type="primary" 
            size="large"
            round
            style="background-color: #b88552; margin-top: 24px"
          >
            添加第一本书
          </NButton>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.library-container {
  background-color: var(--bg-main);
}

/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 书籍网格 - 固定大小 */
.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 150px);
  gap: 32px;
}

/* 书籍卡片 */
.book-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.book-card:hover {
  transform: translateY(-8px);
}

.book-card:hover .book-cover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.book-cover {
  position: relative;
  width: 150px;
  height: 225px; /* 2:3 比例 */
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
  background: linear-gradient(135deg, #e6d5b8 0%, #d4bc96 100%);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-placeholder span {
  font-size: 48px;
  font-weight: 700;
  color: #8b7355;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.book-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(220, 38, 38, 0.9);
}

.book-info {
  padding: 12px 4px;
  width: 150px;
}

.book-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-author {
  font-size: 12px;
  color: var(--text-main);
  opacity: 0.6;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
}
</style>
