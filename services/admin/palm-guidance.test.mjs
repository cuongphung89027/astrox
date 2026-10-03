import test from 'node:test';
import assert from 'node:assert/strict';
import { renderServicePrompt, defaultPromptSettings } from './prompt-engine.ts';
import { defaultEnglishPromptSettings } from './english-prompts.ts';
test('published old palm prompt receives observation and uncertainty runtime contract', () => {
  const settings = defaultPromptSettings();
  settings.templates['palm.read.v1'] = 'Old prompt';
  const rendered = renderServicePrompt({ id: 'palm.read.v1', values: ['L', 'R', 'Q'] }, 'palm', settings);
  assert.match(rendered, /visibility/);
  assert.match(rendered, /uncertainty/);
  assert.match(rendered, /Quan sát|quan sát/);
});
test('managed follow-up is available in both locales with no image required', () => {
  const node = { id: 'palm.followup.v1', values: ['{}', 'Q'] };
  assert.match(renderServicePrompt(node, 'palm', defaultPromptSettings()), /answer/);
  const settings = defaultPromptSettings();
  settings.templates = defaultEnglishPromptSettings().templates;
  assert.match(renderServicePrompt(node, 'palm', settings, { locale: 'en' }), /answer/);
  assert.throws(() => renderServicePrompt(node, 'tarot', settings));
});
