<!--
  左侧图层管理面板
  实现树形结构展示图层，支持拖拽排序、搜索等功能
-->
<template>
  <div class="sidebar" :class="{ collapsed }">
    <!-- 面板标题栏 -->
    <div class="sidebar-header">
      <div v-if="!collapsed" class="header-title">
        <el-icon class="title-icon"><Menu /></el-icon>
        <span class="title-text">图层管理</span>
      </div>
      <el-button 
        type="text" 
        :icon="collapsed ? Expand : Fold" 
        size="small" 
        @click="$emit('toggle')"
        class="toggle-btn"
      />
    </div>
    
    <!-- 面板内容 -->
    <div v-if="!collapsed" class="sidebar-content">
      <!-- 搜索框 -->
      <div class="search-section">
        <el-input
          v-model="searchText"
          placeholder="搜索图层..."
          :prefix-icon="Search"
          size="small"
          clearable
        />
      </div>
      
      <!-- 工具栏 -->
      <div class="toolbar-section">
        <el-button-group size="small">
          <el-button :icon="View" @click="showAllLayers">全部显示</el-button>
          <el-button :icon="Hide" @click="hideAllLayers">全部隐藏</el-button>
        </el-button-group>
        <el-button 
          type="primary" 
          :icon="Plus" 
          size="small" 
          @click="addLayerDialog = true"
        >
          添加图层
        </el-button>
      </div>
      
      <!-- 图层树 -->
      <div class="layer-tree-section">
        <el-tree
          ref="layerTreeRef"
          :data="filteredLayerTree"
          :props="treeProps"
          node-key="id"
          default-expand-all
          :expand-on-click-node="false"
          draggable
          @node-drop="handleNodeDrop"
        >
          <template #default="{ node, data }">
            <div class="layer-tree-node">
              <!-- 图层可见性切换 -->
              <el-checkbox
                v-model="data.visible"
                @change="handleVisibilityChange(data)"
                class="visibility-checkbox"
              />
              
              <!-- 图层图标 -->
              <el-icon class="layer-icon">
                <component :is="getLayerIcon(data)" />
              </el-icon>
              
              <!-- 图层名称 -->
              <span class="layer-name" :title="data.title">
                {{ data.title || data.name }}
              </span>
              
              <!-- 操作按钮 -->
              <div class="layer-actions">
                <!-- 透明度控制 -->
                <el-popover
                  placement="right"
                  title="透明度"
                  :width="200"
                  trigger="click"
                >
                  <div class="opacity-control">
                    <el-slider
                      v-model="data.opacity"
                      :min="0"
                      :max="100"
                      @change="handleOpacityChange(data)"
                    />
                    <span class="opacity-value">{{ data.opacity }}%</span>
                  </div>
                  <template #reference>
                    <el-button 
                      type="text" 
                      :icon="Setting" 
                      size="small"
                      class="action-btn"
                    />
                  </template>
                </el-popover>
                
                <!-- 更多操作 -->
                <el-dropdown trigger="click" @command="handleLayerCommand">
                  <el-button 
                    type="text" 
                    :icon="MoreFilled" 
                    size="small"
                    class="action-btn"
                  />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="`zoom-${data.id}`" :icon="ZoomIn">
                        缩放到图层
                      </el-dropdown-item>
                      <el-dropdown-item :command="`export-${data.id}`" :icon="Download">
                        导出图层
                      </el-dropdown-item>
                      <el-dropdown-item :command="`remove-${data.id}`" :icon="Delete" divided>
                        移除图层
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </template>
        </el-tree>
      </div>
    </div>
    
    <!-- 折叠状态下的快捷按钮 -->
    <div v-else class="collapsed-buttons">
      <el-tooltip content="图层管理" placement="right">
        <el-button type="text" :icon="Menu" @click="$emit('toggle')" />
      </el-tooltip>
    </div>
    
    <!-- 添加图层对话框 -->
    <el-dialog
      v-model="addLayerDialog"
      title="添加图层"
      width="500px"
    >
      <el-form :model="newLayerForm" label-width="80px">
        <el-form-item label="图层类型">
          <el-select v-model="newLayerForm.type" placeholder="请选择图层类型">
            <el-option label="WMS服务" value="wms" />
            <el-option label="WFS服务" value="wfs" />
            <el-option label="本地文件" value="file" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务地址">
          <el-input v-model="newLayerForm.url" placeholder="请输入服务地址" />
        </el-form-item>
        <el-form-item label="图层名称">
          <el-input v-model="newLayerForm.name" placeholder="请输入图层名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addLayerDialog = false">取消</el-button>
        <el-button type="primary" @click="addNewLayer">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { 
  Menu, 
  Expand, 
  Fold, 
  Search, 
  View, 
  Hide, 
  Plus, 
  Setting, 
  MoreFilled, 
  ZoomIn, 
  Download, 
  Delete,
  Pointer,
  Picture,
  Grid
} from '@element-plus/icons-vue';

// Props
defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
});

// Emits
defineEmits(['toggle']);

// 搜索文本
const searchText = ref('');

// 图层树引用
const layerTreeRef = ref();

// 添加图层对话框
const addLayerDialog = ref(false);
const newLayerForm = reactive({
  type: '',
  url: '',
  name: ''
});

// 树形组件属性配置
const treeProps = {
  children: 'children',
  label: 'title',
  disabled: 'disabled'
};

// 示例图层数据（后续将从store或API获取）
const layerTree = ref([
  {
    id: 'group-1',
    name: 'base-maps',
    title: '底图图层组',
    type: 'group',
    visible: true,
    opacity: 100,
    children: [
      {
        id: 'layer-1',
        name: 'osm',
        title: 'OpenStreetMap',
        type: 'tile',
        visible: true,
        opacity: 100
      },
      {
        id: 'layer-2',
        name: 'satellite',
        title: '卫星影像',
        type: 'tile',
        visible: false,
        opacity: 80
      }
    ]
  },
  {
    id: 'group-2',
    name: 'water-layers',
    title: '水务专题图层',
    type: 'group',
    visible: true,
    opacity: 100,
    children: [
      {
        id: 'layer-3',
        name: 'water-quality',
        title: '水质监测点',
        type: 'vector',
        visible: false,
        opacity: 100
      },
      {
        id: 'layer-4',
        name: 'pipe-network',
        title: '管网系统',
        type: 'vector',
        visible: false,
        opacity: 100
      }
    ]
  }
]);

// 过滤后的图层树
const filteredLayerTree = computed(() => {
  if (!searchText.value) return layerTree.value;
  
  return layerTree.value.filter(item => 
    item.title.includes(searchText.value) ||
    (item.children && item.children.some(child => 
      child.title.includes(searchText.value)
    ))
  );
});

// 获取图层图标
const getLayerIcon = (data) => {
  switch (data.type) {
    case 'group':
      return Menu;
    case 'vector':
      return Pointer;
    case 'tile':
      return Picture;
    default:
      return Grid;
  }
};

// 处理可见性变化
const handleVisibilityChange = (data) => {
  console.log(`图层 ${data.name} 可见性变更为:`, data.visible);
  // 这里将发送到地图组件或store
};

// 处理透明度变化
const handleOpacityChange = (data) => {
  console.log(`图层 ${data.name} 透明度变更为:`, data.opacity);
  // 这里将发送到地图组件或store
};

// 处理图层拖拽
const handleNodeDrop = (dragNode, dropNode, position) => {
  console.log('图层拖拽:', dragNode, dropNode, position);
  // 这里处理图层顺序变更
};

// 处理图层命令
const handleLayerCommand = (command) => {
  const [action, layerId] = command.split('-');
  console.log(`执行操作 ${action} 对图层 ${layerId}`);
  
  switch (action) {
    case 'zoom':
      // 缩放到图层
      break;
    case 'export':
      // 导出图层
      break;
    case 'remove':
      // 移除图层
      break;
  }
};

// 显示所有图层
const showAllLayers = () => {
  const setVisible = (layers) => {
    layers.forEach(layer => {
      layer.visible = true;
      if (layer.children) {
        setVisible(layer.children);
      }
    });
  };
  setVisible(layerTree.value);
};

// 隐藏所有图层
const hideAllLayers = () => {
  const setHidden = (layers) => {
    layers.forEach(layer => {
      layer.visible = false;
      if (layer.children) {
        setHidden(layer.children);
      }
    });
  };
  setHidden(layerTree.value);
};

// 添加新图层
const addNewLayer = () => {
  console.log('添加新图层:', newLayerForm);
  // 这里处理添加图层的逻辑
  addLayerDialog.value = false;
  // 重置表单
  Object.assign(newLayerForm, {
    type: '',
    url: '',
    name: ''
  });
};
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--esri-neutral-100);
  border-right: 1px solid var(--esri-neutral-300);
  transition: width var(--transition-medium);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--esri-neutral-300);
  background: var(--esri-neutral-100);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: var(--esri-primary-blue);
  font-size: 16px;
}

.title-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--esri-neutral-700);
}

.toggle-btn {
  color: var(--esri-neutral-600);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
}

.search-section {
  margin-bottom: 12px;
}

.toolbar-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.layer-tree-section {
  flex: 1;
}

.layer-tree-node {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px 0;
  gap: 8px;
}

.visibility-checkbox {
  flex-shrink: 0;
}

.layer-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--esri-neutral-600);
}

.layer-name {
  flex: 1;
  font-size: 13px;
  color: var(--esri-neutral-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.layer-tree-node:hover .layer-actions {
  opacity: 1;
}

.action-btn {
  color: var(--esri-neutral-500);
  padding: 2px;
}

.opacity-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.opacity-value {
  font-size: 12px;
  color: var(--esri-neutral-600);
  min-width: 30px;
}

.collapsed-buttons {
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Element Plus 树形组件样式覆盖 */
:deep(.el-tree-node__content) {
  height: auto;
  min-height: 32px;
  padding: 0 8px;
}

:deep(.el-tree-node__expand-icon) {
  color: var(--esri-neutral-500);
}

:deep(.el-tree-node__expand-icon.expanded) {
  transform: rotate(90deg);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: var(--esri-primary-blue);
  color: var(--esri-neutral-100);
}
</style>