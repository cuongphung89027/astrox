import { publicConfig } from '../../services/admin/config.ts';
import { readPublished } from '../../services/admin/store.mjs';
export async function onRequestGet({env}) {
 try {const published=env.DB?await readPublished(env):null;
 return Response.json(published?{config:publicConfig(published.config),revision:published.revision}:{config:null,revision:null},{headers:{'cache-control':'no-store'}});
 }catch{return Response.json({error:'config_unavailable'},{status:503,headers:{'cache-control':'no-store'}});}
}
