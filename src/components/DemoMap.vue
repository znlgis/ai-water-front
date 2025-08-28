<template>
  <div class="map-wrapper">
    <div id="map" class="map"></div>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { fromLonLat } from 'ol/proj'

export default {
  name: 'DemoMap',
  setup() {
    const map = ref(null)

    onMounted(() => {
      // 创建基础地图，不包含图层控制器
      map.value = new Map({
        target: 'map',
        layers: [
          new TileLayer({
            name: 'OSM',
            source: new OSM()
          })
        ],
        view: new View({
          center: fromLonLat([116.4074, 39.9042]), // 北京坐标
          zoom: 10
        })
      })
    })

    return {
      map
    }
  }
}
</script>

<style scoped>
.map-wrapper {
  flex: 1;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
}
</style>
