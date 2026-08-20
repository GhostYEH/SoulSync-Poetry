const assert = require('assert/strict');
const service = require('../src/services/challengeBattleService');

async function main() {
  const originalGenerate = service.generateQuestion;
  service.rooms.clear();
  service.matchmakingQueue = [];
  service.onlineUsers.clear();
  service.generateQuestion = async () => ({
    question: '床前明月光，____。', answer: '疑是地上霜', title: '静夜思', author: '李白', full_poem: '床前明月光，疑是地上霜。'
  });

  try {
    const single = await service.startSingleGame('owner', '房主');
    assert.equal(service.submitSingleAnswer(single.id, 'other', '疑是地上霜').success, false, 'other users cannot answer a single-player room');
    assert.equal(service.submitSingleAnswer(single.id, 'owner', '疑是地上霜').success, true);
    assert.equal(service.submitSingleAnswer(single.id, 'owner', '疑是地上霜').success, false, 'the same question cannot be answered twice');

    await service.nextSingleQuestion(single.id, 'owner');
    service.getRoom(single.id).questionStartedAt = Date.now() - 31_000;
    const timedOut = service.submitSingleAnswer(single.id, 'owner', '疑是地上霜');
    assert.equal(timedOut.timeout, true, 'server rejects late answers');

    service.addUser('p1', '甲', 'socket-1');
    service.addUser('p2', '乙', 'socket-2');
    assert.equal(await service.addToMatchmaking('p1', '甲', 'socket-1'), null);
    const room = await service.addToMatchmaking('p2', '乙', 'socket-2');
    assert.equal(room.mode, 'dual', 'matchmaking resolves to a real room, not a Promise');
    assert.equal(room.status, 'playing');
    assert.equal(service.getUser('p1').inGame, true);
    assert.equal(service.getUser('p2').inGame, true);

    console.log('game mechanics tests passed');
  } finally {
    service.generateQuestion = originalGenerate;
    service.rooms.clear();
    service.matchmakingQueue = [];
    service.onlineUsers.clear();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
