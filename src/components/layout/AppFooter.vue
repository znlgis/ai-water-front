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
    </div>

    <!-- 右侧操作按钮 -->
    <div class="footer-actions">
      <button @click="toggleFullscreen" class="action-btn" title="全屏">
        <span class="icon">⛶</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { mapInstance } from '../../mapInstance.js'
import { toLonLat } from 'ol/proj'

export default {
  name: 'AppFooter',
  setup() {
    // 初始占位
    const coordinates = ref('--')
    const zoomLevel = ref('--')

    let pointerMoveKey = null
    let viewChangeKey = null
    let mapMoveEndKey = null

    const formatCoord = (lon, lat) => {
      // 保留 4 位小数
      const ew = lon >= 0 ? 'E' : 'W'
      const ns = lat >= 0 ? 'N' : 'S'
      return `${Math.abs(lon).toFixed(4)}°${ew}, ${Math.abs(lat).toFixed(4)}°${ns}`
    }

    const attachListeners = (map) => {
      if (!map) return
      const view = map.getView()
      // 初始缩放
      if (view) {
        zoomLevel.value = view.getZoom()?.toFixed(0)
      }
      // 鼠标移动获取坐标（WebMercator -> WGS84）
      pointerMoveKey = map.on('pointermove', (evt) => {
        if (!evt.coordinate) return
        const [lon, lat] = toLonLat(evt.coordinate)
        coordinates.value = formatCoord(lon, lat)
      })
      // 缩放变化监听
      viewChangeKey = view.on('change:resolution', () => {
        zoomLevel.value = view.getZoom()?.toFixed(0)
      })
      // 兼容拖拽或其他导致缩放变化的事件
      mapMoveEndKey = map.on('moveend', () => {
        zoomLevel.value = view.getZoom()?.toFixed(0)
      })
    }

    const tryInit = () => {
      if (mapInstance) {
        attachListeners(mapInstance)
        return true
      }
      return false
    }

    let retryTimer = null

    onMounted(() => {
      // 等待 mapInstance 可用（DemoMap 挂载后才会注入）
      if (!tryInit()) {
        retryTimer = setInterval(() => {
          if (tryInit()) {
            clearInterval(retryTimer)
            retryTimer = null
          }
        }, 200)
      }
    })

    onUnmounted(() => {
      if (retryTimer) clearInterval(retryTimer)
      // 清理事件
      try {
        if (mapInstance) {
          if (pointerMoveKey) mapInstance.un('pointermove', pointerMoveKey.listener || pointerMoveKey)
          if (mapMoveEndKey) mapInstance.un('moveend', mapMoveEndKey.listener || mapMoveEndKey)
          const view = mapInstance.getView && mapInstance.getView()
          if (view && viewChangeKey) view.un('change:resolution', viewChangeKey.listener || viewChangeKey)
        }
      } catch (e) {
        // 忽略清理错误
      }
    })

    // 切换全屏
    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    }

    return {
      coordinates,
      zoomLevel,
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
