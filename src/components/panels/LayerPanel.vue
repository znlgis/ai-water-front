<template>
  <div class="layer-panel">
    <div class="panel-header">
      <h3>图层管理</h3>
    </div>
    <div class="panel-content">
      <div class="layer-list">
        <div
          v-for="layer in remoteLayers"
          :key="layer.fullName"
          class="layer-item"
        >
          <div class="layer-info">
            <input type="checkbox" v-model="layer.visible" @change="toggleLayer(layer)" />
            <span class="layer-name">{{ layer.name }}</span>
          </div>
        </div>
        <div v-if="remoteLayers.length===0" class="empty-tip">无可用图层或正在加载...</div>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, onMounted } from 'vue'
import GeoServerRestApi from '../../geoserver/GeoServerRestApi.js'
import { mapInstance } from '../../mapInstance.js'
import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'

export default {
  name: 'LayerPanel',
  setup() {
    // 远程 GeoServer 图层（不含 OSM 底图）
    const remoteLayers = reactive([])
    const api = new GeoServerRestApi()
    // 缓存已创建的 OL 图层对象，key = fullName(workspace:layer)
    const layerCache = new Map()

    const fetchLayers = async () => {
      try {
        const data = await api.layers.getLayers()
        const list = data?.layers?.layer || []
        remoteLayers.splice(0, remoteLayers.length)
        list.forEach(l => {
          const fullName = l.name
          const simpleName = fullName.includes(':') ? fullName.split(':')[1] : fullName
          if (simpleName === 'OpenStreetMap') return // 跳过与底图同名的图层
          remoteLayers.push({ fullName, name: simpleName, visible: false })
        })
      } catch (e) {
        console.error('加载图层失败', e)
      }
    }

    const createLayerIfNeeded = (layer) => {
      if (layerCache.has(layer.fullName)) return layerCache.get(layer.fullName)
      const olLayer = new TileLayer({
        source: new TileWMS({
          url: '/geoserver/wms',
            params: { LAYERS: layer.fullName, TILED: true, VERSION: '1.1.1' },
            serverType: 'geoserver',
            transition: 0
        }),
        properties: { name: layer.fullName }
      })
      layerCache.set(layer.fullName, olLayer)
      return olLayer
    }

    const toggleLayer = (layer) => {
      if (!mapInstance) return
      const olLayer = createLayerIfNeeded(layer)
      const layersCollection = mapInstance.getLayers()
      if (layer.visible) {
        // 添加到最上方（保持 OSM 在最底层 index 0）
        layersCollection.push(olLayer)
      } else {
        layersCollection.remove(olLayer)
      }
    }

    onMounted(fetchLayers)

    return { remoteLayers, toggleLayer }
  }
}
</script>

<style scoped>
.layer-panel { height: 100%; display: flex; flex-direction: column; }
.panel-header { padding: 16px; border-bottom: 1px solid #ddd; background-color: #fff; }
.panel-header h3 { margin: 0; font-size: 16px; color: #333; }
.panel-content { flex: 1; padding: 16px; overflow-y: auto; }
.layer-list { border: 1px solid #e1e5e9; border-radius: 4px; background-color: #fff; }
.layer-item { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #e1e5e9; }
.layer-item:last-child { border-bottom: none; }
.layer-item:hover { background-color: #f8f9fa; }
.layer-info { flex: 1; display: flex; align-items: center; gap: 8px; }
.layer-name { font-size: 14px; color: #333; }
.empty-tip { padding: 12px; font-size: 12px; color: #888; text-align: center; }
</style>
