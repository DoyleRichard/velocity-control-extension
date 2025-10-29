<template>
  <div id="app" class="velocity-control-app">
    <!-- header -->
    <header class="app-header">
      <div class="logo">
        <i class="el-icon-video-play"></i>
        <span class="app-name">视频速率控制器</span>
      </div>
      <div class="header-actions">
        <el-tag v-if="videoCount > 0" type="success" size="small">{{ videoCount }}个视频</el-tag>

        <!-- 新增：刷新按钮（美化样式） -->
        <el-button
          class="refresh-btn"
          type="text"
          size="small"
          @click="refreshVideos"
          title="刷新视频列表"
          aria-label="刷新视频列表"
        >
          <i class="el-icon-refresh"></i>
          <span class="refresh-label">检测</span>
        </el-button>

        <!-- 新增：重置倍速按钮 -->
        <el-button
          class="reset-btn"
          type="text"
          size="small"
          @click="resetSpeed"
          title="恢复到常规速度"
          aria-label="恢复到常规速度"
        >
          重置
        </el-button>
      </div>
    </header>

    <!-- main -->
    <main class="app-main">
      <!-- current speed -->
      <section class="speed-panel">
        <div class="speed-left">
          <div class="speed-value">
            <span class="value-number">{{ currentSpeed.toFixed(2) }}</span>
            <span class="value-unit">x</span>
          </div>
           <div class="speed-label">当前速度</div>
         </div>
        <el-progress
          class="speed-progress"
          :percentage="speedPercentage"
          :stroke-width="10"
          :show-text="false"
          :color="progressColor"
        />
      </section>

      <!-- slider -->
      <section class="control-section">
        <div class="section-title"><i class="el-icon-set-up"></i><span>精确控制</span></div>
        <el-slider
          v-model="speed"
          :min="minSpeed"
          :max="maxSpeed"
          :step="0.1"
          :format-tooltip="formatSpeed"
          @change="handleSpeedChange"
          :marks="speedMarks"
          class="compact-slider"
        />
      </section>

      <!-- presets (single row, numbers only) -->
      <section class="control-section presets-section" aria-label="预设速度">
        <div class="section-title"><i class="el-icon-magic-stick"></i><span>预设速度</span></div>
        <div class="presets-grid">
          <el-button
            v-for="value in presetSpeeds"
            :key="value"
            :type="speed === value ? 'primary' : 'default'"
            class="preset-btn"
            @click="setSpeed(value)"
            size="small"
          >
            {{ value }}x
          </el-button>
        </div>
      </section>
    </main>

    <!-- footer -->
    <footer class="app-footer">
      <div class="shortcuts">
        <span class="kbd"><kbd>Ctrl</kbd>↑</span>
        <span class="kbd"><kbd>Ctrl</kbd>↓</span>
        <span class="kbd"><kbd>Ctrl Shift</kbd>0</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus' // 用于轻提示（toast）

// 状态与配置
const speed = ref(1.0)
const currentSpeed = ref(1.0)
const videoCount = ref(0)
const minSpeed = ref(0.1)
const maxSpeed = ref(32.0)

// 预设：仅倍率（保持一行显示）
const presetSpeeds = ref([0.1, 0.2, 3.0, 5.0, 10.0])

// UI 计算属性
const speedPercentage = computed(() => {
  return ((speed.value - minSpeed.value) / (maxSpeed.value - minSpeed.value)) * 100
})
const progressColor = computed(() => {
  if (speed.value < 1.0) return '#67C23A'
  if (speed.value < 2.0) return '#409EFF'
  return '#E6A23C'
})
const speedMarks = computed(() => {
  const marks = {}
  // 仅在 1.0 处显示标记
  presetSpeeds.value.forEach(v => { if (v === 1.0) marks[v] = { label: '1.0x' } })
  return marks
})
const formatSpeed = (v) => `${v.toFixed(1)}x`

// 行为：设置/重置/调整速度
const setSpeed = async (newSpeed) => {
  speed.value = newSpeed
  const ok = await applySpeedToPage(newSpeed)
  if (ok) showToast('success', `速度已设置为 ${newSpeed}x`)
}
const resetSpeed = () => setSpeed(1.0)
const adjustSpeed = (delta) => {
  const n = Math.min(Math.max(speed.value + delta, minSpeed.value), maxSpeed.value)
  setSpeed(parseFloat(n.toFixed(2)))
}
const handleSpeedChange = async (val) => { if (val !== null) await applySpeedToPage(val) }

// 与页面通信：发送消息到 content script
const applySpeedToPage = async (speedValue) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'setSpeed', speed: speedValue })
    if (response && response.success) {
      currentSpeed.value = speedValue
      videoCount.value = response.videoCount || 0
      return true
    }
  } catch (e) {
    console.error(e)
    showToast('error', '无法连接到页面，请刷新后重试')
  }
  return false
}

const getCurrentSpeed = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSpeed' })
    if (response && typeof response.speed === 'number') {
      speed.value = response.speed
      currentSpeed.value = response.speed
      videoCount.value = response.videoCount || 0
    }
  } catch (e) {
    videoCount.value = 0
  }
}

// 重新在页面中查找 video 元素（由 popup 触发）
const refreshVideos = async () => {
  console.log('refreshVideos')
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) throw new Error('no active tab')
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'detectVideos' })
    if (response && typeof response.speed === 'number') {
      speed.value = response.speed
      currentSpeed.value = response.speed
      videoCount.value = response.videoCount || 0
      showToast('success', '已刷新视频列表')
      return
    }
  } catch (e) {
    console.error(e)
    showToast('error', '刷新失败，请刷新页面后重试')
  }
}

// 轻提示：替代原来的 modal 状态弹窗
const showToast = (type, message) => {
  // type: 'success' | 'error' | 'info' | 'warning'
  ElMessage({
    message,
    type: type === 'error' ? 'error' : 'success',
    duration: 1400
  })
}

watch(speed, (v) => { currentSpeed.value = v })

// 简单防抖实现
function debounce(fn, delay) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

const handleFocus = debounce(refreshVideos, 300)

onMounted(() => {
  getCurrentSpeed()
  window.addEventListener('focus', handleFocus)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', handleFocus)
})
</script>

<style scoped>
/* 容器与配色（固定高度，避免纵向滚动） */
.velocity-control-app {
  width: 360px;
  height: 520px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(180deg,#f7fbff 0%, #eef4ff 100%);
  color: #17212b;
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
  box-shadow: 0 12px 30px rgba(10,20,40,0.08);
}

/* header */
.app-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:10px 14px;
  background:rgba(255,255,255,0.95);
  border-bottom:1px solid rgba(15,23,42,0.04);
  flex:0 0 52px;
}
.logo { display:flex; align-items:center; gap:10px; font-weight:600; }
.logo .el-icon-video-play { color:#409EFF; font-size:18px; }
.app-name { font-size:14px; color:#0f2430; }
.header-actions { display:flex; align-items:center; gap:8px; }

/* 主体 */
.app-main {
  padding:12px;
  display:flex;
  flex-direction:column;
  gap:10px;
  flex:1 1 auto;
  overflow:hidden;
}

/* 当前速度卡片 */
.speed-panel {
  display:flex;
  align-items:center;
  gap:12px;
  padding:10px;
  border-radius:12px;
  background: linear-gradient(90deg,#ffffff 0%, #f7fbff 100%);
  box-shadow:0 8px 20px rgba(16,30,60,0.04);
}
.speed-left { display:flex; flex-direction:column; gap:2px; }
.speed-value {
  display:flex;
  align-items:baseline;
  gap:6px;
}
.value-number {
  font-size:34px;
  font-weight:800;
  background: linear-gradient(90deg,#2f80ed,#7b61ff);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  line-height:1;
  letter-spacing: -0.5px;
}
.value-unit {
  font-size:14px;
  color:#4b5964;
  font-weight:700;
  margin-bottom:6px;
}
.speed-label { font-size:12px; color:#556066; }
.speed-progress { min-width:120px; width:42%; }

/* 控制区通用 */
.control-section { display:flex; flex-direction:column; gap:8px; padding:8px; border-radius:10px; background:rgba(255,255,255,0.96); box-shadow:0 6px 18px rgba(14,31,80,0.03); }
.section-title { display:flex; align-items:center; gap:8px; font-weight:600; color:#22313a; font-size:13px; }

/* 滑块视觉微调 */
.compact-slider :deep(.el-slider__bar) { height:6px; border-radius:6px; background:linear-gradient(90deg,#67C23A,#409EFF,#E6A23C); }
.compact-slider :deep(.el-slider__button) { width:14px; height:14px; box-shadow:0 2px 6px rgba(64,158,255,0.12); }

/* 预设：单行布局，按钮风格优化 */
.presets-section .presets-grid {
  display:flex;
  gap:10px;
  align-items:center;
  justify-content:space-between;
  width:100%;
}
.preset-btn {
  flex: 1 1 0;
  min-width: 0;
  height:44px;
  border-radius:10px;
  font-weight:700;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0 8px;
  background:#ffffff;
  border:1px solid rgba(15,23,42,0.06);
  color:#12232e;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}
.preset-btn:hover { transform: translateY(-4px); box-shadow:0 10px 24px rgba(16,30,60,0.06); }
:deep(.el-button--primary.preset-btn) {
  background: linear-gradient(90deg,#409EFF,#67C23A);
  color:#fff;
  border-color:transparent;
  box-shadow:0 10px 28px rgba(64,158,255,0.12);
}

/* footer 简洁展示快捷键 */
.app-footer {
  flex:0 0 56px;
  padding:8px 12px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  border-top:1px solid rgba(15,23,42,0.02);
}
.shortcuts { display:flex; gap:10px; color:#5b6b77; font-size:12px; }
.kbd kbd { background:#f5f7fa; border:1px solid rgba(15,23,42,0.04); padding:2px 6px; border-radius:4px; font-family:monospace; }

/* 刷新按钮视觉调整：蓝色为主，带圆角背景、hover 效果 */
.refresh-btn {
  display:flex;
  align-items:center;
  gap:6px;
  color: #1f6feb;
  border-radius: 8px;
  padding: 6px 8px;
  transition: background .12s ease, transform .08s ease;
  background: transparent;
}
.refresh-btn .el-icon-refresh { font-size: 14px; color: inherit; }
.refresh-btn .refresh-label {
  font-size: 12px;
  color: inherit;
  font-weight: 600;
  line-height: 1;
}
.refresh-btn:hover {
  background: rgba(31,111,235,0.06);
  transform: translateY(-2px);
}

/* 新增：重置按钮样式（醒目但不突兀） */
.reset-btn {
  border-radius: 8px;
  padding: 6px 10px;
  background: linear-gradient(90deg, #ff6b6b, #ff3b30);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 6px 14px rgba(255,59,48,0.12);
  transition: transform .08s ease, box-shadow .12s ease;
}
.reset-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255,59,48,0.16);
}

/* 小屏保障（不产生纵向滚动条） */
@media (max-height:540px) {
  .velocity-control-app { height:500px; }
  .presets-section .presets-grid { gap:6px; }
}
</style>