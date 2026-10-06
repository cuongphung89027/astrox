import { renderPrompt, type PromptNode } from '../../../services/admin/prompt-engine';
import { wrapVisualPrompt } from '../../../services/admin/visual-reading';
const pending = new Map<string, PromptNode>();
/** Records structured template values alongside the rendered local preview. */
export function managedPrompt(id: string, values: unknown[]): string {
  const node: PromptNode = {
    id,
    values: values.map(v => {
      const text = String(v ?? '');
      return pending.get(text) ?? text;
    }),
  };
  const text = renderPrompt(node);
  pending.set(text, node);
  if (pending.size > 256) pending.delete(pending.keys().next().value!);
  return text;
}
export function promptDescriptor(text: string): PromptNode | undefined {
  return pending.get(text);
}
/** Quotes, consent and inference must share the exact same deterministic descriptor. */
export function readingPromptDescriptor(text: string, serviceId: string, locale: 'vi' | 'en'): PromptNode | undefined {
  const node = promptDescriptor(text);
  return node ? wrapVisualPrompt(node, serviceId, locale) : undefined;
}

export function managedJoin(values: string[], separator: string): string {
  const parts: string[] = [];
  values.forEach((v, i) => {
    if (i) parts.push(separator);
    parts.push(v);
  });
  return managedPrompt('$join', parts);
}
