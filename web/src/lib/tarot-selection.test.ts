import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTarotSelection, selectionTour, tarotSelectionService, requestTarotSelection } from './tarot-selection';

test('a chosen frame stays attached to its service regardless of translated labels', () => {
  for (const frameId of ['ppf', 'sao', 'soa'])
    assert.equal(tarotSelectionService('three', frameId), `tarot--three--${frameId}`);
  assert.equal(tarotSelectionService('celtic10'), 'tarot--celtic10');
  assert.throws(() => tarotSelectionService('three', 'not-a-frame'));
});
test('selection response cannot silently fall back from invalid spread/frame to three cards', () => {
  assert.equal(
    parseTarotSelection({
      status: 'selected',
      spreadId: 'three',
      frameId: 'soa',
      source: 'jev',
      reasonCode: 'obstacle',
    }).frameId,
    'soa',
  );
  for (const value of [
    null,
    { status: 'selected', spreadId: 'three', frameId: 'bad' },
    { status: 'selected', spreadId: 'bad' },
  ])
    assert.throws(() => parseTarotSelection(value));
  assert.equal(parseTarotSelection({ status: 'needs_context', source: 'jev' }).status, 'needs_context');
});
test('every light tour ends at the predetermined choice and has bounded nonflashing steps', () => {
  for (let from = 0; from < 5; from++)
    for (let to = 0; to < 5; to++) {
      const steps = selectionTour(from, to);
      assert.equal(steps.at(-1)?.index, to);
      assert.ok(steps.reduce((sum, step) => sum + step.delay, 0) <= 2200);
      assert.ok(steps.every(s => s.delay >= 130));
    }
});
test('HTTP failure and cancellation never become a successful selection', async () => {
  await assert.rejects(
    () =>
      requestTarotSelection(
        { question: 'Test', context: '', locale: 'vi' },
        new AbortController().signal,
        async () => new Response('', { status: 429 }),
      ),
    /rate_limited/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => requestTarotSelection({ question: 'Test', context: '', locale: 'vi' }, controller.signal));
});
