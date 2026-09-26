import test from 'node:test';
import assert from 'node:assert/strict';
import { load, hookRuntime, nodes } from './support/load.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

const JPEG = 'data:image/jpeg;base64,QUJDREVG';
const READING = {
  quality: 'ok', message: '',
  summary: 'Bàn tay bạn cho thấy cách tiếp cận thực tế.',
  lines: [
    { name: 'Tâm đạo', observation: 'Đường tâm rõ, hơi cong.', reading: 'Bạn cảm nhận cảm xúc sâu nhưng giữ kín.', points: [] },
    { name: 'Đầu đạo', observation: 'Đường đầu dài và thẳng.', reading: 'Bạn xử lý vấn đề theo lối phân tích.', points: [] },
  ],
};
const PRICE = { pending: false, paid: true, points: 900, text: '900 Point' };

// --- tiny tree helpers; mock function components are expanded in place ---
function frames(node, ancestors = [], out = []) {
  if (node == null || typeof node === 'boolean') return out;
  if (Array.isArray(node)) { for (const child of node) frames(child, ancestors, out); return out; }
  if (typeof node !== 'object') { out.push({ text: String(node), ancestors }); return out; }
  out.push({ el: node, ancestors });
  const child = typeof node.type === 'function' ? node.type(node.props) : node.props?.children;
  return frames(child, ancestors.concat(node), out);
}
const textOf = el => frames(el.props?.children).filter(f => f.text !== undefined).map(f => f.text).join('');
const visibleText = tree => frames(tree).filter(f => f.text !== undefined).map(f => f.text).join('');
const els = (tree, pred) => frames(tree).filter(f => f.el && pred(f.el, f.ancestors));
function one(tree, label, pred) { const found = els(tree, pred); assert.equal(found.length, 1, `${label}: found ${found.length}`); return found[0]; }
function none(tree, label, pred) { assert.equal(els(tree, pred).length, 0, label); }
const insideCard = frame => frame.ancestors.some(a => a.props?.['data-glass'] === 'true');
const summaryOf = details => frames(details.el).find(f => f.el?.type === 'summary')?.el;

async function fixture() {
  const runtime = hookRuntime();
  const calls = { managed: [], price: [], ai: [], uploads: [] };
  const { PalmReader } = await load('components/discovery/PalmReader.tsx', {
    mocks: {
      react: runtime.react,
      '@/components/kit': {
        Btn: 'button',
        GlassCard: props => ({ type: 'div', props: { ...props, 'data-glass': 'true' } }),
      },
      '@/components/kit/PaidPriceBadge': {
        PaidPriceBadge: props => ({ type: 'data', props: { 'data-price-badge': String(props.price?.points ?? '') } }),
      },
      '@/lib/api': { callAiText: async args => { calls.ai.push(args); return JSON.stringify(READING); } },
      '@/lib/managed-prompts': { managedPrompt: (id, values) => { calls.managed.push([id, values]); return `prompt:${id}:${values.join('|')}`; } },
      '@/lib/palm-photo': { normalizePalmPhoto: async file => { calls.uploads.push(file); return { dataUrl: JPEG, width: 1200, height: 800 }; } },
      '@/lib/use-paid-price': { usePaidPrice: (serviceId, prompt) => { calls.price.push([serviceId, prompt]); return PRICE; } },
      '@/lib/palm-camera': { isWellLit: () => true },
      './PalmCamera': { PalmCamera: () => null },
      './PalmGuide': { PalmGuide: () => 'GUIDE', PalmIllustration: () => 'ART' },
    },
    globals: { Image: class { set src(_value) {} } },
  });
  let tree;
  const render = () => { runtime.reset(); tree = PalmReader(); return tree; };
  const checkbox = () => one(tree, 'consent checkbox', el => el.type === 'input' && el.props?.type === 'checkbox');
  const submitButton = () => one(tree, 'submit button', el => el.type === 'button' && el.props?.type === 'submit');
  const PHOTO = { name: 'palm.jpg', type: 'image/jpeg', size: 2048 };
  return {
    calls, render, tree: () => tree, PHOTO, runtime, checkbox, submitButton,
    async upload() {
      one(tree, 'upload input', el => el.type === 'input' && el.props?.type === 'file' && String(el.props?.accept).includes('image/jpeg'))
        .el.props.onChange({ target: { files: [PHOTO], value: '' } });
      await tick(); render();
    },
    async submit() {
      one(tree, 'form', el => el.type === 'form').el.props.onSubmit({ preventDefault() {} });
      await tick(); await tick(); render();
    },
  };
}

test('initial view: one h1 Chỉ tay, one card with art and two actions, one folded guide, no marketing', async () => {
  const f = await fixture(); f.render(); f.runtime.flushEffects();
  const tree = f.tree();
  const h1 = one(tree, 'h1', el => el.type === 'h1');
  assert.equal(textOf(h1.el).trim(), 'Chỉ tay');
  none(tree, 'no sub-headings in the initial view', el => el.type === 'h2' || el.type === 'h3');
  none(tree, 'no paragraphs in the initial view', el => el.type === 'p');
  const text = visibleText(tree);
  for (const gone of ['Thử nghiệm', 'Mỗi bàn tay, một nét riêng', 'KHÁM PHÁ BẢN THÂN', 'BẮT ĐẦU TỪ MỘT BỨC ẢNH', 'Chụp lòng bàn tay rõ nét', 'Mỗi nếp tay'])
    assert.ok(!text.includes(gone), `marketing copy must go: ${gone}`);
  none(tree, 'no progress step list', el => el.type === 'ol' && el.props?.['aria-label'] === 'Các bước xem chỉ tay');
  const cards = els(tree, el => el.props?.['data-glass'] === 'true');
  assert.equal(cards.length, 1, 'a single entry card');
  assert.equal(frames(tree).filter(f => f.text === 'ART').length, 1, 'exactly one illustration');
  const buttons = els(cards[0].el, el => el.type === 'button');
  assert.equal(buttons.length, 2, 'capture and upload actions only');
  assert.ok(buttons.some(b => /chụp/i.test(textOf(b.el))), 'capture action');
  assert.ok(buttons.some(b => /chọn|tải/i.test(textOf(b.el))), 'upload action');
  const details = one(tree, 'how-to details', el => el.type === 'details');
  assert.notEqual(details.el.props?.open, true, 'guide starts collapsed');
  assert.equal(textOf(summaryOf(details)).trim(), 'Hướng dẫn chụp');
  assert.ok(insideCard(details), 'folded guide lives inside the card');
  assert.equal(frames(tree).filter(f => f.text === 'GUIDE').length, 1, 'guide content appears once');
});

test('guide content: three one-sentence steps, no repeated art or title', async () => {
  const runtime = hookRuntime();
  const { PalmGuide } = await load('components/discovery/PalmGuide.tsx', {
    mocks: { react: { ...runtime.react, useId: () => 'guide-id' } },
  });
  const tree = PalmGuide();
  const items = els(tree, el => el.type === 'li');
  assert.equal(items.length, 3, 'three steps');
  for (const li of items) {
    assert.deepEqual(nodes(li.el.props.children).filter(n => n && typeof n === 'object'), [], 'one plain sentence per li');
    const sentence = textOf(li.el).trim();
    assert.match(sentence, /^[^.]+\.$/u, `one sentence: ${sentence}`);
  }
  none(tree, 'guide must not repeat the illustration', el => el.type === 'svg');
  none(tree, 'guide must not repeat a title', el => ['h1', 'h2', 'h3', 'h4', 'strong', 'b'].includes(el.type));
});

test('review view: no marketing copy, kept selects, consent gate, paid badge, collapsed question, normalized JPEG', async () => {
  const f = await fixture(); f.render(); f.runtime.flushEffects();
  await f.upload();
  const tree = f.tree();
  assert.equal(f.calls.uploads[0], f.PHOTO, 'the chosen file goes to the normalizer');
  const imgs = els(tree, el => el.type === 'img');
  assert.ok(imgs.length >= 1, 'a photo is shown');
  for (const img of imgs) assert.equal(img.el.props.src, JPEG, 'every photo view uses the normalized JPEG');
  none(tree, 'no marketing headings in review', el => el.type === 'h2');
  const text = visibleText(tree);
  for (const gone of ['TRƯỚC KHI KHÁM PHÁ', 'Kiểm tra ảnh đã rõ nếp tay']) assert.ok(!text.includes(gone), gone);
  const selects = els(tree, el => el.type === 'select');
  assert.equal(selects.length, 2, 'side and dominant selects kept');
  const options = selects.map(sel => nodes(sel.el.props.children).filter(n => n?.type === 'option').map(o => o.props.children));
  assert.ok(options.some(o => o.join() === 'Tay trái,Tay phải'), 'side options');
  assert.ok(options.some(o => o.includes('Cả hai tay')), 'dominant options');
  assert.equal(f.checkbox().el.props.checked, false, 'consent starts unchecked');
  assert.equal(f.submitButton().el.props.disabled, true, 'analysis disabled before consent');
  const details = one(tree, 'question details', el => el.type === 'details');
  assert.notEqual(details.el.props?.open, true, 'question starts collapsed');
  assert.equal(textOf(summaryOf(details)).trim(), 'Thêm câu hỏi');
  const area = frames(details.el).find(fr => fr.el?.type === 'textarea');
  assert.ok(area, 'textarea lives inside the collapsed details');
  assert.equal(els(tree, el => el.type === 'textarea').length, 1, 'single question field');
  assert.ok(
    frames(details.el).some(fr => fr.el?.type === 'label' && textOf(fr.el).includes('Câu hỏi') && frames(fr.el).some(g => g.el === area.el)),
    'field label Câu hỏi',
  );
  assert.equal(f.calls.price[0][0], 'palm', 'price asked for the palm service');
  f.checkbox().el.props.onChange({ target: { checked: true } }); f.render();
  assert.equal(f.submitButton().el.props.disabled, false, 'consent unlocks analysis');
  const badge = frames(f.submitButton().el).find(fr => fr.el?.props?.['data-price-badge'] !== undefined);
  assert.ok(badge, 'paid price badge inside the analysis CTA');
  assert.equal(badge.el.props['data-price-badge'], String(PRICE.points));
});

test('result view: summary and active reading, named switcher, folded observation, one honest note, unchanged AI call', async () => {
  const f = await fixture(); f.render(); f.runtime.flushEffects();
  await f.upload();
  f.checkbox().el.props.onChange({ target: { checked: true } }); f.render();
  await f.submit();
  const tree = f.tree();
  assert.equal(f.calls.ai.length, 1);
  assert.equal(f.calls.ai[0].serviceId, 'palm');
  assert.equal(f.calls.ai[0].parts[0].text, f.calls.price[0][1], 'same managed prompt for price and call');
  assert.ok(f.calls.managed.some(([id, values]) => id === 'palm.read.v1' && values.join('|') === 'Tay trái|Tay phải|'));
  assert.deepEqual(f.calls.ai[0].parts[1].inline_data, { mime_type: 'image/jpeg', data: JPEG.split(',')[1] }, 'same normalized JPEG bytes');
  const text = visibleText(tree);
  assert.ok(text.includes(READING.summary), 'summary retained');
  const tabs = () => frames(one(f.tree(), 'line switcher group', el => el.props?.['aria-label'] === 'Chọn đường chỉ tay').el).filter(fr => fr.el?.type === 'button');
  assert.equal(tabs().length, READING.lines.length);
  assert.deepEqual(tabs().map(t => t.el.props['aria-pressed']), [true, false]);
  for (const tab of tabs()) assert.doesNotMatch(textOf(tab.el), /0\d/, 'no ordinal labels');
  assert.ok(text.includes(READING.lines[0].reading), 'active line reading shown');
  none(tree, 'no duplicate panel headings', el => el.type === 'h2');
  for (const gone of ['GÓC NHÌN TỪ BÀN TAY', 'QUAN SÁT TỪ ẢNH', 'GÓC NHÌN TRUYỀN THỐNG']) assert.ok(!text.includes(gone), gone);
  const details = one(tree, 'observation details', el => el.type === 'details');
  assert.notEqual(details.el.props?.open, true, 'observation starts collapsed');
  assert.equal(textOf(summaryOf(details)).trim(), 'Quan sát từ ảnh');
  assert.ok(visibleText(details.el).includes(READING.lines[0].observation));
  assert.equal(frames(tree).filter(fr => fr.text?.includes(READING.lines[0].observation)).length, 1, 'observation appears once, inside the details');
  tabs()[1].el.props.onClick(); f.render();
  const after = visibleText(f.tree());
  assert.ok(after.includes(READING.lines[1].reading), 'switching lines swaps the reading');
  assert.ok(!after.includes(READING.lines[0].reading));
  assert.deepEqual(tabs().map(t => t.el.props['aria-pressed']), [false, true]);
  const note = els(f.tree(), el => el.type === 'p' && textOf(el).includes('chưa xác minh'));
  assert.equal(note.length, 1, 'one limitation note');
  assert.ok(textOf(note[0].el).includes('chiêm nghiệm'), 'note names the reflective nature');
  assert.ok(!insideCard(note[0]), 'note sits outside the cards');
  assert.ok(textOf(note[0].el).length <= 220, 'short note');
  const all = visibleText(f.tree());
  assert.equal(all.split('chưa xác minh').length - 1, 1, 'limitation stated once');
  assert.equal(all.split('chiêm nghiệm').length - 1, 1);
  none(f.tree(), 'no speculative overlays', el => el.type === 'svg');
});
