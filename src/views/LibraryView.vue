<script setup>
import { NButton, NEmpty } from 'naive-ui'
import { useLibraryStore } from '../stores/useLibraryStore'
import { useViewStore } from '../stores/useViewStore'
import { useReaderStore } from '../stores/useReaderStore'
import AppSidebar from '../components/AppSidebar.vue'
import BookCard from '../components/BookCard.vue'

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

const handleDeleteBook = async (bookId) => {
  await libraryStore.deleteBook(bookId)
}

const handleUpdateBook = async (updatedBook) => {
  await libraryStore.updateBook(updatedBook.id, {
    title: updatedBook.title,
    author: updatedBook.author,
    cover: updatedBook.cover
  })
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
          <BookCard
            v-for="book in libraryStore.books"
            :key="book.id"
            :book="book"
            @select="handleSelectBook"
            @delete="handleDeleteBook"
            @update="handleUpdateBook"
          />
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
}
</style>
