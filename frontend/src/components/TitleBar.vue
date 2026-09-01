<template>
  <div class="title-bar">
    <!-- 左侧：应用图标和标题 -->
    <div class="title-bar-left">
      <div class="app-icon">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span class="app-title">古诗词学习系统</span>
    </div>

    <!-- 中间：拖拽区域 -->
    <div class="title-bar-drag"></div>

    <!-- 右侧：窗口控制按钮 -->
    <div class="title-bar-controls">
      <button class="control-btn minimize" @click="minimize" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="1" y="5" width="10" height="2" fill="currentColor"/>
        </svg>
      </button>
      <button class="control-btn maximize" @click="maximize" title="最大化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      <button class="control-btn close" @click="close" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M1 1l10 10M11 1l-10 10" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const isMaximized = ref(false);
let resizeFrame = null;

// 检查是否在Electron环境中
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI;
};

// 窗口控制函数
const minimize = () => {
  if (isElectron()) {
    window.electronAPI.minimizeWindow();
  }
};

const maximize = async () => {
  if (isElectron()) {
    window.electronAPI.maximizeWindow();
    // 更新最大化状态
    isMaximized.value = await window.electronAPI.isMaximized();
  }
};

const close = () => {
  if (isElectron()) {
    window.electronAPI.closeWindow();
  }
};

const syncMaximizedState = async () => {
  if (!isElectron()) return;
  isMaximized.value = await window.electronAPI.isMaximized();
};

const handleWindowResize = () => {
  if (resizeFrame) return;
  resizeFrame = window.requestAnimationFrame(async () => {
    resizeFrame = null;
    await syncMaximizedState();
  });
};

// 监听窗口状态变化
onMounted(async () => {
  if (isElectron()) {
    await syncMaximizedState();

    // 同一帧只查询一次窗口状态，避免拖动窗口时堆积 IPC 调用。
    window.addEventListener('resize', handleWindowResize, { passive: true });
  }
});

onUnmounted(() => {
  if (isElectron()) {
    window.removeEventListener('resize', handleWindowResize);
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = null;
  }
});
</script>

<style scoped>
.title-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #2c1810 0%, #4a2c1a 50%, #2c1810 100%);
  border-bottom: 1px solid #8b4513;
  z-index: 9999;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 古风纹理背景 */
.title-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(139, 69, 19, 0.1) 2px,
      rgba(139, 69, 19, 0.1) 4px
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(139, 69, 19, 0.1) 2px,
      rgba(139, 69, 19, 0.1) 4px
    );
  pointer-events: none;
}

.title-bar-left {
  display: flex;
  align-items: center;
  padding-left: 12px;
  z-index: 1;
}

.app-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #d4af37;
  margin-right: 8px;
}

.app-title {
  font-size: 14px;
  font-weight: 500;
  color: #f5e6d3;
  font-family: 'Microsoft YaHei', 'SimSun', serif;
  letter-spacing: 1px;
}

.title-bar-drag {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
  z-index: 0;
}

.title-bar-controls {
  display: flex;
  align-items: center;
  z-index: 1;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  color: #f5e6d3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, color 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.control-btn.close:hover {
  background: #e74c3c;
  color: white;
}

.control-btn svg {
  pointer-events: none;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .app-title {
    font-size: 12px;
  }

  .control-btn {
    width: 40px;
  }
}
</style>
