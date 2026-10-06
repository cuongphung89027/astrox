const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const dependencies = process.env.ASTROX_DEPS_ROOT || path.resolve(__dirname, '../../web');
const Ajv = require(require.resolve('ajv', { paths: [dependencies] }));
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const input = read('example-input.json');
const report = read('example-report.json');
const validate = new Ajv({ allErrors: true }).compile(read('report.schema.json'));
const clone = value => JSON.parse(JSON.stringify(value));

function check(value) {
  assert.ok(validate(value), JSON.stringify(validate.errors));
  for (const key of ['schemaVersion', 'module', 'serviceId', 'locale']) assert.equal(value[key], input.request[key]);
  const facts = new Set(input.trustedFacts.map(fact => fact.id));
  assert.deepEqual(value.chapters.map(chapter => chapter.id), input.chapterPlan.map(chapter => chapter.id));
  const ids = new Set();
  value.chapters.forEach((chapter, index) => {
    assert.equal(chapter.visual.kind, input.chapterPlan[index].visualKind);
    chapter.visual.factIds.forEach(id => assert.ok(facts.has(id), 'Foreign visual fact'));
    const axes = new Set();
    for (const signal of chapter.visual.signals || []) {
      assert.ok(!axes.has(signal.axisId), 'Repeated axis'); axes.add(signal.axisId);
      assert.ok((input.chapterPlan[index].allowedAxes || []).some(axis => axis.id === signal.axisId), 'Foreign axis');
      assert.ok(chapter.insights.some(insight => insight.id === signal.insightId), 'Foreign signal insight');
    }
    chapter.insights.forEach(insight => {
      assert.ok(!ids.has(insight.id), 'Repeated insight id'); ids.add(insight.id);
      insight.sourceFactIds.forEach(id => assert.ok(facts.has(id), 'Foreign insight fact'));
      for (const key of ['label', 'summary', 'detail', 'rationale', 'action']) assert.ok(!/[<>]/.test(insight[key]), 'Markup in display text');
    });
  });
  const display = value.title + ' ' + value.summary + ' ' + value.chapters.map(chapter => chapter.title + ' ' + chapter.summary + ' ' + chapter.insights.map(insight => [insight.label, insight.summary, insight.detail, insight.rationale, insight.action].join(' ')).join(' ')).join(' ');
  const wordCount = display.trim().split(/\s+/).length;
  assert.ok(wordCount >= 430 && wordCount <= 650, 'Fixture exceeds its length budget: ' + wordCount);
  return wordCount;
}

const words = check(report);
const cases = [
  ['unsupported visual', value => { value.chapters[0].visual.kind = 'arbitrary-html'; }],
  ['AI numeric chart value', value => { value.chapters[0].visual.percent = 97; }],
  ['numeric personality signal', value => { value.chapters[0].visual.signals[0].lean = 97; }],
  ['foreign axis', value => { value.chapters[0].visual.signals[0].axisId = 'unrequested-topic'; }],
  ['repeated axis', value => { value.chapters[0].visual.signals[1].axisId = value.chapters[0].visual.signals[0].axisId; }],
  ['foreign evidence', value => { value.chapters[0].insights[0].sourceFactIds = ['partner-private']; }],
  ['other leaf service', value => { value.serviceId = 'numerology--cycles'; }],
  ['wrong locale', value => { value.locale = 'en'; }],
  ['markup', value => { value.chapters[0].insights[0].detail = '<script>bad</script>'; }]
];
for (const [name, mutate] of cases) { const value = clone(report); mutate(value); assert.throws(() => check(value), name); }
const drafts = read('prompts/template-drafts.json');
assert.equal(drafts.length, 5);
for (const draft of drafts) {
  assert.ok(draft.id.startsWith(draft.module + '.'));
  assert.deepEqual(draft.variables, ['requestAndChapterPlan', 'trustedFacts', 'taskText']);
  const placeholders = [...new Set([...draft.template.matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1]))].sort();
  assert.deepEqual(placeholders, ['v0', 'v1', 'v2']);
}
console.log(JSON.stringify({ fixture: 'pass', schema: 'pass', semanticChecks: 'pass', words, rejectedCases: cases.map(([name]) => name), promptDrafts: drafts.length }, null, 2));
