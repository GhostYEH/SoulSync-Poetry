// Socket.io 客户端连接管理
import { io } from 'socket.io-client';

// 确保 socket 实例只被创建一次
let socket;
let socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

// 初始化 socket
const initSocket = async () => {
  if (window.socketInstance) {
    console.log('Using existing socket instance');
    socket = window.socketInstance;
    return socket;
  }

  console.log('Socket URL:', socketUrl);

  // 创建 socket 实例
  socket = io(socketUrl, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling']
  });

  // 存储 socket 实例到全局对象
  window.socketInstance = socket;
  return socket;
};

// 立即初始化
initSocket();

// 存储 socket 事件监听器
const eventListeners = new Map();

// 连接状态
let isConnected = false;

import { getToken } from './services/api';

// 连接并认证
function connect() {
  console.log('开始建立 socket 连接...');
  if (socket) {
    const token = getToken();
    if (token) {
      socket.auth = { token };
    }
  }
  socket.connect();
  return true;
}

// 初始化 socket 事件监听器
function initSocketListeners() {
  console.log('初始化 socket 事件监听器...');
  
  // 监听连接成功事件
  socket.on('connect', () => {
    console.log('Socket 已连接:', socket.id);
    isConnected = true;
  });
  
  // 监听连接错误
  socket.on('connect_error', (error) => {
    console.error('Socket 连接错误:', error);
    isConnected = false;
  });
  
  // 监听断开连接
  socket.on('disconnect', (reason) => {
    console.log('Socket 已断开连接:', reason);
    isConnected = false;
  });
}

// 断开连接
function disconnect() {
  socket.disconnect();
}

// 注册事件监听器
function on(event, callback) {
  socket.on(event, callback);
  
  // 存储监听器，以便后续可以移除
  if (!eventListeners.has(event)) {
    eventListeners.set(event, []);
  }
  eventListeners.get(event).push(callback);
}

// 移除事件监听器
function off(event, callback) {
  socket.off(event, callback);
  
  // 从存储中移除
  if (eventListeners.has(event)) {
    const listeners = eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
}

// 导出 socket 实例和方法
export default {
  socket,
  initSocket,
  connect,
  disconnect,
  on,
  off
};
