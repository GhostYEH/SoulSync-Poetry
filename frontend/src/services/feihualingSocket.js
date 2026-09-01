import { io } from 'socket.io-client';
import { SOCKET_URL } from './api';

class FeihualingSocket {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.eventHandlers = {};
    this.authToken = null;
  }

  connect(token) {
    this.authToken = token || this.authToken;
    if (this.socket && this.connected) {
      return this.channel();
    }

    // Socket.IO 会自动重连。不要在每次页面切换时再创建一个连接，
    // 否则服务端会把同一用户的 socketId 来回覆盖，邀请和房间事件会丢失。
    if (this.socket) {
      this.socket.connect();
      return this.channel();
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('飞花令Socket连接成功');
      this.connected = true;
      
      // 发送认证
      if (this.authToken) this.socket.emit('authenticate', { token: this.authToken });
      this.trigger('connect');
    });

    this.socket.on('disconnect', () => {
      console.log('飞花令Socket断开连接');
      this.connected = false;
      this.trigger('disconnected');
    });

    // 认证成功（后端发送 authenticated 事件）
    this.socket.on('authenticated', (data) => {
      console.log('用户认证成功:', data);
      this.trigger('authenticated', data);
    });

    this.socket.on('online-list-update', (users) => {
      this.trigger('online-list-update', users);
    });

    // 在线用户列表更新（兼容后端发送的 online-users 事件名）
    this.socket.on('online-users', (users) => {
      this.trigger('online-users', users);
    });

    // 接收邀请
    this.socket.on('receive-invitation', (data) => {
      this.trigger('receive-invitation', data);
    });

    // 邀请被拒绝
    this.socket.on('invitation-rejected', (data) => {
      this.trigger('invitation-rejected', data);
    });

    // 邀请被取消
    this.socket.on('invitation-cancelled', (data) => {
      this.trigger('invitation-cancelled', data);
    });

    // 游戏开始
    this.socket.on('game-start', (data) => {
      this.trigger('game-start', data);
    });

    // 诗句提交成功
    this.socket.on('poem-submitted', (data) => {
      this.trigger('poem-submitted', data);
    });

    // 扔题成功
    this.socket.on('question-thrown', (data) => {
      this.trigger('question-thrown', data);
    });

    // 游戏结果
    this.socket.on('game-result', (data) => {
      this.trigger('game-result', data);
    });

    // 对手断线
    this.socket.on('opponent-disconnected', (data) => {
      this.trigger('opponent-disconnected', data);
    });

    // 验证中状态
    this.socket.on('validating', () => {
      this.trigger('validating');
    });

    // 计时器更新
    this.socket.on('timer-tick', (data) => {
      this.trigger('timer-tick', data);
    });

    // 计时器暂停
    this.socket.on('timer-pause', () => {
      this.trigger('timer-pause');
    });

    // 计时器继续
    this.socket.on('timer-resume', (data) => {
      this.trigger('timer-resume', data);
    });

    // 诗词闯关联机事件也走同一条全局连接
    [
      'challenge-invitation',
      'challenge-invitation-sent',
      'challenge-invitation-rejected',
      'challenge-invitation-cancelled',
      'challenge-dual-started',
      'challenge-dual-next',
      'challenge-dual-finished',
      'challenge-dual-timer-tick',
      'challenge-dual-answer-update',
      'challenge-matchmaking-waiting',
      'challenge-matchmaking-cancelled',
      'challenge-matchmaking-count',
      'opponent-reconnecting',
      'opponent-reconnected',
      'challenge-started',
      'challenge-answer-result',
      'challenge-next',
      'challenge-timeouted',
      'challenge-finished',
      'challenge-history-result',
      'pong'
    ].forEach(event => {
      this.socket.on(event, (data) => this.trigger(event, data));
    });

    // 错误处理
    this.socket.on('error', (error) => {
      console.error('飞花令错误:', error);
      this.trigger('error', error);
    });

    return this.channel();
  }

  // 给页面一个带作用域的事件通道。通道销毁只移除当前页面的监听，
  // 不会断开全局连接，因此用户停留在其他页面时仍能收到邀请。
  channel() {
    const handlers = [];
    const service = this;
    return {
      get connected() { return service.connected; },
      on(event, callback) {
        service.on(event, callback);
        handlers.push({ event, callback });
        return this;
      },
      off(event, callback) {
        service.off(event, callback);
        const index = handlers.findIndex(item => item.event === event && item.callback === callback);
        if (index >= 0) handlers.splice(index, 1);
        return this;
      },
      once(event, callback) {
        const onceHandler = (data) => {
          service.off(event, onceHandler);
          const index = handlers.findIndex(item => item.event === event && item.callback === onceHandler);
          if (index >= 0) handlers.splice(index, 1);
          callback(data);
        };
        service.on(event, onceHandler);
        handlers.push({ event, callback: onceHandler });
        return this;
      },
      emit(event, data) {
        service.socket?.emit(event, data);
        return this;
      },
      // 页面生命周期不再拥有连接；这里只释放该页面的事件。
      disconnect() { this.dispose(); },
      dispose() {
        handlers.splice(0).forEach(({ event, callback }) => service.off(event, callback));
      }
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // 发送邀请
  sendInvitation(targetUserId, keyword, difficulty) {
    this.socket.emit('send-invitation', {
      targetUserId,
      keyword,
      difficulty
    });
  }

  // 取消已发出的邀请
  cancelInvitation() {
    this.socket?.emit('cancel-invitation');
  }

  // 接受邀请
  acceptInvitation(inviteId, inviterId, keyword, difficulty) {
    this.socket.emit('accept-invitation', {
      inviteId,
      inviterId,
      keyword,
      difficulty
    });
  }

  // 拒绝邀请
  rejectInvitation(inviteId, inviterId) {
    this.socket.emit('reject-invitation', {
      inviteId,
      inviterId
    });
  }

  // 刷新在线用户列表
  refreshOnlineUsers() {
    if (this.socket && this.connected) {
      this.socket.emit('feihualing:get-online-users');
    } else {
      // Socket未连接时，稍后重试
      console.log('[飞花令Socket] Socket未连接，延迟刷新在线用户列表');
      setTimeout(() => {
        if (this.socket && this.connected) {
          this.socket.emit('feihualing:get-online-users');
        }
      }, 1000);
    }
  }

  // 提交答案
  submitAnswer(roomId, answer) {
    this.socket.emit('submit-poem', {
      roomId,
      poem: answer
    });
  }

  // 扔题
  throwQuestion(roomId) {
    this.socket.emit('throw-question', {
      roomId
    });
  }

  // 超时
  timeout(roomId) {
    this.socket.emit('timeout', {
      roomId
    });
  }

  // 游戏结束
  gameOver(roomId, winnerId, loserId, reason) {
    this.socket.emit('game-over', {
      roomId,
      winnerId,
      loserId,
      reason
    });
  }

  refreshPendingInvitations() {
    this.socket?.emit('feihualing:get-pending-invitation');
    this.socket?.emit('challenge-get-pending-invitations');
  }

  // 闯关邀请共用同一条已认证连接
  challengeSendInvitation(targetUserId, targetUsername, username) {
    this.socket?.emit('challenge-send-invitation', { targetUserId, targetUsername, username });
  }

  challengeCancelInvitation(targetUserId) {
    this.socket?.emit('challenge-cancel-invitation', { targetUserId });
  }

  challengeAcceptInvitation(inviteId, inviterId, username) {
    this.socket?.emit('challenge-accept-invitation', { inviteId, inviterId, username });
  }

  challengeRejectInvitation(inviteId, inviterId) {
    this.socket?.emit('challenge-reject-invitation', { inviteId, inviterId });
  }

  challengeRefreshOnlineUsers() {
    this.socket?.emit('challenge-get-online-users');
  }

  // 事件监听
  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }

  // 移除事件监听
  off(event, callback) {
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(callback);
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }

  clearHandlers() {
    this.eventHandlers = {};
  }

  // 触发事件
  trigger(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(callback => {
        callback(data);
      });
    }
  }
}

export default new FeihualingSocket();
