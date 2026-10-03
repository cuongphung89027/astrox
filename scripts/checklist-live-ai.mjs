/** Explicit live diagnostic using synthetic data; no user wallets or config writes. */
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hydrateConfig } from '../services/admin/config.ts';
import { decrypt } from '../services/admin/crypto.mjs';
import { renderServicePrompt } from '../services/admin/prompt-engine.ts';
import { executeProviderChain } from '../services/admin/runtime.mjs';

if (!process.argv.includes('--run-live') || !process.env.ASTROX_QA_ENCRYPTION_FILE) {
  console.log(
    'Explicit diagnostic: ASTROX_QA_ENCRYPTION_FILE=<existing deployment secret file> node scripts/checklist-live-ai.mjs --run-live',
  );
  process.exit(1);
}
const root = fileURLToPath(new URL('../', import.meta.url));
function query(command) {
  const output = execFileSync(
    'wrangler',
    [
      'd1',
      'execute',
      'astrox-db',
      '--remote',
      '--config',
      'services/backend/wrangler.jsonc',
      '--command',
      command,
      '--json',
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const result = JSON.parse(output);
  if (!result.every(r => r.success)) throw new Error('Read-only diagnostic query failed');
  return result[0].results;
}
const published = query(
  'SELECT s.published_id,v.config FROM admin_state s JOIN admin_versions v ON s.published_id=v.id WHERE s.id=1',
)[0];
const config = hydrateConfig(JSON.parse(published.config));
const encryptionEnv = JSON.parse(readFileSync(process.env.ASTROX_QA_ENCRYPTION_FILE, 'utf8'));
const secrets = new Map();
async function secret(ref) {
  if (!secrets.has(ref)) {
    const row = query(`SELECT ciphertext FROM admin_secrets WHERE ref='${ref.replaceAll("'", "''")}'`)[0];
    secrets.set(ref, row ? await decrypt(encryptionEnv, ref, row.ciphertext) : null);
  }
  return secrets.get(ref);
}
// Keep the configured endpoint/model chain; cap diagnostic output and retries.
for (const provider of config.ai.providers) {
  for (const route of [provider, ...(provider.models || [])]) {
    route.maxTokens = Math.min(route.maxTokens, 2200);
    route.retries = 0;
    route.timeoutMs = Math.min(route.timeoutMs, 90000);
  }
}
config.ai.maxAttempts = Math.min(config.ai.maxAttempts, 2);
const allowHosts = [...new Set(config.ai.providers.map(p => new URL(p.baseUrl).hostname))];
const serviceId = 'tuvi--tim-hieu-ban-than--tinh-cach';
const chart = JSON.stringify({
  synthetic: true,
  palaces: [
    {
      name: 'Mệnh',
      majorStars: [{ name: 'Tử Vi', brightness: 'Miếu' }],
      minorStars: [{ name: 'Kình Dương' }],
      adjectiveStars: [],
    },
    {
      name: 'Quan Lộc',
      majorStars: [{ name: 'Thiên Cơ', mutagen: 'Kỵ' }],
      minorStars: [{ name: 'Hỏa Tinh' }],
      adjectiveStars: [],
    },
    {
      name: 'Tài Bạch',
      majorStars: [{ name: 'Thiên Phủ', brightness: 'Vượng' }],
      minorStars: [{ name: 'Lộc Tồn' }, { name: 'Địa Kiếp' }],
      adjectiveStars: [],
    },
  ],
});
const results = [];
for (const locale of ['vi', 'en']) {
  const settings = locale === 'en' ? config.promptsEn : config.prompts;
  const prompt = renderServicePrompt(
    {
      id: 'tuvi.tuviPromptBody.0',
      values: [
        locale === 'vi' ? 'Hồ sơ kiểm thử tổng hợp, không thuộc người thật.' : 'Synthetic QA profile, no real person.',
        chart,
        locale === 'vi'
          ? 'Phân tích tính cách và khuynh hướng từ các cung được cung cấp, khoảng 350-500 từ.'
          : 'Analyze personality and tendencies using the supplied palaces, about 350-500 words.',
      ],
    },
    serviceId,
    settings,
    { locale },
  );
  try {
    const output = await executeProviderChain(
      config,
      { serviceId, locale, messages: [{ role: 'user', content: prompt }] },
      secret,
      { allowHosts },
    );
    const text = output.choices[0].message.content;
    results.push({ locale, ok: true, prompt, text, model: output.model, attempts: output.attempts });
    console.log(JSON.stringify({ locale, ok: true, outputCharacters: text.length, model: output.model }));
  } catch (error) {
    results.push({ locale, ok: false, code: error.code || 'DIAGNOSTIC_FAILED', attempts: error.attempts });
    console.log(JSON.stringify({ locale, ok: false, code: error.code || 'DIAGNOSTIC_FAILED' }));
  }
}
secrets.clear();
const directory = new URL('../qa-report/2026-10-03-checklist-closure/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(
  new URL('live-ai.json', directory),
  JSON.stringify(
    {
      publishedRevision: published.published_id,
      scope:
        'Real configured provider chain with synthetic chart, new runtime policy and published Admin settings; no authenticated wallet/API claim.',
      results,
    },
    null,
    2,
  ),
);
if (results.some(r => !r.ok)) process.exitCode = 1;
