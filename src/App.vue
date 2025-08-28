<template>
  <div class="app-container">
    <!-- 主要内容区域，没有顶部标题栏 -->
    <div class="main-content">
      <!-- 左侧图层管理面板 -->
      <div class="left-panel">
        <LayerPanel />
      </div>

      <!-- 中间地图区域 -->
      <div class="map-container">
        <DemoMap />
        <!-- 底部状态栏只在地图区域显示 -->
        <AppFooter />
      </div>

      <!-- 右侧AI助手面板 -->
      <div class="right-panel">
        <AIAssistantPanel />
      </div>
    </div>
  </div>
</template>

<script>
import DemoMap from './components/DemoMap.vue'
import LayerPanel from './components/panels/LayerPanel.vue'
import AIAssistantPanel from './components/panels/AIAssistantPanel.vue'
import AppFooter from './components/layout/AppFooter.vue'

export default {
  name: 'App',
  components: {
    DemoMap,
    LayerPanel,
    AIAssistantPanel,
    AppFooter
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
  width: 300px;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.map-container {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.right-panel {
  width: 350px;
  background-color: #f8f9fa;
  border-left: 1px solid #ddd;
  overflow-y: auto;
}
</style>
