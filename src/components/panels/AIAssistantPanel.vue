<template>
  <div class="ai-assistant-panel">
    <div class="panel-header">
      <h3>AI 助手</h3>
    </div>

    <div class="panel-content">
      <!-- 对话历史 -->
      <div class="chat-history" ref="chatHistory">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="{ 'user-message': message.type === 'user', 'ai-message': message.type === 'ai' }"
        >
          <div class="message-content">
            {{ message.content }}
          </div>
          <div class="message-time">
            {{ formatTime(message.timestamp) }}
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div class="input-group">
          <textarea
            v-model="inputMessage"
            @keydown.enter.prevent="sendMessage"
            placeholder="请输入您的问题..."
            rows="3"
            class="message-input"
          ></textarea>
          <button
            @click="sendMessage"
            :disabled="!inputMessage.trim()"
            class="send-button"
          >
            发送
          </button>
        </div>
      </div>

      <!-- 快捷功能按钮 -->
      <div class="quick-actions">
        <button @click="quickQuery('水质分析')" class="quick-btn">水质分析</button>
        <button @click="quickQuery('污染源识别')" class="quick-btn">污染源识别</button>
        <button @click="quickQuery('监测建议')" class="quick-btn">监测建议</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, nextTick } from 'vue'

export default {
  name: 'AIAssistantPanel',
  setup() {
    const inputMessage = ref('')
    const chatHistory = ref(null)

    const messages = reactive([
      {
        id: 1,
        type: 'ai',
        content: '您好！我是AI水质监测助手，我可以帮助您分析水质数据、识别污染源、提供监测建议等。请问有什么可以帮助您的？',
        timestamp: new Date()
      }
    ])

    // 发送消息
    const sendMessage = async () => {
      if (!inputMessage.value.trim()) return

      // 添加用户消息
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: inputMessage.value,
        timestamp: new Date()
      }
      messages.push(userMessage)

      const userInput = inputMessage.value
      inputMessage.value = ''

      // 滚动到底部
      await nextTick()
      scrollToBottom()

      // 模拟AI回复
      setTimeout(() => {
        const aiResponse = {
          id: Date.now() + 1,
          type: 'ai',
          content: generateAIResponse(userInput),
          timestamp: new Date()
        }
        messages.push(aiResponse)

        nextTick(() => {
          scrollToBottom()
        })
      }, 1000)
    }

    // 快捷查询
    const quickQuery = (query) => {
      inputMessage.value = query
      sendMessage()
    }

    // 生成AI回复（模拟）
    const generateAIResponse = (input) => {
      const responses = {
        '水质分析': '根据当前监测数据，我为您分析了水质状况：pH值正常，溶解氧略低，建议加强曝气处理。',
        '污染源识别': '通过数据分析，发现上游500米处可能存在工业排放源，建议进行现场核查。',
        '监测建议': '建议在以下位置增设监测点：1. 河流入口处 2. 工业区下游 3. 居民区取水点附近。'
      }

      return responses[input] || `您询问了"${input}"，我正在分析相关数据，请稍候...`
    }

    // 格式化时间
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 滚动到底部
    const scrollToBottom = () => {
      if (chatHistory.value) {
        chatHistory.value.scrollTop = chatHistory.value.scrollHeight
      }
    }

    return {
      inputMessage,
      messages,
      chatHistory,
      sendMessage,
      quickQuery,
      formatTime
    }
  }
}
</script>

<style scoped>
.ai-assistant-panel {
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
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 12px;
  background-color: #f8f9fa;
}

.message {
  margin-bottom: 16px;
}

.message:last-child {
  margin-bottom: 0;
}

.user-message .message-content {
  background-color: #007bff;
  color: white;
  margin-left: 20%;
}

.ai-message .message-content {
  background-color: #fff;
  color: #333;
  margin-right: 20%;
  border: 1px solid #e1e5e9;
}

.message-content {
  padding: 12px;
  border-radius: 12px;
  line-height: 1.4;
  font-size: 14px;
}

.message-time {
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.input-area {
  border-top: 1px solid #e1e5e9;
  padding-top: 16px;
}

.input-group {
  display: flex;
  gap: 8px;
}

.message-input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 12px;
  resize: none;
  font-family: inherit;
  font-size: 14px;
}

.message-input:focus {
  outline: none;
  border-color: #007bff;
}

.send-button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.send-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.quick-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-btn {
  padding: 6px 12px;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.quick-btn:hover {
  background-color: #e9ecef;
  border-color: #007bff;
}
</style>
