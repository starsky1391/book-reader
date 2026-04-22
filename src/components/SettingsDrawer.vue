<script setup>
import {
  NDrawer, NTabs, NTabPane, NSlider, NRadioGroup, NRadio, NButton, NSelect
} from 'naive-ui'
import { useReaderStore } from '../stores/useReaderStore'
import { useLibraryStore } from '../stores/useLibraryStore'
import { ref } from 'vue'

const readerStore = useReaderStore()
const libraryStore = useLibraryStore()

// 当前选中的 tab
const activeTab = ref('text')

// 字体选项
const fontOptions = [
  { label: '系统默认', value: 'system-ui' },
  { label: 'Arial', value: 'Arial' },
  { label: '宋体', value: 'SimSun' },
  { label: '黑体', value: 'SimHei' },
  { label: '微软雅黑', value: 'Microsoft YaHei' }
]

// 主题选项
const themeOptions = [
  { key: 'white', label: '白色', color: '#FBFBFB' },
  { key: 'parchment', label: '羊皮纸', color: '#F4F1E6' },
  { key: 'green', label: '护眼绿', color: '#F0F9E8' },
  { key: 'dark', label: '深夜', color: '#16171D' }
]

const handleClose = () => {
  readerStore.settingsDrawerVisible = false
}

const handleFontFamilyChange = (value) => {
  readerStore.fontFamily = value
  readerStore.saveTextSettings()
}

const handleFontSizeChange = (value) => {
  readerStore.fontSize = value
  readerStore.saveTextSettings()
}

const handleLineHeightChange = (value) => {
  readerStore.lineHeight = value
  readerStore.saveTextSettings()
}

const handleLetterSpacingChange = (value) => {
  readerStore.letterSpacing = value
  readerStore.saveTextSettings()
}

const handleTextAlignChange = (value) => {
  readerStore.textAlign = value
  readerStore.saveTextSettings()
}

const handleThemeChange = (themeKey) => {
  readerStore.setTheme(themeKey)
}

const handleClearAll = () => {
  libraryStore.clearAll()
}
</script>

<template>
  <NDrawer
    :show="readerStore.settingsDrawerVisible"
    @update:show="handleClose"
    :width="500"
    placement="right"
    class="modern-settings-drawer"
    title="设置"
  >
    <div class="settings-content">
      <NTabs v-model:value="activeTab" type="card" class="custom-tabs">
        <NTabPane name="text" tab="文字">
          <div class="p-4 space-y-4">
            <div class="setting-card">
              <h4 class="text-sm font-medium mb-3">字体库</h4>
              <NSelect
                :value="readerStore.fontFamily"
                :options="fontOptions"
                @update:value="handleFontFamilyChange"
                class="w-full"
              />
            </div>
            <div class="setting-card">
              <h4 class="text-sm font-medium mb-3">
                字体大小 <span class="text-xs text-gray-500">{{ readerStore.fontSize }}px</span>
              </h4>
              <NSlider
                :value="readerStore.fontSize"
                :min="12"
                :max="40"
                :step="1"
                @update:value="handleFontSizeChange"
                class="custom-slider"
              />
              <div class="flex justify-between text-xs mt-1">
                <span>12px</span>
                <span>40px</span>
              </div>
            </div>
            <div class="setting-card">
              <h4 class="text-sm font-medium mb-3">
                行间距 <span class="text-xs text-gray-500">{{ readerStore.lineHeight }}</span>
              </h4>
              <NSlider
                :value="readerStore.lineHeight"
                :min="1.0"
                :max="2.0"
                :step="0.1"
                @update:value="handleLineHeightChange"
                class="custom-slider"
              />
              <div class="flex justify-between text-xs mt-1">
                <span>1.0</span>
                <span>2.0</span>
              </div>
            </div>
            <div class="setting-card">
              <h4 class="text-sm font-medium mb-3">
                字符间距 <span class="text-xs text-gray-500">{{ readerStore.letterSpacing }}px</span>
              </h4>
              <NSlider
                :value="readerStore.letterSpacing"
                :min="0"
                :max="2"
                :step="0.1"
                @update:value="handleLetterSpacingChange"
                class="custom-slider"
              />
              <div class="flex justify-between text-xs mt-1">
                <span>0px</span>
                <span>2px</span>
              </div>
            </div>
            <div class="setting-card">
              <h4 class="text-sm font-medium mb-3">对齐方式</h4>
              <NRadioGroup
                :value="readerStore.textAlign"
                @update:value="handleTextAlignChange"
              >
                <div class="flex space-x-4">
                  <NRadio value="left">左对齐</NRadio>
                  <NRadio value="justify">前后对齐</NRadio>
                </div>
              </NRadioGroup>
            </div>
          </div>
        </NTabPane>

        <NTabPane name="background" tab="阅读背景">
          <div class="p-4 space-y-4">
            <div class="setting-card">
              <h4 class="text-sm font-medium mb-3">主题选择</h4>
              <div class="flex space-x-5 mt-4">
                <div
                  v-for="theme in themeOptions"
                  :key="theme.key"
                  @click="handleThemeChange(theme.key)"
                  class="theme-circle-wrapper"
                  :class="{ 'is-active': readerStore.selectedTheme === theme.key }"
                >
                  <div
                    class="color-dot"
                    :style="{
                      backgroundColor: theme.color,
                      border: theme.key === 'white' ? '1px solid #ddd' : 'none'
                    }"
                  >
                    <div v-if="readerStore.selectedTheme === theme.key" class="active-check"></div>
                  </div>
                  <span class="theme-label">{{ theme.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </NTabPane>

        <NTabPane name="other" tab="其它">
          <div class="p-4 space-y-4">
            <div class="setting-card">
              <h4 class="text-sm font-medium mb-3">关于</h4>
              <p class="text-sm">Book Reader v2.1.0</p>
              <p class="text-sm">一个轻量级的桌面小说阅读器</p>
              <p class="text-xs text-gray-500 mt-2">支持 Edge TTS 高质量语音合成</p>
            </div>
            <div class="setting-card">
              <NButton
                @click="handleClearAll"
                class="w-full"
                type="warning"
                quaternary
              >
                清空书籍和缓存
              </NButton>
            </div>
          </div>
        </NTabPane>
      </NTabs>
    </div>
  </NDrawer>
</template>

<style scoped>
.modern-settings-drawer {
  background-color: var(--bg-main);
  backdrop-filter: blur(10px);
  color: var(--text-main);
}

.settings-content {
  max-width: 450px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100%;
  background-color: var(--bg-main);
  transition: background-color 0.3s ease;
}

.setting-card {
  background-color: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(184, 133, 82, 0.1);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  margin-bottom: 16px;
}

.setting-card:hover {
  box-shadow: 0 4px 12px rgba(184, 133, 82, 0.1);
}

.custom-slider {
  --n-slider-rail-background: #e0e0e0;
  --n-slider-rail-fill-background: #b88552;
  --n-slider-handle-background: white;
  --n-slider-handle-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  --n-slider-rail-height: 4px;
}

.custom-tabs {
  --n-tab-line-color: transparent;
  --n-tab-text-color: #94a3b8;
  --n-tab-text-color-active: #b88552;
  --n-tab-border-radius: 20px;
  --n-tab-padding: 8px 16px;
  --n-tab-font-size: 14px;
}

.custom-switch {
  --n-switch-button-background: white;
  --n-switch-background: #e0e0e0;
  --n-switch-background-active: #b88552;
  --n-switch-button-box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  --n-switch-height: 20px;
  --n-switch-width: 36px;
}

.theme-circle-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.color-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-circle-wrapper.is-active .color-dot {
  outline: 2px solid #b88552;
  outline-offset: 3px;
  transform: scale(0.9);
}

.theme-label {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
  display: block;
  text-align: center;
  transition: all 0.3s ease;
}

.is-active .theme-label {
  color: #b88552;
  font-weight: 600;
}

.active-check {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #b88552;
  transition: all 0.3s ease;
}
</style>