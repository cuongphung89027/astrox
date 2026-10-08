import test from 'node:test';
import assert from 'node:assert/strict';
import { keyboardOccludes } from './keyboard-viewport';
test('hide dock only for editable focus plus meaningful keyboard occlusion, not pinch zoom', () => {
  const base = { editable: true, baseline: 844, visible: 520, scale: 1 };
  assert.equal(keyboardOccludes(base), true);
  assert.equal(keyboardOccludes({ ...base, editable: false }), false);
  assert.equal(keyboardOccludes({ ...base, scale: 2 }), false);
  assert.equal(keyboardOccludes({ ...base, visible: 820 }), false);
  assert.equal(keyboardOccludes({ ...base, visible: 844 }), false);
});
