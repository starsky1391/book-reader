<script setup>
import { NIcon } from 'naive-ui'
import { BookOutline, SettingsOutline, AddOutline, MenuOutline } from '@vicons/ionicons5'

const emit = defineEmits(['import', 'settings'])
</script>

<template>
  <div class="sidebar-container">
    <!-- 顶部：菜单 + 书架标签 -->
    <div class="sidebar-top">
      <div class="menu-btn">
        <NIcon size="22"><MenuOutline /></NIcon>
      </div>
      <div class="nav-item-active">
        <NIcon size="20"><BookOutline /></NIcon>
        <span>书架</span>
      </div>
    </div>
    
    <!-- 中间占位 -->
    <div class="sidebar-spacer"></div>
    
    <!-- 底部：系统操作 -->
    <div class="sidebar-bottom">
      <div class="nav-item" @click.stop="emit('settings')">
        <NIcon size="20"><SettingsOutline /></NIcon>
        <span>设置</span>
      </div>
      <div class="nav-item nav-item-primary" @click.stop="emit('import')">
        <NIcon size="20"><AddOutline /></NIcon>
        <span>导入书籍</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 12px 20px;
  box-sizing: border-box;
  background-color: var(--bg-sidebar);
}

/* 顶部 */
.sidebar-top {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-main);
  transition: all 0.2s ease;
}

.menu-btn:hover {
  background-color: rgba(184, 133, 82, 0.1);
}

.nav-item-active {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background-color: rgba(184, 133, 82, 0.12);
  border-radius: 10px;
  color: #b88552;
  font-size: 14px;
  font-weight: 600;
}

/* 中间占位 */
.sidebar-spacer {
  flex: 1;
  min-height: 0;
}

/* 底部 */
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

/* 导航项 */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background-color: rgba(184, 133, 82, 0.08);
}

.nav-item-primary {
  background-color: #b88552;
  color: white;
}

.nav-item-primary:hover {
  background-color: #a07645;
}
</style>
