const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../utils/db');
const feihuaRankingService = require('../services/feihuaRankingService');

const onlineUsers = new Map();

const invitations = new Map();

const gameRooms = new Map();

const FEIHUA_KEYWORDS = [
  '春', '月', '花', '山', '水', '风', '雪', '云',
  '酒', '愁', '江', '河', '日', '夜', '心', '人',
  '天', '鸟', '雨', '秋', '梅', '柳', '松', '竹',
  '桃', '光'
];

const POETRY_QUESTIONS = require('../data/poetryQuestions.json');

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function generateQuestions(count) {
  const shuffled = [...POETRY_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(q => ({
    question: q.question,
    answer: q.answer,
    poem: q.poem,
    author: q.author
  }));
}

function cleanUpRoom(roomId) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  gameRooms.delete(roomId);

  for (const player of room.players) {
    const user = onlineUsers.get(player.userId);
    if (user) user.inGame = false;
  }

  setTimeout(() => broadcastOnlineUsers(io), 50);
}

function verifyToken(token) {
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return {
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      role: decoded.role
    };
  } catch (error) {
    console.error('Token验证失败:', error.message);
    return null;
  }
}

async function getUserClassInfo(userId) {
  try {
    return await db.get(
      `SELECT u.id, u.username, u.class_id, 
              COALESCE(fhr.max_rounds, 0) as max_rounds
       FROM users u
       LEFT JOIN feihua_high_records fhr ON u.id = fhr.user_id
       WHERE u.id = $1`,
      [userId]
    );
  } catch (err) {
    console.error('获取用户信息失败:', err);
    return null;
  }
}

async function broadcastOnlineUsers(io) {
  const users = [];
  
  for (const [userId, user] of onlineUsers.entries()) {
    const classInfo = await getUserClassInfo(userId);
    users.push({
      userId: user.userId,
      username: user.username,
      classId: classInfo?.class_id || null,
      maxRounds: classInfo?.max_rounds || 0,
      inGame: user.inGame || false
    });
  }
  
  io.emit('online-list-update', users);
}

async function saveBattleRecord(room, winnerId, loserId, isRankingMatch = false) {
  const now = new Date().toISOString();
  const battleHistory = JSON.stringify({
    keyword: room.keyword,
    difficulty: room.difficulty,
    isRanking: isRankingMatch,
    usedPoems: room.usedPoems,
    totalRounds: room.currentQuestionIndex + 1
  });
  
  await db.run(
    `INSERT INTO feihua_battles
     (player1_id, player2_id, keyword, winner_id, loser_id, total_rounds,
      battle_history, started_at, ended_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      room.players[0].userId,
      room.players[1].userId,
      room.keyword || '填空对战',
      winnerId,
      loserId,
      room.currentQuestionIndex + 1,
      battleHistory,
      new Date(room.startTime).toISOString(),
      now
    ]
  );
  
  await updateHighRecords(room, winnerId, loserId);
  
  if (isRankingMatch && room.isRanking) {
    try {
      await feihuaRankingService.updateRankingAfterBattle(winnerId, loserId);
      console.log(`[排位赛] 更新排位数据: 胜者 ${winnerId}, 败者 ${loserId}`);
    } catch (rankingErr) {
      console.error('[排位赛] 更新排位数据失败:', rankingErr);
    }
  } else {
    console.log(`[飞花令] 普通对战记录已保存，不计入排位（isRanking=${room.isRanking}, flag=${isRankingMatch}）`);
  }
}

async function updateHighRecords(room, winnerId, loserId) {
  const now = new Date().toISOString();
  
  try {
    await db.run(
      `INSERT INTO feihua_high_records (user_id, keyword, max_rounds, total_battles, wins, losses, updated_at)
       VALUES ($1, $2, $3, 1, 1, 0, $4)
       ON CONFLICT(user_id, keyword) DO UPDATE SET
         max_rounds = GREATEST(max_rounds, $3),
         total_battles = total_battles + 1,
         wins = wins + 1,
         updated_at = $4`,
      [winnerId, room.keyword || '填空对战', room.currentQuestionIndex + 1, now]
    );
  } catch (err) {
    console.error('更新获胜者记录失败:', err);
  }

  try {
    await db.run(
      `INSERT INTO feihua_high_records (user_id, keyword, max_rounds, total_battles, wins, losses, updated_at)
       VALUES ($1, $2, $3, 1, 0, 1, $4)
       ON CONFLICT(user_id, keyword) DO UPDATE SET
         max_rounds = GREATEST(max_rounds, $3),
         total_battles = total_battles + 1,
         losses = losses + 1,
         updated_at = $4`,
      [loserId, room.keyword || '填空对战', room.currentQuestionIndex + 1, now]
    );
  } catch (err) {
    console.error('更新失败者记录失败:', err);
  }
}

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('新用户连接:', socket.id);
    
    socket.on('authenticate', async (data) => {
      const { token } = data;
      const user = verifyToken(token);
      
      if (user) {
        const classInfo = await getUserClassInfo(user.userId);
        
        onlineUsers.set(user.userId, {
          ...user,
          socketId: socket.id,
          classId: classInfo?.class_id || null,
          maxRounds: classInfo?.max_rounds || 0,
          inGame: false
        });
        
        socket.userId = user.userId;
        
        console.log('用户认证成功:', user.username, '班级:', classInfo?.class_id);
        
        socket.emit('init', { 
          userId: String(user.userId),
          username: user.username,
          classId: classInfo?.class_id || null
        });
        
        await broadcastOnlineUsers(io);
      } else {
        console.log('用户认证失败');
        socket.emit('error', { message: '认证失败，请重新登录' });
        socket.disconnect();
      }
    });

    socket.on('refresh-online-users', async () => {
      await broadcastOnlineUsers(io);
      console.log(`用户 ${socket.userId} 刷新了在线用户列表`);
    });
    
    socket.on('send-invitation', async (data) => {
      const { targetUserId, keyword, difficulty } = data;
      const inviter = onlineUsers.get(socket.userId);
      
      if (!inviter) {
        socket.emit('error', { message: '未认证用户' });
        return;
      }
      
      const actualTargetUserId = Number(targetUserId);
      const targetUser = onlineUsers.get(actualTargetUserId);
      if (!targetUser) {
        socket.emit('error', { message: '目标用户不在线' });
        return;
      }
      
      if (targetUser.inGame) {
        socket.emit('error', { message: '目标用户正在游戏中' });
        return;
      }
      
      const inviteId = generateId();

      invitations.set(inviteId, {
        inviterId: socket.userId,
        inviterName: inviter.username,
        inviterClassId: inviter.classId,
        inviterMaxRounds: inviter.maxRounds,
        targetId: actualTargetUserId,
        keyword: keyword,
        difficulty: difficulty,
        timestamp: Date.now()
      });
      
      io.to(targetUser.socketId).emit('receive-invitation', {
        inviteId,
        inviterId: inviter.userId,
        inviterName: inviter.username,
        inviterClassId: inviter.classId,
        inviterMaxRounds: inviter.maxRounds,
        keyword: keyword || '待定（接受后随机）',
        difficulty: difficulty
      });

      const savedInvitation = invitations.get(inviteId);
      socket.emit('invitation-sent', {
        inviteId,
        keyword: savedInvitation ? savedInvitation.keyword : (keyword || '随机'),
        difficulty: difficulty
      });

      console.log(`${inviter.username} 邀请 ${targetUser.username} 进行飞花令对战，令字: ${keyword || '随机'}`);
    });
    
    socket.on('accept-invitation', async (data) => {
      const { inviteId, inviterId, keyword, difficulty } = data;
      const invitation = invitations.get(inviteId);
      
      if (!invitation) {
        socket.emit('error', { message: '邀请不存在或已过期' });
        return;
      }
      
      const actualInviterId = invitation.inviterId || Number(inviterId);
      const inviter = onlineUsers.get(actualInviterId);
      const acceptor = onlineUsers.get(socket.userId);
      
      console.log(`[accept-invitation] inviterId=${actualInviterId}, socket.userId=${socket.userId}`);
      console.log(`[accept-invitation] inviter exists=${!!inviter}, acceptor exists=${!!acceptor}`);
      console.log(`[accept-invitation] onlineUsers keys:`, [...onlineUsers.keys()]);
      
      if (!inviter || !acceptor) {
        socket.emit('error', { message: '用户不在线' });
        return;
      }
      
      const roomId = generateId();
      
      const finalKeyword = (invitation.keyword && invitation.keyword !== '待定（接受后随机）')
        ? invitation.keyword
        : FEIHUA_KEYWORDS[Math.floor(Math.random() * FEIHUA_KEYWORDS.length)];
      
      const isRankingMode = invitation.difficulty === 'ranking';
      
      const questions = generateQuestions(30);

      gameRooms.set(roomId, {
        players: [
          {
            userId: actualInviterId,
            username: inviter.username,
            classId: inviter.classId,
            score: 0,
            correctAnswers: 0,
            wrongAnswers: 0
          },
          {
            userId: socket.userId,
            username: acceptor.username,
            classId: acceptor.classId,
            score: 0,
            correctAnswers: 0,
            wrongAnswers: 0
          }
        ],
        keyword: finalKeyword,
        difficulty: invitation.difficulty,
        isRanking: isRankingMode,
        currentTurn: 0,
        currentRound: 1,
        questions: questions,
        currentQuestionIndex: 0,
        usedPoems: [],
        status: 'active',
        startTime: Date.now(),
        timeLimit: 30
      });

      inviter.inGame = true;
      acceptor.inGame = true;

      socket.join(roomId);
      io.to(inviter.socketId).socketsJoin(roomId);

      const firstQuestion = questions[0];
      io.to(roomId).emit('game-start', {
        roomId,
        keyword: finalKeyword,
        difficulty: invitation.difficulty,
        isRanking: isRankingMode,
        players: [
          { userId: String(actualInviterId), username: inviter.username },
          { userId: String(socket.userId), username: acceptor.username }
        ],
        currentTurn: 0,
        timeLimit: 30,
        currentQuestion: firstQuestion,
        totalQuestions: 30,
        currentQuestionIndex: 0
      });
      
      console.log(`${acceptor.username} 接受了 ${inviter.username} 的邀请，进入房间 ${roomId}，令字: ${finalKeyword}`);
      
      invitations.delete(inviteId);
      
      await broadcastOnlineUsers(io);
    });
    
    socket.on('reject-invitation', (data) => {
      const { inviteId, inviterId } = data;
      const invitation = invitations.get(inviteId);
      
      if (!invitation) {
        socket.emit('error', { message: '邀请不存在' });
        return;
      }
      
      const actualInviterId = invitation.inviterId || Number(inviterId);
      const inviter = onlineUsers.get(actualInviterId);
      if (inviter) {
        io.to(inviter.socketId).emit('invitation-rejected', {
          rejecterId: socket.userId
        });
      }
      
      console.log(`邀请 ${inviteId} 被拒绝`);
      
      invitations.delete(inviteId);
    });
    
    socket.on('submit-poem', async (data) => {
      const { roomId, answer } = data;
      const room = gameRooms.get(roomId);

      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }

      if (room.status !== 'active') {
        socket.emit('error', { message: '游戏已结束' });
        return;
      }

      const currentPlayerIndex = room.players.findIndex(p => p.userId === socket.userId);
      if (currentPlayerIndex !== room.currentTurn) {
        socket.emit('error', { message: '还没轮到你' });
        return;
      }

      const currentQuestion = room.questions[room.currentQuestionIndex];
      if (!currentQuestion) {
        socket.emit('error', { message: '题目不存在' });
        return;
      }

      const normalizedAnswer = (answer || '').trim();
      const correctAnswer = (currentQuestion.answer || '').trim();
      const isCorrect = normalizedAnswer === correctAnswer;

      if (!isCorrect) {
          const loserIndex = currentPlayerIndex;
          const winnerIndex = (loserIndex + 1) % 2;
          const loser = room.players[loserIndex];
          const winner = room.players[winnerIndex];

          await saveBattleRecord(room, winner.userId, loser.userId, room.isRanking);

          io.to(roomId).emit('poem-submitted', {
            isCorrect: false,
            playerId: socket.userId,
            playerName: loser.username,
            correctAnswer: correctAnswer,
            yourAnswer: normalizedAnswer,
            question: currentQuestion.question,
            currentQuestionIndex: room.currentQuestionIndex,
            totalQuestions: room.questions.length
          });

          room.status = 'finished';
          io.to(roomId).emit('game-result', {
            winnerId: String(winner.userId),
            winnerName: winner.username,
            loserId: String(loser.userId),
            loserName: loser.username,
            reason: 'wrong_answer',
            winnerScore: winner.correctAnswers,
            loserScore: loser.correctAnswers,
            totalRounds: room.currentQuestionIndex + 1,
            isRanking: room.isRanking
          });

          cleanUpRoom(roomId);
          return;
        }

        room.players[currentPlayerIndex].correctAnswers += 1;
        room.players[currentPlayerIndex].score += 1;

        const nextQuestionIndex = room.currentQuestionIndex + 1;

        if (nextQuestionIndex >= room.questions.length) {
          const p0 = room.players[0];
          const p1 = room.players[1];

          let winnerId, loserId, reason;
          if (p0.correctAnswers > p1.correctAnswers) {
            winnerId = p0.userId; loserId = p1.userId; reason = 'score';
          } else if (p1.correctAnswers > p0.correctAnswers) {
            winnerId = p1.userId; loserId = p0.userId; reason = 'score';
          } else {
            winnerId = p0.userId; loserId = p1.userId; reason = 'tie';
          }

          await saveBattleRecord(room, winnerId, loserId, room.isRanking);

          io.to(roomId).emit('poem-submitted', {
            isCorrect: true,
            playerId: String(socket.userId),
            playerName: room.players[currentPlayerIndex].username,
            correctAnswer: correctAnswer,
            question: currentQuestion.question,
            currentQuestionIndex: room.currentQuestionIndex,
            totalQuestions: room.questions.length,
            players: room.players.map(p => ({
              userId: String(p.userId),
              username: p.username,
              correctAnswers: p.correctAnswers
            })),
            gameOver: true
          });

          room.status = 'finished';
          io.to(roomId).emit('game-result', {
            winnerId: String(winnerId),
            loserId: String(loserId),
            winnerScore: room.players[0].userId === winnerId ? p0.correctAnswers : p1.correctAnswers,
            loserScore: room.players[0].userId === winnerId ? p1.correctAnswers : p0.correctAnswers,
            reason,
            totalRounds: room.questions.length,
            isRanking: room.isRanking
          });

          cleanUpRoom(roomId);
          return;
        }

        room.currentQuestionIndex = nextQuestionIndex;
        room.currentTurn = (room.currentTurn + 1) % 2;
        const nextQuestion = room.questions[nextQuestionIndex];

        io.to(roomId).emit('poem-submitted', {
          isCorrect: true,
          playerId: String(socket.userId),
          playerName: room.players[currentPlayerIndex].username,
          correctAnswer: correctAnswer,
          question: currentQuestion.question,
          currentQuestionIndex: room.currentQuestionIndex,
          totalQuestions: room.questions.length,
          players: room.players.map(p => ({
            userId: String(p.userId),
            username: p.username,
            correctAnswers: p.correctAnswers
          })),
          nextQuestion: nextQuestion,
          nextTurn: room.currentTurn,
          timeLimit: room.timeLimit
        });

        io.to(roomId).emit('timer-resume', { timeLimit: room.timeLimit });
    });
    socket.on('timeout', async (data) => {
      const { roomId } = data;
      const room = gameRooms.get(roomId);

      if (!room || room.status !== 'active') {
        socket.emit('error', { message: '房间不存在或游戏已结束' });
        return;
      }

      const loserIndex = room.currentTurn;
      const winnerIndex = (loserIndex + 1) % 2;
      const loser = room.players[loserIndex];
      const winner = room.players[winnerIndex];
      const currentQuestion = room.questions[room.currentQuestionIndex];

      await saveBattleRecord(room, winner.userId, loser.userId, room.isRanking);

      room.status = 'finished';
      io.to(roomId).emit('game-result', {
        winnerId: String(winner.userId),
        winnerName: winner.username,
        loserId: String(loser.userId),
        loserName: loser.username,
        correctAnswer: currentQuestion ? currentQuestion.answer : '',
        question: currentQuestion ? currentQuestion.question : '',
        reason: 'timeout',
        winnerScore: winner.correctAnswers,
        loserScore: loser.correctAnswers,
        totalRounds: room.currentQuestionIndex + 1,
        isRanking: room.isRanking
      });

      cleanUpRoom(roomId);
      console.log(`房间 ${roomId} 游戏结束，获胜者: ${winner.username}，原因: 超时`);
    });
    
    socket.on('game-over', async (data) => {
      const { roomId, winnerId, loserId, reason } = data;
      const room = gameRooms.get(roomId);

      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }

      await saveBattleRecord(room, winnerId, loserId, room.isRanking);

      room.status = 'finished';
      io.to(roomId).emit('game-result', {
        winnerId: String(winnerId),
        loserId: String(loserId),
        winnerScore: room.players[0].userId === winnerId ? room.players[0].correctAnswers : room.players[1].correctAnswers,
        loserScore: room.players[0].userId === winnerId ? room.players[1].correctAnswers : room.players[0].correctAnswers,
        reason: reason || 'normal',
        totalRounds: room.currentQuestionIndex + 1,
        isRanking: room.isRanking
      });

      cleanUpRoom(roomId);
      console.log(`房间 ${roomId} 游戏结束，获胜者: ${winnerId}`);
    });
    
    socket.on('disconnect', async () => {
      console.log('用户断开连接:', socket.id);
      
      for (const [userId, user] of onlineUsers.entries()) {
        if (user.socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log('用户离线:', user.username);
          break;
        }
      }
      
      await broadcastOnlineUsers(io);
      
      for (const [inviteId, invitation] of invitations.entries()) {
        if (invitation.inviterId === socket.userId || invitation.targetId === socket.userId) {
          const otherUserId = invitation.inviterId === socket.userId ? invitation.targetId : invitation.inviterId;
          const otherUser = onlineUsers.get(otherUserId);
          if (otherUser) {
            io.to(otherUser.socketId).emit('invitation-cancelled', {
              reason: 'user-disconnected'
            });
          }
          invitations.delete(inviteId);
        }
      }
      
      for (const [roomId, room] of gameRooms.entries()) {
        if (room.players.some(p => p.userId === socket.userId)) {
          const otherPlayer = room.players.find(p => p.userId !== socket.userId);
          
          await saveBattleRecord(room, otherPlayer.userId, socket.userId, room.isRanking);
          
          room.status = 'finished';
          io.to(roomId).emit('opponent-disconnected', {
            winnerId: String(otherPlayer.userId),
            winnerName: otherPlayer.username,
            loserId: String(socket.userId),
            loserName: room.players.find(p => p.userId === socket.userId)?.username || '未知',
            isRanking: room.isRanking
          });

          cleanUpRoom(roomId);
        }
      }
    });
  });
}

module.exports = setupSocket;
