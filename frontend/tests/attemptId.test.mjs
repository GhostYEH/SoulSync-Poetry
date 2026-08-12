import { generateAttemptId } from '../src/utils/attemptId.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log('Testing attemptId utility...\n');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const id1 = generateAttemptId();
const id2 = generateAttemptId();
const id3 = generateAttemptId();

assert(typeof id1 === 'string', 'generateAttemptId returns a string');
assert(id1.length === 36, 'UUID has 36 characters');
assert(UUID_REGEX.test(id1), 'UUID matches RFC4122 v4 format');
assert(UUID_REGEX.test(id2), 'second UUID matches RFC4122 v4 format');
assert(id1 !== id2, 'two consecutive IDs are different');
assert(id1 !== id3 && id2 !== id3, 'three IDs are all unique');

const ids = new Set();
for (let i = 0; i < 1000; i++) ids.add(generateAttemptId());
assert(ids.size === 1000, '1000 generated IDs are all unique');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);