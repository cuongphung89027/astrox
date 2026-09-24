import { routeModule } from './modules.ts';
/** Display-only state. Backend still authorizes every operation independently. */
export function publicState(config, pathname, now = Date.now()) {
  if (!config) return { blocked: false, notice: null, announcement: '' };
  const module = routeModule(pathname);
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
