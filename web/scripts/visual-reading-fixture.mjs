/** Local browser QA: real request descriptors/calculators, manually authored provider fixture. */
import { readFileSync } from 'node:fs';
import { visualInput, saveVisualReading } from '../../services/admin/visual-reading.ts';
import { fixture } from '../tests/support/visual-fixtures.mjs';
const request = JSON.parse(readFileSync(0, 'utf8'));
const input = visualInput(request.promptDescriptor, request.serviceId, request.locale);
if (!input) throw Error('expected versioned native reading descriptor');
let report = fixture(input);
if (request.serviceId === 'numerology--life-path' && request.locale === 'vi') {
  report = JSON.parse(readFileSync(new URL('../../docs/visual-readings/example-report.json', import.meta.url), 'utf8'));
  for (const [index, c] of report.chapters.entries()) {
    c.visual.kind = input.chapters[index].kind;
    c.visual.factIds = [input.facts[0].id];
    for (const i of c.insights) {
      i.detail +=
        ' Đây là cách diễn giải biểu tượng trong hệ Pythagoras. Bạn có thể đối chiếu với hoàn cảnh của mình để nhận ra lúc khuynh hướng này giúp ích và lúc cần điều chỉnh.';
      i.rationale =
        'Dữ kiện số chủ đạo ' +
        input.facts[0].value +
        ' từ ngày sinh là cơ sở của góc nhìn này. Con số gợi ra chủ đề trải nghiệm và tự chủ theo trường phái này, không xác nhận một hành vi đã xảy ra.';
      i.sourceFactIds = [input.facts[0].id];
      i.example =
        'Ví dụ giả định: khi bắt đầu một dự án mới, bạn có thể thử một bước nhỏ rồi trao đổi với người cùng làm. Điều học được từ lần thử sẽ giúp quyết định có tiếp tục hay điều chỉnh.';
      if (i.action.length < 20) i.action += ' và ghi lại điều học được.';
      i.terms = [{ term: 'Số chủ đạo', explanation: 'Chỉ số rút gọn từ ngày sinh trong hệ Pythagoras.' }];
    }
  }
}
process.stdout.write(saveVisualReading(JSON.stringify(report), input));
