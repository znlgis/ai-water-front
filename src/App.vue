<template>
  <div class="app-container">
    <div class="main-content">
      <!-- 左侧面板（可水平调整宽度） -->
      <div class="left-panel" :style="leftStyle">
        <div class="panel-split">
          <div class="top-half" :style="topStyle">
            <LayerPanel />
          </div>
          <div class="panel-resizer" @mousedown="startVDrag" />
          <div class="bottom-half">
            <AIAssistantPanel />
          </div>
        </div>
      </div>
      <!-- 水平分隔条 -->
      <div class="h-resizer" @mousedown="startHDrag"></div>

      <!-- 中间地图区域 -->
      <div class="map-container">
        <DemoMap />
        <AppFooter />
      </div>
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
    // 垂直拆分高度
    const topHeight = ref(parseInt(localStorage.getItem('layerPanelHeight')||'0',10) || 260)
    const topStyle = ref({ height: topHeight.value + 'px' })
    const isDraggingV = ref(false)
    const startY = ref(0)
    const startHeight = ref(0)
    const minTop = 140
    const minBottom = 160

    // 水平宽度
    const storedW = parseInt(localStorage.getItem('leftPanelWidth')||'0',10)
    const leftWidth = ref(storedW && storedW > 0 ? storedW : 680) // 初始加倍 (原 340)
    const leftStyle = ref({ width: leftWidth.value + 'px' })
    const isDraggingH = ref(false)
    const startX = ref(0)
    const startLeftWidth = ref(0)
    const minLeft = 360
    const minMap = 420

    const onMouseMove = (e) => {
      // 垂直
      if (isDraggingV.value) {
        const delta = e.clientY - startY.value
        let newH = startHeight.value + delta
        const containerH = document.querySelector('.panel-split')?.clientHeight || 0
        if (newH < minTop) newH = minTop
        if (containerH - newH - 6 < minBottom) newH = containerH - minBottom - 6
        topHeight.value = newH
        topStyle.value = { height: newH + 'px' }
      }
      // 水平
      if (isDraggingH.value) {
        const deltaX = e.clientX - startX.value
        let newW = startLeftWidth.value + deltaX
        const totalW = document.querySelector('.main-content')?.clientWidth || window.innerWidth
        if (newW < minLeft) newW = minLeft
        if (totalW - newW - 6 < minMap) newW = totalW - minMap - 6
        leftWidth.value = newW
        leftStyle.value = { width: newW + 'px' }
      }
    }

    const onMouseUp = () => {
      if (isDraggingV.value) {
        isDraggingV.value = false
        localStorage.setItem('layerPanelHeight', String(topHeight.value))
        document.body.classList.remove('resizing-v')
      }
      if (isDraggingH.value) {
        isDraggingH.value = false
        localStorage.setItem('leftPanelWidth', String(leftWidth.value))
        document.body.classList.remove('resizing-h')
      }
    }

    const startVDrag = (e) => {
      isDraggingV.value = true
      startY.value = e.clientY
      startHeight.value = topHeight.value
      document.body.classList.add('resizing-v')
    }

    const startHDrag = (e) => {
      isDraggingH.value = true
      startX.value = e.clientX
      startLeftWidth.value = leftWidth.value
      document.body.classList.add('resizing-h')
    }

    onMounted(() => {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      // 校正存储的高度
      requestAnimationFrame(()=>{
        const containerH = document.querySelector('.panel-split')?.clientHeight || 0
        if (topHeight.value > containerH - minBottom - 6) {
          topHeight.value = Math.max(minTop, Math.round(containerH*0.4))
          topStyle.value = { height: topHeight.value + 'px' }
        }
      })
      // 校正存储宽度
      requestAnimationFrame(()=>{
        const totalW = document.querySelector('.main-content')?.clientWidth || window.innerWidth
        if (leftWidth.value < minLeft) leftWidth.value = minLeft
        if (totalW - leftWidth.value - 6 < minMap) {
          leftWidth.value = totalW - minMap - 6
        }
        leftStyle.value = { width: leftWidth.value + 'px' }
      })
    })

    onBeforeUnmount(() => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    })

    return { topStyle, startVDrag, startHDrag, leftStyle }
  }
}
</script>

<style scoped>
.app-container { height: 100vh; width: 100vw; display: flex; flex-direction: column; }
.main-content { flex: 1; display: flex; height: 100%; min-width: 0; }
.left-panel { background: #f5f5f5; border-right: 1px solid #ddd; display: flex; flex-direction: column; overflow: hidden; }
.h-resizer { width: 6px; cursor: col-resize; background: linear-gradient(to right, #e2e5e8, #d3d6d9); border-right: 1px solid #ccc; border-left: 1px solid #ccc; }
.h-resizer:hover { background: linear-gradient(to right, #d9dce0, #c7cacf); }
.panel-split { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.top-half { overflow: hidden; border-bottom: 1px solid #ddd; position: relative; }
.bottom-half { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.panel-resizer { height: 6px; cursor: row-resize; background: linear-gradient(to bottom, #e2e5e8, #d3d6d9); border-bottom: 1px solid #ccc; border-top: 1px solid #ccc; }
.panel-resizer:hover { background: linear-gradient(to bottom, #d9dce0, #c7cacf); }
body.resizing-v, body.resizing-v * { user-select: none !important; cursor: row-resize !important; }
body.resizing-h, body.resizing-h * { user-select: none !important; cursor: col-resize !important; }
.map-container { flex: 1; position: relative; display: flex; flex-direction: column; min-width: 0; }
.right-panel { width: 350px; background-color: #f8f9fa; border-left: 1px solid #ddd; overflow-y: auto; }
</style>
