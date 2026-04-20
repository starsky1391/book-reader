<script setup>
import { NDrawer, NScrollbar, NEmpty } from 'naive-ui'
import { useReaderStore } from '../stores/useReaderStore'
import { useLibraryStore } from '../stores/useLibraryStore'

const readerStore = useReaderStore()
const libraryStore = useLibraryStore()

const handleClose = () => {
  readerStore.directoryDrawerVisible = false
}

const handleSelectChapter = (index) => {
  libraryStore.selectChapter(index)
  handleClose()
}

const formatIndex = (index) => {
  return (index + 1).toString().padStart(2, '0')
}
</script>

<template>
  <NDrawer 
    :show="readerStore.directoryDrawerVisible"
    @update:show="handleClose"
    :width="320"
    placement="left"
    class="modern-drawer"
    :native-scrollbar="false"
  >
    <div class="drawer-container">
      <div class="drawer-header">
        <span class="title">目录</span>
        <span class="count">共 {{ libraryStore.totalChapters }} 章</span>
      </div>

      <NScrollbar class="drawer-content">
        <div class="px-4 py-2">
          <div
            v-for="(chapter, index) in libraryStore.currentBook.chapters || []"
            :key="index"
            @click="handleSelectChapter(index)"
            class="chapter-item"
            :class="{ 'active': libraryStore.currentBook.currentChapterIndex === index }"
          >
            <span class="index-num">{{ formatIndex(index) }}</span>
            <span class="chapter-title">{{ chapter.title }}</span>
            <div class="active-indicator"></div>
          </div>

          <NEmpty
            v-if="!libraryStore.currentBook.chapters?.length"
            description="暂无章节信息"
            class="mt-10"
          />
        </div>
      </NScrollbar>
    </div>
  </NDrawer>
</template>

<style scoped>
.drawer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-main);
}

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

.drawer-header .title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-main);
}

.drawer-header .count {
  font-size: 0.8rem;
  color: #999;
}

.drawer-content {
  flex: 1;
  overflow: auto;
  background-color: var(--bg-main);
}

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

.index-num {
  font-family: "Fira Code", monospace;
  font-size: 0.8rem;
  color: #bbb;
  margin-right: 16px;
  width: 24px;
}

.chapter-title {
  font-size: 0.95rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.chapter-item:hover {
  background-color: rgba(184, 133, 82, 0.05);
}

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
</style>
