<!--
  应用程序底部状态栏
  显示坐标信息、比例尺、连接状态等基础数据
-->
<template>
  <div class="app-footer">
    <div class="footer-content">
      <!-- 左侧：坐标信息 -->
      <div class="footer-left">
        <div class="coordinate-info">
          <el-icon><Location /></el-icon>
          <span class="coordinate-label">坐标:</span>
          <span class="coordinate-value">{{ currentCoordinates }}</span>
        </div>
        <div class="projection-info">
          <span class="projection-label">投影:</span>
          <span class="projection-value">{{ currentProjection }}</span>
        </div>
      </div>
      
      <!-- 中间：比例尺信息 -->
      <div class="footer-center">
        <div class="scale-info">
          <el-icon><Position /></el-icon>
          <span class="scale-label">比例尺:</span>
          <span class="scale-value">{{ currentScale }}</span>
        </div>
      </div>
      
      <!-- 右侧：系统状态 -->
      <div class="footer-right">
        <!-- GeoServer连接状态 -->
        <div class="connection-status">
          <el-icon :class="geoServerStatus.connected ? 'status-connected' : 'status-disconnected'">
            <Connection />
          </el-icon>
          <span class="status-text">GeoServer</span>
          <el-tag 
            :type="geoServerStatus.connected ? 'success' : 'danger'" 
            size="small"
            effect="plain"
          >
            {{ geoServerStatus.connected ? '已连接' : '未连接' }}
          </el-tag>
        </div>
        
        <!-- AI服务状态 -->
        <div class="connection-status">
          <el-icon :class="aiServiceStatus.connected ? 'status-connected' : 'status-disconnected'">
            <Connection />
          </el-icon>
          <span class="status-text">AI服务</span>
          <el-tag 
            :type="aiServiceStatus.connected ? 'success' : 'danger'" 
            size="small"
            effect="plain"
          >
            {{ aiServiceStatus.connected ? '已连接' : '未连接' }}
          </el-tag>
        </div>
        
        <!-- 版本信息 -->
        <div class="version-info">
          <span class="version-text">v1.0.0</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { Location, Position, Connection } from '@element-plus/icons-vue';

// 当前坐标信息
const currentCoordinates = ref('120.123456, 30.654321');
const currentProjection = ref('EPSG:4326');
const currentScale = ref('1:50,000');

// 服务连接状态
const geoServerStatus = reactive({
  connected: true,
  lastCheck: new Date()
});

const aiServiceStatus = reactive({
  connected: false,
  lastCheck: new Date()
});

// 可以通过事件或store来更新这些状态
// 这里作为示例暂时使用静态数据
</script>

<style scoped>
.app-footer {
  height: var(--app-footer-height);
  background: var(--esri-neutral-700);
  color: var(--esri-neutral-100);
  border-top: 1px solid var(--esri-neutral-300);
  font-size: 12px;
}

.footer-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.footer-left,
.footer-center,
.footer-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.footer-left {
  flex: 1;
}

.footer-right {
  flex: 1;
  justify-content: flex-end;
}

.coordinate-info,
.projection-info,
.scale-info,
.connection-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.coordinate-label,
.projection-label,
.scale-label,
.status-text {
  color: var(--esri-neutral-400);
}

.coordinate-value,
.projection-value,
.scale-value {
  color: var(--esri-neutral-100);
  font-weight: 500;
}

.status-connected {
  color: var(--esri-success);
}

.status-disconnected {
  color: var(--esri-error);
}

.version-info {
  padding: 2px 6px;
  background: var(--esri-neutral-600);
  border-radius: 3px;
  font-size: 10px;
}

.version-text {
  color: var(--esri-neutral-200);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .footer-content {
    padding: 0 8px;
  }
  
  .coordinate-info,
  .projection-info {
    display: none;
  }
  
  .footer-left {
    flex: 0;
  }
}

@media (max-width: 480px) {
  .scale-info {
    display: none;
  }
  
  .status-text {
    display: none;
  }
}
</style>