import assert from 'node:assert/strict';
import { generateAttemptId } from '../src/utils/attemptId.js';

const first = generateAttemptId();
const second = generateAttemptId();
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

assert.match(first, uuidV4, 'attempt id must be an RFC4122 v4 UUID');
assert.match(second, uuidV4, 'attempt id must be an RFC4122 v4 UUID');
assert.notEqual(first, second, 'attempt ids must be unique');
console.log('attemptId tests passed');
