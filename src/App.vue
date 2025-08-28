<!--
  水务智能前端系统主应用组件
  实现三栏式布局：左侧图层管理、中间地图、右侧AI助手
-->
<template>
  <div class="app-layout">
    <!-- 应用标题栏 -->
    <AppHeader />
    
    <!-- 主体内容区域 -->
    <div class="app-body">
      <!-- 左侧图层管理面板 -->
      <LayerPanel 
        :collapsed="leftPanelCollapsed" 
        @toggle="toggleLeftPanel"
      />
      
      <!-- 中间地图区域 -->
      <div class="main-content">
        <DemoMap />
      </div>
      
      <!-- 右侧AI助手面板 -->
      <AIAssistantPanel 
        :collapsed="rightPanelCollapsed" 
        @toggle="toggleRightPanel"
      />
    </div>
    
    <!-- 底部状态栏 -->
    <AppFooter />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DemoMap from './components/DemoMap.vue';
import AppHeader from './components/layout/AppHeader.vue';
import AppFooter from './components/layout/AppFooter.vue';
import LayerPanel from './components/panels/LayerPanel.vue';
import AIAssistantPanel from './components/panels/AIAssistantPanel.vue';

// 面板折叠状态
const leftPanelCollapsed = ref(false);
const rightPanelCollapsed = ref(false);

// 切换左侧面板
const toggleLeftPanel = () => {
  leftPanelCollapsed.value = !leftPanelCollapsed.value;
};

// 切换右侧面板
const toggleRightPanel = () => {
  rightPanelCollapsed.value = !rightPanelCollapsed.value;
};
</script>