import { moduleById, isModuleInDevelopment } from './modules.ts';
import { resolveRoute } from './markets.ts';
/** Display-only state. Backend still authorizes every operation independently. */
export function publicState(config, pathname, now = Date.now()) {
  const module = moduleById(resolveRoute(pathname)?.id || '')?.id || '';
  if (isModuleInDevelopment(module)) return { blocked: true, development: true, notice: null, announcement: '' };
  if (!config) return { blocked: false, notice: null, announcement: '' };
  const service = config.billing?.services?.find(s => s.id === module);
  const blocked = Boolean(
    module &&
    (config.maintenance ||
      ['maintenance', 'hidden', 'draft'].includes(config.availability?.[module] || service?.status)),
  );
  const notice =
    config.content?.notices?.find(
      n =>
        n.enabled &&
        (!n.module || n.module === 'all' || n.module === module) &&
        (!n.startsAt || Date.parse(n.startsAt) <= now) &&
        (!n.endsAt || Date.parse(n.endsAt) > now),
    ) || null;
  return { blocked, notice, announcement: config.content?.announcement || '' };
}
