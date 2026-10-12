import test from 'node:test';
import assert from 'node:assert/strict';
import { displayAdPlacement } from './display-ads';
test('ads only on approved public utility surfaces, never on readings or accounts', () => {
 for (const p of ['/', '/en', '/licham', '/en/lunar-calendar']) assert.ok(displayAdPlacement(p));
 for (const p of ['/admin', '/hoso', '/en/profile', '/tarot', '/tuvi', '/en/tarot', '/banggia', '/dieukhoan', '/unknown']) assert.equal(displayAdPlacement(p), null);
});
