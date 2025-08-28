<template>
  <div class="app-container">
    <div class="main-content">
      <!-- 左侧：上 图层管理 / 下 AI 助手 可拖拽调整高度 -->
      <div class="left-panel">
        <div class="panel-split">
          <div class="top-half" :style="topStyle">
            <LayerPanel />
          </div>
          <div class="panel-resizer" @mousedown="startDrag" />
          <div class="bottom-half">
            <AIAssistantPanel />
          </div>
        </div>
      </div>

      <!-- 中间地图区域 -->
      <div class="map-container">
        <DemoMap />
        <AppFooter />
      </div>

      <!-- 右侧面板已移除 -->
    </div>
  </div>
</template>

<script>
import DemoMap from './components/DemoMap.vue'
import LayerPanel from './components/panels/LayerPanel.vue'
import AIAssistantPanel from './components/panels/AIAssistantPanel.vue'
import AppFooter from './components/layout/AppFooter.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
// 开发模式下加载测试工具
if (import.meta.env.DEV) {
  import('./utils/geoJsonTestUtils.js')
}

export default {
  name: 'App',
  components: { DemoMap, LayerPanel, AIAssistantPanel, AppFooter },
  setup() {
    const topHeight = ref(parseInt(localStorage.getItem('layerPanelHeight')||'0',10) || 260) // 初始高度
    const isDragging = ref(false)
    const startY = ref(0)
    const startHeight = ref(0)

    const minTop = 140
    const minBottom = 160

    const topStyle = ref({ height: topHeight.value + 'px' })

    const onMouseMove = (e) => {
      if (!isDragging.value) return
      const delta = e.clientY - startY.value
      let newH = startHeight.value + delta
      const containerH = document.querySelector('.panel-split').clientHeight
      // 约束
      if (newH < minTop) newH = minTop
      if (containerH - newH - 6 < minBottom) newH = containerH - minBottom - 6
      topHeight.value = newH
      topStyle.value = { height: newH + 'px' }
    }
    const onMouseUp = () => {
      if (!isDragging.value) return
      isDragging.value = false
      localStorage.setItem('layerPanelHeight', String(topHeight.value))
      document.body.classList.remove('resizing-v')
    }

    const startDrag = (e) => {
      isDragging.value = true
      startY.value = e.clientY
      startHeight.value = topHeight.value
      document.body.classList.add('resizing-v')
    }

    onMounted(() => {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      // 如果存储高度超过容器则重设
      requestAnimationFrame(()=>{
        const containerH = document.querySelector('.panel-split')?.clientHeight || 0
        if (topHeight.value > containerH - minBottom - 6) {
          topHeight.value = Math.max(minTop, Math.round(containerH*0.4))
          topStyle.value = { height: topHeight.value + 'px' }
        }
      })
    })
    onBeforeUnmount(() => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    })

    return { topStyle, startDrag }
  }
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  height: 100%;
}

.left-panel {
  width: 340px;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.panel-split {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.top-half {
  overflow: hidden;
  border-bottom: 1px solid #ddd;
  position: relative;
}

.bottom-half {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-resizer {
  height: 6px;
  cursor: row-resize;
  background: linear-gradient(to bottom, #e2e5e8, #d3d6d9);
  border-bottom: 1px solid #ccc;
  border-top: 1px solid #ccc;
}

.panel-resizer:hover {
  background: linear-gradient(to bottom, #d9dce0, #c7cacf);
}

body.resizing-v,
body.resizing-v * {
  user-select: none !important;
  cursor: row-resize !important;
}

.map-container {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 旧右侧面板样式保留如需恢复使用 */
.right-panel {
  width: 350px;
  background-color: #f8f9fa;
  border-left: 1px solid #ddd;
  overflow-y: auto;
}
</style>
