import test from 'node:test';
import assert from 'node:assert/strict';
import {pcRippleEnvelope} from '../src/scripts/pc-ripple.ts';

test('component pulse travels from nearby to distant lights and fully ends', () => {
  assert.equal(pcRippleEnvelope(.3, 0), 1);
  assert.equal(pcRippleEnvelope(.3, 1), 0);
  assert.equal(pcRippleEnvelope(1.6, 1), 1);
  assert.equal(pcRippleEnvelope(1.6, 0), 0);
  for (const distance of [0, .2, .5, 1]) {
    for (const age of [-1, 0, 2, 20, Infinity]) assert.equal(pcRippleEnvelope(age, distance), 0);
    for (let age = 0; age <= 2; age += .013) {
      const pulse = pcRippleEnvelope(age, distance);
      assert.ok(pulse >= 0 && pulse <= 1, 'pulse never exceeds the brightness envelope');
    }
  }
});
