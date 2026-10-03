import test from 'node:test';
import assert from 'node:assert/strict';
import { load, hookRuntime, nodes, memoryStorage } from './support/load.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

const JPEG = 'data:image/jpeg;base64,QUJDREVG';
const READING = {
  quality: 'ok',
  message: '',
  summary: 'Bàn tay bạn cho thấy cách tiếp cận thực tế.',
  lines: [
    {
      name: 'Tâm đạo',
      observation: 'Đường tâm rõ, hơi cong.',
      reading: 'Bạn cảm nhận cảm xúc sâu nhưng giữ kín.',
      points: [],
    },
    {
      name: 'Đầu đạo',
      observation: 'Đường đầu dài và thẳng.',
      reading: 'Bạn xử lý vấn đề theo lối phân tích.',
      points: [],
    },
  ],
};
const PRICE = { pending: false, paid: true, points: 900, text: '900 Point' };

// --- tiny tree helpers; mock function components are expanded in place ---
function frames(node, ancestors = [], out = []) {
  if (node == null || typeof node === 'boolean') return out;
  if (Array.isArray(node)) {
    for (const child of node) frames(child, ancestors, out);
    return out;
  }
  if (typeof node !== 'object') {
    out.push({ text: String(node), ancestors });
    return out;
  }
  out.push({ el: node, ancestors });
  const child = typeof node.type === 'function' ? node.type(node.props) : node.props?.children;
  return frames(child, ancestors.concat(node), out);
}
const textOf = el =>
  frames(el.props?.children)
    .filter(f => f.text !== undefined)
    .map(f => f.text)
    .join('');
const visibleText = tree =>
  frames(tree)
    .filter(f => f.text !== undefined)
    .map(f => f.text)
    .join('');
const els = (tree, pred) => frames(tree).filter(f => f.el && pred(f.el, f.ancestors));
function one(tree, label, pred) {
  const found = els(tree, pred);
  assert.equal(found.length, 1, `${label}: found ${found.length}`);
  return found[0];
}
function none(tree, label, pred) {
  assert.equal(els(tree, pred).length, 0, label);
}
const insideCard = frame => frame.ancestors.some(a => a.props?.['data-glass'] === 'true');
const summaryOf = details => frames(details.el).find(f => f.el?.type === 'summary')?.el;

async function fixture(options = {}) {
  const storage = memoryStorage();
  const listeners = new Map();
  const runtime = hookRuntime();
  const calls = { managed: [], price: [], ai: [], uploads: [] };
  const { PalmReaderSession: PalmReader } = await load('components/discovery/PalmReader.tsx', {
    mocks: {
      react: runtime.react,
      '@/components/kit': {
        Btn: 'button',
        GlassCard: props => ({ type: 'div', props: { ...props, 'data-glass': 'true' } }),
      },
      '@/components/kit/PaidPriceBadge': {
        PaidPriceBadge: props => ({ type: 'data', props: { 'data-price-badge': String(props.price?.points ?? '') } }),
      },
      '@/lib/api': {
        callAiText: async args => {
          calls.ai.push(args);
          if (options.ai) return options.ai(args);
          return args.parts[0].text.includes('palm.followup.v1')
            ? JSON.stringify({ answer: 'Phần cuối của tâm đạo cần nhìn rõ hơn.' })
            : JSON.stringify(READING);
        },
      },
      '@/lib/managed-prompts': {
        managedPrompt: (id, values) => {
          calls.managed.push([id, values]);
          return `prompt:${id}:${values.join('|')}`;
        },
      },
      '@/lib/palm-photo': {
        normalizePalmPhoto: async file => {
          calls.uploads.push(file);
          return { dataUrl: JPEG, width: 1200, height: 800 };
        },
      },
      '@/lib/use-paid-price': {
        usePaidPrice: (serviceId, prompt) => {
          calls.price.push([serviceId, prompt]);
          return PRICE;
        },
      },
      '@/lib/palm-quality': { inspectPalmPhoto: async () => options.quality ?? { state: 'ready', checks: [] } },
      '@/lib/state': { getAccountEpoch: () => 0, accountStorageKey: key => key, subscribe: () => () => {} },
      './PalmCamera': { PalmCamera: () => null },
      './PalmGuide': { PalmGuide: () => 'GUIDE', PalmIllustration: () => 'ART' },
    },
    globals: {
      localStorage: storage,
      window: {
        addEventListener(type, fn) {
          listeners.set(type, fn);
        },
        removeEventListener(type) {
          listeners.delete(type);
        },
      },
      Image: class {
        set src(_value) {}
      },
    },
  });
  let tree;
  const render = () => {
    runtime.reset();
    tree = PalmReader();
    return tree;
  };
  const checkbox = () => one(tree, 'consent checkbox', el => el.type === 'input' && el.props?.type === 'checkbox');
  const submitButton = () => one(tree, 'submit button', el => el.type === 'button' && el.props?.type === 'submit');
  const PHOTO = { name: 'palm.jpg', type: 'image/jpeg', size: 2048 };
  return {
    calls,
    storage,
    refreshStorage: () => listeners.get('storage')?.(),
    render,
    tree: () => tree,
    PHOTO,
    runtime,
    checkbox,
    submitButton,
    async upload() {
      one(
        tree,
        'upload input',
        el => el.type === 'input' && el.props?.type === 'file' && String(el.props?.accept).includes('image/jpeg'),
      ).el.props.onChange({ target: { files: [PHOTO], value: '' } });
      await tick();
      render();
    },
    async submit() {
      one(tree, 'form', el => el.type === 'form').el.props.onSubmit({ preventDefault() {} });
      await tick();
      await tick();
      render();
    },
  };
}

test('entry exposes live-camera and upload actions without requesting camera automatically', async () => {
  const f = await fixture();
  f.render();
  f.runtime.flushEffects();
  const tree = f.tree();
  assert.equal(textOf(one(tree, 'h1', el => el.type === 'h1').el).trim(), 'Chỉ tay');
  assert.equal(els(tree, el => el.type === 'button' && textOf(el).includes('Mở camera')).length, 1);
  assert.equal(els(tree, el => el.type === 'button' && textOf(el).includes('Chọn ảnh')).length, 1);
  assert.match(visibleText(tree), /CAMERA CHƯA BẬT/);
  assert.equal(f.calls.ai.length, 0);
  assert.equal(frames(tree).filter(f => f.text === 'ART').length, 1);
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
    assert.deepEqual(
      nodes(li.el.props.children).filter(n => n && typeof n === 'object'),
      [],
      'one plain sentence per li',
    );
    const sentence = textOf(li.el).trim();
    assert.match(sentence, /^[^.]+\.$/u, `one sentence: ${sentence}`);
  }
  none(tree, 'guide must not repeat the illustration', el => el.type === 'svg');
  none(tree, 'guide must not repeat a title', el => ['h1', 'h2', 'h3', 'h4', 'strong', 'b'].includes(el.type));
});

test('review view: no marketing copy, kept selects, consent gate, paid badge, collapsed question, normalized JPEG', async () => {
  const f = await fixture();
  f.render();
  f.runtime.flushEffects();
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
  const options = selects.map(sel =>
    nodes(sel.el.props.children)
      .filter(n => n?.type === 'option')
      .map(o => o.props.children),
  );
  assert.ok(
    options.some(o => o.join() === 'Tay trái,Tay phải'),
    'side options',
  );
  assert.ok(
    options.some(o => o.includes('Cả hai tay')),
    'dominant options',
  );
  assert.equal(f.checkbox().el.props.checked, false, 'consent starts unchecked');
  assert.equal(f.submitButton().el.props.disabled, true, 'analysis disabled before consent');
  const details = one(
    tree,
    'question details',
    el => el.type === 'details' && frames(el).some(fr => fr.el?.type === 'summary' && textOf(fr.el) === 'Thêm câu hỏi'),
  );
  assert.notEqual(details.el.props?.open, true, 'question starts collapsed');
  assert.equal(textOf(summaryOf(details)).trim(), 'Thêm câu hỏi');
  const area = frames(details.el).find(fr => fr.el?.type === 'textarea');
  assert.ok(area, 'textarea lives inside the collapsed details');
  assert.equal(els(tree, el => el.type === 'textarea').length, 1, 'single question field');
  assert.ok(
    frames(details.el).some(
      fr => fr.el?.type === 'label' && textOf(fr.el).includes('Câu hỏi') && frames(fr.el).some(g => g.el === area.el),
    ),
    'field label Câu hỏi',
  );
  assert.equal(f.calls.price[0][0], 'palm', 'price asked for the palm service');
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  assert.equal(f.submitButton().el.props.disabled, false, 'consent unlocks analysis');
  const badge = frames(f.submitButton().el).find(fr => fr.el?.props?.['data-price-badge'] !== undefined);
  assert.ok(badge, 'paid price badge inside the analysis CTA');
  assert.equal(badge.el.props['data-price-badge'], String(PRICE.points));
});

test('result view: summary and active reading, named switcher, folded observation, one honest note, unchanged AI call', async () => {
  const f = await fixture();
  f.render();
  f.runtime.flushEffects();
  await f.upload();
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  await f.submit();
  const tree = f.tree();
  assert.equal(f.calls.ai.length, 1);
  assert.equal(f.calls.ai[0].serviceId, 'palm');
  assert.equal(f.calls.ai[0].parts[0].text, f.calls.price[0][1], 'same managed prompt for price and call');
  assert.ok(f.calls.managed.some(([id, values]) => id === 'palm.read.v1' && values.join('|') === 'Tay trái|Tay phải|'));
  assert.deepEqual(
    f.calls.ai[0].parts[1].inline_data,
    { mime_type: 'image/jpeg', data: JPEG.split(',')[1] },
    'same normalized JPEG bytes',
  );
  const text = visibleText(tree);
  assert.ok(text.includes(READING.summary), 'summary retained');
  const tabs = () =>
    frames(one(f.tree(), 'line switcher group', el => el.props?.['aria-label'] === 'Chọn đường chỉ tay').el).filter(
      fr => fr.el?.type === 'button',
    );
  assert.equal(tabs().length, READING.lines.length);
  assert.deepEqual(
    tabs().map(t => t.el.props['aria-pressed']),
    [true, false],
  );
  for (const tab of tabs()) assert.doesNotMatch(textOf(tab.el), /0\d/, 'no ordinal labels');
  assert.ok(text.includes(READING.lines[0].reading), 'active line reading shown');
  assert.ok(els(tree, el => el.type === 'h2').length >= 1, 'result has clear section headings');
  for (const gone of ['GÓC NHÌN TỪ BÀN TAY', 'QUAN SÁT TỪ ẢNH', 'GÓC NHÌN TRUYỀN THỐNG'])
    assert.ok(!text.includes(gone), gone);
  const details = one(
    tree,
    'observation details',
    el =>
      el.type === 'details' && frames(el).some(fr => fr.el?.type === 'summary' && textOf(fr.el) === 'Quan sát từ ảnh'),
  );
  assert.equal(details.el.props?.open, true, 'observation is readable without an extra tap');
  assert.equal(textOf(summaryOf(details)).trim(), 'Quan sát từ ảnh');
  assert.ok(visibleText(details.el).includes(READING.lines[0].observation));
  assert.equal(
    frames(tree).filter(fr => fr.text?.includes(READING.lines[0].observation)).length,
    1,
    'observation appears once, inside the details',
  );
  tabs()[1].el.props.onClick();
  f.render();
  const after = visibleText(f.tree());
  assert.ok(after.includes(READING.lines[1].reading), 'switching lines swaps the reading');
  assert.ok(!after.includes(READING.lines[0].reading));
  assert.deepEqual(
    tabs().map(t => t.el.props['aria-pressed']),
    [false, true],
  );
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

test('full flow result exposes save, other hand and a text-only managed follow-up', async () => {
  const f = await fixture();
  f.render();
  f.runtime.flushEffects();
  await f.upload();
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  await f.submit();
  assert.ok(visibleText(f.tree()).includes('Lưu bài đọc'));
  assert.ok(visibleText(f.tree()).includes('Thêm tay còn lại'));
  const field = one(f.tree(), 'follow-up input', el => el.type === 'textarea' && el.props.id === 'palm-followup');
  field.el.props.onChange({ target: { value: 'Giải thích thêm tâm đạo' } });
  f.render();
  one(f.tree(), 'follow-up form', el => el.type === 'form').el.props.onSubmit({ preventDefault() {} });
  await tick();
  await tick();
  f.render();
  assert.equal(f.calls.ai.length, 2);
  assert.equal(f.calls.ai[1].parts.length, 1, 'follow-up never re-uploads the photo');
  assert.match(f.calls.ai[1].parts[0].text, /palm.followup.v1/);
  assert.ok(visibleText(f.tree()).includes('Phần cuối của tâm đạo cần nhìn rõ hơn.'));
});

test('account or locale change remounts the entire palm session', async () => {
  const runtime = hookRuntime();
  let epoch = 0;
  const { PalmReader } = await load('components/discovery/PalmReader.tsx', {
    mocks: {
      react: runtime.react,
      '@/lib/state': { getAccountEpoch: () => epoch, subscribe: () => () => {}, accountStorageKey: k => k },
    },
  });
  runtime.reset();
  const first = PalmReader();
  epoch = 1;
  runtime.reset();
  const next = PalmReader();
  assert.notEqual(first.key, next.key);
});

test('saving and reopening keeps the result without saving or requesting another photo', async () => {
  const f = await fixture();
  f.render();
  f.runtime.flushEffects();
  await f.upload();
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  await f.submit();
  one(f.tree(), 'save button', e => e.type === 'button' && textOf(e) === 'Lưu bài đọc').el.props.onClick();
  f.render();
  const raw = f.storage.getItem('astrox_palm_history_v1');
  assert.ok(raw);
  assert.doesNotMatch(raw, /base64|QUJDREVG/);
  const savedEntry = JSON.parse(raw)[0];
  one(
    f.tree(),
    'reopen button',
    e => e.type === 'button' && textOf(e).includes(savedEntry.reading.summary.slice(0, 90)),
  ).el.props.onClick();
  f.render();
  assert.ok(visibleText(f.tree()).includes(READING.summary));
  assert.equal(els(f.tree(), e => e.type === 'img').length, 0);
  assert.equal(f.calls.ai.length, 1);
});
test('unusable photo cannot start AI even if consent is checked', async () => {
  const f = await fixture({ quality: { state: 'retake', checks: [{ id: 'hand', status: 'fail' }] } });
  f.render();
  f.runtime.flushEffects();
  await f.upload();
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  assert.equal(f.submitButton().el.props.disabled, true);
  await f.submit();
  assert.equal(f.calls.ai.length, 0);
  assert.ok(visibleText(f.tree()).includes('Chọn ảnh khác'));
});
test('cancelled reading ignores a provider response that arrives late', async () => {
  let resolve;
  const f = await fixture({
    ai: () =>
      new Promise(r => {
        resolve = r;
      }),
  });
  f.render();
  f.runtime.flushEffects();
  await f.upload();
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  one(f.tree(), 'analysis form', e => e.type === 'form').el.props.onSubmit({ preventDefault() {} });
  await tick();
  f.render();
  const cancel = els(f.tree(), e => e.type === 'button' && textOf(e).includes('Dừng phân tích'))[0];
  assert.ok(cancel);
  cancel.el.props.onClick();
  resolve(JSON.stringify(READING));
  await tick();
  f.render();
  assert.ok(!visibleText(f.tree()).includes(READING.summary));
});

test('comparison selects only the other hand and reopening offers a new capture without sending an image', async () => {
  const f = await fixture();
  f.render();
  f.runtime.flushEffects();
  await f.upload();
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  await f.submit();
  one(f.tree(), 'save button', e => e.type === 'button' && textOf(e) === 'Lưu bài đọc').el.props.onClick();
  f.render();
  const left = JSON.parse(f.storage.getItem('astrox_palm_history_v1'))[0];
  const right = {
    ...left,
    id: 'right-reading',
    side: 'Tay phải',
    question: 'Bài đọc tay phải',
    reading: { ...left.reading, lines: left.reading.lines.map(l => ({ ...l, uncertainty: 'Phần cuối chưa rõ.' })) },
  };
  f.storage.setItem('astrox_palm_history_v1', JSON.stringify([right, left]));
  f.refreshStorage();
  f.render();
  one(
    f.tree(),
    'left reopen',
    e => e.type === 'button' && textOf(e).includes(left.reading.summary.slice(0, 90)),
  ).el.props.onClick();
  f.render();
  const compare = one(
    f.tree(),
    'comparison picker',
    e => e.type === 'select' && e.props['aria-label'] === 'Bài đọc của tay còn lại',
  ).el;
  assert.equal(els(compare, e => e.type === 'option' && e.props.value === left.id).length, 0);
  compare.props.onChange({ target: { value: right.id } });
  f.render();
  assert.match(visibleText(f.tree()), /Hai tay, hai góc nhìn/);
  assert.match(visibleText(f.tree()), /Phần cuối chưa rõ/);
  assert.equal(f.calls.ai.length, 1);
  one(f.tree(), 'new capture', e => e.type === 'button' && textOf(e) === 'Chụp ảnh mới').el.props.onClick();
  f.render();
  none(
    f.tree(),
    'old follow-up is closed for the new capture',
    e => e.type === 'textarea' && e.props.id === 'palm-followup',
  );
  assert.equal(f.calls.ai.length, 1);
});

test('cancelled text follow-up ignores a late answer while retaining the reading', async () => {
  let resolveReply;
  const f = await fixture({
    ai: args =>
      args.parts[0].text.includes('palm.followup.v1')
        ? new Promise(resolve => {
            resolveReply = resolve;
          })
        : Promise.resolve(JSON.stringify(READING)),
  });
  f.render();
  f.runtime.flushEffects();
  await f.upload();
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  await f.submit();
  one(f.tree(), 'follow-up question', e => e.type === 'textarea' && e.props.id === 'palm-followup').el.props.onChange({
    target: { value: 'Quan sát nào chưa rõ?' },
  });
  f.render();
  await f.submit();
  assert.equal(f.calls.ai[1].parts.length, 1);
  one(f.tree(), 'cancel answer', e => e.type === 'button' && textOf(e) === 'Dừng trả lời').el.props.onClick();
  resolveReply(JSON.stringify({ answer: 'Late answer must not appear' }));
  await tick();
  f.render();
  assert.ok(visibleText(f.tree()).includes(READING.summary));
  assert.ok(!visibleText(f.tree()).includes('Late answer must not appear'));
});

test('capture of the other hand preserves the first confirmed snapshot without another comparison request', async () => {
  const f = await fixture();
  f.render();
  f.runtime.flushEffects();
  await f.upload();
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  await f.submit();
  one(f.tree(), 'other hand', e => e.type === 'button' && textOf(e) === 'Thêm tay còn lại').el.props.onClick();
  f.render();
  one(f.tree(), 'camera', e => typeof e.props?.onCapture === 'function').el.props.onCapture({
    dataUrl: JPEG,
    w: 1200,
    h: 800,
  });
  await tick();
  f.render();
  const handField = one(
    f.tree(),
    'confirmed hand field',
    e => e.type === 'label' && textOf(e).startsWith('Bàn tay trong ảnh'),
  ).el;
  assert.equal(one(handField, 'confirmed other side', e => e.type === 'select').el.props.value, 'Tay phải');
  f.checkbox().el.props.onChange({ target: { checked: true } });
  f.render();
  await f.submit();
  assert.match(visibleText(f.tree()), /Hai tay, hai góc nhìn/);
  const hands = els(f.tree(), e => e.type === 'article').map(f => textOf(f.el));
  assert.equal(hands.length, 2);
  assert.ok(hands[0].includes('Tay trái'));
  assert.ok(hands[1].includes('Tay phải'));
  assert.equal(f.calls.ai.length, 2, 'only the two explicit reading submissions call AI');
});
