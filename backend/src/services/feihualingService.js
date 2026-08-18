const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

class FeihualingService {
  constructor() {
    this.onlineUsers = new Map();
    this.rooms = new Map();
    this.pendingInvitations = new Map();
    this.disconnectedPlayers = new Map();
    this.RECONNECT_TIMEOUT = 30000;

    this.DIFFICULTY_CONFIG = {
      easy: { timeLimit: 60, name: '入门' },
      medium: { timeLimit: 45, name: '进阶' },
      hard: { timeLimit: 30, name: '专业' },
      ranking: { timeLimit: 30, name: '排位赛' }
    };

    this.RECOMMENDED_KEYWORDS = ['春', '花', '月', '风', '雨', '山', '水', '云', '雪', '夜', '酒', '鸟', '秋', '江', '人', '天'];
    
    this.poemsCache = null;
    this.poemsCacheTime = 0;
    this.CACHE_TTL = 5 * 60 * 1000;
  }

  async loadPoemsFromDB() {
    const now = Date.now();
    if (this.poemsCache && (now - this.poemsCacheTime) < this.CACHE_TTL) {
      return this.poemsCache;
    }

    try {
      const result = await db.query('SELECT id, title, author, content FROM poems');
      this.poemsCache = result.rows || [];
      this.poemsCacheTime = now;
      return this.poemsCache;
    } catch (err) {
      console.error('[FeihualingService] 加载诗词失败:', err.message);
      this.poemsCache = [];
      this.poemsCacheTime = now;
      return [];
    }
  }

  getRandomKeyword() {
    return this.RECOMMENDED_KEYWORDS[Math.floor(Math.random() * this.RECOMMENDED_KEYWORDS.length)];
  }

  async validatePoemFromDB(poem, keyword) {
    const poems = await this.loadPoemsFromDB();
    const normalizedPoem = poem.replace(/[，。！？、；：""''（）【】《》\s]/g, '');
    
    if (!normalizedPoem.includes(keyword)) {
      return { valid: false, reason: `诗句中未包含令字「${keyword}」` };
    }

    if (normalizedPoem.length < 4) {
      return { valid: false, reason: '输入的诗句太短，请至少输入一句完整的诗词' };
    }

    for (const p of poems) {
      // 按常见标点分割为单句
      const sentences = (p.content || '').split(/[，。！？、；：\s]/).filter(s => s.length > 0);
      for (const sentence of sentences) {
        const normalizedSentence = sentence.replace(/[""''（）【】《》]/g, '');
        // 要求用户输入的诗句包含于原句中且长度相差不大，或者原句包含用户输入
        // 为了严格起见，我们要求用户输入的诗句要么和某一句完全一致，要么是该句的绝对主体（长度差<=2）
        if (normalizedSentence.includes(normalizedPoem) && (normalizedSentence.length - normalizedPoem.length <= 2)) {
          return { 
            valid: true, 
            source: 'database',
            title: p.title,
            author: p.author
          };
        }
      }
    }

    return { valid: null, reason: '数据库中未找到或匹配不完整，需要AI验证' };
  }

  addUser(userId, username, socketId) {
    const existingUser = this.onlineUsers.get(userId);
    if (existingUser) {
      this.onlineUsers.set(userId, {
        ...existingUser,
        socketId,
        inGame: existingUser.inGame
      });

      if (existingUser.inGame) {
        const room = this.rooms.get(existingUser.inGame);
        if (room) {
          const player = room.players.find(p => p.id === userId);
          if (player) {
            player.socketId = socketId;
            player.disconnected = false;
            player.disconnectTime = null;
          }
        }
      }

      this.disconnectedPlayers.delete(userId);
      return this.getOnlineUsers();
    }

    this.onlineUsers.set(userId, {
      userId: userId.toString(),
      username,
      socketId,
      classId: null,
      maxRounds: 0,
      inGame: false
    });

    (async () => {
      try {
        const result = await db.query(
          'SELECT class_id, (SELECT COALESCE(MAX(total_rounds), 0) FROM feihua_battles WHERE player1_id = $1 OR player2_id = $2) as max_rounds FROM users WHERE id = $3',
          [userId, userId, userId]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          const user = this.onlineUsers.get(userId);
          if (user) {
            user.classId = row.class_id || null;
            user.maxRounds = row.max_rounds || 0;
          }
        }
      } catch (err) {
        console.error('[FeihualingService] 获取用户信息失败:', err.message);
      }
    })();

    return this.getOnlineUsers();
  }

  removeUser(socketId) {
    for (const [userId, user] of this.onlineUsers) {
      if (user.socketId === socketId) {
        if (user.inGame) {
          const roomId = user.inGame;
          const room = this.rooms.get(roomId);
          if (room && room.status === 'playing') {
            const player = room.players.find(p => p.id === userId);
            if (player) {
              player.disconnected = true;
              player.disconnectTime = Date.now();
            }

            this.disconnectedPlayers.set(userId, {
              roomId,
              username: user.username,
              disconnectTime: Date.now()
            });

            setTimeout(() => {
              this.handleReconnectTimeout(userId);
            }, this.RECONNECT_TIMEOUT);

            continue;
          }
        }
        this.onlineUsers.delete(userId);
        this.pendingInvitations.delete(userId);
        break;
      }
    }
    return this.getOnlineUsers();
  }

  handleReconnectTimeout(userId) {
    const disconnectedInfo = this.disconnectedPlayers.get(userId);
    if (!disconnectedInfo) return null;

    const room = this.rooms.get(disconnectedInfo.roomId);
    if (!room || room.status !== 'playing') {
      this.disconnectedPlayers.delete(userId);
      return null;
    }

    const player = room.players.find(p => p.id === userId);
    if (player && player.disconnected) {
      this.disconnectedPlayers.delete(userId);
      const winner = room.players.find(p => p.id !== userId);
      room.status = 'finished';
      room.winner = winner;
      room.loser = player;
      room.endReason = 'disconnect_timeout';

      this.saveFightHistory(room);

      room.players.forEach(p => {
        const user = this.onlineUsers.get(p.id);
        if (user) user.inGame = false;
      });

      this.rooms.delete(disconnectedInfo.roomId);

      if (winner && winner.socketId) {
        return {
          winnerSocketId: winner.socketId,
          winner,
          loser: player,
          reason: 'disconnect_timeout'
        };
      }
    }

    this.disconnectedPlayers.delete(userId);
    return null;
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.values()).map(u => ({
      userId: u.userId,
      username: u.username,
      classId: u.classId,
      maxRounds: u.maxRounds,
      inGame: u.inGame
    }));
  }

  getUser(userId) {
    return this.onlineUsers.get(userId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  sendInvitation(fromUserId, toUserId, keyword, difficulty) {
    const fromUser = this.onlineUsers.get(fromUserId);
    const toUser = this.onlineUsers.get(toUserId);

    if (!fromUser || !toUser) {
      return { success: false, error: '用户不在线' };
    }

    if (toUser.inGame) {
      return { success: false, error: '对方正在游戏中' };
    }

    if (fromUser.inGame) {
      return { success: false, error: '你正在游戏中' };
    }

    const finalKeyword = keyword || this.getRandomKeyword();
    const finalDifficulty = difficulty || 'medium';

    const invitationId = uuidv4();
    this.pendingInvitations.set(toUserId, {
      id: invitationId,
      from: {
        userId: fromUserId,
        username: fromUser.username,
        classId: fromUser.classId,
        maxRounds: fromUser.maxRounds
      },
      to: {
        userId: toUserId,
        username: toUser.username
      },
      keyword: finalKeyword,
      difficulty: finalDifficulty,
      timestamp: Date.now()
    });

    return {
      success: true,
      invitationId,
      toSocketId: toUser.socketId,
      from: {
        userId: fromUserId,
        username: fromUser.username,
        classId: fromUser.classId,
        maxRounds: fromUser.maxRounds
      },
      keyword: finalKeyword,
      difficulty: finalDifficulty
    };
  }

  acceptInvitation(userId, inviteId, inviterId, keyword, difficulty) {
    const invitation = this.pendingInvitations.get(userId);
    if (!invitation) {
      return { success: false, error: '邀请不存在或已过期' };
    }

    if (Date.now() - invitation.timestamp > 60000) {
      this.pendingInvitations.delete(userId);
      return { success: false, error: '邀请已过期' };
    }

    const fromUser = this.onlineUsers.get(inviterId);
    const toUser = this.onlineUsers.get(userId);

    if (!fromUser || !toUser) {
      return { success: false, error: '用户不在线' };
    }

    if (fromUser.inGame || toUser.inGame) {
      return { success: false, error: '对方已在游戏中' };
    }

    const finalKeyword = keyword || invitation.keyword || this.getRandomKeyword();
    const finalDifficulty = difficulty || invitation.difficulty || 'medium';
    const diffConfig = this.DIFFICULTY_CONFIG[finalDifficulty] || this.DIFFICULTY_CONFIG.medium;

    const roomId = uuidv4();
    const room = {
      id: roomId,
      status: 'playing',
      keyword: finalKeyword,
      difficulty: finalDifficulty,
      difficultyName: diffConfig.name,
      isRanking: finalDifficulty === 'ranking',
      players: [
        {
          id: fromUser.userId,
          username: fromUser.username,
          socketId: fromUser.socketId,
          score: 0,
          disconnected: false
        },
        {
          id: toUser.userId,
          username: toUser.username,
          socketId: toUser.socketId,
          score: 0,
          disconnected: false
        }
      ],
      currentTurn: Math.floor(Math.random() * 2),
      currentRound: 1,
      usedPoems: [],
      turnTimeLimit: diffConfig.timeLimit,
      turnStartTime: Date.now(),
      createdAt: Date.now(),
      winner: null,
      loser: null,
      endReason: null
    };

    this.rooms.set(roomId, room);

    fromUser.inGame = roomId;
    toUser.inGame = roomId;

    this.pendingInvitations.delete(userId);

    return {
      success: true,
      room,
      fromSocketId: fromUser.socketId,
      toSocketId: toUser.socketId
    };
  }

  rejectInvitation(userId, inviteId, inviterId) {
    const invitation = this.pendingInvitations.get(userId);
    if (!invitation) {
      return { success: false, error: '邀请不存在或已过期' };
    }

    if (Date.now() - invitation.timestamp > 60000) {
      this.pendingInvitations.delete(userId);
      return { success: false, error: '邀请已过期' };
    }

    const fromUser = this.onlineUsers.get(inviterId);
    this.pendingInvitations.delete(userId);

    if (fromUser) {
      fromUser.inGame = false;
    }

    return {
      success: true,
      fromSocketId: fromUser ? fromUser.socketId : null
    };
  }

  cancelInvitation(userId) {
    for (const [toUserId, invitation] of this.pendingInvitations) {
      if (invitation.from.userId === userId) {
        this.pendingInvitations.delete(toUserId);
        return { success: true };
      }
    }
    return { success: false, error: '没有待处理的邀请' };
  }

  submitAnswer(roomId, userId, poem) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    if (room.status !== 'playing') {
      return { success: false, error: '游戏已结束' };
    }

    if (!poem || typeof poem !== 'string' || poem.trim() === '') {
      return { success: false, error: '请输入诗句' };
    }

    const playerIndex = room.players.findIndex(p => p.id === userId);
    if (playerIndex === -1) {
      return { success: false, error: '你不在该房间中' };
    }

    if (playerIndex !== room.currentTurn) {
      return { success: false, error: '还没轮到你' };
    }

    const player = room.players[playerIndex];
    if (player.disconnected) {
      return { success: false, error: '你已断线' };
    }

    const normalizedPoem = poem.replace(/[，。！？、；：""''（）【】《》\s]/g, '');
    if (room.usedPoems.some(p => {
      const usedNormalized = p.normalized || (p.original || '').replace(/[，。！？、；：""''（）【】《》\s]/g, '');
      return usedNormalized === normalizedPoem;
    })) {
      return { success: false, error: '该诗句已被使用', isDuplicate: true };
    }

    return {
      success: true,
      room,
      currentPlayer: player,
      opponent: room.players[1 - playerIndex],
      normalizedPoem
    };
  }

  async verifyAnswer(roomId, userId, poem, aiResult, normalizedPoem) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    if (!poem || typeof poem !== 'string') {
      return null;
    }

    const playerIndex = room.players.findIndex(p => p.id === userId);
    const player = room.players[playerIndex];
    const opponent = room.players[1 - playerIndex];

    const alreadyUsed = room.usedPoems.some(p => {
      const usedNorm = p.normalized || (p.original || '').replace(/[，。！？、；：""''（）【】《》\s]/g, '');
      return usedNorm === normalizedPoem;
    });
    if (alreadyUsed) {
      return this._endRoundWithResult(room, opponent, player, 'answer_invalid', '该诗句已被使用');
    }

    if (!aiResult || !aiResult.isValid) {
      return this._endRoundWithResult(room, opponent, player, 'answer_invalid', aiResult ? aiResult.reason : '诗句无效');
    }

    room.usedPoems.push({
      normalized: normalizedPoem,
      original: poem,
      submittedBy: userId,
      submittedByName: player.username,
      round: room.currentRound
    });

    player.score += 1;

    room.currentTurn = (room.currentTurn + 1) % 2;
    room.currentRound += 1;
    room.turnStartTime = Date.now();

    return {
      isCorrect: true,
      aiResult,
      poem,
      currentRound: room.currentRound,
      usedPoems: room.usedPoems,
      players: room.players.map(p => ({
        id: p.id,
        userId: p.id,
        username: p.username,
        score: p.score
      })),
      currentTurn: room.currentTurn,
      nextPlayer: room.players[room.currentTurn]
    };
  }

  _endRoundWithResult(room, winner, loser, reason, reasonDetail) {
    room.status = 'finished';
    room.winner = winner;
    room.loser = loser;
    room.endReason = reason;
    room.endReasonDetail = reasonDetail;

    room.players.forEach(p => {
      const user = this.onlineUsers.get(p.id);
      if (user) user.inGame = false;
    });

    this.saveFightHistory(room);

    const result = {
      isCorrect: false,
      winner: { userId: winner.id, username: winner.username, score: winner.score },
      loser: { userId: loser.id, username: loser.username, score: loser.score },
      reason: reasonDetail || reason,
      totalRounds: room.currentRound,
      players: room.players.map(p => ({
        id: p.id,
        userId: p.id,
        username: p.username,
        score: p.score
      })),
      usedPoems: room.usedPoems,
      isRanking: room.isRanking
    };

    this.rooms.delete(room.id);

    return result;
  }

  handleTimeout(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const loserIndex = room.currentTurn;
    const winnerIndex = (loserIndex + 1) % 2;
    const loser = room.players[loserIndex];
    const winner = room.players[winnerIndex];

    return this._endRoundWithResult(room, winner, loser, 'timeout', '答题超时');
  }

  handleDisconnect(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const playerIndex = room.players.findIndex(p => p.id === userId);
    if (playerIndex === -1) {
      return null;
    }

    const winnerIndex = (playerIndex + 1) % 2;
    const loser = room.players[playerIndex];
    const winner = room.players[winnerIndex];

    return this._endRoundWithResult(room, winner, loser, 'disconnected', '对手断线');
  }

  endGame(roomId, winnerId, loserId, reason) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    const winner = room.players.find(p => p.id === winnerId);
    const loser = room.players.find(p => p.id === loserId);

    if (!winner || !loser) {
      return { success: false, error: '玩家不存在' };
    }

    return this._endRoundWithResult(room, winner, loser, 'manual', reason || '主动结束');
  }

  async saveFightHistory(room) {
    if (!room.winner || !room.loser) return;

    try {
      await db.query(
        'INSERT INTO feihua_battles (player1_id, player2_id, keyword, winner_id, loser_id, total_rounds, player1_throw_count, player2_throw_count, battle_history, started_at, ended_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [
          room.players[0].id,
          room.players[1].id,
          room.keyword,
          room.winner ? room.winner.id : null,
          room.loser ? room.loser.id : null,
          room.currentRound,
          0,
          0,
          JSON.stringify(room.usedPoems),
          room.createdAt,
          Date.now()
        ]
      );
    } catch (err) {
      console.error('[FeihualingService] 保存对战历史失败:', err.message);
    }
  }

  async getFightHistory(username) {
    try {
      const result = await db.query(
        `SELECT
          f.id,
          p1.username as player1,
          p2.username as player2,
          f.keyword,
          f.winner_id,
          f.loser_id,
          f.total_rounds,
          f.ended_at as date
        FROM feihua_battles f
        JOIN users p1 ON f.player1_id = p1.id
        JOIN users p2 ON f.player2_id = p2.id
        WHERE p1.username = $1 OR p2.username = $2
        ORDER BY f.ended_at DESC
        LIMIT 20`,
        [username, username]
      );

      const history = result.rows.map(row => ({
        id: row.id,
        player1: row.player1,
        player2: row.player2,
        keyword: row.keyword,
        winner: row.winner_id,
        loser: row.loser_id,
        rounds: row.total_rounds,
        date: row.date
      }));

      return history;
    } catch (err) {
      console.error('[FeihualingService] 获取对战历史失败:', err.message);
      throw err;
    }
  }

  getRecommendedKeywords() {
    return this.RECOMMENDED_KEYWORDS;
  }

  getDifficultyConfig(difficulty) {
    return this.DIFFICULTY_CONFIG[difficulty] || this.DIFFICULTY_CONFIG.medium;
  }
}

module.exports = new FeihualingService();
