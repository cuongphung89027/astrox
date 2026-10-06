import test from 'node:test';
import assert from 'node:assert/strict';
import { graph, memoryStorage } from './support/load.mjs';
import { fixture } from './support/visual-fixtures.mjs';
import { visualInput, saveVisualReading } from '../../services/admin/visual-reading.ts';
const serviceId = 'numerology--life-path';
async function scene({ eligible = true, free = false, recovered = false } = {}) {
  const calls = { consent: 0, ai: 0, quote: 0 },
    bodies = [];
  let descriptor;
  const result = () => {
    const input = visualInput(descriptor, serviceId, 'vi');
    return {
      choices: [{ message: { content: saveVisualReading(JSON.stringify(fixture(input)), input) } }],
      configRevision: 14,
      languagePolicyVersion: 'vi-reading-2',
      chargedPoints: 0,
    };
  };
  const load = graph({
    globals: {
      localStorage: memoryStorage(),
      document: { documentElement: { lang: 'vi' } },
      window: {
        location: { pathname: '/thansohoc' },
        dispatchEvent() {},
        addEventListener() {},
        removeEventListener() {},
      },
      fetch: async (url, opts = {}) => {
        const path = new URL(String(url), 'https://theastrox.space').pathname;
        if (path === '/api/market') return Response.json({ market: 'VN' });
        if (path === '/api/site-config')
          return Response.json({
            revision: 14,
            config: {
              billing: {
                unlocks: { enabled: false },
                services: [
                  { id: serviceId, name: 'Số Chủ Đạo', policy: 'profile', status: free ? 'free' : 'paid', points: 90 },
                ],
              },
            },
          });
        if (path === '/api/ai/session')
          return free ? Response.json({}, { status: 401 }) : Response.json({ token: 'test-token', userId: 'reader' });
        if (path === '/api/ai/upgrade') {
          calls.quote++;
          descriptor = JSON.parse(opts.body).promptDescriptor;
          return Response.json({
            available: eligible,
            points: 0,
            campaignId: 'visual-readings-2026-10',
            ...(recovered ? { result: result() } : {}),
          });
        }
        if (path === '/api/ai') {
          calls.ai++;
          const body = JSON.parse(opts.body);
          bodies.push(body);
          descriptor = body.promptDescriptor;
          return Response.json(result());
        }
        throw new Error('Unexpected request ' + path);
      },
    },
    mocks: {
      './config': { AI_BASE: '/api/ai', AUTH_API_BASE: 'https://api.theastrox.space', DEFAULT_MODEL: 'fixture' },
      './state': {
        getState: () => ({ profile: { name: 'An', gender: 'Nam', dob: '2001-03-08', hourChi: 'Tý', place: 'Hà Nội' } }),
        getAccountEpoch: () => 1,
        setState() {},
        setPromptRevision() {},
        recordPromptResult() {},
        recordLanguageResult() {},
      },
      './feature-telemetry': { trackFeature() {} },
      './reading-consent': {
        confirmReading: async () => {
          calls.consent++;
          throw new Error('Unexpected paid consent');
        },
      },
    },
  });
  const managed = await load('lib/managed-prompts.ts');
  const profile = managed.managedPrompt('numerology.profileContextText.0', ['An', 'Nam', '08/03/2001', 'Tý', 'Hà Nội']);
  const chart = managed.managedPrompt('numerology.numerologyContextText.0', [
    JSON.stringify({ lifePath: 5, destiny: 8, soulUrge: 3 }),
  ]);
  const prompt = managed.managedPrompt('numerology.numerologyPromptBody.0', [profile, chart, 'Phân tích Số Chủ Đạo']);
  return { api: await load('lib/api.ts'), prompt, calls, bodies };
}
test('an explicitly requested eligible format upgrade bypasses paid consent and sends the campaign', async () => {
  const { api, prompt, calls, bodies } = await scene();
  const text = await api.runAiPrompt(prompt, { serviceId, formatUpgrade: true });
  assert.ok(text.includes('astrox.saved-visual-reading.v1'));
  assert.equal(calls.consent, 0);
  assert.equal(calls.ai, 1);
  assert.equal(calls.quote, 1);
  assert.equal(bodies[0].upgradeCampaign, 'visual-readings-2026-10');
  assert.equal(bodies[0].expectedPoints, 0);
});
test('ineligible format conversion rejects without paid consent or an AI request', async () => {
  const { api, prompt, calls } = await scene({ eligible: false });
  await assert.rejects(api.runAiPrompt(prompt, { serviceId, formatUpgrade: true }), /nâng cấp miễn phí/);
  assert.equal(calls.consent, 0);
  assert.equal(calls.ai, 0);
});
test('a completed server upgrade can be recovered without repeating AI', async () => {
  const { api, prompt, calls } = await scene({ eligible: false, recovered: true });
  const text = await api.runAiPrompt(prompt, { serviceId, formatUpgrade: true });
  assert.ok(text.includes('astrox.saved-visual-reading.v1'));
  assert.equal(calls.consent, 0);
  assert.equal(calls.ai, 0);
});
test('an old anonymous reading in a currently free service converts without a paid grant', async () => {
  const { api, prompt, calls } = await scene({ free: true });
  const text = await api.runAiPrompt(prompt, { serviceId, formatUpgrade: true });
  assert.ok(text.includes('astrox.saved-visual-reading.v1'));
  assert.equal(calls.consent, 0);
  assert.equal(calls.ai, 1);
  assert.equal(calls.quote, 0);
});
