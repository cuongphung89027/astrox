import type {Provider} from './config.ts';
/** Legacy provider ID is its default route. Child IDs are namespaced to that provider. */
export function providerRoutes(providers: Provider[]): Provider[] {
 return providers.flatMap(p=>[
  {...p,models:[]},
  ...(p.models||[]).map(m=>({...m,id:`${p.id}:${m.id}`,name:`${p.name} · ${m.name || m.model}`,enabled:p.enabled&&m.enabled,secretRef:p.secretRef,models:[]}))
 ]);
}
export function routeLabel(p: Provider) { return `${p.name} · ${p.model || 'Chưa đặt model'} · ${p.protocol}`; }
export function belongsToProvider(route:string,id:string) { return route===id||route.startsWith(`${id}:`); }
