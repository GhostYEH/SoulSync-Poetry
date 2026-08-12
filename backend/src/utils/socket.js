let io = null;

/**
 * 初始化 Socket.io 实例（仅在 server.js 启动时调用一次）。
 * @param {import('socket.io').Server} ioInstance
 */
function init(ioInstance) {
  io = ioInstance;
}

/**
 * 获取 Socket.io 实例。若未初始化则返回 null。
 * @returns {import('socket.io').Server | null}
 */
function getIO() {
  return io;
}

module.exports = { init, getIO };
