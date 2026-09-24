# Reading Motion Polish Implementation Plan

Goal: Stronger user-approved motion and polished cream/green/gold presentation for Kinh Dich and couples, retaining the existing layout and all calculation/AI behavior.
Architecture: CSS modules with finite transform/opacity animations, keyed decorative coin replay per throw, six-line preview, and a decorative couples connection emblem. No animation timers, dependencies, AI calls, or delayed domain results. Keep both system reduced-motion and app html[data-motion=reduced] fully supported.
Tech stack: Existing Next.js, React, CSS modules.

1. Coin scene: layered rings, metallic coin flip/settle per actual throw; six-line bottom-up preview and staggered new row. Method inputs enter on selection, retained question state.
2. Result seal: finite glow and line reveal. Controls: focus/hover/press feedback with hover restricted to fine pointers.
3. Couples: modest decorative orbit emblem, keyed DOM transition while React form state persists; staggered cards/result/evidence. Wider hour field to avoid clipping full option labels.
4. Validate existing browser workflows and calculation tests, then explicit full/reduced-motion checks, mobile 390/desktop1440 and build. Do not deploy this new design until reviewed unless user requests deployment.
