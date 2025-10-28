<template>
  <div id="app" class="velocity-control-popup">
    <el-container class="popup-container">
      <el-header height="auto" class="popup-header">
        <h3>Velocity Control</h3>
        <el-text type="info" size="small">当前倍速: {{ currentSpeed }}x</el-text>
      </el-header>
      
      <el-main class="popup-main">
        <!-- 滑块控制 -->
        <div class="control-section">
          <el-text class="control-label">倍速调节</el-text>
          <el-slider
            v-model="speed"
            :min="minSpeed"
            :max="maxSpeed"
            :step="0.1"
            :format-tooltip="formatSpeed"
            @change="handleSpeedChange"
            show-stops
            :marks="speedMarks"
          />
        </div>
        
        <!-- 预设按钮 -->
        <div class="control-section">
          <el-text class="control-label">常用倍速</el-text>
          <div class="preset-buttons">
            <el-button
              v-for="preset in presetSpeeds"
              :key="preset"
              :type="speed === preset ? 'primary' : 'default'"
              @click="setSpeed(preset)"
              size="small"
            >
              {{ preset }}x
            </el-button>
          </div>
        </div>
        
        <!-- 精确输入 -->
        <div class="control-section">
          <el-text class="control-label">精确设置</el-text>
          <div class="input-control">
            <el-input-number
              v-model="speed"
              :min="minSpeed"
              :max="maxSpeed"
              :step="0.1"
              size="small"
              @change="handleSpeedChange"
            />
            <el-button @click="resetSpeed" type="info" size="small">重置</el-button>
          </div>
        </div>
        
        <!-- 快捷键提示 -->
        <el-collapse class="shortcut-hint">
          <el-collapse-item title="快捷键提示">
            <div>加速: Ctrl + ↑</div>
            <div>减速: Ctrl + ↓</div>
            <div>重置: Ctrl + Shift + 0</div>
          </el-collapse-item>
        </el-collapse>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'

// 响应式数据
const speed = ref(1.0)
const currentSpeed = ref(1.0)
const minSpeed = ref(0.1)
const maxSpeed = ref(5.0)

// 预设速度
const presetSpeeds = ref([0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0])

// 滑块标记
const speedMarks = computed(() => {
  const marks = {}
  presetSpeeds.value.forEach(preset => {
    marks[preset] = preset + 'x'
  })
  return marks
})

// 格式化速度显示
const formatSpeed = (value) => {
  return `${value.toFixed(1)}x`
}

// 设置速度
const setSpeed = async (newSpeed) => {
  speed.value = newSpeed
  await applySpeedToPage(newSpeed)
}

// 重置速度
const resetSpeed = () => {
  setSpeed(1.0)
}

// 处理速度变化
const handleSpeedChange = async (newSpeed) => {
  if (newSpeed !== null) {
    await applySpeedToPage(newSpeed)
  }
}

// 应用速度到页面
const applySpeedToPage = async (speedValue) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'setSpeed',
      speed: speedValue
    })
    
    if (response && response.success) {
      currentSpeed.value = speedValue
    }
  } catch (error) {
    console.error('Failed to set speed:', error)
    // 处理错误，例如内容脚本未加载
    ElMessage.error('无法连接到页面，请刷新页面后重试')
  }
}

// 获取当前速度
const getCurrentSpeed = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getSpeed'
    })
    
    if (response && response.speed) {
      speed.value = response.speed
      currentSpeed.value = response.speed
    }
  } catch (error) {
    console.error('Failed to get current speed:', error)
  }
}

// 生命周期
onMounted(() => {
  getCurrentSpeed()
})
</script>

<style scoped>
.velocity-control-popup {
  width: 320px;
  min-height: 400px;
}

.popup-container {
  padding: 0;
}

.popup-header {
  text-align: center;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.popup-header h3 {
  margin: 0 0 8px 0;
  color: #409eff;
}

.popup-main {
  padding: 16px;
}

.control-section {
  margin-bottom: 20px;
}

.control-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.input-control {
  display: flex;
  gap: 8px;
  align-items: center;
}

.shortcut-hint {
  margin-top: 20px;
}

:deep(.el-slider__marks-text) {
  font-size: 10px;
  transform: translateX(-50%) rotate(-45deg);
  white-space: nowrap;
}
</style>