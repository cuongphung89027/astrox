import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePalmReading } from '../src/lib/palm.ts';
const reading = points => JSON.stringify({quality:'ok', message:'', summary:'Tổng quan', lines:[{name:'Tâm đạo', observation:'Nếp rõ', reading:'Góc nhìn', points}]});
test('missing geometry preserves a valid textual observation', () => {
 assert.equal(parsePalmReading(reading(undefined)).lines[0].observation, 'Nếp rõ');
 assert.deepEqual(parsePalmReading(reading(undefined)).lines[0].points, []);
});
test('bounded model coordinates are not evidence of verified creases', () => {
 assert.equal(parsePalmReading(reading([[.2,.3],[.4,.5]])).lines[0].overlayVerified, false);
});
test('out-of-bounds geometry is discarded without losing the reading', () => {
 assert.deepEqual(parsePalmReading(reading([[20,30],[40,50]])).lines[0].points, []);
});
