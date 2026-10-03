import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load } from './support/load.mjs';

for (const locale of ['vi', 'en']) {
  test(`AI markdown bullets render as semantic list items in ${locale} without losing emphasis or prose`, async () => {
    const { AiText } = await load('components/kit/AiText.tsx', {
      mocks: { '@/i18n/LocaleProvider': { useLocale: () => ({ locale, t: key => key }) } },
    });
    const text = '**Heading**\n* First **important** point\n* Second point\nClosing prose.\n\n- Third point\n• Fourth point';
    const markup = renderToStaticMarkup(createElement(AiText, { text }));
    assert.equal((markup.match(/<li>/g) || []).length, 4);
    assert.equal((markup.match(/<ul /g) || []).length, 2);
    assert.ok(markup.includes('list-disc'));
    assert.match(markup, /<strong[^>]*>important<\/strong>/);
    assert.ok(markup.includes('Closing prose.'));
    assert.ok(!markup.includes('* First'));
    assert.ok(!markup.includes('* Second'));
  });
}
