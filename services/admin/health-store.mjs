import {sql} from './store.mjs';
export function providerHealth(env) {
 return {
  async get(id){const r=await sql(env,'SELECT failures,last_failure_at FROM admin_provider_health WHERE provider_id=?',id).first();return r?{failures:r.failures,lastFailureAt:r.last_failure_at}:null},
  async recordFailure(id,now){await sql(env,'INSERT INTO admin_provider_health(provider_id,failures,last_failure_at) VALUES(?,1,?) ON CONFLICT(provider_id) DO UPDATE SET failures=failures+1,last_failure_at=excluded.last_failure_at',id,now).run()},
  async recordSuccess(id){await sql(env,'DELETE FROM admin_provider_health WHERE provider_id=?',id).run()}
 };
}
