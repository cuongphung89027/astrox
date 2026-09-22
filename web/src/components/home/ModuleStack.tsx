"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ModuleIllustration } from "./ModuleIllustration";

export const STACK_MODULES = [
  { href: "/tuvi", title: "Tử Vi", short: "Tử Vi", category: "Lá số & vận trình", sub: "Đọc lá số 12 cung, khám phá những dấu mốc trong hành trình của bạn.", kind: "tuvi", action: "Lập lá số" },
  { href: "/cunghoangdao", title: "Cung Hoàng Đạo", short: "Cung Hoàng Đạo", category: "Chiêm tinh & tính cách", sub: "Khám phá cung hoàng đạo, bản đồ sao và những nét riêng của bạn.", kind: "zodiac", action: "Khám phá cung của bạn" },
  { href: "/kinhdich", title: "Kinh Dịch", short: "Kinh Dịch", category: "Gieo quẻ & chiêm nghiệm", sub: "Một quẻ dịch, một góc nhìn mới cho điều bạn đang băn khoăn.", kind: "iching", action: "Gieo một quẻ" },
  { href: "/battu", title: "Bát Tự", short: "Bát Tự", category: "Tứ trụ & ngũ hành", sub: "Từ ngày giờ sinh, tìm hiểu tứ trụ và sự cân bằng ngũ hành của bạn.", kind: "battu", action: "Khám phá tứ trụ" },
  { href: "/thansohoc", title: "Thần Số Học", short: "Thần Số", category: "Con số & bản thân", sub: "Tìm con số chủ đạo và khám phá những tiềm năng bên trong bạn.", kind: "numerology", action: "Tìm con số của bạn" },
  { href: "/tarot", title: "Tarot", short: "Tarot", category: "Trải bài & lắng nghe", sub: "Dành một khoảng lặng, rút lá bài và lắng nghe điều mình cần lúc này.", kind: "tarot", action: "Bắt đầu trải bài" },
];

/** A hand of six cards: rotate, swipe, or select any named tool. */
export function ModuleStack() {
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const count = STACK_MODULES.length;
  const move = (direction: number) => setActive(current => (current + direction + count) % count);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    swiped.current = false;
    if ((event.target as HTMLElement).closest("a")) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const origin = start.current;
    if (!origin || origin.id !== event.pointerId) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (!swiped.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
      start.current = null;
      return;
    }
    if (Math.abs(dx) > 10) {
      swiped.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag(Math.max(-130, Math.min(130, dx)));
    }
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const origin = start.current;
    if (origin && event.pointerId === origin.id && swiped.current) {
      const dx = event.clientX - origin.x;
      if (Math.abs(dx) > 28) move(dx < 0 ? 1 : -1);
    }
    start.current = null;
    setDrag(0);
  }

  return (
    <div className="ax-deck" role="region" aria-roledescription="carousel" aria-label="Sáu cánh cửa AstroX"
      onKeyDown={event => {
        swiped.current = false;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}>
      <div className="ax-deck-stage" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onPointerCancel={() => { start.current = null; setDrag(0); }}
        onClickCapture={event => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }}>
        <div className="ax-deck-orbit" aria-hidden="true" />
        {STACK_MODULES.map((module, index) => {
          const position = ((index - active + count + 2) % count) - 2;
          const selected = index === active;
          const distance = Math.abs(position);
          const style = {
            "--deck-slot": distance === 3 ? 0 : position,
            "--deck-depth": distance,
            "--drag": `${selected ? drag : 0}px`,
            zIndex: selected ? 10 : 6 - distance,
          } as CSSProperties;
          return (
            <div key={module.href} className={`ax-deck-slot ${selected ? "is-active" : ""} ${distance === 3 ? "is-back" : ""} ${selected && drag ? "is-dragging" : ""}`} style={style} aria-hidden={!selected}>
              <article className={`ax-module-card ax-module-${module.kind}`} aria-labelledby={`module-title-${module.kind}`}>
                {!selected && <button type="button" tabIndex={-1} className="ax-deck-select-card" aria-label={`Chọn ${module.title}`} onClick={() => setActive(index)} />}
                <div className="ax-module-art">
                  <span className="ax-module-number" aria-hidden="true">0{index + 1}</span>
                  <ModuleIllustration kind={module.kind} />
                  <span className="ax-module-art-label" aria-hidden="true">ASTROX COLLECTION</span>
                </div>
                <div className="ax-module-body">
                  <p className="ax-module-category">{module.category}</p>
                  <h3 id={`module-title-${module.kind}`}>{module.title}</h3>
                  <p className="ax-module-description">{module.sub}</p>
                  {selected ? <Link className="ax-module-action" href={module.href} draggable={false}><span>{module.action}</span><span aria-hidden="true">↗</span></Link> : <div className="ax-module-action"><span>Chọn lá bài này</span><span aria-hidden="true">↗</span></div>}
                </div>
              </article>
            </div>
          );
        })}
      </div>
      <div className="ax-deck-controls">
        <button type="button" className="ax-deck-control" onClick={() => move(-1)} aria-label="Card trước"><span aria-hidden="true">←</span></button>
        <div className="ax-deck-status" aria-live="polite" aria-atomic="true"><span>0{active + 1}</span><span className="ax-deck-status-line" /><span>06</span><span className="sr-only">{STACK_MODULES[active].title}</span></div>
        <button type="button" className="ax-deck-control" onClick={() => move(1)} aria-label="Card tiếp theo"><span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}
