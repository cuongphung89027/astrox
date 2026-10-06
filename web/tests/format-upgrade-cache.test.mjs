import test from 'node:test';
import assert from 'node:assert/strict';
import { load, memoryStorage } from './support/load.mjs';
import { original, serviceId, fixture } from './support/visual-fixtures.mjs';
import { wrapVisualPrompt, visualInput, saveVisualReading } from '../../services/admin/visual-reading.ts';

const revision = 14;
const languagePolicy = 'astrox.language.v1';
const oldText = 'Bản luận giải đã mở: chủ đạo 5, bài học 14. Giữ nguyên toàn văn và căn cứ gốc.';

async function cacheFixture(locale = 'vi', data = new Map()) {
  const state = await load('lib/state.ts', {
    globals: {
      window: { location: { pathname: locale === 'en' ? '/en/numerology' : '/thansohoc' } },
      localStorage: memoryStorage(data),
    },
  });
  state.getState();
  state.setState({ profile: { name: 'An', dob: '2001-03-08', gender: 'Nam', hourChi: 'Tý', place: 'Hà Nội' } });
  state.setPromptRevision(revision);
  return { state, data };
}

function stampResult(state, text) {
  state.recordPromptResult(text, revision);
  state.recordLanguageResult(text, languagePolicy);
}

function bucketFor(state, group = 'numerologyTopics') {
  const cache = state.getState().aiCache.profiles[state.cacheFingerprint()];
  return group === 'tuviPeriod.week' ? cache.tuviPeriod.week : cache[group];
}

function visualFixture(locale = 'vi') {
  const input = visualInput(wrapVisualPrompt(original, serviceId, locale), serviceId, locale);
  return { input, text: saveVisualReading(JSON.stringify(fixture(input)), input) };
}

for (const locale of ['vi', 'en']) {
  test(`format upgrade preserves the original ${locale} reading at the same revision and language policy, including after reload`, async () => {
    const { state, data } = await cacheFixture(locale);
    stampResult(state, oldText);
    state.writeAiCache('numerologyTopics', 'life-path', oldText, { module: 'numerology', topic: 'life-path' });
    const activeKey = state.localeCacheKey(locale, 'life-path');
    const previous = structuredClone(bucketFor(state)[activeKey]);
    const { text } = visualFixture(locale);
    stampResult(state, text);

    state.writeAiCache('numerologyTopics', 'life-path', text, {
      module: 'numerology',
      topic: 'life-path',
      formatUpgrade: true,
    });

    assert.equal(state.readAiCache('numerologyTopics', 'life-path'), text, 'the visual report becomes active');
    const history = Object.entries(bucketFor(state)).filter(([key]) => key.startsWith(`${activeKey}::history::`));
    assert.equal(history.length, 1, 'same-revision conversion keeps one readable original');
    assert.deepEqual(history[0][1], previous, 'old text, model, timestamps and provenance remain intact');
    const restored = (await cacheFixture(locale, data)).state;
    assert.equal(restored.readAiCache('numerologyTopics', history[0][0].replace(/^en::/, '')), oldText);
    assert.equal(restored.readAiCache('numerologyTopics', 'life-path'), text);
  });
}

test('a rejected visual conversion does not replace or archive the already opened reading', async () => {
  const { state, data } = await cacheFixture();
  stampResult(state, oldText);
  state.writeAiCache('numerologyTopics', 'life-path', oldText);
  const previous = structuredClone(bucketFor(state));
  const { input } = visualFixture();

  assert.throws(() => {
    const rejected = saveVisualReading('This provider response is not a visual report.', input);
    state.writeAiCache('numerologyTopics', 'life-path', rejected, { formatUpgrade: true });
  }, /VISUAL_READING_INVALID/);

  assert.deepEqual(bucketFor(state), previous, 'validation failure makes no cache write');
  assert.equal(state.readAiCache('numerologyTopics', 'life-path'), oldText);
  assert.equal((await cacheFixture('vi', data)).state.readAiCache('numerologyTopics', 'life-path'), oldText);
});

test('a repeatable period format upgrade keeps the earlier result while activating the new one', async () => {
  const { state, data } = await cacheFixture();
  const key = '2026-W41';
  const earlier = 'Vận trình tuần đã mở: ưu tiên hoàn thiện công việc đang dở và giữ nhịp nghỉ ngơi.';
  const upgraded = 'Vận trình tuần theo cấu trúc mới: nhịp tuần, cơ hội, điểm cần cân bằng và hành động.';
  stampResult(state, earlier);
  state.writeAiCache('tuviPeriod.week', key, earlier, { module: 'tuvi', period: 'week' });
  const previous = structuredClone(bucketFor(state, 'tuviPeriod.week')[key]);
  stampResult(state, upgraded);

  state.writeAiCache('tuviPeriod.week', key, upgraded, {
    module: 'tuvi',
    period: 'week',
    formatUpgrade: true,
  });

  assert.equal(state.readAiCache('tuviPeriod.week', key), upgraded);
  assert.equal(state.readAiCache('tuviPeriod.week', key, true), '', 'repeatable force semantics still apply');
  const history = Object.entries(bucketFor(state, 'tuviPeriod.week')).filter(([entryKey]) =>
    entryKey.startsWith(`${key}::history::`),
  );
  assert.equal(history.length, 1, 'period conversion also preserves the original at the same revision');
  assert.deepEqual(history[0][1], previous);
  const restored = (await cacheFixture('vi', data)).state;
  assert.equal(restored.readAiCache('tuviPeriod.week', history[0][0]), earlier);
  assert.equal(restored.readAiCache('tuviPeriod.week', key), upgraded);
});

test('an ordinary same-revision repeatable refresh does not opt into format-upgrade history', async () => {
  const { state } = await cacheFixture();
  stampResult(state, 'Earlier forecast');
  state.writeAiCache('tuviPeriod.week', '2026-W41', 'Earlier forecast');
  stampResult(state, 'Refreshed forecast');
  state.writeAiCache('tuviPeriod.week', '2026-W41', 'Refreshed forecast');

  assert.equal(state.readAiCache('tuviPeriod.week', '2026-W41'), 'Refreshed forecast');
  assert.equal(
    Object.keys(bucketFor(state, 'tuviPeriod.week')).length,
    1,
    'the new preservation behavior is explicitly opt-in',
  );
});
