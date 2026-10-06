/**
 * AiText — render văn bản trả về từ AI một cách AN TOÀN (React nodes, không
 * innerHTML thô). Cú pháp hỗ trợ:
 *  - "**bold**"  → <strong>
 *  - dòng "- "   → danh sách <ul><li>
 *  - "\n\n"      → ngắt đoạn
 *  - "\n" trong đoạn → <br />
 */
import { Fragment, type ReactNode } from 'react';
import { hasHan, translateKnownTerms } from '../../../../services/admin/reading-language';
import { useLocale } from '@/i18n/LocaleProvider';
import { readingSegments, stripBullet } from '@/lib/reading-blocks';

/** Tokenize only supported markup; React escapes all literal HTML and URLs. */
export function ReadingInline({ text, depth = 0 }: { text: string; depth?: number }) {
  if (depth > 4) return text;
  const token =
    /(`+)([^`]*?)\1|\*\*([^*\n]+)\*\*|(?<![\w*])\*([^*\n]+)\*(?![\w*])|__([^_\n]+)__|(?<!\w)_([^_\n]+)_(?!\w)/g;
  const nodes: ReactNode[] = [];
  let at = 0;
  let match;
  while ((match = token.exec(text))) {
    nodes.push(text.slice(at, match.index));
    const key = match.index;
    if (match[1]) nodes.push(<code key={key}>{match[2]}</code>);
    else if (match[3] || match[5])
      nodes.push(
        <strong key={key} className="font-bold text-muc">
          <ReadingInline text={match[3] || match[5]} depth={depth + 1} />
        </strong>,
      );
    else
      nodes.push(
        <em key={key}>
          <ReadingInline text={match[4] || match[6]} depth={depth + 1} />
        </em>,
      );
    at = token.lastIndex;
  }
  nodes.push(text.slice(at));
  return <>{nodes}</>;
}
export function readingHeading(line: string): string | null {
  const match =
    line.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/) || line.match(/^\s*(?:\d+[.)]\s*)?\*\*([^*]+)\*\*\s*[:：]?\s*$/);
  return match ? match[1] : null;
}
function readingBlocks(text: string) {
  const result: { type: 'p' | 'ul' | 'ol' | 'heading' | 'code'; lines: string[]; start?: number }[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let fence = '';
  let separated = true;
  for (const line of lines) {
    const delimiter = line.match(/^\s*(`{3,}|~{3,})/);
    if (delimiter) {
      if (!fence) {
        fence = delimiter[1];
        result.push({ type: 'code', lines: [] });
      } else if (delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length) {
        fence = '';
        separated = true;
      } else result.at(-1)!.lines.push(line);
      continue;
    }
    if (fence) {
      result.at(-1)!.lines.push(line);
      continue;
    }
    if (!line.trim()) {
      separated = true;
      continue;
    }
    const heading = readingHeading(line);
    if (heading) {
      result.push({ type: 'heading', lines: [heading] });
      separated = true;
      continue;
    }
    const bullet = readingSegments([line])[0].type === 'ul' ? stripBullet(line) : null,
      ordered = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
    const type = bullet ? 'ul' : ordered ? 'ol' : 'p';
    const content = bullet ? bullet : ordered ? ordered[2] : line;
    const last = result.at(-1);
    if (!separated && last?.type === type) last.lines.push(content);
    else result.push({ type, lines: [content], ...(ordered ? { start: Number(ordered[1]) } : {}) });
    separated = false;
  }
  return result;
}

export function AiText({ text, className }: { text: string; className?: string }) {
  const t = useLocale();
  const displayed = translateKnownTerms(text);
  const unresolved = hasHan(displayed);
  const legacy = hasHan(text);
  const blocks = readingBlocks(
    (unresolved ? '' : displayed)
      .replace(/\bAI\b/g, 'AstroX')
      .replace(/bốn trụ/gi, match => (match[0] === 'B' ? 'Tứ trụ' : 'tứ trụ')),
  );

  return (
    <div
      style={{
        fontSize: 'var(--reading-font-size, 16px)',
        lineHeight: 1.85,
        textAlign: 'justify',
        overflowWrap: 'anywhere',
      }}
      className={`space-y-3 text-sm leading-relaxed text-muc ${className ?? ''}`}
    >
      {legacy && (
        <p role="status" className="text-sm text-muc/65">
          {unresolved ? t.t('aitext.legacyUnresolved') : t.t('aitext.legacyTranslated')}
        </p>
      )}
      {blocks.map((block, bi) => {
        if (block.type === 'heading')
          return (
            <h3 key={bi} style={{ textAlign: 'left', fontWeight: 600 }}>
              <ReadingInline text={block.lines[0]} />
            </h3>
          );
        if (block.type === 'code')
          return (
            <pre key={bi} style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>
              <code>{block.lines.join('\n')}</code>
            </pre>
          );
        if (block.type === 'ul' || block.type === 'ol') {
          const List = block.type;
          return (
            <List
              key={bi}
              start={block.type === 'ol' ? block.start : undefined}
              className={`${block.type === 'ol' ? 'list-decimal' : 'list-disc'} space-y-1.5 pl-5`}
            >
              {block.lines.map((line, i) => (
                <li key={i}>
                  <ReadingInline text={line} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={bi}>
            {block.lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 ? <br /> : null}
                <ReadingInline text={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
      {legacy && (
        <details className="text-sm">
          <summary>{t.t('aitext.original')}</summary>
          <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
        </details>
      )}
    </div>
  );
}
