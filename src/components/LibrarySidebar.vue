<script setup>
import { NButton, NIcon, NScrollbar, NEmpty } from 'naive-ui'
import { Add, Trash } from '@vicons/ionicons5'
import { useLibraryStore } from '../stores/useLibraryStore'

const libraryStore = useLibraryStore()

const handleImportFile = () => {
  libraryStore.importFile()
}

const handleDeleteBook = (bookId) => {
  libraryStore.deleteBook(bookId)
}

const handleSelectBook = (bookId) => {
  libraryStore.loadBook(bookId)
}
</script>

<template>
  <div class="bookshelf-container">
    <div class="bookshelf-content">
      <div class="flex justify-between items-center mb-6">
        <h2 class="shelf-title">我的书架</h2>
        <NButton 
          @click="handleImportFile" 
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
            v-for="book in libraryStore.books" 
            :key="book.id"
            @click="handleSelectBook(book.id)"
            class="book-row-item"
            :class="{ 'ring-2 ring-[#b88552]': libraryStore.currentBook.id === book.id }"
          >
            <!-- 微型封面 -->
            <div class="book-cover-mini">
              <img 
                v-if="book.cover" 
                :src="book.cover" 
                class="cover-image"
                alt="封面"
              />
              <span v-else class="cover-text">{{ book.title.charAt(0) }}</span>
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
                @click.stop="handleDeleteBook(book.id)"
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
          
          <NEmpty v-if="!libraryStore.hasBooks" description="书架空空如也" />
        </div>
      </NScrollbar>
      
      <!-- 版本号 -->
      <div class="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        v1.0.0
      </div>
    </div>
  </div>
</template>

<style scoped>
.bookshelf-container {
  min-height: 100vh;
  background-color: var(--bg-sidebar);
  padding: 40px 20px;
  filter: brightness(0.95);
}

.bookshelf-content {
  max-width: 680px;
  margin: 0 auto;
}

.shelf-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 24px;
  padding-left: 8px;
}

.book-row-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-card);
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
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.cover-text {
  color: #8b7355;
  font-weight: bold;
  font-size: 14px;
}

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

.book-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.book-row-item:hover .book-actions {
  opacity: 1;
}
</style>
