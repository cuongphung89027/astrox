import type { SavedVisualReading } from '../../../services/admin/visual-reading';
import { translateKnownTerms } from '../../../services/admin/reading-language';

// Match the syntax supported by ReadingInline, rather than deleting literal symbols.
function inlinePlain(text: string, depth = 0): string {
  if (depth > 4) return text;
  const token =
    /(`+)([^`]*?)\1|\*\*([^\s*](?:[^*\n]*[^\s*])?)\*\*|(?<![\w*])\*([^\s*](?:[^*\n]*[^\s*])?)\*(?![\w*])|__([^\s_](?:[^_\n]*[^\s_])?)__|(?<!\w)_([^\s_](?:[^_\n]*[^\s_])?)_(?!\w)/g;
  return text.replace(token, (_all, fence, code, bold, italic, strong, emphasis) =>
    fence ? code : inlinePlain(bold || italic || strong || emphasis, depth + 1),
  );
}
export function readingPlainText(text: string): string {
  let fence = '';
  return translateKnownTerms(text)
    .replace(/\bAI\b/g, 'AstroX')
    .replace(/bốn trụ/gi, match => (match[0] === 'B' ? 'Tứ trụ' : 'tứ trụ'))
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .flatMap(line => {
      const delimiter = /^\s*(`{3,}|~{3,})/.exec(line);
      if (delimiter) {
        if (!fence) {
          fence = delimiter[1];
          return [];
        }
        if (delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length) {
          fence = '';
          return [];
        }
      }
      if (fence) return [line];
      const heading = line.replace(/^\s*#{1,6}\s+(.+?)(?:\s+#+)?\s*$/, '$1');
      return [inlinePlain(heading.replace(/^\s*[-*+]\s+/, '• '))];
    })
    .join('\n')
    .trim();
}
export function visualReadingText(saved: SavedVisualReading): string {
  const { report, snapshot } = saved;
  const en = report.locale === 'en';
  const lines = [report.title, report.summary];
  if (snapshot.period) lines.push(snapshot.period.label);
  report.chapters.forEach((chapter, index) => {
    lines.push('', `${index + 1}. ${chapter.title}`, chapter.summary);
    chapter.insights.forEach(insight => {
      lines.push(
        '',
        insight.label,
        insight.summary,
        insight.detail,
        en ? 'Why this interpretation?' : 'Vì sao có nhận định này?',
        insight.rationale,
      );
      insight.sourceFactIds.forEach(id => {
        const fact = snapshot.facts.find(f => f.id === id);
        if (fact) lines.push(`${fact.label}: ${String(fact.value)}`);
      });
      lines.push(en ? 'An example' : 'Ví dụ trong đời sống', insight.example);
      insight.terms.forEach(term => lines.push(`${term.term}: ${term.explanation}`));
      lines.push(en ? 'One thing to try' : 'Một việc bạn có thể thử', insight.action);
    });
  });
  return lines.join('\n');
}
