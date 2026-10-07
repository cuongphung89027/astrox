import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load } from './support/load.mjs';

// Exercise the public renderers over the real sources, including their shared
// formatting/parser code. Only locale and the kit barrel are isolated: importing
// every unrelated interactive kit component is unnecessary for server rendering.
async function renderReading(renderer, locale, text) {
  const localeMock = { useLocale: () => ({ locale, t: key => key }) };
  const { AiText } = await load('components/kit/AiText.tsx', {
    mocks: { '@/i18n/LocaleProvider': localeMock },
  });
  const Component =
    renderer === 'AiText'
      ? AiText
      : (
          await load('components/kit/StructuredReading.tsx', {
            mocks: { '@/components/kit': { AiText }, '@/i18n/LocaleProvider': localeMock },
          })
        ).StructuredReading;
  return renderToStaticMarkup(createElement(Component, { text }));
}

const visibleText = markup => markup.replace(/<[^>]+>/g, '');
const elementCount = (markup, tag) => (markup.match(new RegExp(`<${tag}(?:\\s|>)`, 'g')) || []).length;

const copy = {
  vi: {
    heading: 'Điểm mạnh nổi bật',
    intro: 'Bạn thường quan sát trước khi phản hồi.',
    emphasis: 'chậm lại một nhịp',
    strong: 'hỏi cho rõ',
    after: 'Giữ một câu hỏi cụ thể để tiếp tục.',
    list: ['Ghi lại điều bạn quan sát.', 'Hỏi lại điều chưa rõ.', 'Chọn một việc để thực hành.'],
    summary: 'Tổng quan',
    detail: 'Cách áp dụng',
    last: 'Đoạn cuối đã lưu vẫn phải đọc được.',
  },
  en: {
    heading: 'Your notable strengths',
    intro: 'You tend to observe before responding.',
    emphasis: 'pause for a moment',
    strong: 'ask for clarity',
    after: 'Keep one specific question for the next conversation.',
    list: ['Write down what you observe.', 'Ask about what remains unclear.', 'Choose one action to practice.'],
    summary: 'Overview',
    detail: 'How to apply it',
    last: 'The last saved paragraph must remain readable.',
  },
};

for (const renderer of ['AiText', 'StructuredReading']) {
  for (const locale of ['vi', 'en']) {
    const c = copy[locale];
    const name = `${renderer} (${locale})`;

    test(`${name}: Markdown headings become readable headings without leaking # or emphasis markers`, async () => {
      const markup = await renderReading(renderer, locale, `## *${c.heading}*\n${c.intro}`);
      assert.match(markup, /<h[1-6](?:\s[^>]*)?>/, 'the heading has semantic structure');
      const text = visibleText(markup);
      assert.ok(text.includes(c.heading), 'the full heading is retained');
      assert.ok(text.includes(c.intro), 'the following paragraph is retained');
      assert.ok(!text.includes(`## *${c.heading}*`), 'ATX syntax is not displayed');
      assert.ok(!text.includes(`*${c.heading}*`), 'inline emphasis syntax is not displayed in a heading');
    });

    test(`${name}: single and double emphasis remain formatted without exposing asterisks`, async () => {
      const markup = await renderReading(renderer, locale, `${c.intro} Hãy *${c.emphasis}* và **${c.strong}**.`);
      assert.match(markup, new RegExp(`<em(?:\\s[^>]*)?>${c.emphasis}</em>`));
      assert.match(markup, new RegExp(`<strong(?:\\s[^>]*)?>${c.strong}</strong>`));
      assert.ok(!visibleText(markup).includes(`*${c.emphasis}*`));
      assert.ok(!visibleText(markup).includes(`**${c.strong}**`));
    });

    test(`${name}: numbered advice renders as an ordered list between intact prose paragraphs`, async () => {
      const text = `${c.intro}\n\n1. ${c.list[0]}\n2. ${c.list[1]}\n3. ${c.list[2]}\n\n${c.after}`;
      const markup = await renderReading(renderer, locale, text);
      assert.equal(elementCount(markup, 'ol'), 1, 'one ordered list');
      assert.equal(elementCount(markup, 'li'), 3, 'each numbered instruction is a list item');
      for (const item of c.list) assert.ok(visibleText(markup).includes(item), item);
      assert.ok(visibleText(markup).includes(c.intro));
      assert.ok(visibleText(markup).includes(c.after));
      assert.ok(!visibleText(markup).includes(`1. ${c.list[0]}`), 'raw Markdown list numbering is not printed');
    });

    test(`${name}: literal inline and fenced code preserve #, *, and bold syntax without creating headings`, async () => {
      const literal = '**literal** #123 2 * 3';
      const text = `Dữ liệu: \`${literal}\`.\n\n\`\`\`text\n# literal-heading\n* literal-item\n2 * 3 = 6\n\`\`\``;
      const markup = await renderReading(renderer, locale, text);
      assert.match(
        markup,
        /<code(?:\s[^>]*)?>\*\*literal\*\* #123 2 \* 3<\/code>/,
        'inline code is displayed verbatim',
      );
      assert.match(markup, /<pre(?:\s[^>]*)?>[\s\S]*<code(?:\s[^>]*)?>/, 'fenced code has preformatted structure');
      assert.ok(visibleText(markup).includes('# literal-heading'));
      assert.ok(visibleText(markup).includes('* literal-item'));
      assert.ok(visibleText(markup).includes('2 * 3 = 6'));
      assert.equal(elementCount(markup, 'li'), 0, 'a literal code line is not a bullet');
      assert.doesNotMatch(markup, /<h[1-6](?:\s[^>]*)?>[^<]*literal-heading/, 'a code line is not a reading section');
    });

    test(`${name}: regular # identifiers, C#, and multiplication survive formatting cleanup`, async () => {
      const text =
        '#123 là mã bài đọc.\nKỹ năng C# hữu ích.\n2 * 3 = 6.\n2 * 3 + 4 * 5 = 26.\n2 ** 3 + 4 ** 2 = 24.\nGiá trị * chưa được xác định.';
      const markup = await renderReading(renderer, locale, text);
      const rendered = visibleText(markup);
      for (const literal of [
        '#123',
        'C#',
        '2 * 3 = 6',
        '2 * 3 + 4 * 5 = 26.',
        '2 ** 3 + 4 ** 2 = 24.',
        'Giá trị * chưa được xác định.',
      ]) {
        assert.ok(rendered.includes(literal), `preserve ${literal}`);
      }
      assert.equal(elementCount(markup, 'li'), 0);
      assert.doesNotMatch(markup, /<h[1-6](?:\s[^>]*)?>/, 'an identifier is not a Markdown heading');
    });
    test(`${name}: a literal trailing hash in a heading is preserved`, async () => {
      const markup = await renderReading(renderer, locale, '## Lập trình C#\n\nNội dung đã lưu.');
      assert.ok(visibleText(markup).includes('Lập trình C#'));
      assert.ok(!visibleText(markup).includes('## Lập trình'));
    });

    test(`${name}: AI-supplied HTML and script text cannot become executable elements`, async () => {
      const text =
        '# <script>alert(1)</script>\n\n**<img src=x onerror=alert(2)>**\n\n- <svg onload=alert(3)>\n- [unsafe](javascript:alert(4))';
      const markup = await renderReading(renderer, locale, text);
      // The shared toolbar has trusted decorative SVG icons; inspect the reading body.
      const bodyMarkup = markup.replace(/<svg\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>/g, '');
      assert.doesNotMatch(bodyMarkup, /<(?:script|img|svg|iframe|object)\b/i);
      assert.doesNotMatch(markup, /\b(?:href|src)=["']javascript:/i);
      assert.ok(markup.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'HTML text is escaped, not silently deleted');
      assert.ok(markup.includes('&lt;img src=x onerror=alert(2)&gt;'));
      assert.ok(markup.includes('&lt;svg onload=alert(3)&gt;'));
    });

    test(`${name}: richer cached readings preserve all paragraphs and mixed list types across CRLF sections`, async () => {
      const cachedText = [
        `# ${c.summary}`,
        c.intro,
        '',
        `## ${c.detail}`,
        `* ${c.list[0]}`,
        `- ${c.list[1]}`,
        '',
        `1) ${c.list[2]}`,
        `2) *${c.emphasis}*`,
        '',
        c.last,
      ].join('\r\n');
      const markup = await renderReading(renderer, locale, cachedText);
      assert.equal(elementCount(markup, 'ul'), 1, 'mixed Markdown bullet markers produce one list');
      assert.equal(elementCount(markup, 'ol'), 1, 'parenthesized numbered instructions remain an ordered list');
      assert.equal(elementCount(markup, 'li'), 4, 'all four cached list items are retained');
      const rendered = visibleText(markup);
      for (const text of [c.summary, c.detail, c.intro, ...c.list, c.emphasis, c.last]) {
        assert.ok(rendered.includes(text), `retain cached content: ${text}`);
      }
      assert.ok(!rendered.includes(`1) ${c.list[2]}`));
      assert.ok(!rendered.includes(`*${c.emphasis}*`));
      assert.ok(!rendered.includes(`# ${c.summary}`));
    });
  }
}
