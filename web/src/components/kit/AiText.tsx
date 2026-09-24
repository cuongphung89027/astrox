/**
 * AiText — render văn bản trả về từ AI một cách AN TOÀN (React nodes, không
 * innerHTML thô). Cú pháp hỗ trợ:
 *  - "**bold**"  → <strong>
 *  - dòng "- "   → danh sách <ul><li>
 *  - "\n\n"      → ngắt đoạn
 *  - "\n" trong đoạn → <br />
 */
import { Fragment, type ReactNode } from "react";
import {hasHan,translateKnownTerms} from "../../../../services/admin/reading-language";

/** Tách "**bold**" thành các node inline (index lẻ = phần trong dấu **). */
function renderInline(text: string, keyBase: string): ReactNode[] {
  return text.split(/\*\*([^*]+)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyBase}-${i}`} className="font-bold text-muc">
        {part}
      </strong>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>
    ),
  );
}

export function AiText({ text, className }: { text: string; className?: string }) {
  const displayed=translateKnownTerms(text);
  const unresolved=hasHan(displayed);
  const legacy=hasHan(text);
  const blocks = (unresolved?'':displayed).replace(/\bAI\b/g, "AstroX").replace(/bốn trụ/gi, match => match[0] === "B" ? "Tứ trụ" : "tứ trụ")
    .trim()
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div style={{ fontSize: "var(--reading-font-size, 16px)", lineHeight: 1.85, textAlign: "justify", overflowWrap: "anywhere" }} className={`space-y-3 text-sm leading-relaxed text-muc ${className ?? ""}`}>
      {legacy&&<p role="status" className="text-sm text-muc/65">{unresolved?'Bài đã lưu còn thuật ngữ chưa được Việt hóa. Bản gốc được giữ bên dưới để bạn đối chiếu.':'Thuật ngữ trong bài đã lưu được hiển thị bằng tiếng Việt; bản gốc vẫn được giữ.'}</p>}
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.length > 0 && lines.every((l) => /^\s*[-•]\s+/.test(l));

        if (isList) {
          return (
            <ul key={bi} className="list-disc space-y-1.5 pl-5">
              {lines.map((line, li) => (
                <li key={li}>{renderInline(line.replace(/^\s*[-•]\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((line, li) => (
              <Fragment key={li}>
                {li > 0 ? <br /> : null}
                {renderInline(line, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
      {legacy&&<details className="text-sm"><summary>Xem bản gốc đã lưu</summary><p style={{whiteSpace:'pre-wrap'}}>{text}</p></details>}
    </div>
  );
}
