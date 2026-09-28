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
  assert.ok(
    nodes(tree).some(n => String(n.props?.children).includes('English prompts')),
    'US branch renders',
  );
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

test('P1-8: ServicesPanel US branch edits the usServices overlay only — shared VN config untouched', async () => {
  const runtime = hookRuntime();
  const config = defaultConfig();
  config.promptsEn = defaultEnglishPromptSettings();
  const sharedSnapshot = structuredClone(config.billing.services);
  const touched = [];
  const update = fn => {
    const draft = structuredClone(config);
    fn(draft);
    touched.push(draft);
  };
  const { ServicesPanel } = await l('components/admin/panels/ServicesPanel.tsx', {
    mocks: { react: runtime.react },
    globals: {},
  });
  const branchEl = ServicesPanel({ config, update, market: 'US' });
  assert.equal(branchEl.type?.name, 'ServicesEditor', 'same complete editor as VN');
  const tree = branchEl.type(branchEl.props);
  assert.ok(
    nodes(tree).some(n => n.props?.specs?.some(s => s[0] === 'enabled')),
    'unlock settings present',
  );
  // Edit a US price — the write goes to billing.usServices, never billing.services.
  const input = nodes(tree).find(n => n.props?.value?.id && n.props?.specs?.some(s => s[0] === 'points'));
  assert.ok(input, 'price input present');
  input.props.onChange('points', 42);
  assert.equal(touched.length, 1);
  assert.ok(touched[0].billing.usServices, 'overlay written');
  assert.deepEqual(touched[0].billing.services, sharedSnapshot, 'shared VN services byte-identical');
  assert.equal(touched[0].billing.usServices[input.props.value.id].points, 42);
  assert.deepEqual(touched[0].billing.unlocks, config.billing.unlocks);
  const settings = nodes(tree).find(n => n.props?.value?.bundles && n.props?.specs?.some(s => s[0] === 'enabled'));
  assert.ok(settings);
  settings.props.onChange('enabled', true);
  assert.equal(touched[1].billing.usUnlocks.enabled, true);
  assert.equal(touched[1].billing.unlocks.enabled, false);
});

test('US content editor changes announcements and notices without overwriting Vietnamese content', async () => {
  const config = defaultConfig(),
    touched = [];
  config.content.announcement = 'VI only';
  const { ContentPanel } = await l('components/admin/panels/ContentPanel.tsx');
  const branch = ContentPanel({
    market: 'US',
    config,
    renderFields() {},
    update: fn => {
      const d = structuredClone(config);
      fn(d);
      touched.push(d);
    },
  });
  branch.props.update(d => {
    d.content.announcement = 'US announcement';
    d.content.notices.push({
      id: 'us',
      title: 'Welcome',
      body: 'English',
      module: 'tarot',
      enabled: true,
      startsAt: '',
      endsAt: '',
    });
  });
  assert.equal(touched[0].content.announcement, 'VI only');
  assert.equal(touched[0].content.notices.length, 0);
  assert.equal(touched[0].contentUs.announcement, 'US announcement');
  assert.equal(touched[0].contentUs.notices.length, 1);
});
