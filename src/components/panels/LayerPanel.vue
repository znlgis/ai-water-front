<template>
  <div class="layer-panel">
    <div class="panel-header">
      <h3>图层管理</h3>
    </div>

    <div class="panel-content">
      <!-- 基础图层部分 -->
      <div class="layer-section">
        <h4>基础图层</h4>
        <div class="layer-list">
          <div
            v-for="baseLayer in baseLayers"
            :key="baseLayer.id"
            class="layer-item"
            :class="{ active: baseLayer.active }"
            @click="switchBaseLayer(baseLayer)"
          >
            <div class="layer-info">
              <span class="layer-name">{{ baseLayer.name }}</span>
            </div>
            <div class="layer-controls">
              <input
                type="radio"
                :checked="baseLayer.active"
                @change="switchBaseLayer(baseLayer)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 覆盖图层部分 -->
      <div class="layer-section">
        <h4>覆盖图层</h4>
        <div class="layer-list">
          <div
            v-for="overlayLayer in overlayLayers"
            :key="overlayLayer.id"
            class="layer-item"
          >
            <div class="layer-info">
              <span class="layer-name">{{ overlayLayer.name }}</span>
            </div>
            <div class="layer-controls">
              <input
                type="checkbox"
                v-model="overlayLayer.visible"
                @change="toggleOverlayLayer(overlayLayer)"
              />
              <input
                type="range"
                min="0"
                max="100"
                v-model="overlayLayer.opacity"
                @input="updateOpacity(overlayLayer)"
                class="opacity-slider"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 图层操作按钮 -->
      <div class="layer-actions">
        <button @click="addLayer" class="btn btn-primary">添加图层</button>
        <button @click="removeSelectedLayers" class="btn btn-secondary">删除选中</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
  name: 'LayerPanel',
  setup() {
    // 基础图层数据
    const baseLayers = reactive([
      { id: 1, name: 'OpenStreetMap', active: true, type: 'OSM' },
      { id: 2, name: '卫星影像', active: false, type: 'Satellite' },
      { id: 3, name: '地形图', active: false, type: 'Terrain' }
    ])

    // 覆盖图层数据
    const overlayLayers = reactive([
      { id: 1, name: '水质监测点', visible: true, opacity: 80, type: 'WMS' },
      { id: 2, name: '河流水系', visible: false, opacity: 60, type: 'Vector' },
      { id: 3, name: '污染源分布', visible: false, opacity: 70, type: 'WFS' }
    ])

    // 切换基础图层
    const switchBaseLayer = (selectedLayer) => {
      baseLayers.forEach(layer => {
        layer.active = layer.id === selectedLayer.id
      })
      console.log('切换基础图层:', selectedLayer.name)
    }

    // 切换覆盖图层可见性
    const toggleOverlayLayer = (layer) => {
      console.log('切换图层可见性:', layer.name, layer.visible)
    }

    // 更新图层透明度
    const updateOpacity = (layer) => {
      console.log('更新图层透明度:', layer.name, layer.opacity)
    }

    // 添加新图层
    const addLayer = () => {
      console.log('添加新图层')
    }

    // 删除选中图层
    const removeSelectedLayers = () => {
      console.log('删除选中图层')
    }

    return {
      baseLayers,
      overlayLayers,
      switchBaseLayer,
      toggleOverlayLayer,
      updateOpacity,
      addLayer,
      removeSelectedLayers
    }
  }
}
</script>

<style scoped>
.layer-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #ddd;
  background-color: #fff;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.layer-section {
  margin-bottom: 24px;
}

.layer-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.layer-list {
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  background-color: #fff;
}

.layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #e1e5e9;
  cursor: pointer;
  transition: background-color 0.2s;
}

.layer-item:last-child {
  border-bottom: none;
}

.layer-item:hover {
  background-color: #f8f9fa;
}

.layer-item.active {
  background-color: #e3f2fd;
}

.layer-info {
  flex: 1;
}

.layer-name {
  font-size: 14px;
  color: #333;
}

.layer-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.opacity-slider {
  width: 60px;
}

.layer-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}
</style>
