<script setup>
import { ref, watch, computed } from 'vue'
import { NModal, NCard, NForm, NFormItem, NInput, NButton, NIcon, useMessage } from 'naive-ui'
import { ImageOutline } from '@vicons/ionicons5'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  book: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:show', 'update'])

const message = useMessage()

// 表单数据
const formData = ref({
  title: '',
  author: '',
  cover: ''
})

// 是否有修改
const hasChanges = computed(() => {
  return (
    formData.value.title !== props.book.title ||
    formData.value.author !== props.book.author ||
    formData.value.cover !== props.book.cover
  )
})

// 监听 book 变化，更新表单数据
watch(
  () => props.book,
  (newBook) => {
    if (newBook) {
      formData.value = {
        title: newBook.title || '',
        author: newBook.author || '',
        cover: newBook.cover || ''
      }
    }
  },
  { immediate: true, deep: true }
)

// 关闭弹窗
const handleClose = () => {
  emit('update:show', false)
}

// 选择新封面
const handleSelectCover = async () => {
  try {
    const result = await window.electron.dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePaths.length) return

    const imagePath = result.filePaths[0]
    
    // 读取图片并转换为 base64
    const base64 = await window.electron.file.readImageAsBase64(imagePath)
    if (base64) {
      formData.value.cover = base64
      message.success('封面已更新')
    }
  } catch (error) {
    console.error('选择封面失败:', error)
    message.error('选择封面失败')
  }
}

// 保存修改
const handleSave = () => {
  if (!formData.value.title.trim()) {
    message.warning('书籍名称不能为空')
    return
  }

  emit('update', {
    id: props.book.id,
    title: formData.value.title.trim(),
    author: formData.value.author.trim() || '未知作者',
    cover: formData.value.cover
  })

  message.success('保存成功')
  handleClose()
}
</script>

<template>
  <NModal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    style="width: 600px; max-width: 90vw"
    title="书籍信息"
    :bordered="false"
    :mask-closable="false"
  >
    <div class="modal-content">
      <!-- 左侧：封面 -->
      <div class="cover-section">
        <div class="cover-wrapper" @click="handleSelectCover">
          <img
            v-if="formData.cover"
            :src="formData.cover"
            class="cover-preview"
            alt="封面"
          />
          <div v-else class="cover-placeholder">
            <NIcon size="48" color="#8b7355">
              <ImageOutline />
            </NIcon>
            <span>暂无封面</span>
          </div>
          <div class="cover-overlay">
            <span>点击修改封面</span>
          </div>
        </div>
        <p class="cover-hint">点击图片更换封面</p>
      </div>

      <!-- 右侧：表单 -->
      <div class="form-section">
        <NForm label-placement="left" label-width="80">
          <NFormItem label="书籍名称">
            <NInput
              v-model:value="formData.title"
              placeholder="请输入书籍名称"
              clearable
            />
          </NFormItem>
          <NFormItem label="作者名">
            <NInput
              v-model:value="formData.author"
              placeholder="请输入作者名"
              clearable
            />
          </NFormItem>
        </NForm>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="modal-footer">
        <NButton
          type="primary"
          style="background-color: #b88552"
          :disabled="!hasChanges"
          @click="handleSave"
        >
          保存
        </NButton>
        <NButton @click="handleClose">
          取消
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.modal-content {
  display: flex;
  gap: 32px;
  padding: 16px 0;
}

/* 左侧封面区域 */
.cover-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.cover-wrapper {
  position: relative;
  width: 150px;
  height: 225px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #e6d5b8 0%, #d4bc96 100%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cover-wrapper:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.cover-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8b7355;
}

.cover-placeholder span {
  font-size: 14px;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.cover-wrapper:hover .cover-overlay {
  opacity: 1;
}

.cover-overlay span {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.cover-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-main);
  opacity: 0.6;
}

/* 右侧表单区域 */
.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 底部按钮 */
.modal-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
</style>
