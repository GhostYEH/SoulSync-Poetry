const feihualingService = require('./services/feihualingService');
const challengeBattleService = require('./services/challengeBattleService');
const { evaluateFeihuaPoem } = require('./services/aiService');
const feihuaRankingService = require('./services/feihuaRankingService');
const jwt = require('jsonwebtoken');
const config = require('./config/config');

const JWT_SECRET = config.jwt.secret;

// 双人对战房间计时器管理
const duelTimers = new Map();

// 断线重连等待计时器（闯关对战）
const reconnectTimers = new Map();
const RECONNECT_WAIT_TIME = 30000; // 30秒重连等待时间

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('[Socket] 新的Socket连接:', socket.id);

    let currentUserId = null;

    // ==============================================================
    // 认证
    // ==============================================================
    socket.on('authenticate', (data) => {
      try {
        const token = data.token;
        if (!token) {
          socket.emit('error', { error: '未提供token' });
          return;
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded || !decoded.userId) {
          socket.emit('error', { error: 'token无效' });
          return;
        }
        currentUserId = decoded.userId.toString();

        const onlineUsers = feihualingService.addUser(currentUserId, decoded.username, socket.id);
        challengeBattleService.addUser(currentUserId, decoded.username, socket.id);
        challengeBattleService.updatePlayerSocketId(currentUserId, socket.id);

        // 检查是否有重连等待计时器，如果有则清除并恢复游戏
        for (const [timerKey, timer] of reconnectTimers.entries()) {
          if (timerKey.endsWith(`_${currentUserId}`)) {
            clearTimeout(timer);
            reconnectTimers.delete(timerKey);
            console.log(`[ChallengeBattle] 玩家 ${currentUserId} 重连成功，恢复游戏`);
            
            // 恢复游戏计时器
            const roomId = timerKey.split('_')[0];
            const room = challengeBattleService.getRoom(roomId);
            if (room && room.status === 'playing') {
              // 通知双方游戏继续
              room.players.forEach(p => {
                if (p.socketId) {
                  io.to(p.socketId).emit('opponent-reconnected', {
                    message: '对手已重连，游戏继续',
                    currentQuestionIndex: room.currentQuestionIndex,
                    currentTurn: room.currentQuestionIndex % 2,
                    players: room.players.map(pl => ({
                      id: pl.id,
                      username: pl.username,
                      correctAnswers: pl.correctAnswers,
                      wrongAnswers: pl.wrongAnswers
                    }))
                  });
                }
              });
              // 重新启动游戏计时器
              startDualInviteTimer(roomId, io);
            }
            break;
          }
        }

        socket.emit('authenticated', {
          userId: currentUserId,
          username: decoded.username
        });

        io.emit('online-users', onlineUsers);
        console.log(`[Socket] 用户 ${decoded.username} 已认证`);
      } catch (error) {
        console.error('[Socket] 登录失败:', error);
        socket.emit('error', { error: '登录失败，请重新登录' });
      }
    });

    // ==============================================================
    // 飞花令相关事件（保持不变）
    // ==============================================================
    socket.on('get-game-config', () => {
      const keywords = feihualingService.getRecommendedKeywords();
      const difficulties = Object.entries(feihualingService.DIFFICULTY_CONFIG).map(([key, val]) => ({
        level: key,
        name: val.name,
        timeLimit: val.timeLimit,
        throwCount: val.throwCount
      }));
      socket.emit('game-config', { keywords, difficulties });
    });

    socket.on('send-invitation', (data) => {
      const targetUserId = data.targetUserId.toString();
      const keyword = data.keyword || '花';
      const difficulty = data.difficulty || 'medium';
      const result = feihualingService.sendInvitation(currentUserId, targetUserId, keyword, difficulty);
      if (!result.success) {
        socket.emit('error', { error: result.error });
        return;
      }
      if (result.toSocketId) {
        io.to(result.toSocketId).emit('receive-invitation', {
          inviteId: result.invitationId,
          from: result.from,
          keyword: result.keyword,
          difficulty: result.difficulty
        });
      }
      socket.emit('invitation-sent', { success: true });
    });

    socket.on('accept-invitation', (data) => {
      const { inviteId, inviterId, keyword, difficulty } = data;
      const result = feihualingService.acceptInvitation(currentUserId, inviteId, inviterId, keyword, difficulty);
      if (!result.success) {
        socket.emit('error', { error: result.error });
        return;
      }
      const { room, fromSocketId, toSocketId } = result;
      const gameStartPayload = {
        room: {
          id: room.id,
          keyword: room.keyword,
          difficulty: room.difficulty,
          difficultyName: room.difficultyName,
          isRanking: room.isRanking,
          players: room.players.map(p => ({
            id: p.id, userId: p.id, username: p.username,
            score: p.score, throwCount: p.throwCount, remainingThrows: p.remainingThrows
          })),
          currentTurn: room.currentTurn,
          currentRound: room.currentRound,
          usedPoems: room.usedPoems,
          turnTimeLimit: room.turnTimeLimit
        }
      };
      if (fromSocketId) io.to(fromSocketId).emit('game-start', gameStartPayload);
      if (toSocketId) io.to(toSocketId).emit('game-start', gameStartPayload);
      startTurnTimer(room.id, io);
      io.emit('online-users', feihualingService.getOnlineUsers());
    });

    socket.on('feihualing:get-online-users', () => {
      if (!currentUserId) return;
      socket.emit('online-users', feihualingService.getOnlineUsers());
    });

    socket.on('reject-invitation', (data) => {
      const { inviteId, inviterId } = data;
      const result = feihualingService.rejectInvitation(currentUserId, inviteId, inviterId);
      if (!result.success) {
        socket.emit('error', { error: result.error });
        return;
      }
      if (result.fromSocketId) {
        io.to(result.fromSocketId).emit('invitation-rejected', { inviteId, fromUserId: currentUserId });
      }
      io.emit('online-users', feihualingService.getOnlineUsers());
      socket.emit('invitation-rejected', { success: true });
    });

    socket.on('cancel-invitation', () => {
      feihualingService.cancelInvitation(currentUserId);
      socket.emit('invitation-cancelled');
      io.emit('online-users', feihualingService.getOnlineUsers());
    });

    socket.on('submit-poem', async (data) => {
      try {
        const { roomId, poem } = data;
        const submitResult = feihualingService.submitAnswer(roomId, currentUserId, poem);
        if (!submitResult.success) {
          socket.emit('error', { error: submitResult.error, isDuplicate: submitResult.isDuplicate });
          return;
        }
        const { room, currentPlayer, normalizedPoem } = submitResult;
        room.players.forEach(player => {
          if (player.socketId) {
            io.to(player.socketId).emit('validating', {
              poem, submittedBy: currentPlayer.username, round: room.currentRound
            });
          }
        });
        let finalResult = null;
        const keywordOk = normalizedPoem.includes(room.keyword);
        if (!keywordOk) {
          finalResult = { isValid: false, score: 0, reason: `诗句中未包含令字「${room.keyword}」`, source: 'server' };
        } else {
          // 使用 Qwen/Qwen2.5-7B-Instruct 模型判题
          const usedPoemTexts = room.usedPoems.map(p => p.original || p.normalized);
          finalResult = await evaluateFeihuaPoem(poem, room.keyword, room.difficulty || 'medium', usedPoemTexts);
          finalResult.source = 'ai';
        }
        clearTurnTimer(roomId);
        console.log('[飞花令] AI判题结果:', finalResult);
        const verifyResult = await feihualingService.verifyAnswer(roomId, currentUserId, poem, finalResult, normalizedPoem);
        console.log('[飞花令] verifyAnswer结果:', verifyResult);
        if (!verifyResult) {
          socket.emit('error', { error: '验证失败' });
          return;
        }
        if (verifyResult.isCorrect) {
          console.log('[飞花令] 判题正确，发送poem-submitted事件');
          room.players.forEach(player => {
            if (player.socketId) io.to(player.socketId).emit('poem-submitted', {
              ...verifyResult, submittedBy: currentPlayer.username, poem, aiResult: finalResult, isValid: true
            });
          });
          startTurnTimer(roomId, io);
        } else {
          console.log('[飞花令] 判题失败，发送game-result事件');
          if (room.isRanking) {
            try {
              const rankingResult = await feihuaRankingService.updateRankingAfterBattle(verifyResult.winner.userId, verifyResult.loser.userId);
              verifyResult.rankingChange = rankingResult;
            } catch (e) { console.error('[飞花令] 更新排位分失败:', e); }
          }
          room.players.forEach(player => {
            if (player.socketId) io.to(player.socketId).emit('game-result', {
              winnerId: verifyResult.winner.userId, winnerName: verifyResult.winner.username,
              loserId: verifyResult.loser.userId, loserName: verifyResult.loser.username,
              reason: verifyResult.reason,
              totalRounds: verifyResult.totalRounds, usedPoems: verifyResult.usedPoems,
              players: verifyResult.players, aiResult: finalResult, poem, isRanking: room.isRanking, rankingChange: verifyResult.rankingChange
            });
          });
        }
      } catch (err) {
        console.error('[Feihua] 提交诗句失败:', err);
        socket.emit('error', { error: '提交诗句失败，请重试' });
      }
    });


    socket.on('game-over', (data) => {
      const { roomId, winnerId, loserId, reason } = data;
      const result = feihualingService.endGame(roomId, winnerId, loserId, reason);
      if (!result.success) { socket.emit('error', { error: result.error }); return; }
      clearTurnTimer(roomId);
      result.players.forEach(player => {
        if (player.socketId) io.to(player.socketId).emit('game-result', {
          winnerId: result.winner.userId, winnerName: result.winner.username,
          loserId: result.loser.userId, loserName: result.loser.username,
          reason, totalRounds: result.totalRounds,
          usedPoems: result.usedPoems, players: result.players, currentRound: result.totalRounds
        });
      });
    });

    // ==============================================================
    // 诗词闯关 - 单人练习模式
    // ==============================================================
    socket.on('challenge-start', async (data) => {
      try {
        if (!currentUserId) { socket.emit('error', { error: '未登录' }); return; }
        const room = await challengeBattleService.startSingleGame(currentUserId, data.username || '玩家');
        socket.emit('challenge-started', {
          roomId: room.id,
          mode: 'single',
          currentQuestion: room.questions[0],
          currentRound: 1
        });
      } catch (err) {
        console.error('[Challenge] 开始单人游戏失败:', err);
        socket.emit('error', { error: '开始游戏失败' });
      }
    });

    socket.on('challenge-answer', async (data) => {
      try {
        const { roomId, answer } = data;
        const submitResult = challengeBattleService.submitSingleAnswer(roomId, currentUserId, answer);
        if (!submitResult.success) { socket.emit('error', { error: submitResult.error }); return; }
        socket.emit('challenge-answer-result', {
          isCorrect: submitResult.isCorrect,
          correctAnswer: submitResult.correctAnswer,
          question: submitResult.question
        });
        setTimeout(async () => {
          const nextResult = await challengeBattleService.nextSingleQuestion(roomId);
          if (nextResult.type === 'finished') {
            challengeBattleService.saveSingleRecord(challengeBattleService.getRoom(roomId));
            socket.emit('challenge-finished', {
              type: 'finished', reason: nextResult.reason, totalQuestions: nextResult.totalQuestions,
              correctCount: nextResult.correctCount, wrongCount: nextResult.wrongCount,
              wrongQuestions: nextResult.wrongQuestions, players: nextResult.resultPlayers
            });
          } else if (nextResult.success) {
            socket.emit('challenge-next', {
              question: nextResult.question, currentRound: nextResult.currentRound,
              correctCount: nextResult.correctCount, wrongCount: nextResult.wrongCount
            });
          }
        }, 800);
      } catch (err) {
        console.error('[Challenge] 提交答案失败:', err);
        socket.emit('error', { error: '提交答案失败' });
      }
    });

    socket.on('challenge-timeout', async (data) => {
      try {
        const { roomId } = data;
        const result = await challengeBattleService.timeoutSingleGame(roomId);
        if (result && result.type === 'finished') {
          socket.emit('challenge-finished', {
            type: 'finished', reason: 'timeout', totalQuestions: result.totalQuestions,
            correctCount: result.correctCount, wrongCount: result.wrongCount,
            wrongQuestions: result.wrongQuestions, players: result.resultPlayers
          });
        } else if (result) {
          socket.emit('challenge-timeouted', {
            correctAnswer: result.correctAnswer, question: result.question,
            currentRound: result.currentRound, correctCount: result.correctCount, wrongCount: result.wrongCount
          });
        }
      } catch (err) { console.error('[Challenge] 超时处理失败:', err); }
    });

    socket.on('challenge-quit', (data) => {
      try {
        const { roomId, mode } = data;
        if (mode === 'dual' || mode === 'dual-invite') {
          const result = challengeBattleService.quitDualInviteGame(roomId, currentUserId);
          if (result && result.type === 'finished') {
            const room = challengeBattleService.getRoom(roomId);
            if (room) {
              room.players.forEach(p => {
                if (p.socketId) io.to(p.socketId).emit('challenge-dual-finished', result);
              });
            }
            io.emit('online-users', challengeBattleService.getOnlineUsersList());
          }
          return;
        }
        const result = challengeBattleService.quitSingleGame(roomId);
        if (result) {
          socket.emit('challenge-finished', {
            type: 'finished', reason: 'quit', totalQuestions: result.totalQuestions,
            correctCount: result.correctCount, wrongCount: result.wrongCount,
            wrongQuestions: result.wrongQuestions, players: result.resultPlayers
          });
        }
      } catch (err) { console.error('[Challenge] 结束游戏失败:', err); }
    });

    // ==============================================================
    // 诗词闯关 - 双人匹配模式（保持不变）
    // ==============================================================
    socket.on('challenge-match-start', (data) => {
      if (!currentUserId) { socket.emit('error', { error: '未登录' }); return; }
      const room = challengeBattleService.addToMatchmaking(currentUserId, data.username || '玩家', socket.id);
      if (room) {
        const roomInfo = challengeBattleService.getRoomInfo(room);
        roomInfo.currentQuestion = room.question;
        roomInfo.status = 'playing';
        room.players.forEach(p => {
          if (p.socketId) io.to(p.socketId).emit('challenge-dual-started', roomInfo);
        });
        io.emit('challenge-matchmaking-count', { count: challengeBattleService.getMatchmakingQueueSize() });
      } else {
        socket.emit('challenge-matchmaking-waiting', { count: challengeBattleService.getMatchmakingQueueSize() });
      }
    });

    socket.on('challenge-match-cancel', () => {
      challengeBattleService.removeFromMatchmaking(currentUserId);
      socket.emit('challenge-matchmaking-cancelled');
      io.emit('challenge-matchmaking-count', { count: challengeBattleService.getMatchmakingQueueSize() });
    });

    socket.on('challenge-match-count', () => {
      socket.emit('challenge-matchmaking-count', { count: challengeBattleService.getMatchmakingQueueSize() });
    });

    socket.on('challenge-dual-answer', async (data) => {
      try {
        const { roomId, answer } = data;
        const result = challengeBattleService.submitDualAnswer(roomId, currentUserId, answer);
        if (!result.success) { socket.emit('error', { error: result.error }); return; }
        const room = challengeBattleService.getRoom(roomId);
        const player = room.players.find(p => p.id === currentUserId);
        const answerEvent = {
          playerId: currentUserId, username: player.username,
          isCorrect: player.isCorrect, bothAnswered: result.bothAnswered
        };
        room.players.forEach(p => {
          if (p.socketId) io.to(p.socketId).emit('challenge-dual-answer-update', answerEvent);
        });
        if (result.bothAnswered) {
          setTimeout(async () => {
            const advanceResult = await challengeBattleService.advanceDualRound(roomId);
            if (advanceResult.type === 'finished') {
              room.players.forEach(p => { if (p.socketId) io.to(p.socketId).emit('challenge-dual-finished', advanceResult); });
              io.emit('online-users', challengeBattleService.getOnlineUsersList());
            } else if (advanceResult.success) {
              room.players.forEach(p => { if (p.socketId) io.to(p.socketId).emit('challenge-dual-next', { question: advanceResult.question, currentRound: advanceResult.currentRound, players: advanceResult.players }); });
            }
          }, 2000);
        }
      } catch (err) { console.error('[Challenge] 双人答题失败:', err); socket.emit('error', { error: '提交答案失败' }); }
    });

    socket.on('challenge-dual-timeout', async (data) => {
      try {
        const { roomId } = data;
        const room = challengeBattleService.getRoom(roomId);
        if (!room || room.status !== 'playing') return;
        const player = room.players.find(p => p.id === currentUserId);
        if (!player || player.answered) return;
        const result = challengeBattleService.handleDualTimeout(roomId, currentUserId);
        if (result) {
          room.players.forEach(p => {
            if (p.socketId) io.to(p.socketId).emit('challenge-dual-answer-update', {
              playerId: currentUserId, username: player.username, isCorrect: false,
              bothAnswered: result.bothAnswered, isTimeout: true
            });
          });
          if (result.bothAnswered) {
            setTimeout(async () => {
              const advanceResult = await challengeBattleService.advanceDualRound(roomId);
              if (advanceResult.type === 'finished') {
                room.players.forEach(p => { if (p.socketId) io.to(p.socketId).emit('challenge-dual-finished', advanceResult); });
                io.emit('online-users', challengeBattleService.getOnlineUsersList());
              } else if (advanceResult.success) {
                room.players.forEach(p => { if (p.socketId) io.to(p.socketId).emit('challenge-dual-next', { question: advanceResult.question, currentRound: advanceResult.currentRound, players: advanceResult.players }); });
              }
            }, 2000);
          }
        }
      } catch (err) { console.error('[Challenge] 双人超时处理失败:', err); }
    });

    // ==============================================================
    // 诗词闯关 - 邀请对战模式（重写，清晰简洁）
    // ==============================================================

    // 发送邀请
    socket.on('challenge-send-invitation', (data) => {
      if (!currentUserId) { socket.emit('error', { error: '未登录' }); return; }
      const { targetUserId, targetUsername } = data;
      const inviter = challengeBattleService.getUser(currentUserId);
      if (!inviter) { socket.emit('error', { error: '用户信息不存在' }); return; }
      const targetSocket = challengeBattleService.getUserSocket(targetUserId);
      if (!targetSocket) { socket.emit('error', { error: '目标用户不在线' }); return; }
      if (targetSocket.inGame) { socket.emit('error', { error: '目标用户正在对战中' }); return; }

      const inviteId = challengeBattleService.createInvitation(currentUserId, data.username || '玩家', targetUserId);
      io.to(targetSocket.socketId).emit('challenge-invitation', {
        inviteId, fromId: currentUserId, from: data.username || '玩家'
      });
      socket.emit('challenge-invitation-sent', { inviteId, targetUsername });
    });

    // 接受邀请，创建对战房间
    socket.on('challenge-accept-invitation', async (data) => {
      console.log('[Challenge] 收到接受邀请请求:', data);
      if (!currentUserId) { socket.emit('error', { error: '未登录' }); return; }

      const { inviteId, inviterId } = data;
      const result = await challengeBattleService.acceptDualInvitation(
        inviterId, currentUserId, data.username || '玩家', socket.id, inviteId
      );

      console.log('[Challenge] 接受邀请结果:', result);

      if (!result.success) {
        socket.emit('error', { error: result.error });
        return;
      }

      const { room } = result;
      const inviterSocket = challengeBattleService.getUserSocket(inviterId);

      // 构建游戏开始数据
      const startPayload = buildDualGamePayload(room);

      // 发给被邀请者
      io.to(socket.id).emit('challenge-dual-started', startPayload);
      // 发给邀请者
      if (inviterSocket) {
        io.to(inviterSocket.socketId).emit('challenge-dual-started', startPayload);
      }

      // 更新在线用户列表
      io.emit('online-users', challengeBattleService.getOnlineUsersList());

      // 启动计时器
      startDualInviteTimer(room.id, io, challengeBattleService);
    });

    // 拒绝邀请
    socket.on('challenge-reject-invitation', (data) => {
      const { inviteId, inviterId } = data;
      challengeBattleService.removeInvitation(inviteId);
      const inviterSocket = challengeBattleService.getUserSocket(inviterId);
      if (inviterSocket) {
        io.to(inviterSocket.socketId).emit('challenge-invitation-rejected', { rejecterId: currentUserId });
      }
    });

    // 取消邀请
    socket.on('challenge-cancel-invitation', (data) => {
      const { targetUserId } = data;
      challengeBattleService.removeInvitationByUser(currentUserId);
      const targetSocket = challengeBattleService.getUserSocket(targetUserId);
      if (targetSocket) io.to(targetSocket.socketId).emit('challenge-invitation-cancelled');
    });

    // 提交答案（邀请对战）
    socket.on('challenge-dual-invite-answer', async (data) => {
      try {
        const { roomId, answer } = data;
        console.log('[Challenge] 收到邀请对战答案:', { roomId, answer: answer?.substring(0, 20), currentUserId });

        const result = challengeBattleService.submitDualInviteAnswer(roomId, currentUserId, answer);
        console.log('[Challenge] 答案判定结果:', JSON.stringify(result));

        if (!result.success) {
          socket.emit('error', { error: result.error });
          return;
        }

        const room = challengeBattleService.getRoom(roomId);

        // 答错判负：立即结束游戏
        if (result.type === 'finished') {
          console.log('[Challenge] 游戏结束（答错），发送 challenge-dual-finished');
          clearDualInviteTimer(roomId);
          broadcastToRoom(room, 'challenge-dual-finished', result, io);
          io.emit('online-users', challengeBattleService.getOnlineUsersList());
          return;
        }

        // 答对：先发送正确反馈，再进入下一题
        broadcastToRoom(room, 'poem-submitted', result, io);

        // 延迟后进入下一题
        setTimeout(() => {
          const advanceResult = challengeBattleService.advanceDualInviteQuestion(roomId);
          if (advanceResult) {
            if (advanceResult.type === 'finished') {
              console.log('[Challenge] 30题全部答完，发送 challenge-dual-finished');
              clearDualInviteTimer(roomId);
              broadcastToRoom(advanceResult.room || room, 'challenge-dual-finished', advanceResult, io);
              io.emit('online-users', challengeBattleService.getOnlineUsersList());
            } else {
              console.log('[Challenge] 发送下一题:', advanceResult.currentQuestionIndex);
              // 重启计时器
              startDualInviteTimer(roomId, io, challengeBattleService);
              broadcastToRoom(advanceResult.room || room, 'challenge-dual-next', advanceResult, io);
            }
          }
        }, 1500);

      } catch (err) {
        console.error('[Challenge] 邀请对战提交答案失败:', err);
        socket.emit('error', { error: '提交答案失败' });
      }
    });

    // 超时判负（邀请对战）
    socket.on('challenge-dual-invite-timeout', async (data) => {
      try {
        const { roomId } = data;
        const result = challengeBattleService.handleDualInviteTimeout(roomId, currentUserId);

        if (result && result.type === 'finished') {
          console.log('[Challenge] 超时判负，发送 challenge-dual-finished');
          clearDualInviteTimer(roomId);
          const room = challengeBattleService.getRoom(roomId);
          if (room) broadcastToRoom(room, 'challenge-dual-finished', result, io);
          io.emit('online-users', challengeBattleService.getOnlineUsersList());
        }
      } catch (err) {
        console.error('[Challenge] 邀请对战超时处理失败:', err);
      }
    });

    // 退出游戏（邀请对战）
    socket.on('challenge-dual-invite-quit', async (data) => {
      try {
        const { roomId } = data;
        const result = challengeBattleService.quitDualInviteGame(roomId, currentUserId);

        if (result && result.type === 'finished') {
          console.log('[Challenge] 退出游戏，发送 challenge-dual-finished');
          clearDualInviteTimer(roomId);
          const room = challengeBattleService.getRoom(roomId);
          if (room) broadcastToRoom(room, 'challenge-dual-finished', result, io);
          io.emit('online-users', challengeBattleService.getOnlineUsersList());
        }
      } catch (err) {
        console.error('[Challenge] 退出游戏失败:', err);
      }
    });

    // 获取在线用户列表（闯关对战）
    socket.on('challenge-get-online-users', () => {
      const users = challengeBattleService.getOnlineUsersList();
      socket.emit('online-users', users);
    });

    // ping
    socket.on('ping', () => { socket.emit('pong'); });

    // ==============================================================
    // 断开连接处理
    // ==============================================================
    socket.on('disconnect', async () => {
      console.log('[Socket] Socket断开连接:', socket.id);

      if (currentUserId) {
        challengeBattleService.removeFromMatchmaking(currentUserId);
        io.emit('challenge-matchmaking-count', { count: challengeBattleService.getMatchmakingQueueSize() });

        // 飞花令断线
        const onlineUsers = feihualingService.removeUser(socket.id);
        io.emit('online-users', onlineUsers);

        const user = feihualingService.getUser(currentUserId);
        if (user && user.inGame) {
          const roomId = user.inGame;
          const room = feihualingService.getRoom(roomId);
          if (room && room.status === 'playing') {
            const result = feihualingService.handleDisconnect(roomId, currentUserId);
            if (result) {
              if (room.isRanking) {
                feihuaRankingService.updateRankingAfterBattle(result.winner.id, result.loser.id)
                  .then(rankingChange => {
                    result.players.forEach(player => {
                      if (player.socketId && player.id !== currentUserId) {
                        io.to(player.socketId).emit('opponent-disconnected', {
                          opponentId: currentUserId, opponentName: result.loser?.username,
                          winner: { userId: result.winner.id, username: result.winner.username },
                          message: '对手已断线，你获胜！', reason: result.reason, currentRound: result.totalRounds,
                          isRanking: room.isRanking, rankingChange
                        });
                      }
                    });
                  }).catch(e => {
                    result.players.forEach(player => {
                      if (player.socketId && player.id !== currentUserId) {
                        io.to(player.socketId).emit('opponent-disconnected', {
                          opponentId: currentUserId, opponentName: result.loser?.username,
                          winner: { userId: result.winner.id, username: result.winner.username },
                          message: '对手已断线，你获胜！', reason: result.reason, currentRound: result.totalRounds
                        });
                      }
                    });
                  });
              } else {
                result.players.forEach(player => {
                  if (player.socketId && player.id !== currentUserId) {
                    io.to(player.socketId).emit('opponent-disconnected', {
                      opponentId: currentUserId, opponentName: result.loser?.username,
                      winner: { userId: result.winner.id, username: result.winner.username },
                      message: '对手已断线，你获胜！', reason: result.reason, currentRound: result.totalRounds
                    });
                  }
                });
              }
            }
          }
        }

        // 闯关对战断线 - 添加重连等待时间
        const challengeUser = challengeBattleService.getUser(currentUserId);
        if (challengeUser && challengeUser.inGame) {
          for (const [roomId, room] of challengeBattleService.rooms.entries()) {
            if (room.mode === 'dual-invite' && room.status === 'playing') {
              const playerIndex = room.players.findIndex(p => String(p.id) === String(currentUserId));
              if (playerIndex !== -1) {
                // 清除之前的重连计时器（如果存在）
                const timerKey = `${roomId}_${currentUserId}`;
                if (reconnectTimers.has(timerKey)) {
                  clearTimeout(reconnectTimers.get(timerKey));
                }
                
                // 暂停游戏计时器，通知对手等待
                clearDualInviteTimer(roomId);
                const opponent = room.players.find(p => String(p.id) !== String(currentUserId));
                if (opponent && opponent.socketId) {
                  io.to(opponent.socketId).emit('opponent-reconnecting', {
                    message: '对手断线中，等待重连...',
                    waitTime: RECONNECT_WAIT_TIME / 1000
                  });
                }
                
                // 设置重连等待计时器
                const timer = setTimeout(() => {
                  // 超时未重连，结束游戏
                  const currentRoom = challengeBattleService.getRoom(roomId);
                  if (currentRoom && currentRoom.status === 'playing') {
                    const result = challengeBattleService.quitDualInviteGame(roomId, currentUserId);
                    if (result && result.type === 'finished') {
                      room.players.forEach(p => {
                        if (p.socketId && String(p.id) !== String(currentUserId)) {
                          io.to(p.socketId).emit('challenge-dual-finished', result);
                        }
                      });
                      io.emit('online-users', challengeBattleService.getOnlineUsersList());
                    }
                  }
                  reconnectTimers.delete(timerKey);
                }, RECONNECT_WAIT_TIME);
                
                reconnectTimers.set(timerKey, timer);
                console.log(`[ChallengeBattle] 玩家 ${currentUserId} 断线，等待 ${RECONNECT_WAIT_TIME/1000} 秒重连`);
                break;
              }
            }
          }
        }

        io.emit('online-users', challengeBattleService.getOnlineUsersList());
      }
    });
  });

  return io;
}

// ==============================================================
// 辅助函数
// ==============================================================

// 构建双人邀请对战游戏开始数据
function buildDualGamePayload(room) {
  const currentQuestion = room.questions[0];
  return {
    id: room.id,
    currentQuestionIndex: 0,
    totalQuestions: room.totalQuestions,
    currentQuestion: {
      ...currentQuestion,
      round: 1
    },
    currentTurn: 0, // 玩家0先答
    timeLimit: room.timeLimit,
    players: room.players.map((p, idx) => ({
      id: p.id,
      userId: p.id,
      username: p.username,
      correctAnswers: 0,
      wrongAnswers: 0,
      // 标识这是玩家0还是玩家1
      playerIndex: idx
    })),
    status: 'playing'
  };
}

// 向房间内所有玩家广播
function broadcastToRoom(room, event, data, io) {
  if (!room || !room.players) return;
  room.players.forEach(p => {
    if (p.socketId) {
      io.to(p.socketId).emit(event, data);
    }
  });
}

// 启动双人邀请对战计时器
function startDualInviteTimer(roomId, io, service) {
  // 先清除旧计时器
  clearDualInviteTimer(roomId);

  const room = service.getRoom(roomId);
  if (!room) return;

  let remaining = room.timeLimit || 30;

  const timer = setInterval(() => {
    const currentRoom = service.getRoom(roomId);
    if (!currentRoom || currentRoom.status !== 'playing') {
      clearDualInviteTimer(roomId);
      return;
    }

    remaining--;

    // 向当前回合的玩家发送倒计时
    const currentTurn = currentRoom.currentQuestionIndex % 2;
    const currentPlayer = currentRoom.players[currentTurn];
    if (currentPlayer && currentPlayer.socketId) {
      io.to(currentPlayer.socketId).emit('challenge-dual-timer-tick', {
        remaining,
        roomId,
        currentQuestionIndex: currentRoom.currentQuestionIndex
      });
    }

    if (remaining <= 0) {
      clearDualInviteTimer(roomId);
      // 超时判负（由客户端触发超时，或者服务器直接处理）
      // 这里服务器主动处理超时
      const result = service.handleDualInviteTimeoutByRoom(roomId);
      if (result && result.type === 'finished') {
        broadcastToRoom(currentRoom, 'challenge-dual-finished', result, io);
        io.emit('online-users', service.getOnlineUsersList());
      }
    }
  }, 1000);

  duelTimers.set(roomId, timer);
}

// 清除双人邀请对战计时器
function clearDualInviteTimer(roomId) {
  if (duelTimers.has(roomId)) {
    clearInterval(duelTimers.get(roomId));
    duelTimers.delete(roomId);
  }
}

// 飞花令计时器（保持原有）
const roomTimers = new Map();

function startTurnTimer(roomId, io) {
  clearTurnTimer(roomId);
  const room = feihualingService.getRoom(roomId);
  if (!room) return;

  const timer = setInterval(async () => {
    const currentRoom = feihualingService.getRoom(roomId);
    if (!currentRoom || currentRoom.status !== 'playing') {
      clearTurnTimer(roomId);
      return;
    }
    const elapsed = Math.floor((Date.now() - currentRoom.turnStartTime) / 1000);
    const remaining = currentRoom.turnTimeLimit - elapsed;
    currentRoom.players.forEach(player => {
      if (player.socketId) {
        io.to(player.socketId).emit('timer-tick', {
          remaining, total: currentRoom.turnTimeLimit,
          currentPlayerId: currentRoom.players[currentRoom.currentTurn].id,
          currentRound: currentRoom.currentRound, usedPoemsCount: currentRoom.usedPoems.length
        });
      }
    });
    if (remaining <= 0) {
      clearTurnTimer(roomId);
      const result = feihualingService.handleTimeout(roomId);
      if (result) {
        let rankingChange = null;
        if (currentRoom.isRanking) {
          try {
            rankingChange = await feihuaRankingService.updateRankingAfterBattle(result.winner.userId, result.loser.userId);
          } catch (e) { console.error('[飞花令] 超时更新排位分失败:', e); }
        }
        currentRoom.players.forEach(player => {
          if (player.socketId) io.to(player.socketId).emit('game-result', {
            winnerId: result.winner.userId, winnerName: result.winner.username,
            loserId: result.loser.userId, loserName: result.loser.username,
            reason: result.reason,
            totalRounds: result.totalRounds, usedPoems: currentRoom.usedPoems,
            players: result.players, currentRound: result.totalRounds, isRanking: currentRoom.isRanking, rankingChange
          });
        });
      }
    }
  }, 1000);

  roomTimers.set(roomId, timer);
}

function clearTurnTimer(roomId) {
  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId));
    roomTimers.delete(roomId);
  }
}

module.exports = setupSocket;
