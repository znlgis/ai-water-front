/**
 * 应用程序入口文件
 * 初始化Vue3应用并配置OpenLayers地图组件和Element Plus UI组件
 */

import {createApp} from "vue";
import App from "./App.vue";

// 导入Vue3-OpenLayers插件
import OpenLayersMap from "vue3-openlayers";

// 导入Element Plus UI框架
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

// 导入Pinia状态管理
import { createPinia } from 'pinia';

// 导入自定义样式
import "./style.css";

// 创建Vue应用实例
const app = createApp(App);

// 创建Pinia实例
const pinia = createPinia();

// 注册OpenLayers地图插件
app.use(OpenLayersMap);

// 注册Element Plus UI框架
app.use(ElementPlus);

// 注册Pinia状态管理
app.use(pinia);

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 将应用挂载到DOM元素#app上
app.mount("#app");