import test from 'node:test';
import assert from 'node:assert/strict';
import { load as l, hookRuntime, nodes } from './support/load.mjs';
import { defaultConfig } from '../../services/admin/config.ts';
import { defaultEnglishPromptSettings } from '../../services/admin/english-prompts.ts';

test('P1-8: PromptsPanel US branch edits promptsEn only; Vietnamese set untouched', async () => {
  const runtime = hookRuntime();
  const config = defaultConfig();
  const viTemplatesSnapshot = structuredClone(config.prompts.templates);
  const viTasksSnapshot = structuredClone(config.prompts.tasks);
  const touched = [];
  const update = fn => {
    const draft = structuredClone(config);
    fn(draft);
    touched.push(draft);
  };
  const { PromptsPanel } = await l('components/admin/panels/PromptsPanel.tsx', {
    mocks: { react: runtime.react },
    globals: {},
  });
  const branchEl = PromptsPanel({ config, update, market: 'US' });
  assert.equal(branchEl.type?.name, 'PromptsPanelEn', 'US branch selected');
  const tree = branchEl.type(branchEl.props);
  assert.ok(nodes(tree).some(n => String(n.props?.children).includes('English prompts')), 'US branch renders');
  const anyTemplate = nodes(tree).find(n => n.type === 'textarea');
  assert.ok(anyTemplate, 'English template editor present');
  anyTemplate.props.onChange({ target: { value: 'EN EDIT' } });
  assert.equal(touched.length, 1);
  // The edit landed inside promptsEn (some template changed).
  const changedEn = Object.keys(touched[0].promptsEn.templates).find(
    k => touched[0].promptsEn.templates[k] === 'EN EDIT',
  );
  assert.ok(changedEn, 'edit went to promptsEn');
  assert.notEqual(changedEn, undefined);
  // Vietnamese prompts byte-identical.
  assert.deepEqual(touched[0].prompts.templates, viTemplatesSnapshot);
  assert.deepEqual(touched[0].prompts.tasks, viTasksSnapshot);
});

test('P1-8: ServicesPanel US branch is read-only — no update call, no edit buttons', async () => {
  const runtime = hookRuntime();
  const config = defaultConfig();
  config.promptsEn = defaultEnglishPromptSettings();
  let updates = 0;
  const update = () => {
    updates++;
  };
  const { ServicesPanel } = await l('components/admin/panels/ServicesPanel.tsx', {
    mocks: { react: runtime.react },
    globals: {},
  });
  const branchEl = ServicesPanel({ config, update, market: 'US' });
  assert.equal(branchEl.type?.name, 'UsServicesCoverage', 'US read-only branch selected');
  const tree = branchEl.type(branchEl.props);
  assert.ok(nodes(tree).some(n => String(n.props?.children).includes('US services')), 'US coverage view renders');
  assert.equal(nodes(tree).filter(n => n.type === 'button').length, 0, 'no edit affordances');
  assert.equal(updates, 0);
});
