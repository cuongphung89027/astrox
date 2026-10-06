export const original = {
  id: 'numerology.numerologyPromptBody.0',
  values: [
    { id: 'numerology.profileContextText.0', values: ['An', 'Nam', '08/03/2001', 'Tý', 'Hà Nội'] },
    {
      id: 'numerology.numerologyContextText.0',
      values: [
        JSON.stringify({
          lifePath: 5,
          destiny: 8,
          soulUrge: 3,
          personality: 7,
          karmicDebts: [{ label: 'Số Chủ Đạo', raw: 14 }],
          now: { year: 2026 },
        }),
      ],
    },
    'Luận số chủ đạo',
  ],
};
export const serviceId = 'numerology--life-path';
export function fixture(input) {
  const report = {
    schemaVersion: 'astrox.visual-reading.v1',
    module: input.module,
    serviceId: input.serviceId,
    locale: input.locale,
    title: input.title,
    summary: 'Một góc nhìn cụ thể giúp bạn nhận ra khuynh hướng của mình.',
    chapters: input.chapters.map((c, idx) => ({
      id: c.id,
      title: c.title,
      summary: 'Từ dữ kiện đến cách ứng dụng trong đời sống.',
      visual: {
        kind: c.kind,
        factIds: [input.facts[0].id],
        ...(c.allowedAxes
          ? {
              signals: c.allowedAxes.map((a, i) => ({
                axisId: a.id,
                lean: ['right', 'left', 'balanced'][i],
                insightId: `insight-${idx}-${i % 2}`,
              })),
            }
          : {}),
      },
      insights: [0, 1].map(n => ({
        id: `insight-${idx}-${n}`,
        role: n ? 'balance' : 'strength',
        label: 'Khám phá có định hướng',
        summary: 'Bạn có thể đổi mới và giữ một điểm tựa.',
        detail:
          'Khuynh hướng này có thể xuất hiện khi bạn muốn thử một cách làm mới. Hãy quan sát hoàn cảnh và nhu cầu thực tế trước khi quyết định, thay vì coi con số là kết luận về bản thân.',
        rationale: 'Số chủ đạo 5 trong dữ liệu đầu vào gợi ra chủ đề trải nghiệm và thích nghi theo trường phái này.',
        example: 'Khi bắt đầu dự án, thử một phương án nhỏ trước khi thay toàn bộ kế hoạch.',
        action: 'Chọn một việc để thử trong tuần này và ghi lại điều học được.',
        terms: [{ term: 'Số chủ đạo', explanation: 'Chỉ số rút gọn từ ngày sinh trong hệ Pythagoras.' }],
        sourceFactIds: [input.facts[0].id],
      })),
    })),
  };
  if (input.locale === 'en') {
    report.summary =
      'A specific perspective to connect your calculated chart with everyday choices and useful next steps.';
    for (const c of report.chapters) {
      c.summary = 'Connect evidence, context and practical choices.';
      for (const i of c.insights) {
        i.label = 'Explore with a clear purpose';
        i.summary = 'You can try a new approach while keeping one reliable anchor for your decisions.';
        i.detail =
          'This tendency may become useful when you want to experiment with a different way of working. First identify the goal you want to preserve, then compare two practical approaches. Adaptation does not require abandoning all structure. Notice when exploration adds useful learning, and when another change would interrupt work you already want to finish.';
        i.rationale =
          'The calculated Life Path value of five provides the evidence for this interpretation in the Pythagorean tradition. It suggests a theme of experience and adaptation. This is a traditional symbolic interpretation rather than proof that a particular behavior or event has occurred in your life.';
        i.example =
          'For example, when beginning a new project you might test one small method and discuss the result with a teammate. That trial can give you information before deciding whether to change the larger plan.';
        i.action = 'Choose one small experiment this week and write down what you learned before starting another one.';
        i.terms = [
          {
            term: 'Life Path',
            explanation: 'A number reduced from the date of birth in the Pythagorean numerology tradition.',
          },
        ];
      }
    }
  }
  return report;
}
