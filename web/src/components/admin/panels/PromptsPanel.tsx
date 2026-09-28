'use client';

import { useState } from 'react';
import { SERVICE_CATALOG, addMissingServices } from '../../../../../services/admin/catalog';
import {
  renderPrompt,
  PROMPT_TEMPLATES,
  ORIGINAL_SYSTEM_PROMPT,
  defaultPromptSettings,
} from '../../../../../services/admin/prompt-engine';
import { ENGLISH_SYSTEM_PROMPT, defaultEnglishPromptSettings } from '../../../../../services/admin/english-prompts';
import type { AdminPanelProps } from '../useAdminApi';
import s from '../AdminDashboard.module.css';

export function PromptsPanel({ config, update, market }: AdminPanelProps) {
  const [promptSamples, setPromptSamples] = useState<Record<string, string>>({});
  // P1-8: the market gate decides WHICH prompt set is edited — US edits the
  // English prompts (promptsEn) and can never touch the Vietnamese set.
  if (market === 'US') return <PromptsPanelEn config={config} update={update} />;
  return (
    <section>
      <h2>Kho prompt gốc và bản đang chỉnh sửa</h2>
      <p>
        Biến {'{{v0}}'}… là dữ liệu được tính từ hồ sơ. Giữ biến để đưa đúng cung, sao và kết quả vào bài. Thay đổi chỉ
        có hiệu lực sau khi áp dụng.
      </p>
      <button
        onClick={() =>
          update(d => {
            d.prompts = defaultPromptSettings();
            d.ai.systemPrompt = ORIGINAL_SYSTEM_PROMPT;
            d.billing.services = addMissingServices(d.billing.services).map(v =>
              v.id !== v.module && v.status === 'draft'
                ? { ...v, status: d.billing.services.find(m => m.id === v.module)?.status || 'draft' }
                : v,
            );
          })
        }
      >
        Khôi phục toàn bộ prompt gốc vào bản nháp
      </button>
      <label>
        System prompt chung
        <textarea
          value={config.ai.systemPrompt}
          onChange={e =>
            update(d => {
              d.ai.systemPrompt = e.target.value;
            })
          }
        />
      </label>
      {PROMPT_TEMPLATES.map(t => (
        <details className={s.record} key={t.id}>
          <summary>
            {t.module} · {t.id}
          </summary>
          <p>{t.source}</p>
          <p>{t.variables.map((v, i) => `{{v${i}}}: ${v}`).join(' · ')}</p>
          <label>
            Khung prompt
            <textarea
              rows={8}
              value={config.prompts.templates[t.id]}
              onChange={e =>
                update(d => {
                  d.prompts.templates[t.id] = e.target.value;
                })
              }
            />
          </label>
          <details>
            <summary>Bản gốc</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{t.template}</pre>
          </details>
          <details>
            <summary>Thử ghép prompt · không gọi AI</summary>
            <label>
              Dữ liệu thử (mảng JSON)
              <textarea
                rows={4}
                value={
                  promptSamples[t.id] ??
                  JSON.stringify(
                    t.variables.map(v => `[${v}]`),
                    null,
                    2,
                  )
                }
                onChange={e => setPromptSamples(v => ({ ...v, [t.id]: e.target.value }))}
              />
            </label>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {(() => {
                try {
                  return renderPrompt(
                    {
                      id: t.id,
                      values: JSON.parse(promptSamples[t.id] ?? JSON.stringify(t.variables.map(v => `[${v}]`))),
                    },
                    config.prompts.templates,
                  );
                } catch {
                  return 'Dữ liệu thử không hợp lệ. Nhập đủ các biến theo mảng JSON.';
                }
              })()}
            </pre>
          </details>
          <button
            onClick={() =>
              update(d => {
                d.prompts.templates[t.id] = t.template;
              })
            }
          >
            Khôi phục khung này
          </button>
        </details>
      ))}
      {Object.entries(config.prompts.tasks).map(([id, text]) => (
        <details className={s.record} key={id}>
          <summary>{SERVICE_CATALOG.find(t => t.id === id)?.name || id}</summary>
          <code>{id}</code>
          <label>
            Prompt nhiệm vụ
            <textarea
              rows={5}
              value={text}
              onChange={e =>
                update(d => {
                  d.prompts.tasks[id] = e.target.value;
                })
              }
            />
          </label>
          <details>
            <summary>Bản gốc</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{defaultPromptSettings().tasks[id]}</pre>
          </details>
        </details>
      ))}
    </section>
  );
}

/** English prompt editor (US market): edits promptsEn/templates + tasks only.
 *  The Vietnamese prompts stay untouched in this context. */
export function PromptsPanelEn({ config, update }: Pick<AdminPanelProps, 'config' | 'update'>) {
  const en = config.promptsEn;
  const set = (fn: (draft: AdminConfigLike) => void) =>
    update(d => {
      fn(d as AdminConfigLike);
    });
  type AdminConfigLike = {
    promptsEn: { templates: Record<string, string>; tasks: Record<string, string> };
    ai: { systemPrompt: string };
  };
  return (
    <section>
      <h2>English prompts (US market)</h2>
      <p>
        Editing the English set only — the Vietnamese prompts are managed in the VN context. Changes apply after
        publishing, per environment.
      </p>
      <button
        onClick={() =>
          set(d => {
            d.promptsEn = defaultEnglishPromptSettings();
            d.ai.systemPrompt = ENGLISH_SYSTEM_PROMPT;
          })
        }
      >
        Reset English prompts to defaults
      </button>
      {PROMPT_TEMPLATES.map(t => (
        <details className={s.record} key={t.id}>
          <summary>
            {t.module} · {t.id}
          </summary>
          <label>
            English template
            <textarea
              rows={8}
              value={en.templates[t.id]}
              onChange={e =>
                set(d => {
                  d.promptsEn.templates[t.id] = e.target.value;
                })
              }
            />
          </label>
          <details>
            <summary>Default</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{defaultEnglishPromptSettings().templates[t.id]}</pre>
          </details>
        </details>
      ))}
      {Object.entries(en.tasks).map(([id, text]) => (
        <details className={s.record} key={id}>
          <summary>{SERVICE_CATALOG.find(t => t.id === id)?.name || id}</summary>
          <code>{id}</code>
          <label>
            English task prompt
            <textarea
              rows={5}
              value={text}
              onChange={e =>
                set(d => {
                  d.promptsEn.tasks[id] = e.target.value;
                })
              }
            />
          </label>
        </details>
      ))}
    </section>
  );
}
