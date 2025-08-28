<template>
  <div class="app-footer">
    <div class="status-info">
      <!-- 地图状态信息 -->
      <div class="status-item">
        <span class="label">坐标:</span>
        <span class="value">{{ coordinates }}</span>
      </div>

      <div class="status-item">
        <span class="label">缩放级别:</span>
        <span class="value">{{ zoomLevel }}</span>
      </div>

      <div class="status-item">
        <span class="label">当前图层:</span>
        <span class="value">{{ currentLayer }}</span>
      </div>

      <!-- 数据状态 -->
      <div class="status-item">
        <span class="label">数据更新:</span>
        <span class="value">{{ lastUpdate }}</span>
      </div>

      <!-- 连接状态 -->
      <div class="status-item">
        <span class="label">连接状态:</span>
        <span class="value" :class="connectionStatusClass">{{ connectionStatus }}</span>
      </div>
    </div>

    <!-- 右侧操作按钮 -->
    <div class="footer-actions">
      <button @click="refreshData" class="action-btn" title="刷新数据">
        <span class="icon">🔄</span>
      </button>
      <button @click="toggleFullscreen" class="action-btn" title="全屏">
        <span class="icon">⛶</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'

export default {
  name: 'AppFooter',
  setup() {
    const coordinates = ref('116.4074°E, 39.9042°N')
    const zoomLevel = ref(10)
    const currentLayer = ref('OpenStreetMap')
    const lastUpdate = ref('')
    const connectionStatus = ref('已连接')

    // 连接状态样式
    const connectionStatusClass = computed(() => {
      return {
        'status-connected': connectionStatus.value === '已连接',
        'status-disconnected': connectionStatus.value === '断开连接',
        'status-connecting': connectionStatus.value === '连接中'
      }
    })

    // 更新时间
    const updateTime = () => {
      const now = new Date()
      lastUpdate.value = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    // 刷新数据
    const refreshData = () => {
      console.log('刷新数据')
      updateTime()
    }

    // 切换全屏
    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    }

    // 定时器ID
    let intervalId = null

    onMounted(() => {
      updateTime()
      // 每30秒更新一次时间
      intervalId = setInterval(updateTime, 30000)
    })

    onUnmounted(() => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    })

    return {
      coordinates,
      zoomLevel,
      currentLayer,
      lastUpdate,
      connectionStatus,
      connectionStatusClass,
      refreshData,
      toggleFullscreen
    }
  }
}
</script>

<style scoped>
.app-footer {
  height: 40px;
  background-color: #2c3e50;
  color: #ecf0f1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 12px;
  border-top: 1px solid #34495e;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.label {
  color: #bdc3c7;
  font-weight: 500;
}

.value {
  color: #ecf0f1;
  font-weight: 400;
}

.status-connected {
  color: #2ecc71 !important;
}

.status-disconnected {
  color: #e74c3c !important;
}

.status-connecting {
  color: #f39c12 !important;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  background: none;
  border: 1px solid #34495e;
  color: #ecf0f1;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
}

.action-btn:hover {
  background-color: #34495e;
  border-color: #4a6741;
}

.icon {
  font-size: 14px;
}
</style>
