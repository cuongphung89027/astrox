import { SERVICE_CATALOG } from './catalog.ts';
import { MODULES } from './modules.ts';
export type ServiceRow = { id: string; module: string; name: string; policy?: string };
export type ServiceNode = { id: string; name: string; serviceIds: string[]; children: ServiceNode[] };
const grouped = new Set(['tuvi', 'zodiac', 'batu', 'numerology']);
export function serviceGroup(id: string): { id: string; name: string } | null {
  const s = SERVICE_CATALOG.find(s => s.id === id);
  if (!s) return null;
  if (s.module === 'tarot') return { id: 'tarot--spreads', name: 'Trải bài' };
  if (!grouped.has(s.module)) return null;
  const key = ['tuvi', 'zodiac'].includes(s.module) ? id.split('--')[1] : 'readings';
  return { id: `${s.module}--${key}`, name: s.group };
}
/** IDs and membership are functional, never inferred from translated display names. */
export function serviceTree(rows: readonly ServiceRow[]): ServiceNode[] {
  return MODULES.map(m => {
    const children: ServiceNode[] = [];
    for (const s of rows.filter(s => s.module === m.id && s.id !== m.id)) {
      const g = serviceGroup(s.id);
      if (!g) {
        children.push({ id: s.id, name: s.name, serviceIds: [s.id], children: [] });
        continue;
      }
      let group = children.find(n => n.id === g.id);
      if (!group) {
        group = { ...g, serviceIds: [], children: [] };
        children.push(group);
      }
      if (m.id === 'tarot') group.serviceIds.push(s.id);
      else group.children.push({ id: s.id, name: s.name, serviceIds: [s.id], children: [] });
    }
    return { id: m.id, name: m.name, serviceIds: rows.filter(s => s.id === m.id).map(s => s.id), children };
  });
}
export type BundleDefinition = { id: string; module: string; name: string; members: string[] };
export function bundleDefinitions(): BundleDefinition[] {
  const out: BundleDefinition[] = [];
  for (const m of MODULES.filter(m => grouped.has(m.id))) {
    const leaves = SERVICE_CATALOG.filter(s => s.module === m.id && s.policy === 'profile');
    out.push({ id: m.id, module: m.id, name: `Toàn bộ luận giải ${m.name}`, members: leaves.map(s => s.id) });
    for (const s of leaves) {
      const group = serviceGroup(s.id)!;
      const entry = out.find(n => n.id === group.id);
      if (entry) entry.members.push(s.id);
      else out.push({ ...group, module: m.id, members: [s.id] });
    }
  }
  return out;
}
