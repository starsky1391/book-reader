<script setup>
import { ref, h } from 'vue'
import { NIcon, NDropdown, useDialog, useMessage } from 'naive-ui'
import { EllipsisHorizontal, InformationCircle, Trash } from '@vicons/ionicons5'
import BookDetailModal from './BookDetailModal.vue'

const props = defineProps({
  book: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['select', 'delete', 'update'])

const dialog = useDialog()
const message = useMessage()
const showDetailModal = ref(false)

// 下拉菜单选项
const dropdownOptions = [
  {
    label: '书籍信息',
    key: 'info',
    icon: () => h(NIcon, null, { default: () => h(InformationCircle) })
  },
  {
    type: 'divider',
    key: 'd1'
  },
  {
    label: '删除',
    key: 'delete',
    icon: () => h(NIcon, null, { default: () => h(Trash) })
  }
]

// 处理下拉菜单选择
const handleDropdownSelect = (key) => {
  if (key === 'info') {
    showDetailModal.value = true
  } else if (key === 'delete') {
    showDeleteConfirm()
  }
}

// 显示删除确认对话框
const showDeleteConfirm = () => {
  dialog.warning({
    title: '要删除吗？',
    content: `确定要在本阅读器中删除书籍《${props.book.title}》吗？`,
    positiveText: '删除',
    negativeText: '取消',
    positiveButtonProps: {
      type: 'primary',
      style: 'background-color: #3b82f6'
    },
    negativeButtonProps: {
      style: 'background-color: white; border: 1px solid #e5e7eb'
    },
    onPositiveClick: () => {
      emit('delete', props.book.id)
      message.success('删除成功')
    }
  })
}

// 处理书籍更新
const handleUpdate = (updatedBook) => {
  emit('update', updatedBook)
}

// 处理卡片点击
const handleCardClick = () => {
  emit('select', props.book.id)
}
</script>

<template>
  <div class="book-card" @click="handleCardClick">
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
      
      <!-- 更多按钮 -->
      <div class="more-btn" @click.stop>
        <NDropdown
          :options="dropdownOptions"
          @select="handleDropdownSelect"
          placement="bottom-end"
          trigger="click"
        >
          <NIcon size="18" color="white">
            <EllipsisHorizontal />
          </NIcon>
        </NDropdown>
      </div>
    </div>
    
    <!-- 书籍信息 -->
    <div class="book-info">
      <h3 class="book-title">{{ book.title }}</h3>
      <p class="book-author">{{ book.author }}</p>
    </div>

    <!-- 详情弹窗 -->
    <BookDetailModal
      v-model:show="showDetailModal"
      :book="book"
      @update="handleUpdate"
    />
  </div>
</template>

<style scoped>
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
  height: 225px;
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

.more-btn {
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
  cursor: pointer;
}

.book-card:hover .more-btn {
  opacity: 1;
}

.more-btn:hover {
  background: rgba(0, 0, 0, 0.7);
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
</style>
