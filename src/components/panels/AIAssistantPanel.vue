<!--
  右侧AI助手面板
  集成Dify平台API，实现智能对话功能
-->
<template>
  <div class="sidebar right-panel" :class="{ collapsed }">
    <!-- 面板标题栏 -->
    <div class="sidebar-header">
      <el-button 
        type="text" 
        :icon="collapsed ? Expand : Fold" 
        size="small" 
        @click="$emit('toggle')"
        class="toggle-btn"
      />
      <div v-if="!collapsed" class="header-title">
        <span class="title-text">AI助手</span>
        <el-icon class="title-icon"><ChatLineRound /></el-icon>
      </div>
    </div>
    
    <!-- 面板内容 -->
    <div v-if="!collapsed" class="sidebar-content">
      <!-- AI助手内容区 -->
      <div class="chat-container">
        <!-- 对话历史区域 -->
        <div class="chat-messages" ref="messagesContainer">
          <!-- 欢迎消息 -->
          <div v-if="messages.length === 0" class="welcome-message">
            <div class="welcome-content">
              <el-icon class="welcome-icon"><ChatLineRound /></el-icon>
              <h3>水务智能助手</h3>
              <p>我可以帮助您进行水务数据分析、地图操作指导、应急预案建议等。请问有什么可以为您服务的？</p>
              
              <!-- 快捷问题 -->
              <div class="quick-questions">
                <h4>快捷问题：</h4>
                <div class="question-buttons">
                  <el-button 
                    v-for="question in quickQuestions" 
                    :key="question"
                    size="small" 
                    type="primary" 
                    plain
                    @click="sendQuickQuestion(question)"
                  >
                    {{ question }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 对话消息 -->
          <div 
            v-for="(message, index) in messages" 
            :key="index"
            class="message-item"
            :class="{ 'user-message': message.type === 'user', 'ai-message': message.type === 'ai' }"
          >
            <div class="message-avatar">
              <el-avatar :size="32">
                <el-icon v-if="message.type === 'user'"><User /></el-icon>
                <el-icon v-else><Cpu /></el-icon>
              </el-avatar>
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-sender">
                  {{ message.type === 'user' ? '您' : 'AI助手' }}
                </span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="message-text" v-html="formatMessage(message.content)"></div>
              
              <!-- AI消息的反馈按钮 -->
              <div v-if="message.type === 'ai'" class="message-actions">
                <el-button-group size="small">
                  <el-button 
                    type="text" 
                    :icon="Star" 
                    @click="feedbackMessage(index, 'like')"
                    :class="{ active: message.feedback === 'like' }"
                  />
                  <el-button 
                    type="text" 
                    :icon="StarFilled" 
                    @click="feedbackMessage(index, 'dislike')"
                    :class="{ active: message.feedback === 'dislike' }"
                  />
                  <el-button type="text" :icon="CopyDocument" @click="copyMessage(message.content)" />
                </el-button-group>
              </div>
            </div>
          </div>
          
          <!-- 正在输入指示器 -->
          <div v-if="isTyping" class="typing-indicator">
            <div class="message-item ai-message">
              <div class="message-avatar">
                <el-avatar :size="32">
                  <el-icon><Cpu /></el-icon>
                </el-avatar>
              </div>
              <div class="message-content">
                <div class="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 输入区域 -->
        <div class="chat-input-area">
          <!-- 连接状态指示 -->
          <div class="connection-status">
            <el-tag 
              :type="connectionStatus.connected ? 'success' : 'danger'" 
              size="small"
              effect="plain"
            >
              <el-icon><Connection /></el-icon>
              {{ connectionStatus.connected ? 'AI服务已连接' : 'AI服务未连接' }}
            </el-tag>
          </div>
          
          <!-- 输入框和发送按钮 -->
          <div class="input-container">
            <el-input
              v-model="currentInput"
              type="textarea"
              placeholder="请输入您的问题..."
              :rows="3"
              resize="none"
              maxlength="1000"
              show-word-limit
              @keydown.ctrl.enter="sendMessage"
              :disabled="!connectionStatus.connected || isTyping"
            />
            <div class="input-actions">
              <el-button-group>
                <el-button type="text" :icon="Picture" @click="uploadFile">
                  上传图片
                </el-button>
                <el-button type="text" :icon="DocumentCopy" @click="clearHistory">
                  清空历史
                </el-button>
              </el-button-group>
              <el-button 
                type="primary" 
                :icon="Promotion"
                @click="sendMessage"
                :disabled="!currentInput.trim() || !connectionStatus.connected || isTyping"
                :loading="isTyping"
              >
                发送
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 折叠状态下的快捷按钮 -->
    <div v-else class="collapsed-buttons">
      <el-tooltip content="AI助手" placement="left">
        <el-button type="text" :icon="ChatLineRound" @click="$emit('toggle')" />
      </el-tooltip>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue';
import { 
  ChatLineRound, 
  Expand, 
  Fold, 
  User, 
  Cpu, 
  Star, 
  StarFilled, 
  CopyDocument,
  Connection,
  Picture,
  DocumentCopy,
  Promotion
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// Props
defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
});

// Emits
defineEmits(['toggle']);

// 消息容器引用
const messagesContainer = ref();

// 当前输入内容
const currentInput = ref('');

// 是否正在输入
const isTyping = ref(false);

// 连接状态
const connectionStatus = reactive({
  connected: false,
  lastCheck: new Date()
});

// 对话消息列表
const messages = ref([]);

// 快捷问题
const quickQuestions = [
  '显示水质监测数据',
  '分析管网运行状态',
  '生成水务报告',
  '应急处理建议'
];

// 发送消息
const sendMessage = async () => {
  if (!currentInput.value.trim() || isTyping.value) return;
  
  const userMessage = {
    type: 'user',
    content: currentInput.value.trim(),
    timestamp: new Date()
  };
  
  messages.value.push(userMessage);
  const inputText = currentInput.value;
  currentInput.value = '';
  
  // 滚动到底部
  await nextTick();
  scrollToBottom();
  
  // 模拟AI回复
  await simulateAIResponse(inputText);
};

// 发送快捷问题
const sendQuickQuestion = (question) => {
  currentInput.value = question;
  sendMessage();
};

// 模拟AI回复
const simulateAIResponse = async (userInput) => {
  isTyping.value = true;
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  let aiResponse = '';
  
  // 根据用户输入生成不同的回复
  if (userInput.includes('水质')) {
    aiResponse = `
      <h4>水质监测数据分析</h4>
      <p>根据最新的水质监测数据：</p>
      <ul>
        <li><strong>pH值：</strong> 7.2 (正常范围)</li>
        <li><strong>溶解氧：</strong> 6.8 mg/L (良好)</li>
        <li><strong>浊度：</strong> 1.2 NTU (优良)</li>
        <li><strong>总磷：</strong> 0.05 mg/L (符合标准)</li>
      </ul>
      <p>建议：当前水质状况良好，建议继续保持现有处理工艺。</p>
    `;
  } else if (userInput.includes('管网')) {
    aiResponse = `
      <h4>管网运行状态分析</h4>
      <p>当前管网系统运行状态：</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; border: 1px solid #ddd;">区域</th>
          <th style="padding: 8px; border: 1px solid #ddd;">压力(MPa)</th>
          <th style="padding: 8px; border: 1px solid #ddd;">状态</th>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">东区</td>
          <td style="padding: 8px; border: 1px solid #ddd;">0.35</td>
          <td style="padding: 8px; border: 1px solid #ddd;">正常</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">西区</td>
          <td style="padding: 8px; border: 1px solid #ddd;">0.28</td>
          <td style="padding: 8px; border: 1px solid #ddd;">偏低</td>
        </tr>
      </table>
      <p><strong>建议：</strong>西区压力偏低，建议检查该区域供水设备。</p>
    `;
  } else if (userInput.includes('应急')) {
    aiResponse = `
      <h4>应急处理建议</h4>
      <p>针对水务应急情况，建议按以下步骤处理：</p>
      <ol>
        <li><strong>立即评估：</strong>确定事故级别和影响范围</li>
        <li><strong>启动预案：</strong>根据事故级别启动相应应急预案</li>
        <li><strong>人员疏散：</strong>如有必要，疏散受影响区域人员</li>
        <li><strong>应急供水：</strong>启动备用水源或应急供水车</li>
        <li><strong>信息通报：</strong>及时向相关部门和公众通报情况</li>
      </ol>
      <p>需要我为您定位最近的应急设备或生成详细应急方案吗？</p>
    `;
  } else {
    aiResponse = `
      <p>感谢您的询问。我是水务智能助手，可以为您提供以下服务：</p>
      <ul>
        <li>🔍 <strong>数据查询：</strong>水质监测、流量统计、设备状态等</li>
        <li>📊 <strong>数据分析：</strong>趋势分析、异常检测、预测建模</li>
        <li>🗺️ <strong>地图操作：</strong>图层控制、空间分析、路径规划</li>
        <li>⚠️ <strong>应急支持：</strong>故障诊断、应急预案、处理建议</li>
        <li>📈 <strong>报告生成：</strong>自动生成各类水务分析报告</li>
      </ul>
      <p>请告诉我您具体需要什么帮助，我会尽力为您提供准确的信息和建议。</p>
    `;
  }
  
  const aiMessage = {
    type: 'ai',
    content: aiResponse,
    timestamp: new Date(),
    feedback: null
  };
  
  isTyping.value = false;
  messages.value.push(aiMessage);
  
  await nextTick();
  scrollToBottom();
};

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 格式化消息内容
const formatMessage = (content) => {
  return content;
};

// 格式化时间
const formatTime = (timestamp) => {
  return timestamp.toLocaleTimeString();
};

// 反馈消息
const feedbackMessage = (index, type) => {
  messages.value[index].feedback = type;
  ElMessage.success(`已记录您的${type === 'like' ? '点赞' : '差评'}反馈`);
};

// 复制消息
const copyMessage = async (content) => {
  try {
    // 移除HTML标签
    const textContent = content.replace(/<[^>]*>/g, '');
    await navigator.clipboard.writeText(textContent);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};

// 上传文件
const uploadFile = () => {
  ElMessage.info('文件上传功能开发中...');
};

// 清空历史
const clearHistory = () => {
  messages.value = [];
  ElMessage.success('对话历史已清空');
};

// 模拟连接检查
onMounted(() => {
  // 模拟连接状态
  setTimeout(() => {
    connectionStatus.connected = true;
  }, 2000);
});
</script>

<style scoped>
.right-panel {
  border-left: 1px solid var(--esri-neutral-300);
  border-right: none;
}

.sidebar-header {
  flex-direction: row-reverse;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scroll-behavior: smooth;
}

.welcome-message {
  text-align: center;
  padding: 32px 16px;
}

.welcome-content {
  max-width: 280px;
  margin: 0 auto;
}

.welcome-icon {
  font-size: 48px;
  color: var(--esri-primary-blue);
  margin-bottom: 16px;
}

.welcome-content h3 {
  margin: 0 0 12px 0;
  color: var(--esri-neutral-700);
  font-size: 18px;
}

.welcome-content p {
  margin: 0 0 24px 0;
  color: var(--esri-neutral-600);
  font-size: 14px;
  line-height: 1.6;
}

.quick-questions h4 {
  margin: 0 0 12px 0;
  color: var(--esri-neutral-700);
  font-size: 14px;
}

.question-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-buttons .el-button {
  width: 100%;
  text-align: left;
  justify-content: flex-start;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.user-message {
  flex-direction: row-reverse;
}

.user-message .message-content {
  text-align: right;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.user-message .message-header {
  flex-direction: row-reverse;
}

.message-sender {
  font-size: 12px;
  font-weight: 600;
  color: var(--esri-neutral-600);
}

.message-time {
  font-size: 11px;
  color: var(--esri-neutral-500);
}

.message-text {
  background: var(--esri-neutral-200);
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--esri-neutral-700);
}

.user-message .message-text {
  background: var(--esri-primary-blue);
  color: var(--esri-neutral-100);
}

.message-text :deep(h4) {
  margin: 0 0 8px 0;
  color: inherit;
  font-size: 14px;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-text :deep(table) {
  margin: 8px 0;
  font-size: 12px;
}

.message-actions {
  margin-top: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.message-item:hover .message-actions {
  opacity: 1;
}

.message-actions .el-button.active {
  color: var(--esri-primary-blue);
}

.typing-indicator .typing-dots {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--esri-neutral-200);
  border-radius: 12px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: var(--esri-neutral-500);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.chat-input-area {
  border-top: 1px solid var(--esri-neutral-300);
  padding: 16px;
  background: var(--esri-neutral-100);
}

.connection-status {
  margin-bottom: 12px;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.collapsed-buttons {
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: var(--esri-neutral-200);
}

.chat-messages::-webkit-scrollbar-thumb {
  background: var(--esri-neutral-400);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: var(--esri-neutral-500);
}
</style>