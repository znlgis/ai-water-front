<!--
  应用程序顶部标题栏
  包含系统标题、用户信息、设置菜单等
-->
<template>
  <div class="app-header">
    <el-container>
      <el-header class="header-content">
        <!-- 左侧：系统标题和导航 -->
        <div class="header-left">
          <div class="system-title">
            <el-icon class="title-icon">
              <DataAnalysis />
            </el-icon>
            <span class="title-text">水务智能前端系统</span>
          </div>
        </div>
        
        <!-- 中间：快捷操作按钮 -->
        <div class="header-center">
          <el-button-group>
            <el-button type="primary" :icon="Location" size="small">
              地图视图
            </el-button>
            <el-button :icon="DataAnalysis" size="small">
              数据分析
            </el-button>
            <el-button :icon="ChatLineRound" size="small">
              AI助手
            </el-button>
          </el-button-group>
        </div>
        
        <!-- 右侧：用户信息和设置 -->
        <div class="header-right">
          <!-- 通知按钮 -->
          <el-badge :value="3" class="notification-badge">
            <el-button :icon="Bell" circle size="small" />
          </el-badge>
          
          <!-- 用户菜单 -->
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user-info">
              <el-avatar :size="32" class="user-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="username">管理员</span>
              <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile" :icon="User">
                  个人资料
                </el-dropdown-item>
                <el-dropdown-item command="settings" :icon="Setting">
                  系统设置
                </el-dropdown-item>
                <el-dropdown-item divided command="logout" :icon="SwitchButton">
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
    </el-container>
  </div>
</template>

<script setup>
import { 
  DataAnalysis, 
  Location, 
  ChatLineRound, 
  Bell, 
  User, 
  ArrowDown, 
  Setting, 
  SwitchButton 
} from '@element-plus/icons-vue';

// 处理用户菜单命令
const handleUserCommand = (command) => {
  switch (command) {
    case 'profile':
      console.log('打开个人资料');
      break;
    case 'settings':
      console.log('打开系统设置');
      break;
    case 'logout':
      console.log('退出登录');
      break;
  }
};
</script>

<style scoped>
.app-header {
  height: var(--app-header-height);
  background: var(--esri-neutral-100);
  border-bottom: 1px solid var(--esri-neutral-300);
  box-shadow: var(--shadow-1);
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  flex: 1;
  display: flex;
  align-items: center;
}

.system-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 24px;
  color: var(--esri-primary-blue);
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--esri-neutral-700);
}

.header-center {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.header-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.notification-badge {
  margin-right: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.user-info:hover {
  background-color: var(--esri-neutral-200);
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: var(--esri-neutral-700);
}

.dropdown-icon {
  font-size: 12px;
  color: var(--esri-neutral-500);
  transition: transform var(--transition-fast);
}

.user-info:hover .dropdown-icon {
  transform: rotate(180deg);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-center {
    display: none;
  }
  
  .title-text {
    display: none;
  }
  
  .username {
    display: none;
  }
}
</style>