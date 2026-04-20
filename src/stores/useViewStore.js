import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 视图状态管理
 * 管理 'library' (书架视图) 和 'reader' (阅读视图) 的切换
 */
export const useViewStore = defineStore('view', () => {
  // 当前视图状态
  const currentView = ref('library') // 'library' | 'reader'

  /**
   * 切换到书架视图
   */
  function showLibrary() {
    currentView.value = 'library'
  }

  /**
   * 切换到阅读视图
   */
  function showReader() {
    currentView.value = 'reader'
  }

  /**
   * 切换视图
   */
  function toggleView() {
    currentView.value = currentView.value === 'library' ? 'reader' : 'library'
  }

  return {
    currentView,
    showLibrary,
    showReader,
    toggleView
  }
})
