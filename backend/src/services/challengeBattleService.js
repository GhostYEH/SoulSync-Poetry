const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { answersMatch } = require('../utils/answerUtils');

class ChallengeBattleService {
  constructor() {
    this.rooms = new Map();
    this.matchmakingQueue = [];
    this.POEMS_CACHE = null;
    this.cacheLoadTime = 0;
    this.CACHE_TTL = 5 * 60 * 1000;
    // 邀请对战相关
    this.onlineUsers = new Map(); // userId -> { id, username, socketId, inGame }
    this.invitations = new Map(); // inviteId -> { inviterId, inviterName, targetId, createdAt }
  }

  // 添加或更新用户在线状态
  addUser(userId, username, socketId) {
    const existingUser = this.onlineUsers.get(userId.toString());
    this.onlineUsers.set(userId.toString(), {
      id: userId.toString(),
      userId: userId.toString(),
      username,
      socketId,
      inGame: existingUser?.inGame || false
    });
    return this.getOnlineUsersList();
  }

  // 移除用户
  removeUser(socketId) {
    for (const [userId, user] of this.onlineUsers.entries()) {
      if (user.socketId === socketId) {
        this.onlineUsers.delete(userId);
        break;
      }
    }
    return this.getOnlineUsersList();
  }

  // 获取用户信息
  getUser(userId) {
    return this.onlineUsers.get(userId.toString());
  }

  // 获取用户Socket信息
  getUserSocket(userId) {
    return this.onlineUsers.get(userId.toString());
  }

  // 更新用户在房间中的socketId（重连时使用）
  updatePlayerSocketId(userId, newSocketId) {
    const userIdStr = userId.toString();
    const user = this.onlineUsers.get(userIdStr);
    if (user) {
      user.socketId = newSocketId;
    }
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players) {
        const player = room.players.find(p => String(p.id) === userIdStr);
        if (player) {
          player.socketId = newSocketId;
          console.log(`[ChallengeBattle] 更新房间 ${roomId} 中玩家 ${userIdStr} 的 socketId 为 ${newSocketId}`);
        }
      }
    }
  }

  // 获取在线用户列表
  getOnlineUsersList() {
    return Array.from(this.onlineUsers.values()).map(u => ({
      userId: u.userId,
      username: u.username,
      inGame: u.inGame || false
    }));
  }

  // 标记用户进入游戏
  setUserInGame(userId, inGame) {
    const user = this.onlineUsers.get(userId.toString());
    if (user) {
      user.inGame = inGame;
    }
  }

  // 创建邀请
  createInvitation(inviterId, inviterName, targetId) {
    const inviteId = uuidv4();
    this.invitations.set(inviteId, {
      inviterId: inviterId.toString(),
      inviterName,
      targetId: targetId.toString(),
      createdAt: Date.now()
    });
    return inviteId;
  }

  // 接受邀请，创建对战房间
  async acceptDualInvitation(inviterId, acceptorId, acceptorName, acceptorSocketId, inviteId) {
    console.log('[ChallengeBattleService] acceptDualInvitation 被调用');
    console.log('[ChallengeBattleService] inviterId:', inviterId, 'acceptorId:', acceptorId, 'inviteId:', inviteId);

    // 找到对应的邀请
    let foundInvite = null;

    if (inviteId) {
      const inv = this.invitations.get(inviteId);
      if (inv && Date.now() - inv.createdAt > 60000) {
        this.invitations.delete(inviteId);
        return { success: false, error: '邀请已过期' };
      }
      if (inv && inv.inviterId === inviterId.toString() && inv.targetId === acceptorId.toString()) {
        foundInvite = { inviteId, ...inv };
      }
    }

    if (!foundInvite) {
      for (const [inviteId2, inv] of this.invitations.entries()) {
        if (Date.now() - inv.createdAt > 60000) {
          this.invitations.delete(inviteId2);
          continue;
        }
        if (inv.inviterId === inviterId.toString() && inv.targetId === acceptorId.toString()) {
          foundInvite = { inviteId: inviteId2, ...inv };
          break;
        }
      }
    }

    if (!foundInvite) {
      return { success: false, error: '邀请不存在或已过期' };
    }

    const inviter = this.onlineUsers.get(inviterId.toString());
    const acceptor = this.onlineUsers.get(acceptorId.toString());

    if (!inviter) return { success: false, error: '邀请者不在线' };
    if (!acceptor) return { success: false, error: '被邀请者不在线' };
    if (inviter.inGame || acceptor.inGame) return { success: false, error: '你或对方正在游戏中' };

    // 删除邀请
    this.invitations.delete(foundInvite.inviteId);

    // 标记双方正在游戏中
    inviter.inGame = true;
    acceptor.inGame = true;

    // 创建对战房间（轮流答题模式：30题，答错判负）
    const room = await this._createDualRoomInvite(
      { userId: inviterId, username: foundInvite.inviterName, socketId: inviter.socketId },
      { userId: acceptorId, username: acceptorName, socketId: acceptorSocketId }
    );

    return { success: true, room, inviterSocketId: inviter.socketId };
  }

  // 移除邀请
  removeInvitation(inviteId) {
    this.invitations.delete(inviteId);
  }

  rejectInvitation(inviteId, targetId, inviterId) {
    const invitation = this.invitations.get(inviteId);
    if (!invitation || invitation.targetId !== String(targetId) || invitation.inviterId !== String(inviterId)) {
      return { success: false, error: '邀请不存在或已失效' };
    }
    this.invitations.delete(inviteId);
    return { success: true, invitation };
  }

  // 按用户ID移除邀请
  removeInvitationByUser(userId) {
    for (const [inviteId, inv] of this.invitations.entries()) {
      if (inv.inviterId === userId.toString() || inv.targetId === userId.toString()) {
        this.invitations.delete(inviteId);
      }
    }
  }

  // 获取用户发出的邀请
  getUserInvitation(userId) {
    for (const [inviteId, inv] of this.invitations.entries()) {
      if (inv.inviterId === userId.toString()) {
        return { inviteId, ...inv };
      }
    }
    return null;
  }

  getPendingInvitations(userId) {
    const now = Date.now();
    const targetId = userId.toString();
    const result = [];
    for (const [inviteId, inv] of this.invitations.entries()) {
      if (now - inv.createdAt > 60000) {
        this.invitations.delete(inviteId);
        continue;
      }
      if (inv.targetId === targetId) result.push({ inviteId, ...inv });
    }
    return result;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  // ==============================================================
  // 诗词题库加载
  // ==============================================================
  async loadPoemsCache() {
    const now = Date.now();
    if (this.POEMS_CACHE && (now - this.cacheLoadTime) < this.CACHE_TTL) {
      return this.POEMS_CACHE;
    }

    try {
      const result = await db.query('SELECT id, title, author, content FROM poems');
      const poems = result.rows || [];

      if (poems.length === 0) {
        this.POEMS_CACHE = [];
        this.cacheLoadTime = now;
        return [];
      }

      const processedPoems = poems.map(poem => {
        const content = (poem.content || '').replace(/[，、；：""''（）【】《》]/g, '，').replace(/[。！？…；]/g, '。');
        const lines = content.split('。').filter(l => l.trim().length >= 4);

        const couplets = [];
        for (const line of lines) {
          const parts = line.split('，').filter(p => p.trim().length >= 2);
          for (let i = 0; i < parts.length - 1; i++) {
            const left = parts[i].trim();
            const right = parts[i + 1].trim();
            if (left.length >= 2 && right.length >= 2) {
              const isTop = Math.random() > 0.5;
              couplets.push({
                question: isTop ? `${left}，____。` : `____，${right}。`,
                answer: isTop ? right : left,
                type: isTop ? '上句填下句' : '下句填上句'
              });
            }
          }
        }

        return {
          ...poem,
          content,
          couplets,
          difficulty: this.estimateDifficulty(poem)
        };
      }).filter(p => p.couplets.length > 0);

      this.POEMS_CACHE = processedPoems;
      this.cacheLoadTime = now;
      return processedPoems;
    } catch (err) {
      console.error('[ChallengeBattle] 加载诗词缓存失败:', err.message);
      this.POEMS_CACHE = [];
      this.cacheLoadTime = now;
      return [];
    }
  }

  estimateDifficulty(poem) {
    const title = poem.title || '';
    const author = poem.author || '';
    const content = poem.content || '';

    const easyPoems = [
      '静夜思', '春晓', '登鹳雀楼', '江雪', '相思', '悯农', '咏柳', '绝句',
      '望庐山瀑布', '赠汪伦', '早发白帝城', '望天门山', '夜宿山寺', '枫桥夜泊',
      '出塞', '芙蓉楼送辛渐', '从军行', '凉州词', '望洞庭', '浪淘沙', '乌衣巷',
      '竹枝词', '秋夕', '泊秦淮', '赤壁', '夜雨寄北', '无题', '游山西村',
      '示儿', '过零丁洋', '晓出净慈寺送林子方', '小池', '春日', '观书有感',
      '游园不值', '村居', '所见', '敕勒歌', '山行', '清明', '江南春'
    ];

    const mediumPoems = [
      '水调歌头', '念奴娇', '江城子', '定风波', '西江月', '清平乐', '菩萨蛮',
      '青玉案', '如梦令', '醉花阴', '声声慢', '渔歌子', '题西林壁', '饮湖上初晴后雨',
      '惠崇春江晚景', '泊船瓜洲', '书湖阴先生壁', '冬夜读书示子聿', '剑门道中遇微雨',
      '秋夜将晓出篱门迎凉有感', '使至塞上', '山居秋暝', '鸟鸣涧', '竹里馆', '鹿柴'
    ];

    for (const name of easyPoems) {
      if (title.includes(name)) return 'easy';
    }
    for (const name of mediumPoems) {
      if (title.includes(name)) return 'medium';
    }

    if (content.length > 100) return 'hard';
    if (content.length > 60) return 'medium';
    return 'easy';
  }

  getDifficultyByRound(round) {
    if (round <= 10) return 'easy';
    if (round <= 20) return 'medium';
    return 'hard';
  }

  getQuestionKey(question) {
    return [question?.title || '', question?.question || '', question?.answer || ''].join('\u0000');
  }

  async generateQuestion(usedQuestionKeys = [], currentRound = 1) {
    const poems = await this.loadPoemsCache();

    if (poems.length === 0) {
      return this.getFallbackQuestion(usedQuestionKeys);
    }

    const targetDifficulty = this.getDifficultyByRound(currentRound);
    const usedSet = new Set(usedQuestionKeys);

    const hasUnusedCouplet = poem => poem.couplets.some(couplet => !usedSet.has(this.getQuestionKey({
      title: poem.title,
      ...couplet
    })));
    let candidates = poems.filter(hasUnusedCouplet);

    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
    const targetLevel = difficultyOrder[targetDifficulty];

    const preferredCandidates = candidates.filter(p => {
      const poemLevel = difficultyOrder[p.difficulty] || 1;
      return poemLevel <= targetLevel;
    });

    if (preferredCandidates.length > 0) {
      candidates = preferredCandidates;
    }

    if (candidates.length === 0) {
      candidates = poems;
    }

    const poem = candidates[Math.floor(Math.random() * candidates.length)];
    const unusedCouplets = poem.couplets.filter(couplet => !usedSet.has(this.getQuestionKey({
      title: poem.title,
      ...couplet
    })));
    const coupletPool = unusedCouplets.length > 0 ? unusedCouplets : poem.couplets;
    const couplet = coupletPool[Math.floor(Math.random() * coupletPool.length)];

    return {
      question: couplet.question,
      answer: couplet.answer,
      full_poem: poem.content,
      title: poem.title,
      author: poem.author,
      type: couplet.type || '诗词接句',
      analysis: `此句出自${poem.author || '未知'}《${poem.title}》`,
      difficulty: poem.difficulty
    };
  }

  async generateQuestionBatch(count = 20, usedQuestionKeys = [], startRound = 1) {
    const questions = [];
    const usedQuestionKeysSet = new Set(usedQuestionKeys);

    for (let i = 0; i < count * 3 && questions.length < count; i++) {
      const round = startRound + questions.length;
      const q = await this.generateQuestion([...usedQuestionKeysSet], round);
      const questionKey = q && this.getQuestionKey(q);
      if (q && !usedQuestionKeysSet.has(questionKey)) {
        usedQuestionKeysSet.add(questionKey);
        questions.push(q);
      }
    }

    // 题库可能比目标局数小；继续从静态兜底题库补齐，避免房间声明的题数
    // 大于实际数组长度，导致答题阶段访问 undefined。
    while (questions.length < count) {
      const q = this.getFallbackQuestion([...usedQuestionKeysSet]);
      if (!q) break;
      const questionKey = this.getQuestionKey(q);
      if (usedQuestionKeysSet.has(questionKey)) break;
      usedQuestionKeysSet.add(questionKey);
      questions.push(q);
    }

    return questions;
  }

  getFallbackQuestion(excludeQuestionKeys = []) {
    const pool = [
      { question: '床前明月光，____。', answer: '疑是地上霜', full_poem: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', title: '静夜思', author: '李白', type: '上句填下句', analysis: '此句出自李白《静夜思》', difficulty: 'easy' },
      { question: '____，疑是地上霜。', answer: '床前明月光', full_poem: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', title: '静夜思', author: '李白', type: '下句填上句', analysis: '此句出自李白《静夜思》', difficulty: 'easy' },
      { question: '春眠不觉晓，____。', answer: '处处闻啼鸟', full_poem: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', title: '春晓', author: '孟浩然', type: '上句填下句', analysis: '此句出自孟浩然《春晓》', difficulty: 'easy' },
      { question: '____，处处闻啼鸟。', answer: '春眠不觉晓', full_poem: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', title: '春晓', author: '孟浩然', type: '下句填上句', analysis: '此句出自孟浩然《春晓》', difficulty: 'easy' },
      { question: '白日依山尽，____。', answer: '黄河入海流', full_poem: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。', title: '登鹳雀楼', author: '王之涣', type: '上句填下句', analysis: '此句出自王之涣《登鹳雀楼》', difficulty: 'easy' },
      { question: '____，黄河入海流。', answer: '白日依山尽', full_poem: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。', title: '登鹳雀楼', author: '王之涣', type: '下句填上句', analysis: '此句出自王之涣《登鹳雀楼》', difficulty: 'easy' },
      { question: '千山鸟飞绝，____。', answer: '万径人踪灭', full_poem: '千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。', title: '江雪', author: '柳宗元', type: '上句填下句', analysis: '此句出自柳宗元《江雪》', difficulty: 'easy' },
      { question: '____，万径人踪灭。', answer: '千山鸟飞绝', full_poem: '千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。', title: '江雪', author: '柳宗元', type: '下句填上句', analysis: '此句出自柳宗元《江雪》', difficulty: 'easy' },
      { question: '红豆生南国，____。', answer: '春来发几枝', full_poem: '红豆生南国，春来发几枝。愿君多采撷，此物最相思。', title: '相思', author: '王维', type: '上句填下句', analysis: '此句出自王维《相思》', difficulty: 'easy' },
      { question: '____，春来发几枝。', answer: '红豆生南国', full_poem: '红豆生南国，春来发几枝。愿君多采撷，此物最相思。', title: '相思', author: '王维', type: '下句填上句', analysis: '此句出自王维《相思》', difficulty: 'easy' },
      { question: '独在异乡为异客，____。', answer: '每逢佳节倍思亲', full_poem: '独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。', title: '九月九日忆山东兄弟', author: '王维', type: '上句填下句', analysis: '此句出自王维《九月九日忆山东兄弟》', difficulty: 'easy' },
      { question: '____，每逢佳节倍思亲。', answer: '独在异乡为异客', full_poem: '独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。', title: '九月九日忆山东兄弟', author: '王维', type: '下句填上句', analysis: '此句出自王维《九月九日忆山东兄弟》', difficulty: 'easy' },
      { question: '两岸猿声啼不住，____。', answer: '轻舟已过万重山', full_poem: '朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。', title: '早发白帝城', author: '李白', type: '上句填下句', analysis: '此句出自李白《早发白帝城》', difficulty: 'easy' },
      { question: '____，轻舟已过万重山。', answer: '两岸猿声啼不住', full_poem: '朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。', title: '早发白帝城', author: '李白', type: '下句填上句', analysis: '此句出自李白《早发白帝城》', difficulty: 'easy' },
      { question: '随风潜入夜，____。', answer: '润物细无声', full_poem: '好雨知时节，当春乃发生。随风潜入夜，润物细无声。野径云俱黑，江船火独明。晓看红湿处，花重锦官城。', title: '春夜喜雨', author: '杜甫', type: '上句填下句', analysis: '此句出自杜甫《春夜喜雨》', difficulty: 'easy' },
      { question: '____，润物细无声。', answer: '随风潜入夜', full_poem: '好雨知时节，当春乃发生。随风潜入夜，润物细无声。野径云俱黑，江船火独明。晓看红湿处，花重锦官城。', title: '春夜喜雨', author: '杜甫', type: '下句填上句', analysis: '此句出自杜甫《春夜喜雨》', difficulty: 'easy' },
      { question: '日照香炉生紫烟，____。', answer: '遥看瀑布挂前川', full_poem: '日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。', title: '望庐山瀑布', author: '李白', type: '上句填下句', analysis: '此句出自李白《望庐山瀑布》', difficulty: 'easy' },
      { question: '____，遥看瀑布挂前川。', answer: '日照香炉生紫烟', full_poem: '日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。', title: '望庐山瀑布', author: '李白', type: '下句填上句', analysis: '此句出自李白《望庐山瀑布》', difficulty: 'easy' },
      { question: '举头望明月，____。', answer: '低头思故乡', full_poem: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', title: '静夜思', author: '李白', type: '上句填下句', analysis: '此句出自李白《静夜思》', difficulty: 'easy' },
      { question: '____，低头思故乡。', answer: '举头望明月', full_poem: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', title: '静夜思', author: '李白', type: '下句填上句', analysis: '此句出自李白《静夜思》', difficulty: 'easy' },
      { question: '欲穷千里目，____。', answer: '更上一层楼', full_poem: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。', title: '登鹳雀楼', author: '王之涣', type: '上句填下句', analysis: '此句出自王之涣《登鹳雀楼》', difficulty: 'easy' },
      { question: '____，更上一层楼。', answer: '欲穷千里目', full_poem: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。', title: '登鹳雀楼', author: '王之涣', type: '下句填上句', analysis: '此句出自王之涣《登鹳雀楼》', difficulty: 'easy' },
      { question: '野火烧不尽，____。', answer: '春风吹又生', full_poem: '离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。远芳侵古道，晴翠接荒城。又送王孙去，萋萋满别情。', title: '赋得古原草送别', author: '白居易', type: '上句填下句', analysis: '此句出自白居易《赋得古原草送别》', difficulty: 'easy' },
      { question: '____，春风吹又生。', answer: '野火烧不尽', full_poem: '离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。远芳侵古道，晴翠接荒城。又送王孙去，萋萋满别情。', title: '赋得古原草送别', author: '白居易', type: '下句填上句', analysis: '此句出自白居易《赋得古原草送别》', difficulty: 'easy' },
      { question: '海内存知己，____。', answer: '天涯若比邻', full_poem: '城阙辅三秦，风烟望五津。与君离别意，同是宦游人。海内存知己，天涯若比邻。无为在歧路，儿女共沾巾。', title: '送杜少府之任蜀州', author: '王勃', type: '上句填下句', analysis: '此句出自王勃《送杜少府之任蜀州》', difficulty: 'medium' },
      { question: '____，天涯若比邻。', answer: '海内存知己', full_poem: '城阙辅三秦，风烟望五津。与君离别意，同是宦游人。海内存知己，天涯若比邻。无为在歧路，儿女共沾巾。', title: '送杜少府之任蜀州', author: '王勃', type: '下句填上句', analysis: '此句出自王勃《送杜少府之任蜀州》', difficulty: 'medium' },
      { question: '谁知盘中餐，____。', answer: '粒粒皆辛苦', full_poem: '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。', title: '悯农', author: '李绅', type: '上句填下句', analysis: '此句出自李绅《悯农》', difficulty: 'easy' },
      { question: '____，粒粒皆辛苦。', answer: '谁知盘中餐', full_poem: '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。', title: '悯农', author: '李绅', type: '下句填上句', analysis: '此句出自李绅《悯农》', difficulty: 'easy' },
      { question: '停车坐爱枫林晚，____。', answer: '霜叶红于二月花', full_poem: '远上寒山石径斜，白云深处有人家。停车坐爱枫林晚，霜叶红于二月花。', title: '山行', author: '杜牧', type: '上句填下句', analysis: '此句出自杜牧《山行》', difficulty: 'medium' },
      { question: '____，霜叶红于二月花。', answer: '停车坐爱枫林晚', full_poem: '远上寒山石径斜，白云深处有人家。停车坐爱枫林晚，霜叶红于二月花。', title: '山行', author: '杜牧', type: '下句填上句', analysis: '此句出自杜牧《山行》', difficulty: 'medium' },
    ];

    const excluded = new Set(excludeQuestionKeys);
    const available = pool.filter(q => !excluded.has(this.getQuestionKey(q)));
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  // ==============================================================
  // 单人练习模式
  // ==============================================================
  async startSingleGame(userId, username) {
    const roomId = uuidv4();
    const initialQuestion = await this.generateQuestion([], 1);

    const room = {
      id: roomId,
      mode: 'single',
      userId,
      username,
      status: 'playing',
      questions: [{ ...initialQuestion, round: 1 }],
      usedQuestionKeys: [this.getQuestionKey(initialQuestion)],
      wrongQuestions: [],
      currentRound: 1,
      totalTime: 30,
      questionStartedAt: Date.now(),
      questionAnswered: false,
      correctCount: 0,
      wrongCount: 0,
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.setUserInGame(userId, roomId);
    return room;
  }

  submitSingleAnswer(roomId, userId, answer) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: '房间不存在' };
    if (room.status !== 'playing') return { success: false, error: '游戏已结束' };
    if (room.mode !== 'single') return { success: false, error: '不是单人模式' };
    if (String(room.userId) !== String(userId)) return { success: false, error: '你不属于该单人房间' };
    if (room.questionAnswered) return { success: false, error: '本题已经作答，请等待下一题' };
    if (Date.now() - room.questionStartedAt >= room.totalTime * 1000) {
      return { success: false, error: '本题已超时', timeout: true };
    }

    const currentQuestion = room.questions[room.questions.length - 1];
    if (!currentQuestion) return { success: false, error: '题目不存在' };
    const isCorrect = answersMatch(answer, currentQuestion.answer);

    room.questionAnswered = true;
    if (isCorrect) {
      room.correctCount++;
    } else {
      room.wrongCount++;
      room.wrongQuestions.push({
        question: currentQuestion.question,
        answer: currentQuestion.answer,
        userAnswer: answer,
        fullPoem: currentQuestion.full_poem,
        author: currentQuestion.author,
        title: currentQuestion.title
      });
    }

    return {
      success: true,
      isCorrect,
      correctAnswer: currentQuestion.answer,
      question: currentQuestion
    };
  }

  async nextSingleQuestion(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return null;
    if (room.mode !== 'single') return null;
    if (userId != null && String(room.userId) !== String(userId)) return null;

    const nextRound = room.questions.length + 1;
    if (nextRound > 30) {
      return this.endSingleGame(room);
    }

    const question = await this.generateQuestion(room.usedQuestionKeys, nextRound);
    room.questions.push({ ...question, round: nextRound });
    room.usedQuestionKeys.push(this.getQuestionKey(question));
    room.currentRound = nextRound;
    room.questionStartedAt = Date.now();
    room.questionAnswered = false;

    return {
      success: true,
      question,
      currentRound: room.currentRound,
      correctCount: room.correctCount,
      wrongCount: room.wrongCount
    };
  }

  async timeoutSingleGame(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return null;
    if (room.mode !== 'single') return null;
    if (String(room.userId) !== String(userId)) return null;
    if (room.questionAnswered) return null;

    room.questionAnswered = true;

    room.wrongCount++;
    const currentQuestion = room.questions[room.questions.length - 1];
    room.wrongQuestions.push({
      question: currentQuestion.question,
      answer: currentQuestion.answer,
      userAnswer: '(超时)',
      fullPoem: currentQuestion.full_poem,
      author: currentQuestion.author,
      title: currentQuestion.title
    });

    const nextResult = await this.nextSingleQuestion(roomId, userId);
    if (nextResult?.type === 'finished') {
      this.saveSingleRecord(room);
      return nextResult;
    }
    if (!nextResult) return null;
    return {
      correctAnswer: currentQuestion.answer,
      ...nextResult
    };
  }

  endSingleGame(room) {
    room.status = 'finished';
    room.endedAt = Date.now();
    this.setUserInGame(room.userId, false);
    return {
      type: 'finished',
      reason: 'completed',
      totalQuestions: room.questions.length,
      correctCount: room.correctCount,
      wrongCount: room.wrongCount,
      wrongQuestions: room.wrongQuestions,
      resultPlayers: [{
        id: room.userId,
        username: room.username,
        correct: room.correctCount,
        wrong: room.wrongCount
      }]
    };
  }

  quitSingleGame(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return null;
    if (room.mode !== 'single') return null;
    if (String(room.userId) !== String(userId)) return null;

    const result = this.endSingleGame(room);
    this.saveSingleRecord(room);
    return { ...result, reason: 'quit' };
  }

  async saveSingleRecord(room) {
    if (!room) return;

    const winnerId = room.correctCount >= room.wrongCount ? room.userId : null;
    const loserId = room.correctCount < room.wrongCount ? room.userId : null;

    try {
      await db.query(
        `INSERT INTO challenge_battles (player1_id, player2_id, winner_id, loser_id, total_questions, player1_correct, player2_correct, total_rounds, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          room.userId, room.userId,
          winnerId, loserId,
          room.questions.length,
          room.correctCount, 0,
          room.currentRound,
          room.createdAt,
          room.endedAt || Date.now()
        ]
      );
    } catch (err) {
      console.error('[ChallengeBattle] 保存单人记录失败:', err.message);
    }

    // 战绩表写入失败时，不能连带丢失本局错题；错题本独立保存。
    try {
      if (room.wrongQuestions && room.wrongQuestions.length > 0) {
        const now = new Date().toISOString();
        for (const wq of room.wrongQuestions) {
          const existingResult = await db.query(
            'SELECT * FROM wrong_questions WHERE user_id = $1 AND question = $2',
            [room.userId, wq.question]
          );

          if (existingResult.rows.length > 0) {
            const existing = existingResult.rows[0];
            await db.query(
              `UPDATE wrong_questions
               SET wrong_count = COALESCE(wrong_count, 1) + 1, user_answer = $1, last_wrong_time = $2,
                   correct_streak = 0, review_count = 0, interval_days = 1,
                   next_review = CURRENT_DATE, mastered = 0
               WHERE id = $3`,
              [wq.userAnswer || '', now, existing.id]
            );
          } else {
            await db.query(
              `INSERT INTO wrong_questions
               (user_id, question, answer, user_answer, level, full_poem, author, title,
                wrong_count, last_wrong_time, correct_streak, review_count, interval_days, next_review)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, 1, CURRENT_DATE)`,
              [room.userId, wq.question, wq.answer, wq.userAnswer || '', 1, wq.fullPoem || '', wq.author || '', wq.title || '', 1, now]
            );
          }
        }
      }
    } catch (err) {
      console.error('[ChallengeBattle] 保存单人错题失败:', err.message);
    }
  }

  async getBattleHistory(userId) {
    try {
      const result = await db.query(
        `SELECT cb.*, u1.username as player1_name, u2.username as player2_name
         FROM challenge_battles cb
         LEFT JOIN users u1 ON cb.player1_id = u1.id
         LEFT JOIN users u2 ON cb.player2_id = u2.id
         WHERE cb.player1_id = $1 OR cb.player2_id = $2
         ORDER BY cb.ended_at DESC
         LIMIT 20`,
        [userId, userId]
      );
      return result.rows || [];
    } catch (err) {
      console.error('[ChallengeBattle] 获取对战历史失败:', err.message);
      throw err;
    }
  }

  // ==============================================================
  // 双人匹配模式
  // ==============================================================
  async addToMatchmaking(userId, username, socketId) {
    this.matchmakingQueue = this.matchmakingQueue.filter(m => String(m.userId) !== String(userId));
    this.matchmakingQueue.push({ userId, username, socketId, joinedAt: Date.now() });

    if (this.matchmakingQueue.length >= 2) {
      const player1 = this.matchmakingQueue.shift();
      const player2 = this.matchmakingQueue.shift();
      return this._createDualRoom(player1, player2);
    }
    return null;
  }

  removeFromMatchmaking(userId) {
    this.matchmakingQueue = this.matchmakingQueue.filter(m => String(m.userId) !== String(userId));
  }

  getMatchmakingQueueSize() {
    return this.matchmakingQueue.length;
  }

  async _createDualRoom(player1, player2) {
    const roomId = uuidv4();
    const question = await this.generateQuestion([], 1);

    const room = {
      id: roomId,
      mode: 'dual',
      players: [
        { id: player1.userId, username: player1.username, socketId: player1.socketId, correct: 0, wrong: 0, answered: false, answer: null, isCorrect: null },
        { id: player2.userId, username: player2.username, socketId: player2.socketId, correct: 0, wrong: 0, answered: false, answer: null, isCorrect: null }
      ],
      status: 'playing',
      currentRound: 1,
      totalRounds: 30,
      question: { ...question, round: 1 },
      wrongQuestions: [],
      usedQuestionKeys: [this.getQuestionKey(question)],
      questionStartTime: Date.now(),
      totalTime: 30,
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.setUserInGame(player1.userId, true);
    this.setUserInGame(player2.userId, true);
    return room;
  }

  getRoomInfo(room) {
    if (room.mode === 'single') {
      return {
        id: room.id,
        mode: 'single',
        username: room.username,
        currentRound: room.currentRound,
        totalRounds: 30
      };
    } else {
      return {
        id: room.id,
        mode: 'dual',
        players: room.players.map(p => ({
          id: p.id,
          username: p.username,
          correct: p.correct,
          wrong: p.wrong
        })),
        currentRound: room.currentRound,
        totalRounds: room.totalRounds
      };
    }
  }

  submitDualAnswer(roomId, userId, answer) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: '房间不存在' };
    if (room.status !== 'playing') return { success: false, error: '游戏未开始或已结束' };
    if (room.mode !== 'dual') return { success: false, error: '不是双人模式' };

    const player = room.players.find(p => String(p.id) === String(userId));
    if (!player) return { success: false, error: '玩家不在此房间' };
    if (player.answered) return { success: false, error: '已回答过本题' };

    const isCorrect = answersMatch(answer, room.question.answer);

    player.answered = true;
    player.answer = answer;
    player.isCorrect = isCorrect;

    if (isCorrect) {
      player.correct++;
    } else {
      player.wrong++;
      room.wrongQuestions.push({
        userId: player.id,
        question: room.question.question,
        answer: room.question.answer,
        userAnswer: answer,
        fullPoem: room.question.full_poem,
        author: room.question.author,
        title: room.question.title,
        source: 'battle'
      });
    }

    const allAnswered = room.players.every(p => p.answered);
    if (allAnswered) {
      return { success: true, bothAnswered: true, question: room.question };
    }
    return { success: true, bothAnswered: false, question: room.question };
  }

  handleDualTimeout(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return null;
    if (room.mode !== 'dual') return null;

    const player = room.players.find(p => String(p.id) === String(userId));
    if (!player || player.answered) return null;

    player.answered = true;
    player.answer = '__TIMEOUT__';
    player.isCorrect = false;
    player.wrong++;
    room.wrongQuestions.push({
      userId: player.id,
      question: room.question.question,
      answer: room.question.answer,
      userAnswer: '(超时)',
      fullPoem: room.question.full_poem,
      author: room.question.author,
      title: room.question.title,
      source: 'battle'
    });

    const allAnswered = room.players.every(p => p.answered);
    if (allAnswered) {
      return { bothAnswered: true, question: room.question };
    }
    return { bothAnswered: false };
  }

  async advanceDualRound(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.status !== 'playing') return null;

    const nextRound = room.currentRound + 1;

    if (nextRound > room.totalRounds) {
      return this.endDualGame(room);
    }

    const question = await this.generateQuestion(room.usedQuestionKeys, nextRound);

    room.players.forEach(p => {
      p.answered = false;
      p.answer = null;
      p.isCorrect = null;
    });

    room.currentRound = nextRound;
    room.question = { ...question, round: nextRound };
    room.usedQuestionKeys.push(this.getQuestionKey(question));
    room.questionStartTime = Date.now();

    return {
      success: true,
      question: room.question,
      currentRound: room.currentRound,
      players: room.players.map(p => ({
        id: p.id,
        username: p.username,
        correct: p.correct,
        wrong: p.wrong
      }))
    };
  }

  endDualGame(room, quitterId = null) {
    room.status = 'finished';
    room.endedAt = Date.now();

    room.players.forEach(p => {
      this.setUserInGame(p.id, false);
    });

    const p1 = room.players[0];
    const p2 = room.players[1];

    let winner = null;
    let loser = null;
    let reason = 'completed';

    if (quitterId != null) {
      const quitter = room.players.find(p => String(p.id) === String(quitterId));
      const opponent = room.players.find(p => String(p.id) !== String(quitterId));
      winner = opponent ? { id: opponent.id, username: opponent.username, correct: opponent.correct } : null;
      loser = quitter ? { id: quitter.id, username: quitter.username, correct: quitter.correct } : null;
      reason = 'quit';
    } else if (p1.correct > p2.correct) {
      winner = { id: p1.id, username: p1.username, correct: p1.correct };
      loser = { id: p2.id, username: p2.username, correct: p2.correct };
    } else if (p2.correct > p1.correct) {
      winner = { id: p2.id, username: p2.username, correct: p2.correct };
      loser = { id: p1.id, username: p1.username, correct: p1.correct };
    } else {
      winner = { id: p1.id, username: p1.username, correct: p1.correct, tie: true };
      loser = { id: p2.id, username: p2.username, correct: p2.correct, tie: true };
    }

    this._saveDualBattleRecord(room, winner, loser);

    return {
      success: true,
      type: 'finished',
      reason,
      totalRounds: room.currentRound,
      players: room.players.map(p => ({
        id: p.id,
        username: p.username,
        correct: p.correct,
        wrong: p.wrong
      })),
      wrongQuestions: room.wrongQuestions || [],
      winner,
      loser
    };
  }

  async _saveDualBattleRecord(room, winner, loser) {
    try {
      await db.query(
        `INSERT INTO challenge_battles (player1_id, player2_id, winner_id, loser_id, total_questions, player1_correct, player2_correct, total_rounds, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          room.players[0].id,
          room.players[1].id,
          winner.tie ? null : winner.id,
          loser.tie ? null : loser.id,
          room.currentRound,
          room.players[0].correct,
          room.players[1].correct,
          room.currentRound,
          room.createdAt,
          room.endedAt || Date.now()
        ]
      );

    } catch (err) {
      console.error('[ChallengeBattle] 保存双人对战记录失败:', err.message);
    }
    try {
      await this._saveWrongQuestions(room.wrongQuestions || []);
    } catch (err) {
      console.error('[ChallengeBattle] 保存双人错题失败:', err.message);
    }
  }

  quitDualGame(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing' || room.mode !== 'dual') return null;
    const quitter = room.players.find(p => String(p.id) === String(userId));
    if (!quitter) return null;
    return this.endDualGame(room, userId);
  }

  async _saveWrongQuestions(wrongQuestions) {
    for (const wq of wrongQuestions) {
      const existing = await db.get(
        'SELECT id FROM wrong_questions WHERE user_id = $1 AND question = $2',
        [wq.userId, wq.question]
      );
      if (existing) {
        await db.run(
          `UPDATE wrong_questions
           SET user_answer = $1, wrong_count = COALESCE(wrong_count, 1) + 1,
               last_wrong_time = CURRENT_TIMESTAMP, mastered = 0, correct_streak = 0,
               review_count = 0, interval_days = 1, next_review = CURRENT_DATE,
               full_poem = COALESCE($2, full_poem), author = COALESCE($3, author),
               title = COALESCE($4, title), source = COALESCE($5, source)
           WHERE id = $6`,
          [wq.userAnswer || '', wq.fullPoem || null, wq.author || null, wq.title || null, wq.source || 'battle', existing.id]
        );
      } else {
        await db.run(
          `INSERT INTO wrong_questions
           (user_id, question, answer, user_answer, level, full_poem, author, title,
            wrong_count, last_wrong_time, correct_streak, review_count, interval_days, next_review, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, CURRENT_TIMESTAMP, 0, 0, 1, CURRENT_DATE, $9)`,
          [wq.userId, wq.question, wq.answer, wq.userAnswer || '', 1, wq.fullPoem || '', wq.author || '', wq.title || '', wq.source || 'battle']
        );
      }
    }
  }

  // ==============================================================
  // 邀请对战模式（轮流答题）
  // ==============================================================
  async _createDualRoomInvite(player1, player2) {
    const roomId = uuidv4();
    const questions = await this.generateQuestionBatch(30, [], 1);

    const room = {
      id: roomId,
      mode: 'dual-invite',
      players: [
        { id: String(player1.userId), username: player1.username, socketId: player1.socketId, correctAnswers: 0, wrongAnswers: 0 },
        { id: String(player2.userId), username: player2.username, socketId: player2.socketId, correctAnswers: 0, wrongAnswers: 0 }
      ],
      status: 'playing',
      questions,
      wrongQuestions: [],
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      timeLimit: 30,
      questionStartedAt: Date.now(),
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    console.log('[ChallengeBattleService] 创建邀请对战房间:', roomId, '玩家:', player1.username, 'vs', player2.username);
    return room;
  }

  // 提交答案（邀请对战）
  submitDualInviteAnswer(roomId, userId, answer) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: '房间不存在' };
    if (room.status !== 'playing') return { success: false, error: '游戏未开始或已结束' };
    if (room.mode !== 'dual-invite') return { success: false, error: '不是邀请对战模式' };

    const playerIndex = room.players.findIndex(p => String(p.id) === String(userId));
    if (playerIndex === -1) return { success: false, error: '玩家不在此房间' };

    // 计算当前应该是哪个玩家答题
    // 偶数题索引(0,2,4...) -> 玩家0答题
    // 奇数题索引(1,3,5...) -> 玩家1答题
    const expectedPlayerIndex = room.currentQuestionIndex % 2;
    if (playerIndex !== expectedPlayerIndex) {
      return { success: false, error: '当前不是你的答题回合' };
    }

    const currentQuestionIndex = room.currentQuestionIndex;
    const currentQuestion = room.questions[currentQuestionIndex];
    if (!currentQuestion || currentQuestionIndex < 0 || currentQuestionIndex >= room.totalQuestions) {
      room.currentQuestionIndex = room.totalQuestions;
      return this._endDualInviteGame(room, null, 'completed');
    }
    const isCorrect = answersMatch(answer, currentQuestion.answer);

    console.log('[ChallengeBattle] 答案判定:', {
      userId, playerIndex, questionIndex: currentQuestionIndex,
      expectedPlayer: expectedPlayerIndex,
      userAnswer: answer,
      correctAnswer: currentQuestion.answer,
      match: isCorrect
    });

    if (isCorrect) {
      room.players[playerIndex].correctAnswers++;

      // 检查是否30题全部答完
      if (currentQuestionIndex >= room.totalQuestions - 1) {
        return this._endDualInviteGame(room, null, 'completed');
      }

      // 还有下一题，更新索引
      room.currentQuestionIndex = currentQuestionIndex + 1;

      return {
        success: true,
        type: 'continue',
        isCorrect: true,
        correctAnswer: currentQuestion.answer,
        currentQuestionIndex: currentQuestionIndex,
        nextQuestionIndex: room.currentQuestionIndex,
        nextTurn: room.currentQuestionIndex % 2,
        players: room.players.map(p => ({ id: p.id, username: p.username, correctAnswers: p.correctAnswers, wrongAnswers: p.wrongAnswers }))
      };
    } else {
      // 答错，立即判负
      room.players[playerIndex].wrongAnswers++;
      room.wrongQuestions.push({
        userId: room.players[playerIndex].id,
        question: currentQuestion.question,
        answer: currentQuestion.answer,
        userAnswer: answer,
        fullPoem: currentQuestion.full_poem,
        author: currentQuestion.author,
        title: currentQuestion.title,
        source: 'battle'
      });
      return this._endDualInviteGame(room, room.players[playerIndex], 'wrong');
    }
  }

  // 进入下一题（答对后调用）
  advanceDualInviteQuestion(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.status !== 'playing') return null;
    if (room.mode !== 'dual-invite') return null;

    // 如果已经超过最后一题，游戏结束
    if (room.currentQuestionIndex >= room.totalQuestions) {
      return this._endDualInviteGame(room, null, 'completed');
    }

    const currentQuestion = room.questions[room.currentQuestionIndex];
    if (!currentQuestion) {
      room.currentQuestionIndex = room.totalQuestions;
      return this._endDualInviteGame(room, null, 'completed');
    }
    room.questionStartedAt = Date.now();
    const currentTurn = room.currentQuestionIndex % 2;

    return {
      success: true,
      currentQuestion,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.totalQuestions,
      currentTurn,
      players: room.players.map(p => ({ id: p.id, username: p.username, correctAnswers: p.correctAnswers, wrongAnswers: p.wrongAnswers }))
    };
  }

  // 超时判负
  handleDualInviteTimeout(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return null;
    if (room.mode !== 'dual-invite') return null;

    const playerIndex = room.players.findIndex(p => String(p.id) === String(userId));
    if (playerIndex === -1) return null;

    const expectedPlayerIndex = room.currentQuestionIndex % 2;
    if (playerIndex !== expectedPlayerIndex) return null;

    const currentQuestion = room.questions[room.currentQuestionIndex];
    if (!currentQuestion || room.currentQuestionIndex >= room.totalQuestions) {
      room.currentQuestionIndex = room.totalQuestions;
      return this._endDualInviteGame(room, null, 'completed');
    }
    room.players[playerIndex].wrongAnswers++;
    if (currentQuestion) {
      room.wrongQuestions.push({
        userId: room.players[playerIndex].id,
        question: currentQuestion.question,
        answer: currentQuestion.answer,
        userAnswer: '(超时)',
        fullPoem: currentQuestion.full_poem,
        author: currentQuestion.author,
        title: currentQuestion.title,
        source: 'battle'
      });
    }
    return this._endDualInviteGame(room, room.players[playerIndex], 'timeout');
  }

  // 服务器端主动超时处理（计时器到期）
  handleDualInviteTimeoutByRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return null;
    if (room.mode !== 'dual-invite') return null;

    const playerIndex = room.currentQuestionIndex % 2;
    const currentQuestion = room.questions[room.currentQuestionIndex];
    if (!currentQuestion || room.currentQuestionIndex >= room.totalQuestions) {
      room.currentQuestionIndex = room.totalQuestions;
      return this._endDualInviteGame(room, null, 'completed');
    }
    room.players[playerIndex].wrongAnswers++;
    room.wrongQuestions.push({
      userId: room.players[playerIndex].id,
      question: currentQuestion.question,
      answer: currentQuestion.answer,
      userAnswer: '(超时)',
      fullPoem: currentQuestion.full_poem,
      author: currentQuestion.author,
      title: currentQuestion.title,
      source: 'battle'
    });
    return this._endDualInviteGame(room, room.players[playerIndex], 'timeout');
  }

  // 退出游戏
  quitDualInviteGame(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return null;
    if (room.mode !== 'dual-invite') return null;

    const playerIndex = room.players.findIndex(p => String(p.id) === String(userId));
    if (playerIndex === -1) return null;

    return this._endDualInviteGame(room, room.players[playerIndex], 'quit');
  }

  // 结束游戏
  _endDualInviteGame(room, loser, reason) {
    room.status = 'finished';
    room.endedAt = Date.now();

    // 更新用户状态
    room.players.forEach(p => {
      this.setUserInGame(p.id, false);
    });

    const p1 = room.players[0];
    const p2 = room.players[1];

    let winner = null;
    let loserResult = null;

    if (loser) {
      const winnerPlayer = loser === p1 ? p2 : p1;
      winner = { id: winnerPlayer.id, username: winnerPlayer.username, correctAnswers: winnerPlayer.correctAnswers };
      loserResult = { id: loser.id, username: loser.username, correctAnswers: loser.correctAnswers, reason };
    } else {
      // 30题全部答完
      if (p1.correctAnswers > p2.correctAnswers) {
        winner = { id: p1.id, username: p1.username, correctAnswers: p1.correctAnswers };
        loserResult = { id: p2.id, username: p2.username, correctAnswers: p2.correctAnswers };
      } else if (p2.correctAnswers > p1.correctAnswers) {
        winner = { id: p2.id, username: p2.username, correctAnswers: p2.correctAnswers };
        loserResult = { id: p1.id, username: p1.username, correctAnswers: p1.correctAnswers };
      } else {
        winner = { id: p1.id, username: p1.username, correctAnswers: p1.correctAnswers, tie: true };
        loserResult = { id: p2.id, username: p2.username, correctAnswers: p2.correctAnswers, tie: true };
      }
    }

    this._saveDualInviteRecord(room, winner, loserResult);

    console.log('[ChallengeBattle] 游戏结束:', { winner: winner.username, loser: loserResult.username, reason });

    return {
      success: true,
      type: 'finished',
      reason,
      currentQuestionIndex: Math.min(room.currentQuestionIndex + 1, room.totalQuestions),
      totalQuestions: room.totalQuestions,
      players: room.players.map(p => ({ id: p.id, username: p.username, correctAnswers: p.correctAnswers, wrongAnswers: p.wrongAnswers })),
      wrongQuestions: room.wrongQuestions || [],
      winner,
      loser: loserResult
    };
  }

  async _saveDualInviteRecord(room, winner, loser) {
    try {
      await db.query(
        `INSERT INTO challenge_battles
         (player1_id, player2_id, winner_id, loser_id, total_questions, player1_correct, player2_correct, total_rounds, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          room.players[0].id,
          room.players[1].id,
          winner.tie ? null : winner.id,
          loser.tie ? null : loser.id,
          room.totalQuestions,
          room.players[0].correctAnswers,
          room.players[1].correctAnswers,
          Math.min(room.currentQuestionIndex + 1, room.totalQuestions),
          room.createdAt,
          room.endedAt || Date.now()
        ]
      );

    } catch (err) {
      console.error('[ChallengeBattle] 保存邀请对战记录失败:', err.message);
    }
    try {
      // 邀请对战的答错/超时题目也写入统一错题本；按用户+题干幂等更新。
      await this._saveWrongQuestions(room.wrongQuestions || []);
    } catch (err) {
      console.error('[ChallengeBattle] 保存邀请对战错题失败:', err.message);
    }
  }
}

module.exports = new ChallengeBattleService();
