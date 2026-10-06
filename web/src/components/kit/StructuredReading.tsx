import { AiText, ReadingInline, readingHeading } from './AiText';
import styles from './StructuredReading.module.css';

/** Preserve every paragraph, including responses cached with the older prompt. */
export function splitReadingSections(text: string) {
  const sections: { title: string; body: string }[] = [];
  let fence = '';
  for (const line of text
    .replace(/\bAI\b/g, 'AstroX')
    .replace(/bốn trụ/gi, match => (match[0] === 'B' ? 'Tứ trụ' : 'tứ trụ'))
    .replace(/\r\n?/g, '\n')
    .split('\n')) {
    const delimiter = line.match(/^\s*(`{3,}|~{3,})/);
    const insideFence = !!fence;
    if (delimiter) {
      if (!fence) fence = delimiter[1];
      else if (delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length) fence = '';
    }
    const heading = !insideFence && !delimiter ? readingHeading(line) : null;
    if (heading) {
      sections.push({ title: heading.replace(/[:：]$/, '').trim(), body: '' });
    } else {
      if (!sections.length) sections.push({ title: '', body: '' });
      sections[sections.length - 1].body += `\n${line}`;
    }
  }
  return sections
    .map(section => ({ ...section, body: section.body.trim() }))
    .filter(section => section.title || section.body);
}

export function StructuredReading({ text }: { text: string }) {
  const sections = splitReadingSections(text);
  return (
    <div className={styles.readingSections}>
      {sections.map((section, index) => {
        const conclusion = /tổng hợp|lời khuyên|kết luận|hành động|summary|advice|conclusion|action/i.test(
          section.title,
        );
        return (
          <section key={index} className={conclusion ? styles.readingConclusion : styles.readingSection}>
            {section.title && (
              <header>
                <span>{conclusion ? '↗' : String(index + 1).padStart(2, '0')}</span>
                <h3>
                  <ReadingInline text={section.title} />
                </h3>
              </header>
            )}
            {section.body && <AiText text={section.body} />}
          </section>
        );
      })}
    </div>
  );
}
