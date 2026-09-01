const test = require('node:test');
const assert = require('node:assert/strict');
const { createImageGenerationCoordinator } = require('./imageGenerationCoordinator');

test('concurrent callers share one generation and receive the same URL', async () => {
  const coordinator = createImageGenerationCoordinator();
  let calls = 0;
  const generate = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return '/generated-images/test.png';
  };

  const [first, second] = await Promise.all([
    coordinator.getOrGenerate('poem-1', generate),
    coordinator.getOrGenerate('poem-1', generate)
  ]);

  assert.equal(calls, 1);
  assert.equal(first, '/generated-images/test.png');
  assert.equal(second, first);
  assert.equal(coordinator.getCached('poem-1'), first);
});

test('a failed generation is not cached and can be retried', async () => {
  const coordinator = createImageGenerationCoordinator();
  let calls = 0;
  const generate = async () => {
    calls += 1;
    if (calls === 1) throw new Error('temporary failure');
    return '/generated-images/retry.png';
  };

  await assert.rejects(coordinator.getOrGenerate('poem-2', generate), /temporary failure/);
  assert.equal(coordinator.getCached('poem-2'), null);
  assert.equal(coordinator.hasInFlight('poem-2'), false);

  const url = await coordinator.getOrGenerate('poem-2', generate);
  assert.equal(url, '/generated-images/retry.png');
  assert.equal(calls, 2);
});
